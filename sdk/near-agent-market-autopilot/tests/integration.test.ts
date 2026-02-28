import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createAutopilot } from '../src/autopilot.js';

function json(data: unknown): string {
  return JSON.stringify(data);
}

describe('autopilot integration', () => {
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

  it('executes bid, stale withdrawal, submission, and settlement reconciliation', async () => {
    let bidPosts = 0;
    let submitPosts = 0;
    let withdrawPosts = 0;

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const method = (req.method ?? 'GET').toUpperCase();

      if (method === 'GET' && url.pathname === '/v1/jobs') {
        if (url.searchParams.get('status') === 'completed') {
          res.setHeader('content-type', 'application/json');
          res.end(
            json([
              {
                job_id: 'job-submit',
                title: 'Completed assignment',
                status: 'completed',
                awarded_bid_id: 'bid-accepted',
                updated_at: '2026-02-28T00:00:00.000Z',
              },
            ])
          );
          return;
        }

        res.setHeader('content-type', 'application/json');
        res.end(
          json([
            {
              job_id: 'job-open',
              title: 'Open job',
              status: 'open',
              budget_amount: '1.5',
              budget_token: 'NEAR',
              job_type: 'standard',
            },
          ])
        );
        return;
      }

      if (method === 'GET' && url.pathname === '/v1/jobs/job-open/bids') {
        res.setHeader('content-type', 'application/json');
        res.end(json([{ bid_id: 'other', amount: '0.7' }]));
        return;
      }

      if (method === 'POST' && url.pathname === '/v1/jobs/job-open/bids') {
        bidPosts += 1;
        res.setHeader('content-type', 'application/json');
        res.end(json({ bid_id: `bid-open-${bidPosts}` }));
        return;
      }

      if (method === 'GET' && url.pathname === '/v1/agents/me/bids') {
        res.setHeader('content-type', 'application/json');
        res.end(
          json([
            { bid_id: 'bid-stale', job_id: 'job-stale', status: 'pending', amount: '0.6' },
            { bid_id: 'bid-accepted', job_id: 'job-submit', status: 'accepted', amount: '1.2' },
          ])
        );
        return;
      }

      if (method === 'POST' && url.pathname === '/v1/bids/bid-stale/withdraw') {
        withdrawPosts += 1;
        res.setHeader('content-type', 'application/json');
        res.end(json({ ok: true }));
        return;
      }

      if (method === 'GET' && url.pathname === '/v1/jobs/job-submit') {
        res.setHeader('content-type', 'application/json');
        res.end(
          json({
            job_id: 'job-submit',
            title: 'Submit job',
            job_type: 'standard',
            my_assignments: [
              {
                assignment_id: 'asg-1',
                status: 'in_progress',
              },
            ],
          })
        );
        return;
      }

      if (method === 'POST' && url.pathname === '/v1/jobs/job-submit/submit') {
        submitPosts += 1;
        res.setHeader('content-type', 'application/json');
        res.end(json({ ok: true }));
        return;
      }

      if (method === 'GET' && url.pathname === '/v1/jobs/job-submit/bids') {
        res.setHeader('content-type', 'application/json');
        res.end(json([{ bid_id: 'bid-accepted', amount: '1.2', bidder_agent_id: 'agent-1' }]));
        return;
      }

      res.statusCode = 404;
      res.setHeader('content-type', 'application/json');
      res.end(json({ error: 'not found', method, path: url.pathname }));
    });

    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    servers.push(server);

    const addr = server.address();
    if (!addr || typeof addr === 'string') {
      throw new Error('Failed to resolve mock server address');
    }

    const temp = await mkdtemp(path.join(tmpdir(), 'autopilot-test-'));
    const statePath = path.join(temp, 'state.json');
    await writeFile(
      statePath,
      json({
        'near_market_bid_submitted:job-stale': '2026-02-27T00:00:00.000Z',
      }),
      'utf8'
    );

    const autopilot = createAutopilot({
      agentId: 'agent-1',
      market: {
        baseUrl: `http://127.0.0.1:${addr.port}`,
        apiKey: 'test-key',
      },
      state: {
        driver: 'file',
        path: statePath,
      },
      nearPriceUsd: 4,
      submitSigningKey: 'secret',
      artifactProvider: async () => ({
        deliverableUrl: 'https://example.com/result.json',
        artifactHash: 'artifact-1',
      }),
    });

    const first = await autopilot.runTick();
    const second = await autopilot.runTick();

    expect(first.halted).toBe(false);
    expect(first.bidDecisions.some(row => row.action === 'bid')).toBe(true);
    expect(first.executionDecisions.some(row => row.action === 'submit')).toBe(true);
    expect(first.settlements.records).toHaveLength(1);

    expect(bidPosts).toBe(1);
    expect(withdrawPosts).toBe(1);
    expect(submitPosts).toBe(1);
    expect(second.executionDecisions.some(row => row.reason === 'already_submitted')).toBe(true);
    expect(submitPosts).toBe(1);
  });

  it('fails closed on API errors', async () => {
    const server = createServer((_req, res) => {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(json({ error: 'boom' }));
    });

    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    servers.push(server);

    const addr = server.address();
    if (!addr || typeof addr === 'string') {
      throw new Error('Failed to resolve mock server address');
    }

    const temp = await mkdtemp(path.join(tmpdir(), 'autopilot-test-'));
    const autopilot = createAutopilot({
      agentId: 'agent-1',
      market: {
        baseUrl: `http://127.0.0.1:${addr.port}`,
        apiKey: 'test-key',
      },
      state: {
        driver: 'file',
        path: path.join(temp, 'state.json'),
      },
    });

    const result = await autopilot.runTick();
    expect(result.halted).toBe(true);
  });
});
