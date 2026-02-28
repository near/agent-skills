import type { MarketBid, MarketJob, SettlementRecord, SettlementReport } from '../types.js';

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function upper(value: unknown): string {
  return typeof value === 'string' ? value.toUpperCase() : '';
}

function resolveAmountNear(params: {
  job: MarketJob;
  jobBids: MarketBid[];
  agentId: string;
}): { amountNear: number | null; bidId?: string } {
  const awardedBidId = typeof params.job.awarded_bid_id === 'string' ? params.job.awarded_bid_id : undefined;

  if (awardedBidId) {
    const awarded = params.jobBids.find(bid => bid.bid_id === awardedBidId);
    const awardedAmount = asNumber(awarded?.amount);
    if (awardedAmount != null && awardedAmount > 0) {
      return { amountNear: awardedAmount, bidId: awarded?.bid_id };
    }
  }

  const own = params.jobBids.find(
    bid => typeof bid.bidder_agent_id === 'string' && bid.bidder_agent_id === params.agentId
  );
  const ownAmount = asNumber(own?.amount);
  if (ownAmount != null && ownAmount > 0) {
    return { amountNear: ownAmount, bidId: own?.bid_id };
  }

  const budgetToken = upper(params.job.budget_token ?? 'NEAR');
  const budgetAmount = asNumber(params.job.budget_amount);
  if (budgetToken === 'NEAR' && budgetAmount != null && budgetAmount > 0) {
    return { amountNear: budgetAmount };
  }

  return { amountNear: null };
}

export function buildSettlementReport(params: {
  jobs: MarketJob[];
  bidsByJobId: Record<string, MarketBid[]>;
  agentId: string;
  nearPriceUsd: number;
}): SettlementReport {
  const records: SettlementRecord[] = [];

  for (const job of params.jobs) {
    if ((job.status ?? '').toLowerCase() !== 'completed') continue;
    const resolved = resolveAmountNear({
      job,
      jobBids: params.bidsByJobId[job.job_id] ?? [],
      agentId: params.agentId,
    });

    if (resolved.amountNear == null || resolved.amountNear <= 0) continue;

    const completedAt =
      typeof job.updated_at === 'string'
        ? new Date(Date.parse(job.updated_at)).toISOString()
        : new Date(0).toISOString();

    records.push({
      settlementId: `${job.job_id}:${resolved.bidId ?? 'unknown'}`,
      jobId: job.job_id,
      jobTitle: job.title,
      bidId: resolved.bidId,
      amountNear: resolved.amountNear,
      amountUsd: resolved.amountNear * params.nearPriceUsd,
      completedAt,
    });
  }

  const totalNear = records.reduce((sum, row) => sum + row.amountNear, 0);
  const totalUsd = records.reduce((sum, row) => sum + row.amountUsd, 0);

  return {
    records,
    totalNear,
    totalUsd,
    scannedJobs: params.jobs.length,
  };
}
