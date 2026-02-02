---
name: near-smart-contracts
description: NEAR Protocol smart contract development in Rust. Use when writing, reviewing, or deploying NEAR smart contracts. Covers contract structure, state management, cross-contract calls, testing, security, and optimization patterns. Based on near-sdk v5.x with modern macro syntax.
license: MIT
metadata:
  author: near
  version: "1.0.0"
---

# NEAR Smart Contracts Development

Comprehensive guide for developing secure and efficient smart contracts on NEAR Protocol using Rust and the NEAR SDK (v5.x).

## When to Apply

Reference these guidelines when:

- Writing new NEAR smart contracts in Rust
- Reviewing existing contract code for security and optimization
- Implementing cross-contract calls and callbacks
- Managing contract state and storage
- Testing and deploying NEAR contracts
- Optimizing gas usage and performance

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
| --------- | ---------- | -------- | --------- |
| 1 | Security & Safety | CRITICAL | `security-` |
| 2 | Contract Structure | HIGH | `structure-` |
| 3 | State Management | HIGH | `state-` |
| 4 | Cross-Contract Calls | MEDIUM-HIGH | `xcc-` |
| 5 | Gas Optimization | MEDIUM | `gas-` |
| 6 | Testing | MEDIUM | `testing-` |
| 7 | Best Practices | MEDIUM | `best-` |

## Quick Reference

### 1. Security & Safety (CRITICAL)

- `security-storage-checks` - Always validate storage operations and check deposits
- `security-access-control` - Implement proper access control using `predecessor_account_id`
- `security-reentrancy` - Protect against reentrancy attacks (update state before external calls)
- `security-overflow` - Use `overflow-checks = true` in Cargo.toml to prevent overflow
- `security-callback-validation` - Validate callback results and handle failures
- `security-private-callbacks` - Mark callbacks as `#[private]` to prevent external calls
- `security-yoctonear-validation` - Validate attached deposits with `#[payable]` functions
- `security-sybil-resistance` - Implement minimum deposit checks to prevent spam

### 2. Contract Structure (HIGH)

- `structure-near-macro` - Use `#[near(contract_state)]` macro for contract struct (replaces old `#[near_bindgen]`)
- `structure-initialization` - Implement proper initialization with `#[init]` patterns
- `structure-versioning` - Plan for contract upgrades with versioning mechanisms
- `structure-events` - Use `env::log_str()` and structured event logging (NEP-297)
- `structure-standards` - Follow NEAR Enhancement Proposals (NEPs) for standards
- `structure-serializers` - Use `#[near(serializers = [json, borsh])]` for data structs
- `structure-panic-default` - Use `#[derive(PanicOnDefault)]` to require initialization

### 3. State Management (HIGH)

- `state-collections` - Use SDK collections from `near_sdk::store`: `IterableMap`, `IterableSet`, `Vector`, `LookupMap`, `LookupSet`, `UnorderedMap`, `UnorderedSet`, `TreeMap`
- `state-serialization` - Use Borsh for state, JSON for external interfaces
- `state-lazy-loading` - Use SDK collections for lazy loading to save gas (loaded on-demand, not all at once)
- `state-pagination` - Implement pagination with `.skip()` and `.take()` for large datasets
- `state-migration` - Plan state migration strategies using versioning
- `state-storage-cost` - Remember: 1 NEAR ≈ 100kb storage, contracts pay for their storage
- `state-unique-prefixes` - Use unique byte prefixes for all collections (avoid collisions)
- `state-native-vs-sdk` - Native collections (Vec, HashMap) load all data; use only for <100 entries

### 4. Cross-Contract Calls (MEDIUM-HIGH)

- `xcc-promise-chaining` - Chain promises correctly
- `xcc-callback-handling` - Handle all callback scenarios (success, failure)
- `xcc-gas-management` - Allocate appropriate gas for cross-contract calls
- `xcc-error-handling` - Implement robust error handling
- `xcc-result-unwrap` - Never unwrap promise results without checks

### 5. Gas Optimization (MEDIUM)

- `gas-batch-operations` - Batch operations to reduce transaction costs
- `gas-minimal-state-reads` - Minimize state reads and writes (cache in memory)
- `gas-efficient-collections` - Choose appropriate collection types (LookupMap vs IterableMap)
- `gas-view-functions` - Mark read-only functions as view (`&self` in Rust)
- `gas-avoid-cloning` - Avoid unnecessary cloning of large data structures
- `gas-early-validation` - Use `require!` early to save gas on invalid inputs
- `gas-prepaid-gas` - Attach appropriate gas for cross-contract calls (recommended: 30 TGas)

### 6. Testing (MEDIUM)

- `testing-unit-tests` - Write comprehensive unit tests with mock contexts
- `testing-integration-tests` - Use `near-sandbox` + `near-api` for integration tests
- `testing-sandbox` - Test with local sandbox environment before testnet/mainnet
- `testing-edge-cases` - Test boundary conditions, overflow, and empty states
- `testing-gas-profiling` - Profile gas usage in integration tests
- `testing-cross-contract` - Test cross-contract calls and callbacks thoroughly
- `testing-failure-scenarios` - Test promise failures and timeout scenarios
- `testing-time-travel` - Use `sandbox.fast_forward()` for time-sensitive tests

### 7. Best Practices (MEDIUM)

- `best-panic-messages` - Provide clear, actionable panic messages
- `best-logging` - Use `env::log_str()` for debugging and event emission
- `best-documentation` - Document public methods, parameters, and complex logic
- `best-error-types` - Define custom error types or use descriptive strings
- `best-constants` - Use constants for magic numbers and configuration
- `best-require-macro` - Use `require!` instead of `assert!` for better error messages
- `best-promise-return` - Return promises from cross-contract calls for proper tracking
- `best-sdk-crates` - Reuse SDK-exported crates (borsh, serde, base64, etc.)

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/security-storage-checks.md
rules/structure-near-bindgen.md
rules/state-collections.md
rules/xcc-promise-chaining.md
rules/testing-integration-tests.md
```

Each rule file contains:
- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and NEAR-specific considerations

## Latest Tools & Versions (2025)

### Development Tools
- **cargo-near**: Latest - Build, deploy, and manage contracts (`cargo near build`, `cargo near deploy`)
- **near-cli-rs**: Latest - Command-line interface for NEAR (`near contract call`, `near contract view`)
- **rustc**: v1.86.0+ - Rust compiler
- **near-sandbox**: Latest - Local sandbox environment for integration testing
- **near-api**: Latest - Rust API client for interacting with NEAR (used with near-sandbox for tests)

### SDK Versions
- **near-sdk-rs**: v5.x - Latest Rust SDK with improved macros

### Key Features
- **Unified macro syntax**: `#[near(contract_state)]` replaces `#[near_bindgen]` + derives
- **Flexible serialization**: `#[near(serializers = [json, borsh])]` for data structs
- **Store collections**: `near_sdk::store::IterableMap`, `IterableSet`, `LookupMap`, `LookupSet`, `Vector`, `UnorderedMap`, `UnorderedSet`, `TreeMap`
- **Simplified cross-contract calls**: High-level promise API with `Promise::new()` and `.then()`
- **Built-in NEP support**: FT (NEP-141), NFT (NEP-171), and other standards
- **Yield/Resume**: Contracts can yield execution and wait for external services to resume

## Common Patterns

### Contract Template
```rust
use near_sdk::{near, env, require, AccountId, PanicOnDefault, NearToken};
use near_sdk::store::IterableMap;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    owner: AccountId,
    data: IterableMap<AccountId, String>,
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self {
            owner,
            data: IterableMap::new(b"d"),
        }
    }

    /// View function (free to call, no gas cost for caller)
    pub fn get_owner(&self) -> &AccountId {
        &self.owner
    }

    /// Change method that requires payment
    #[payable]
    pub fn do_something(&mut self, param: String) -> String {
        require!(
            env::predecessor_account_id() == self.owner,
            "Only owner can call this method"
        );
        // Log actions for debugging and events
        env::log_str(&format!("Processing: {}", param));
        param
    }
}
```

## Essential Links

- [NEAR Documentation](https://docs.near.org)
- [Smart Contract Quickstart](https://docs.near.org/smart-contracts/quickstart)
- [Contract Anatomy](https://docs.near.org/smart-contracts/anatomy/)
- [SDK Collections](https://docs.near.org/smart-contracts/anatomy/collections)
- [Best Practices](https://docs.near.org/smart-contracts/anatomy/best-practices)
- [Security Guidelines](https://docs.near.org/smart-contracts/security/welcome)
- [Integration Testing](https://docs.near.org/smart-contracts/testing/integration-test)
- [SDK Rust Reference](https://docs.rs/near-sdk)
- [NEAR Examples](https://github.com/near-examples)

## Resources

- NEAR Documentation: https://docs.near.org
- NEAR SDK Rust: https://docs.near.org/tools/sdk
- Storage & Collections: https://docs.near.org/smart-contracts/anatomy/collections
- Cross-Contract Calls: https://docs.near.org/smart-contracts/anatomy/crosscontract
- Yield & Resume: https://docs.near.org/smart-contracts/anatomy/yield-resume
- NEAR Examples: https://github.com/near-examples
- NEAR Standards (NEPs): https://github.com/near/NEPs
- Security Best Practices: https://docs.near.org/smart-contracts/security/welcome
- Sandbox Testing: https://github.com/near/near-sandbox
- NEAR API Rust: https://github.com/near/near-api-rs

## SDK Collections Reference

| Collection | Iterable | Clear | Ordered | Range | Use Case |
|------------|----------|-------|---------|-------|----------|
| `Vector` | ✅ | ✅ | ✅ | ✅ | Ordered list with index access |
| `LookupMap` | ❌ | ❌ | ❌ | ❌ | Fast key-value, no iteration needed |
| `LookupSet` | ❌ | ❌ | ❌ | ❌ | Fast membership checks |
| `IterableMap` | ✅ | ✅ | ✅ | ❌ | Key-value with iteration |
| `IterableSet` | ✅ | ✅ | ✅ | ❌ | Set with iteration |
| `UnorderedMap` | ✅ | ✅ | ❌ | ❌ | Key-value, unordered iteration |
| `UnorderedSet` | ✅ | ✅ | ❌ | ❌ | Set, unordered iteration |
| `TreeMap` | ✅ | ✅ | ✅ | ✅ | Sorted key-value with range queries |

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
