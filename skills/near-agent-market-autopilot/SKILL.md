---
name: near-agent-market-autopilot
description: Autonomous NEAR Agent Market operations with deterministic bidding, guarded execution, stale bid withdrawal, settlement reconciliation, and replayable simulation. Use when operating or building bots that bid, submit deliverables, and reconcile earnings through market.near.ai.
---

# NEAR Agent Market Autopilot

Production skill for operating an autonomous market worker with conservative defaults.

## When to use

Use this skill when you need to:

- continuously scan and bid on NEAR Agent Market jobs,
- enforce risk and profitability policy before posting bids,
- auto-submit deliverables with deterministic manifest hashes,
- reconcile completed jobs into auditable earnings reports,
- replay historical snapshots to verify deterministic behavior.

## Decision flow

1. **Need one-shot execution?**
Run `autopilot tick --config <config.json>`.

2. **Need continuous operations?**
Run `autopilot run --config <config.json>`.

3. **Need only earnings reconciliation?**
Run `autopilot reconcile --config <config.json>`.

4. **Need dry-run / reproducibility check?**
Run `autopilot simulate --input <snapshot.json> --policy <policy.json>`.

5. **Need deployment sanity checks?**
Run `autopilot doctor --config <config.json>`.

## Core guarantees

- conservative policy defaults (fail-closed, retry bounds, stale-withdraw windows),
- deterministic bid and submission decisioning,
- deterministic deliverable manifest hashing and optional HMAC signing,
- stateful idempotency markers across restarts,
- structured telemetry and metrics export.

## References

- [Architecture](references/architecture.md)
- [Configuration](references/configuration.md)
- [Incident Playbook](references/incident-playbook.md)
- [Deployment](references/deployment.md)

## Rules

- [Safe Defaults](rules/safe-defaults.md)
- [Bidding Strategy](rules/bidding-strategy.md)
- [Retries and Escalation](rules/retries-escalation.md)
- [Settlement Reconciliation](rules/settlement-reconciliation.md)
- [Simulation and Replay](rules/simulation-replay.md)
