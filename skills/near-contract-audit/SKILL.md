---
name: near-contract-audit
description: Comprehensive security audit skill for NEAR Protocol smart contracts written in Rust. Use when auditing NEAR contracts, reviewing security vulnerabilities, checking NEP compliance (NEP-141 FT, NEP-145 Storage, NEP-171/178 NFT), or analyzing contract code for issues like reentrancy, unhandled promises, unsafe math, access control flaws, and callback security. Supports both automated static analysis tools and manual review methodology.
---

# NEAR Contract Audit

Security audit skill for NEAR smart contracts in Rust. Combines automated static analysis with manual review methodology.

## Audit Workflow

### Phase 1: Automated Analysis

Run your preferred Rust static analysis and NEAR-focused security tools on the contract to:

- Scan for common vulnerability patterns (reentrancy, unsafe math, unhandled promises, access control issues, etc.)
- Check NEP interface coverage and invariants (NEP-141, NEP-145, NEP-171/178)
- Highlight potentially risky patterns for deeper manual review

### Phase 2: Manual Review

After automated analysis, perform manual review for:

- Business logic vulnerabilities
- Access control patterns
- Economic attack vectors
- Cross-contract interaction safety

See [manual-review.md](references/manual-review.md) for complete checklist.

### Phase 3: Code-Specific Analysis

For each finding, verify:

1. Is it a true positive?
2. What is the exploitability?
3. What is the recommended fix?

### Phase 4: Report Generation

Document findings with severity, location, description, and remediation.

## Vulnerability Quick Reference

| Severity   | Detector ID             | Description                                |
| ---------- | ----------------------- | ------------------------------------------ |
| **High**   | `unhandled-promise`     | Promise results not handled by callback    |
| **High**   | `non-private-callback`  | Callback missing `#[private]` macro        |
| **High**   | `reentrancy`            | State change after cross-contract call     |
| **High**   | `unsafe-math`           | Arithmetic without overflow checks         |
| **High**   | `self-transfer`         | Missing sender ≠ receiver validation       |
| **High**   | `incorrect-json-type`   | Using i64/u64/i128/u128 in JSON interfaces |
| **High**   | `unsaved-changes`       | Collection modifications not persisted     |
| **High**   | `nft-approval-check`    | Missing approval_id in NFT transfer        |
| **High**   | `nft-owner-check`       | Missing owner check in approve/revoke      |
| **Medium** | `div-before-mul`        | Precision loss from operation order        |
| **Medium** | `round`                 | Ambiguous rounding direction               |
| **Medium** | `lock-callback`         | Panic in callback can lock contract        |
| **Medium** | `yocto-attach`          | Missing `assert_one_yocto` for 2FA         |
| **Medium** | `dup-collection-id`     | Duplicate IDs in collections               |
| **Medium** | `unregistered-receiver` | No panic on unregistered receivers         |
| **Medium** | `nep*-interface`        | Missing NEP interface methods              |
| **Low**    | `prepaid-gas`           | Missing gas check in ft_transfer_call      |
| **Low**    | `non-callback-private`  | `#[private]` on non-callback function      |
| **Low**    | `unused-ret`            | Unchecked function return values           |
| **Low**    | `upgrade-func`          | Missing upgrade functionality              |
| **Low**    | `tautology`             | Tautological conditions                    |
| **Low**    | `storage-gas`           | Missing storage expansion checks           |
| **Low**    | `unclaimed-storage-fee` | Missing balance check before unregister    |
| **Info**   | `timestamp`             | Block timestamp usage (manipulation risk)  |
| **Info**   | `complex-loop`          | Loops that may cause DoS                   |
| **Info**   | `ext-call`              | Cross-contract invocations                 |
| **Info**   | `transfer`              | Token transfer actions                     |
| **Info**   | `public-interface`      | All public entry points                    |

## Reference Files

For detailed vulnerability documentation with code examples:

- [high-severity.md](references/high-severity.md) - Critical vulnerabilities (9 detectors)
- [medium-severity.md](references/medium-severity.md) - Medium vulnerabilities (7 detectors)
- [low-info-severity.md](references/low-info-severity.md) - Low/informational findings
- [nep-standards.md](references/nep-standards.md) - NEP compliance checks
- [manual-review.md](references/manual-review.md) - Manual audit checklist

## Common Patterns

### Secure Callback Pattern

```rust
#[private]  // Required for callbacks
pub fn on_transfer_complete(&mut self, amount: U128) {
    match env::promise_result(0) {
        PromiseResult::Successful(_) => { /* success logic */ }
        PromiseResult::Failed => {
            // Restore state on failure
            self.balance += amount.0;
        }
        PromiseResult::NotReady => unreachable!(),
    }
}
```

### Secure State Update Pattern (Anti-Reentrancy)

```rust
pub fn withdraw(&mut self, amount: U128) -> Promise {
    let amount = amount.0;
    assert!(self.balance >= amount, "Insufficient balance");

    // Update state BEFORE external call
    self.balance -= amount;

    ext_token::ft_transfer(receiver, amount.into())
        .then(ext_self::on_withdraw(amount.into()))
}
```

### Safe Math Pattern

```toml
# Cargo.toml - Enable overflow checks
[profile.release]
overflow-checks = true
```
