# Production Audit: near-agent-market-autopilot

**Audit Date**: 2026-02-28
**Auditor**: Codex
**Scope**: `sdk/near-agent-market-autopilot`, `skills/near-agent-market-autopilot`, `examples/near-agent-market-autopilot`
**Verdict**: SHIP WITH FIXES

## Executive Summary

The SDK and skill package are functionally complete and now pass a meaningful quality gate (`lint`, `typecheck`, `test`, `build`). Core reliability mechanics are present: fail-closed behavior, durable state markers, retry/backoff orchestration, stale-bid cleanup, deterministic simulation output, and deterministic manifest signing.

During audit, three ship-impacting implementation gaps were found and fixed in this pass: competition entries no longer submit placeholder payloads, state-file persistence is now atomic, and high-latency sequential bid-fetch paths were replaced by bounded concurrency.

Remaining risks are mostly dependency/runtime-level, not core business-logic defects. The package is viable for controlled production rollout with explicit dependency-risk monitoring and runtime environment constraints.

### Findings Count

| Severity | Count | Status |
|----------|-------|--------|
| Critical (P0) | 0 open / 1 fixed | ✅ Fixed in this pass |
| High (P1) | 0 open / 2 fixed | ✅ Fixed in this pass |
| Medium (P2) | 3 | ⚠️ Mitigation required |
| Low (P3) | 1 | 📝 Backlog |

---

## Detailed Findings

### Security

#### Transitive crypto advisory in dependency chain
**Severity**: P2
**Status**: Open
**Location**: `pnpm-lock.yaml` (`near-api-js -> secp256k1 -> elliptic@6.6.1`)
**Description**: `pnpm audit --prod` reports advisory `GHSA-848j-6mx2-7j84` (CVE-2025-14505) through transitive dependency graph.
**Impact**: Potential cryptographic weakness in dependency chain; exploitability depends on actual runtime code-path usage.
**Recommendation**: Track upstream `near-api-js` remediation; pin to patched graph when available; add CI gate that fails on high/critical advisories and reports medium advisories.
**Effort**: Small

---

### Architecture

#### Competition path submitted placeholder entries (fixed)
**Severity**: P0
**Status**: Fixed
**Location**: `sdk/near-agent-market-autopilot/src/autopilot.ts`
**Description**: Competition jobs previously submitted dummy entry payloads during bid phase.
**Impact**: Could publish invalid deliverables and poison competition workflows.
**Fix Applied**: Competition entries now only submit real artifacts from `artifactProvider`, with deterministic manifest-derived hash.
**Effort**: Medium

#### `runTick` orchestration complexity remains high
**Severity**: P2
**Status**: Open
**Location**: `sdk/near-agent-market-autopilot/src/autopilot.ts`
**Description**: `runTick` owns many responsibilities (discovery, bidding, stale-withdraw, submission, settlement).
**Impact**: Slower maintenance velocity and higher regression probability for future changes.
**Recommendation**: Split into dedicated orchestrators (`BidCycle`, `SubmissionCycle`, `SettlementCycle`) with explicit interfaces.
**Effort**: Medium

---

### Performance

#### Sequential per-job bid fetch caused N+1 latency (fixed)
**Severity**: P1
**Status**: Fixed
**Location**: `sdk/near-agent-market-autopilot/src/autopilot.ts`
**Description**: Per-job bid collection was sequential in tick and reconciliation flows.
**Impact**: Tick duration scaled linearly with network latency and job count.
**Fix Applied**: Added bounded concurrency mapper (`mapLimit`, limit=10) for bid fetch fanout.
**Effort**: Small

---

### Resilience

#### Non-atomic state file writes (fixed)
**Severity**: P1
**Status**: Fixed
**Location**: `sdk/near-agent-market-autopilot/src/state/file-store.ts`
**Description**: State store wrote directly to target file.
**Impact**: Crash/power loss during write could corrupt persistent state.
**Fix Applied**: Atomic write path via temp file + rename.
**Effort**: Small

#### SQLite runtime support is environment-dependent
**Severity**: P2
**Status**: Open
**Location**: `sdk/near-agent-market-autopilot/src/state/sqlite-store.ts`
**Description**: SQLite backend depends on `node:sqlite` availability at runtime.
**Impact**: Driver selection can fail in unsupported runtimes, causing startup failure.
**Recommendation**: Add startup capability check to `doctor` command and document required Node runtime version explicitly.
**Effort**: Small

---

### Operational Readiness

#### Metrics server is optional and not auto-wired
**Severity**: P2
**Status**: Open
**Location**: `sdk/near-agent-market-autopilot/src/telemetry/prometheus.ts`
**Description**: Prometheus exporter exists but is not integrated into runtime defaults.
**Impact**: Teams can deploy without metrics visibility unless explicitly configured.
**Recommendation**: Add config-driven metric endpoint wiring in CLI/runtime and publish alert baseline guidance.
**Effort**: Medium

---

### Code Quality

#### Config schema used loose policy typing (fixed)
**Severity**: P3
**Status**: Fixed
**Location**: `sdk/near-agent-market-autopilot/src/cli/config.ts`
**Description**: Policy parsing used permissive record typing.
**Impact**: Weak validation could allow malformed policy structures.
**Fix Applied**: Replaced with explicit partial policy schema.
**Effort**: Small

---

## Action Plan

### Immediate (Before Broad Rollout)
1. Add CI advisory policy: fail on high/critical, report medium with owner.
2. Wire metrics endpoint activation through config and document default dashboard signals.

### Short-term (First Week)
1. Add runtime capability check for `sqlite` mode in `doctor` and startup path.
2. Publish operator runbook for dependency advisory handling and upgrade cadence.

### Medium-term (First Month)
1. Refactor `runTick` into composable cycle-level orchestrators.
2. Add controlled load test harness for 100+ open jobs with latency SLO assertions.

### Backlog
1. Expand docs link checker to optionally validate external links in CI nightly mode.

---

## Verification Checklist

- [x] All P0 findings resolved
- [x] All P1 findings resolved
- [x] Security scan executed (`pnpm audit --prod`)
- [x] Lint/typecheck/test/build all pass
- [ ] Metrics endpoint wired by default runtime config
- [ ] Dependency advisory policy enforced in CI

---

## Appendix

### Files Analyzed

- `sdk/near-agent-market-autopilot/src/**/*`
- `sdk/near-agent-market-autopilot/tests/**/*`
- `sdk/near-agent-market-autopilot/scripts/check-doc-links.mjs`
- `skills/near-agent-market-autopilot/**/*`
- `examples/near-agent-market-autopilot/**/*`

### Tools Used

- `pnpm check`
- `pnpm audit --prod --json`
- `rg`
- targeted source inspection with `sed`

### Test Results

- `6` test files passed
- `15` tests passed
- CI-equivalent local gate passed (`lint`, `typecheck`, `test`, `build`)
