export type JobType = 'standard' | 'competition';

export type JobStatus =
  | 'open'
  | 'filling'
  | 'in_progress'
  | 'submitted'
  | 'judging'
  | 'completed'
  | 'closed'
  | 'expired'
  | 'unknown';

export type BidStatus =
  | 'pending'
  | 'accepted'
  | 'submitted'
  | 'in_progress'
  | 'withdrawn'
  | 'rejected'
  | 'completed'
  | 'unknown';

export type AssignmentStatus =
  | 'in_progress'
  | 'submitted'
  | 'accepted'
  | 'disputed'
  | 'cancelled'
  | 'unknown';

export interface MarketClientConfig {
  baseUrl: string;
  apiKey: string;
  authHeader?: string;
  timeoutMs?: number;
  retry?: {
    attempts: number;
    backoffMs: number;
  };
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface ListJobsParams extends PaginationParams {
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  workerAgentId?: string;
  jobType?: JobType;
}

export interface MarketJob {
  job_id: string;
  title: string;
  description?: string;
  status?: string;
  job_type?: JobType;
  budget_amount?: string | number | null;
  budget_token?: string | null;
  bid_count?: number;
  awarded_bid_id?: string | null;
  worker_agent_id?: string | null;
  updated_at?: string;
  created_at?: string;
  expires_at?: string | null;
  my_assignments?: MarketAssignment[];
  [key: string]: unknown;
}

export interface MarketBid {
  bid_id: string;
  job_id?: string;
  status?: string;
  bidder_agent_id?: string;
  amount?: string | number | null;
  eta_seconds?: number | null;
  proposal?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface MarketAssignment {
  assignment_id: string;
  status?: string;
  deliverable?: string | null;
  deliverable_hash?: string | null;
  submitted_at?: string | null;
  escrow_amount?: string | number | null;
  [key: string]: unknown;
}

export interface CreateBidInput {
  amount: string;
  eta_seconds: number;
  proposal: string;
}

export interface SubmitWorkInput {
  deliverable: string;
  deliverable_hash: string;
}

export interface PolicyConfig {
  minBudgetNear: number;
  maxBudgetNear: number;
  bidDiscountBps: number;
  minBidNear: number;
  maxBidNear: number;
  maxExistingBids: number;
  minMarginNear: number;
  stalePendingBidMinutes: number;
  submitRetryLimit: number;
  submitRetryBackoffMinutes: number;
  submitRetryMaxBackoffMinutes: number;
  submitEscalateAfterMinutes: number;
  submitEscalationLimit: number;
  failClosed: boolean;
}

export interface BidDecision {
  jobId: string;
  action: 'skip' | 'bid' | 'entry';
  reason?: string;
  bidAmountNear?: number;
  confidence: number;
}

export interface ExecutionDecision {
  jobId: string;
  bidId: string;
  assignmentId: string;
  action: 'skip' | 'submit';
  reason?: string;
  nextAttemptAt?: string;
}

export interface SettlementRecord {
  settlementId: string;
  jobId: string;
  jobTitle: string;
  bidId?: string;
  amountNear: number;
  amountUsd: number;
  completedAt: string;
}

export interface SettlementReport {
  records: SettlementRecord[];
  totalNear: number;
  totalUsd: number;
  scannedJobs: number;
}

export interface TrackedBid {
  bidId: string;
  jobId: string;
  status: BidStatus;
  amountNear: number | null;
}

export interface SubmitAttemptState {
  attempts: number;
  firstSeenAt: string;
  nextAttemptAt?: string;
  escalations: number;
  submittedAt?: string;
}

export interface ArtifactPayload {
  deliverableUrl: string;
  artifactHash: string;
  metadata?: Record<string, unknown>;
}

export interface ManifestSignature {
  algorithm: 'hmac-sha256';
  signerId: string;
  signatureHex: string;
}

export interface DeliverableManifest {
  jobId: string;
  assignmentId: string;
  bidId: string;
  agentId: string;
  deliverableUrl: string;
  artifactHash: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface SignedDeliverableManifest {
  manifest: DeliverableManifest;
  manifestHash: string;
  signature: ManifestSignature;
}

export interface TelemetryEvent {
  at: string;
  type:
    | 'bid_decision'
    | 'bid_submitted'
    | 'bid_withdrawn'
    | 'submit_attempt'
    | 'submit_success'
    | 'submit_failure'
    | 'settlement_reconciled'
    | 'tick_error'
    | 'tick_completed';
  payload: Record<string, unknown>;
}

export interface TickResult {
  tickId: string;
  startedAt: string;
  completedAt: string;
  bidDecisions: BidDecision[];
  executionDecisions: ExecutionDecision[];
  settlements: SettlementReport;
  errors: string[];
  halted: boolean;
}

export interface LoopOptions {
  intervalMs?: number;
  maxTicks?: number;
  onTick?: (result: TickResult) => void | Promise<void>;
}

export interface ReconcileOptions {
  limit?: number;
  nearPriceUsd?: number;
}

export interface StateDriverConfig {
  driver: 'file' | 'sqlite';
  path: string;
}

export interface AutopilotConfig {
  agentId: string;
  market: MarketClientConfig;
  policy?: Partial<PolicyConfig>;
  state: StateDriverConfig;
  nearPriceUsd?: number;
  submitSigningKey?: string;
  submitSignerId?: string;
  artifactProvider?: (input: {
    job: MarketJob;
    bid: TrackedBid;
    assignment: MarketAssignment;
  }) => Promise<ArtifactPayload | null>;
}

export interface SimulationInput {
  nowIso: string;
  jobs: MarketJob[];
  bidsByJobId: Record<string, MarketBid[]>;
  trackedBids: TrackedBid[];
  submitStateByKey?: Record<string, SubmitAttemptState>;
  policy?: Partial<PolicyConfig>;
}

export interface SimulationOutput {
  bidDecisions: BidDecision[];
  withdrawBidIds: string[];
  submitDecisions: ExecutionDecision[];
  deterministicDigest: string;
}

export interface StateStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  del(key: string): Promise<void>;
  keys(prefix: string): Promise<string[]>;
}
