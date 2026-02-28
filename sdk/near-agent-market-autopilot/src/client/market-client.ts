import { URL, URLSearchParams } from 'node:url';

import type {
  CreateBidInput,
  ListJobsParams,
  MarketAssignment,
  MarketBid,
  MarketClientConfig,
  MarketJob,
  PaginationParams,
  SubmitWorkInput,
  TrackedBid,
} from '../types.js';

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toTrackedBid(row: MarketBid): TrackedBid {
  return {
    bidId: row.bid_id,
    jobId: row.job_id ?? '',
    status: normalizeBidStatus(row.status),
    amountNear: asNumber(row.amount),
  };
}

function normalizeBidStatus(value: string | undefined): TrackedBid['status'] {
  const status = (value ?? '').toLowerCase();
  if (
    status === 'pending' ||
    status === 'accepted' ||
    status === 'submitted' ||
    status === 'in_progress' ||
    status === 'withdrawn' ||
    status === 'rejected' ||
    status === 'completed'
  ) {
    return status;
  }
  return 'unknown';
}

export class MarketClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly authHeader: string;
  private readonly timeoutMs: number;
  private readonly attempts: number;
  private readonly backoffMs: number;

  constructor(config: MarketClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.authHeader = (config.authHeader ?? 'authorization').trim();
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.attempts = config.retry?.attempts ?? 3;
    this.backoffMs = config.retry?.backoffMs ?? 400;
  }

  async listJobs(params: ListJobsParams = {}): Promise<MarketJob[]> {
    return this.requestJson<MarketJob[]>(`/v1/jobs${this.query({
      limit: params.limit,
      offset: params.offset,
      status: params.status,
      sort: params.sort,
      order: params.order,
      worker_agent_id: params.workerAgentId,
      job_type: params.jobType,
    })}`);
  }

  async getJob(jobId: string): Promise<MarketJob> {
    return this.requestJson<MarketJob>(`/v1/jobs/${encodeURIComponent(jobId)}`);
  }

  async listJobBids(jobId: string, params: PaginationParams = {}): Promise<MarketBid[]> {
    return this.requestJson<MarketBid[]>(
      `/v1/jobs/${encodeURIComponent(jobId)}/bids${this.query(params)}`
    );
  }

  async listMyBids(params: PaginationParams & { statuses?: string[] } = {}): Promise<TrackedBid[]> {
    const raw = await this.requestJson<MarketBid[]>(`/v1/agents/me/bids${this.query({
      limit: params.limit,
      offset: params.offset,
      status: params.statuses?.join(','),
    })}`);

    return raw
      .map(toTrackedBid)
      .filter((row): row is TrackedBid => row.jobId.length > 0);
  }

  async placeBid(jobId: string, payload: CreateBidInput): Promise<MarketBid> {
    return this.requestJson<MarketBid>(`/v1/jobs/${encodeURIComponent(jobId)}/bids`, {
      method: 'POST',
      body: payload,
    });
  }

  async submitEntry(jobId: string, payload: SubmitWorkInput): Promise<Record<string, unknown>> {
    return this.requestJson<Record<string, unknown>>(`/v1/jobs/${encodeURIComponent(jobId)}/entries`, {
      method: 'POST',
      body: payload,
    });
  }

  async submitWork(jobId: string, payload: SubmitWorkInput): Promise<Record<string, unknown>> {
    return this.requestJson<Record<string, unknown>>(`/v1/jobs/${encodeURIComponent(jobId)}/submit`, {
      method: 'POST',
      body: payload,
    });
  }

  async requestChanges(jobId: string, feedback: string): Promise<Record<string, unknown>> {
    return this.requestJson<Record<string, unknown>>(`/v1/jobs/${encodeURIComponent(jobId)}/request-changes`, {
      method: 'POST',
      body: { feedback },
    });
  }

  async withdrawBid(bidId: string): Promise<Record<string, unknown>> {
    return this.requestJson<Record<string, unknown>>(`/v1/bids/${encodeURIComponent(bidId)}/withdraw`, {
      method: 'POST',
      body: {},
    });
  }

  async listAssignmentsForJob(jobId: string): Promise<MarketAssignment[]> {
    const job = await this.getJob(jobId);
    return Array.isArray(job.my_assignments) ? job.my_assignments : [];
  }

  async listCompletedJobsForWorker(workerAgentId: string, limit = 100): Promise<MarketJob[]> {
    return this.listJobs({
      status: 'completed',
      workerAgentId,
      sort: 'updated_at',
      order: 'desc',
      limit,
    });
  }

  private query(input: Record<string, unknown> | PaginationParams): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(input)) {
      if (value == null) continue;
      if (typeof value === 'string' && value.trim().length === 0) continue;
      query.set(key, String(value));
    }
    const encoded = query.toString();
    return encoded.length > 0 ? `?${encoded}` : '';
  }

  private async requestJson<T>(path: string, opts?: { method?: string; body?: unknown }): Promise<T> {
    const endpoint = new URL(path, `${this.baseUrl}/`).toString();
    let attempt = 0;

    while (attempt < this.attempts) {
      attempt += 1;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(endpoint, {
          method: opts?.method ?? 'GET',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            [this.authHeader]: /^bearer\s+/i.test(this.apiKey) ? this.apiKey : `Bearer ${this.apiKey}`,
          },
          body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
          signal: controller.signal,
        });

        const text = await res.text();
        const payload = text.trim().length > 0 ? JSON.parse(text) : null;

        if (!res.ok) {
          if (res.status >= 500 && attempt < this.attempts) {
            await this.sleep(this.backoffMs * attempt);
            continue;
          }
          throw new Error(`Market API ${res.status}: ${JSON.stringify(payload)}`);
        }

        return payload as T;
      } catch (error) {
        const retriable = error instanceof Error && /abort|timed out|network/i.test(error.message);
        if (retriable && attempt < this.attempts) {
          await this.sleep(this.backoffMs * attempt);
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }

    throw new Error('Exceeded max retries');
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createMarketClient(config: MarketClientConfig): MarketClient {
  return new MarketClient(config);
}
