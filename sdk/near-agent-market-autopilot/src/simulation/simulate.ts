import { createHash } from 'node:crypto';

import { rankJobsForBidding } from '../engine/bidding.js';
import {
  nextSubmissionAttempt,
  planStaleBidWithdrawals,
  toExecutionDecision,
} from '../engine/lifecycle.js';
import { resolvePolicyConfig } from '../policy/defaults.js';
import type { SimulationInput, SimulationOutput, SubmitAttemptState, TrackedBid } from '../types.js';

function canonicalJson(value: unknown): string {
  const normalize = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(normalize);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, child]) => [key, normalize(child)])
      );
    }
    return v;
  };

  return JSON.stringify(normalize(value));
}

export function simulateTick(input: SimulationInput): SimulationOutput {
  const policy = resolvePolicyConfig(input.policy);

  const bidDecisions = rankJobsForBidding({
    jobs: [...input.jobs].sort((a, b) => a.job_id.localeCompare(b.job_id)),
    bidsByJobId: input.bidsByJobId,
    policy,
  });

  const bidMarkerByJobId: Record<string, string | undefined> = {};
  for (const bid of input.trackedBids) {
    bidMarkerByJobId[bid.jobId] ??= input.nowIso;
  }

  const stalePlan = planStaleBidWithdrawals({
    trackedBids: input.trackedBids,
    nowIso: input.nowIso,
    bidMarkerByJobId,
    policy,
  });

  const submitStateByKey = input.submitStateByKey ?? {};
  const submitDecisions = input.trackedBids
    .filter(
      (bid): bid is TrackedBid =>
        bid.status === 'accepted' || bid.status === 'in_progress' || bid.status === 'submitted'
    )
    .map(bid => {
      const key = `${bid.jobId}:${bid.bidId}`;
      const existing = submitStateByKey[key] as SubmitAttemptState | undefined;
      const attempt = nextSubmissionAttempt({
        bid,
        nowIso: input.nowIso,
        policy,
        state: existing,
      });

      return toExecutionDecision({
        bid,
        assignmentId: 'unknown',
        action: attempt.shouldAttempt ? 'submit' : 'skip',
        reason: attempt.reason,
        nextAttemptAt: attempt.nextState.nextAttemptAt,
      });
    })
    .sort((a, b) => `${a.jobId}:${a.bidId}`.localeCompare(`${b.jobId}:${b.bidId}`));

  const deterministicDigest = createHash('sha256')
    .update(
      canonicalJson({
        bidDecisions,
        withdrawBidIds: stalePlan.toWithdraw.map(row => row.bidId).sort(),
        submitDecisions,
      }),
      'utf8'
    )
    .digest('hex');

  return {
    bidDecisions,
    withdrawBidIds: stalePlan.toWithdraw.map(row => row.bidId),
    submitDecisions,
    deterministicDigest,
  };
}
