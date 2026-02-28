import type { BidDecision, MarketBid, MarketJob, PolicyConfig } from '../types.js';

function parseNear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeJobType(value: unknown): 'standard' | 'competition' {
  return typeof value === 'string' && value.toLowerCase() === 'competition' ? 'competition' : 'standard';
}

function budgetNear(job: MarketJob): number | null {
  if ((job.budget_token ?? 'NEAR').toString().toUpperCase() !== 'NEAR') return null;
  return parseNear(job.budget_amount);
}

function confidenceScore(params: { budget: number; existingBids: number; policy: PolicyConfig }): number {
  const budgetScore = Math.min(1, params.budget / params.policy.maxBudgetNear);
  const competitionPenalty = Math.min(0.4, params.existingBids * 0.03);
  const confidence = budgetScore * (1 - competitionPenalty);
  return Math.max(0, Math.min(1, Number(confidence.toFixed(3))));
}

function lowestBidNear(bids: MarketBid[]): number | null {
  let min: number | null = null;
  for (const bid of bids) {
    const amount = parseNear(bid.amount);
    if (amount == null || amount <= 0) continue;
    min = min == null ? amount : Math.min(min, amount);
  }
  return min;
}

export function decideBidForJob(params: {
  job: MarketJob;
  bids: MarketBid[];
  policy: PolicyConfig;
}): BidDecision {
  const budget = budgetNear(params.job);
  const existingBids = params.bids.length;

  if (budget == null) {
    return {
      jobId: params.job.job_id,
      action: 'skip',
      reason: 'budget_unknown_or_non_near',
      confidence: 0,
    };
  }

  if (budget < params.policy.minBudgetNear || budget > params.policy.maxBudgetNear) {
    return {
      jobId: params.job.job_id,
      action: 'skip',
      reason: 'budget_outside_policy',
      confidence: 0,
    };
  }

  if (existingBids > params.policy.maxExistingBids) {
    return {
      jobId: params.job.job_id,
      action: 'skip',
      reason: 'market_too_competitive',
      confidence: 0,
    };
  }

  const baseBid = budget * (params.policy.bidDiscountBps / 10_000);
  const liveLowest = lowestBidNear(params.bids);

  let nextBid = baseBid;
  if (liveLowest != null && liveLowest > 0) {
    nextBid = liveLowest - 0.0001;
  }

  const upperBound = Math.min(params.policy.maxBidNear, Math.max(0, budget - 0.0001));
  nextBid = Math.max(params.policy.minBidNear, Math.min(upperBound, nextBid));

  if (nextBid <= 0 || !Number.isFinite(nextBid)) {
    return {
      jobId: params.job.job_id,
      action: 'skip',
      reason: 'invalid_bid_after_bounds',
      confidence: 0,
    };
  }

  const expectedMarginNear = budget - nextBid;
  if (expectedMarginNear < params.policy.minMarginNear) {
    return {
      jobId: params.job.job_id,
      action: 'skip',
      reason: 'below_margin_floor',
      confidence: 0,
    };
  }

  const action = normalizeJobType(params.job.job_type) === 'competition' ? 'entry' : 'bid';
  return {
    jobId: params.job.job_id,
    action,
    bidAmountNear: Number(nextBid.toFixed(4)),
    confidence: confidenceScore({ budget, existingBids, policy: params.policy }),
  };
}

export function rankJobsForBidding(params: {
  jobs: MarketJob[];
  bidsByJobId: Record<string, MarketBid[]>;
  policy: PolicyConfig;
}): BidDecision[] {
  const decisions = params.jobs.map(job =>
    decideBidForJob({
      job,
      bids: params.bidsByJobId[job.job_id] ?? [],
      policy: params.policy,
    })
  );

  return decisions.sort((a, b) => {
    if (a.action === 'skip' && b.action !== 'skip') return 1;
    if (a.action !== 'skip' && b.action === 'skip') return -1;
    return b.confidence - a.confidence;
  });
}
