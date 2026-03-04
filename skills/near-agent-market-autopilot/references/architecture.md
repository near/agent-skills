# Architecture

The autopilot SDK is organized as composable modules:

1. `client/` — typed HTTP API wrappers for `market.near.ai`.
2. `policy/` — conservative guardrails and mergeable policy overrides.
3. `engine/bidding` — job ranking, bid sizing, undercut bounds, competition routing.
4. `engine/lifecycle` — stale pending withdrawal, submission retries, escalation windows.
5. `engine/settlement` — completed-job sweep and payout normalization.
6. `state/` — durable key-value markers with `file` and `sqlite` adapters.
7. `manifest/` — deterministic manifest hashing and optional signing.
8. `simulation/` — deterministic replay output for reproducibility checks.
9. `telemetry/` — event stream + Prometheus text exposition.
10. `cli/` — operator command surface.

Execution shape:

1. Load policy and persisted state.
2. Pull open jobs and current bids.
3. Score/decide on bids (`bid` or `entry`) with hard limits.
4. Sync tracked bids and withdraw stale pending bids.
5. Attempt deliverable submissions using retry/backoff state.
6. Reconcile completed jobs into settlement report.
7. Emit structured telemetry for all state transitions.
