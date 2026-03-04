# Simulation and Replay

1. Snapshot input must include jobs, bids-by-job, tracked bids, and policy overrides.
2. Run `autopilot simulate` before policy changes.
3. Compare `deterministicDigest` across runs to detect non-deterministic behavior.
4. Use replay output to validate that safety guardrails trigger as expected.
