export { Autopilot, createAutopilot } from './autopilot.js';
export { MarketClient, createMarketClient } from './client/market-client.js';
export { simulateTick } from './simulation/simulate.js';
export { resolvePolicyConfig, DEFAULT_POLICY } from './policy/defaults.js';
export { signDeliverableManifest, verifyDeliverableManifestSignature } from './manifest/manifest.js';
export { createTelemetryBus, TelemetryBus } from './telemetry/telemetry.js';
export { startPrometheusServer } from './telemetry/prometheus.js';

export type {
  AutopilotConfig,
  PolicyConfig,
  BidDecision,
  ExecutionDecision,
  SettlementRecord,
  TrackedBid,
  SubmitAttemptState,
  TelemetryEvent,
  TickResult,
  SimulationInput,
  SimulationOutput,
  LoopOptions,
  ReconcileOptions,
  SettlementReport,
  MarketClientConfig,
  MarketJob,
  MarketBid,
  MarketAssignment,
  StateStore,
} from './types.js';
