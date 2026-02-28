import type { ExecutionDecision, PolicyConfig, SubmitAttemptState, TrackedBid } from '../types.js';

export interface StaleWithdrawalPlan {
  bidId: string;
  jobId: string;
  markerInitAt?: string;
}

function minutesToMs(value: number): number {
  return value * 60_000;
}

function plusMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutesToMs(minutes)).toISOString();
}

export function planStaleBidWithdrawals(params: {
  trackedBids: TrackedBid[];
  nowIso: string;
  bidMarkerByJobId: Record<string, string | undefined>;
  policy: PolicyConfig;
}): {
  toWithdraw: StaleWithdrawalPlan[];
  markerUpdates: Array<{ jobId: string; atIso: string }>;
} {
  const toWithdraw: StaleWithdrawalPlan[] = [];
  const markerUpdates: Array<{ jobId: string; atIso: string }> = [];
  const cutoffMs = Date.parse(params.nowIso) - minutesToMs(params.policy.stalePendingBidMinutes);

  for (const bid of params.trackedBids) {
    if (bid.status !== 'pending') continue;
    const marker = params.bidMarkerByJobId[bid.jobId];
    if (!marker) {
      markerUpdates.push({ jobId: bid.jobId, atIso: params.nowIso });
      continue;
    }

    const markerMs = Date.parse(marker);
    if (!Number.isFinite(markerMs)) {
      markerUpdates.push({ jobId: bid.jobId, atIso: params.nowIso });
      continue;
    }

    if (markerMs <= cutoffMs) {
      toWithdraw.push({ bidId: bid.bidId, jobId: bid.jobId });
    }
  }

  return { toWithdraw, markerUpdates };
}

export function nextSubmissionAttempt(params: {
  bid: TrackedBid;
  nowIso: string;
  policy: PolicyConfig;
  state?: SubmitAttemptState;
}): {
  shouldAttempt: boolean;
  nextState: SubmitAttemptState;
  reason?: string;
} {
  const baseState: SubmitAttemptState = params.state ?? {
    attempts: 0,
    firstSeenAt: params.nowIso,
    escalations: 0,
  };

  if (baseState.submittedAt) {
    return {
      shouldAttempt: false,
      nextState: baseState,
      reason: 'already_submitted',
    };
  }

  if (baseState.attempts >= params.policy.submitRetryLimit) {
    return {
      shouldAttempt: false,
      nextState: baseState,
      reason: 'retry_limit_reached',
    };
  }

  if (baseState.nextAttemptAt) {
    const nextMs = Date.parse(baseState.nextAttemptAt);
    const nowMs = Date.parse(params.nowIso);
    if (Number.isFinite(nextMs) && nextMs > nowMs) {
      return {
        shouldAttempt: false,
        nextState: baseState,
        reason: 'backoff_pending',
      };
    }
  }

  return {
    shouldAttempt: true,
    nextState: {
      ...baseState,
      attempts: baseState.attempts + 1,
    },
  };
}

export function applySubmissionFailure(params: {
  state: SubmitAttemptState;
  nowIso: string;
  policy: PolicyConfig;
}): SubmitAttemptState {
  const backoffMinutes = Math.min(
    params.policy.submitRetryMaxBackoffMinutes,
    params.policy.submitRetryBackoffMinutes * Math.max(1, params.state.attempts)
  );

  let escalations = params.state.escalations;
  const firstSeenMs = Date.parse(params.state.firstSeenAt);
  const nowMs = Date.parse(params.nowIso);
  if (
    Number.isFinite(firstSeenMs) &&
    Number.isFinite(nowMs) &&
    nowMs - firstSeenMs >= minutesToMs(params.policy.submitEscalateAfterMinutes)
  ) {
    escalations = Math.min(params.policy.submitEscalationLimit, escalations + 1);
  }

  return {
    ...params.state,
    escalations,
    nextAttemptAt: plusMinutes(params.nowIso, backoffMinutes),
  };
}

export function markSubmissionSucceeded(state: SubmitAttemptState, nowIso: string): SubmitAttemptState {
  return {
    ...state,
    submittedAt: nowIso,
    nextAttemptAt: undefined,
  };
}

export function toExecutionDecision(params: {
  bid: TrackedBid;
  assignmentId: string;
  action: 'skip' | 'submit';
  reason?: string;
  nextAttemptAt?: string;
}): ExecutionDecision {
  return {
    jobId: params.bid.jobId,
    bidId: params.bid.bidId,
    assignmentId: params.assignmentId,
    action: params.action,
    reason: params.reason,
    nextAttemptAt: params.nextAttemptAt,
  };
}
