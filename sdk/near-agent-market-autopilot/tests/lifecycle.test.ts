import { describe, expect, it } from 'vitest';

import {
  applySubmissionFailure,
  nextSubmissionAttempt,
  planStaleBidWithdrawals,
} from '../src/engine/lifecycle.js';
import { DEFAULT_POLICY } from '../src/policy/defaults.js';

describe('lifecycle engine', () => {
  it('schedules stale pending withdrawals by marker timestamp', () => {
    const result = planStaleBidWithdrawals({
      trackedBids: [{ bidId: 'bid-1', jobId: 'job-1', status: 'pending', amountNear: 1 }],
      nowIso: '2026-02-28T00:00:00.000Z',
      bidMarkerByJobId: {
        'job-1': '2026-02-27T22:00:00.000Z',
      },
      policy: { ...DEFAULT_POLICY, stalePendingBidMinutes: 30 },
    });

    expect(result.toWithdraw).toHaveLength(1);
    expect(result.toWithdraw[0]?.bidId).toBe('bid-1');
  });

  it('applies backoff and escalation on failures', () => {
    const state = applySubmissionFailure({
      state: {
        attempts: 2,
        firstSeenAt: '2026-02-27T00:00:00.000Z',
        escalations: 0,
      },
      nowIso: '2026-02-28T00:00:00.000Z',
      policy: DEFAULT_POLICY,
    });

    expect(state.nextAttemptAt).toBeTruthy();
    expect(state.escalations).toBe(1);
  });

  it('blocks attempts when backoff is still active', () => {
    const decision = nextSubmissionAttempt({
      bid: { bidId: 'b', jobId: 'j', status: 'accepted', amountNear: 1 },
      nowIso: '2026-02-28T00:00:00.000Z',
      policy: DEFAULT_POLICY,
      state: {
        attempts: 1,
        firstSeenAt: '2026-02-27T23:00:00.000Z',
        escalations: 0,
        nextAttemptAt: '2026-02-28T01:00:00.000Z',
      },
    });

    expect(decision.shouldAttempt).toBe(false);
    expect(decision.reason).toBe('backoff_pending');
  });
});
