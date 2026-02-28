import { describe, expect, it } from 'vitest';

import { buildSettlementReport } from '../src/engine/settlement.js';

describe('settlement reconciliation', () => {
  it('uses awarded bid amount when available', () => {
    const report = buildSettlementReport({
      agentId: 'agent-1',
      nearPriceUsd: 4,
      jobs: [
        {
          job_id: 'job-1',
          title: 'Awarded',
          status: 'completed',
          awarded_bid_id: 'bid-1',
          updated_at: '2026-02-28T00:00:00.000Z',
        },
      ],
      bidsByJobId: {
        'job-1': [{ bid_id: 'bid-1', amount: '2.5', bidder_agent_id: 'agent-1' }],
      },
    });

    expect(report.records).toHaveLength(1);
    expect(report.records[0]?.amountNear).toBe(2.5);
    expect(report.totalUsd).toBe(10);
  });

  it('falls back to NEAR budget when bid amount is unavailable', () => {
    const report = buildSettlementReport({
      agentId: 'agent-1',
      nearPriceUsd: 5,
      jobs: [
        {
          job_id: 'job-2',
          title: 'Budget fallback',
          status: 'completed',
          budget_amount: '1.25',
          budget_token: 'NEAR',
          updated_at: '2026-02-28T00:00:00.000Z',
        },
      ],
      bidsByJobId: { 'job-2': [] },
    });

    expect(report.records[0]?.amountNear).toBe(1.25);
    expect(report.totalUsd).toBe(6.25);
  });
});
