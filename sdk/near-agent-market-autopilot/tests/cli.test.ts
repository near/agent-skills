import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runCli } from '../src/cli/index.js';

function withCapturedStdout<T>(fn: () => Promise<T>): Promise<{ output: string; result: T }> {
  const chunks: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  (process.stdout.write as unknown as (chunk: string) => boolean) = ((chunk: string) => {
    chunks.push(chunk);
    return true;
  }) as unknown as typeof process.stdout.write;

  return fn()
    .then(result => ({ output: chunks.join(''), result }))
    .finally(() => {
      process.stdout.write = original;
    });
}

describe('cli commands', () => {
  const servers: Array<ReturnType<typeof createServer>> = [];

  afterEach(async () => {
    await Promise.all(
      servers.map(
        server =>
          new Promise<void>(resolve => {
            server.close(() => resolve());
          })
      )
    );
    servers.length = 0;
  });

  it('supports simulate command', async () => {
    const temp = await mkdtemp(path.join(tmpdir(), 'autopilot-cli-'));
    const inputPath = path.join(temp, 'snapshot.json');
    const policyPath = path.join(temp, 'policy.json');

    await writeFile(
      inputPath,
      JSON.stringify({
        nowIso: '2026-02-28T00:00:00.000Z',
        jobs: [{ job_id: 'j', title: 'x', budget_amount: '1', budget_token: 'NEAR' }],
        bidsByJobId: { j: [] },
        trackedBids: [],
      }),
      'utf8'
    );
    await writeFile(policyPath, JSON.stringify({ minBidNear: 0.04 }), 'utf8');

    const { output } = await withCapturedStdout(async () => {
      await runCli(['node', 'autopilot', 'simulate', '--input', inputPath, '--policy', policyPath]);
    });

    expect(output).toContain('deterministicDigest');
  });

  it('supports tick, reconcile, and doctor command contracts', async () => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = (req.method ?? 'GET').toUpperCase();

      if (method === 'GET' && url.pathname === '/v1/jobs') {
        res.setHeader('content-type', 'application/json');
        res.end('[]');
        return;
      }

      if (method === 'GET' && url.pathname === '/v1/agents/me/bids') {
        res.setHeader('content-type', 'application/json');
        res.end('[]');
        return;
      }

      res.statusCode = 404;
      res.end('{}');
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
    servers.push(server);

    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('server addr not available');

    const temp = await mkdtemp(path.join(tmpdir(), 'autopilot-cli-'));
    const configPath = path.join(temp, 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        agentId: 'agent-1',
        market: {
          baseUrl: `http://127.0.0.1:${addr.port}`,
          apiKey: 'x',
        },
        state: {
          driver: 'file',
          path: path.join(temp, 'state.json'),
        },
      }),
      'utf8'
    );

    const tick = await withCapturedStdout(async () => {
      await runCli(['node', 'autopilot', 'tick', '--config', configPath]);
    });
    expect(tick.output).toContain('tickId');

    const reconcile = await withCapturedStdout(async () => {
      await runCli(['node', 'autopilot', 'reconcile', '--config', configPath]);
    });
    expect(reconcile.output).toContain('totalNear');

    const doctor = await withCapturedStdout(async () => {
      await runCli(['node', 'autopilot', 'doctor', '--config', configPath]);
    });
    expect(doctor.output).toContain('"ok": true');
  });

  it('supports run command and stops on fail-closed tick', async () => {
    const server = createServer((_req, res) => {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end('{"error":"boom"}');
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
    servers.push(server);

    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('server addr not available');

    const temp = await mkdtemp(path.join(tmpdir(), 'autopilot-cli-'));
    const configPath = path.join(temp, 'config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        agentId: 'agent-1',
        market: {
          baseUrl: `http://127.0.0.1:${addr.port}`,
          apiKey: 'x',
        },
        state: {
          driver: 'file',
          path: path.join(temp, 'state.json'),
        },
      }),
      'utf8'
    );

    const run = await withCapturedStdout(async () => {
      await runCli(['node', 'autopilot', 'run', '--config', configPath, '--interval-ms', '20']);
    });

    expect(run.output).toContain('"halted":true');
  });
});
