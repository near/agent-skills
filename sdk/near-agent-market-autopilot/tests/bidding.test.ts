import { describe, expect, it } from 'vitest';

import { decideBidForJob } from '../src/engine/bidding.js';
import { DEFAULT_POLICY } from '../src/policy/defaults.js';

describe('bidding engine', () => {
  it('undercuts live minimum bid within policy bounds', () => {
    const decision = decideBidForJob({
      policy: DEFAULT_POLICY,
      job: {
        job_id: 'job-1',
        title: 'test',
        budget_amount: '1',
        budget_token: 'NEAR',
        job_type: 'standard',
      },
      bids: [
        { bid_id: 'a', amount: '0.2' },
        { bid_id: 'b', amount: '0.15' },
      ],
    });

    expect(decision.action).toBe('bid');
    expect(decision.bidAmountNear).toBe(0.1499);
  });

  it('routes competition jobs to entry action', () => {
    const decision = decideBidForJob({
      policy: DEFAULT_POLICY,
      job: {
        job_id: 'job-2',
        title: 'competition',
        budget_amount: '2',
        budget_token: 'NEAR',
        job_type: 'competition',
      },
      bids: [],
    });

    expect(decision.action).toBe('entry');
    expect(decision.bidAmountNear).toBeGreaterThan(0);
  });

  it('skips budgets outside policy', () => {
    const decision = decideBidForJob({
      policy: { ...DEFAULT_POLICY, minBudgetNear: 1 },
      job: {
        job_id: 'job-3',
        title: 'small budget',
        budget_amount: '0.3',
        budget_token: 'NEAR',
      },
      bids: [],
    });

    expect(decision.action).toBe('skip');
    expect(decision.reason).toBe('budget_outside_policy');
  });
});
