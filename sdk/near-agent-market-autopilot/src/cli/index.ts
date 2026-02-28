#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import process from 'node:process';

import { Command } from 'commander';
import { z } from 'zod';

import { createAutopilot } from '../autopilot.js';
import { createMarketClient } from '../client/market-client.js';
import { resolvePolicyConfig } from '../policy/defaults.js';
import { simulateTick } from '../simulation/simulate.js';
import { loadConfig } from './config.js';

const simulationInputSchema = z.object({
  nowIso: z.string().min(1),
  jobs: z.array(z.object({ job_id: z.string(), title: z.string() }).passthrough()),
  bidsByJobId: z.record(z.array(z.object({ bid_id: z.string() }).passthrough())),
  trackedBids: z.array(
    z.object({
      bidId: z.string(),
      jobId: z.string(),
      status: z.enum(['pending', 'accepted', 'submitted', 'in_progress', 'withdrawn', 'rejected', 'completed', 'unknown']),
      amountNear: z.number().nullable(),
    })
  ),
  submitStateByKey: z
    .record(
      z.object({
        attempts: z.number().int().nonnegative(),
        firstSeenAt: z.string().min(1),
        nextAttemptAt: z.string().optional(),
        escalations: z.number().int().nonnegative(),
        submittedAt: z.string().optional(),
      })
    )
    .optional(),
});

export function buildProgram(): Command {
  const program = new Command();
  program.name('autopilot').description('NEAR Agent Market Autopilot').version('0.1.0');

  program
    .command('run')
    .description('Run continuous autopilot loop')
    .requiredOption('--config <path>', 'Path to autopilot JSON config')
    .option('--interval-ms <number>', 'Loop interval in milliseconds', value => Number(value))
    .action(async options => {
      const config = await loadConfig(options.config);
      const autopilot = createAutopilot(config);
      let shouldStop = false;
      const stopSignal = new Error('autopilot_stop');

      process.on('SIGINT', () => {
        shouldStop = true;
      });

      try {
        await autopilot.runLoop({
          intervalMs: Number.isFinite(options.intervalMs) ? options.intervalMs : undefined,
          onTick: async result => {
            process.stdout.write(`${JSON.stringify(result)}\n`);
            if (shouldStop) throw stopSignal;
          },
        });
      } catch (error) {
        if (error !== stopSignal) throw error;
      }
    });

  program
    .command('tick')
    .description('Run one tick')
    .requiredOption('--config <path>', 'Path to autopilot JSON config')
    .action(async options => {
      const config = await loadConfig(options.config);
      const autopilot = createAutopilot(config);
      const result = await autopilot.runTick();
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    });

  program
    .command('reconcile')
    .description('Reconcile completed settlements')
    .requiredOption('--config <path>', 'Path to autopilot JSON config')
    .option('--limit <number>', 'Completed job scan limit', value => Number(value))
    .action(async options => {
      const config = await loadConfig(options.config);
      const autopilot = createAutopilot(config);
      const report = await autopilot.reconcileSettlements({
        limit: Number.isFinite(options.limit) ? options.limit : undefined,
      });
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    });

  program
    .command('simulate')
    .description('Run deterministic simulation from a snapshot file')
    .requiredOption('--input <path>', 'Snapshot input JSON file')
    .option('--policy <path>', 'Policy JSON overrides')
    .action(async options => {
      const snapshotRaw = await readFile(options.input, 'utf8');
      const snapshot = simulationInputSchema.parse(JSON.parse(snapshotRaw));

      let policy = undefined;
      if (options.policy) {
        const policyRaw = await readFile(options.policy, 'utf8');
        policy = resolvePolicyConfig(JSON.parse(policyRaw));
      }

      const output = simulateTick({
        ...snapshot,
        policy,
      });
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    });

  program
    .command('doctor')
    .description('Validate configuration and basic API connectivity')
    .requiredOption('--config <path>', 'Path to autopilot JSON config')
    .action(async options => {
      const config = await loadConfig(options.config);
      const client = createMarketClient(config.market);

      const jobs = await client.listJobs({ limit: 1 });
      const result = {
        ok: true,
        agentId: config.agentId,
        baseUrl: config.market.baseUrl,
        stateDriver: config.state.driver,
        jobsProbeCount: jobs.length,
      };
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    });

  return program;
}

export async function runCli(argv = process.argv): Promise<void> {
  await buildProgram().parseAsync(argv);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
