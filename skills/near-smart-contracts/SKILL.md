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

## Getting Started

### Prerequisites

Install the required tools before starting development:

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add wasm32 target for compiling contracts
rustup target add wasm32-unknown-unknown

# Install cargo-near (build, deploy, and manage contracts)
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/cargo-near/releases/latest/download/cargo-near-installer.sh | sh

# Install near-cli-rs (interact with NEAR network)
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/near-cli-rs/releases/latest/download/near-cli-rs-installer.sh | sh
```

### Create a New Project

> **CRITICAL**: ALWAYS run `cargo near new` to create new projects. NEVER manually create Cargo.toml, lib.rs, or any project files. The command generates all required files with correct configurations.

```bash
# REQUIRED: Create a new contract project using the official template
cargo near new my-contract

# Navigate to project directory
cd my-contract

# Build the contract
cargo near build

# Run tests
cargo test
```

**Why `cargo near new` is mandatory:**
- Generates correct `Cargo.toml` with proper dependencies and build settings
- Creates proper project structure with `src/lib.rs` template
- Includes integration test setup in `tests/` directory
- Configures release profile with `overflow-checks = true`
- Sets up correct crate-type for WASM compilation
- Avoids common configuration mistakes that cause build failures

**DO NOT:**
- ❌ Manually create `Cargo.toml`
- ❌ Manually create `src/lib.rs`
- ❌ Copy-paste project structure from examples
- ❌ Skip this step and create files directly

### Project Structure

```
my-contract/
├── Cargo.toml          # Dependencies and project config
├── src/
│   └── lib.rs          # Main contract code
├── tests/              # Integration tests
│   └── test_basics.rs
└── README.md
```

### Deploy to Testnet

```bash
# Create a testnet account (if needed)
near account create-account sponsor-by-faucet-service my-contract.testnet autogenerate-new-keypair save-to-keychain network-config testnet create

# Build in release mode
cargo near build --release

# Deploy to testnet
cargo near deploy my-contract.testnet without-init-call network-config testnet sign-with-keychain send
```

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
| --------- | ---------- | -------- | --------- |
| 1 | Security & Safety | CRITICAL | `security-` |
| 2 | Contract Structure | HIGH | `structure-` |
| 3 | State Management | HIGH | `state-` |
| 4 | Cross-Contract Calls | MEDIUM-HIGH | `xcc-` |
| 5 | Contract Upgrades | MEDIUM-HIGH | `upgrade-` |
| 6 | Chain Signatures | MEDIUM-HIGH | `chainsig-` |
| 7 | Gas Optimization | MEDIUM | `gas-` |
| 8 | Yield & Resume | MEDIUM | `yield-` |
| 9 | Testing | MEDIUM | `testing-` |
| 10 | Best Practices | MEDIUM | `best-` |

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

### 5. Contract Upgrades & Migration (MEDIUM-HIGH)

- `upgrade-versioned-state` - Use enums for state versioning to simplify future migrations
- `upgrade-migration-method` - Implement `migrate` method with `#[init(ignore_state)]` for state changes
- `upgrade-self-update` - Pattern for contracts that can update themselves programmatically
- `upgrade-cleanup-old-state` - Always remove old state structures to free storage
- `upgrade-dao-controlled` - Use multisig or DAO for production upgrade governance

### 6. Chain Signatures (MEDIUM-HIGH)

- `chainsig-derivation-paths` - Derive foreign blockchain addresses from NEAR accounts
- `chainsig-mpc-signing` - Request signatures from MPC contract (`v1.signer`)
- `chainsig-multichain-tx` - Build transactions for Bitcoin, Ethereum, Solana using `omni-transaction-rs`
- `chainsig-callback-handling` - Handle MPC signature callbacks properly
- `chainsig-gas-allocation` - Allocate sufficient gas for MPC calls (yield/resume pattern)

### 7. Gas Optimization (MEDIUM)

- `gas-batch-operations` - Batch operations to reduce transaction costs
- `gas-minimal-state-reads` - Minimize state reads and writes (cache in memory)
- `gas-efficient-collections` - Choose appropriate collection types (LookupMap vs IterableMap)
- `gas-view-functions` - Mark read-only functions as view (`&self` in Rust)
- `gas-avoid-cloning` - Avoid unnecessary cloning of large data structures
- `gas-early-validation` - Use `require!` early to save gas on invalid inputs
- `gas-prepaid-gas` - Attach appropriate gas for cross-contract calls (recommended: 30 TGas)

### 8. Yield & Resume (MEDIUM)

- `yield-create-promise` - Create yielded promises with `env::promise_yield_create` for external service responses
- `yield-resume-signal` - Signal resume with `env::promise_yield_resume` when external data is ready
- `yield-timeout-handling` - Handle 200 block (~2 min) timeout gracefully without panicking
- `yield-state-management` - Manage state carefully between yield and resume (revert on timeout/failure)
- `yield-gatekeeping` - Protect resume methods from unauthorized callers

### 9. Testing (MEDIUM)

- `testing-unit-tests` - Write comprehensive unit tests with mock contexts
- `testing-integration-tests` - Use `near-sandbox` + `near-api` for integration tests
- `testing-sandbox` - Test with local sandbox environment before testnet/mainnet
- `testing-edge-cases` - Test boundary conditions, overflow, and empty states
- `testing-gas-profiling` - Profile gas usage in integration tests
- `testing-cross-contract` - Test cross-contract calls and callbacks thoroughly
- `testing-failure-scenarios` - Test promise failures and timeout scenarios
- `testing-time-travel` - Use `sandbox.fast_forward()` for time-sensitive tests

### 10. Best Practices (MEDIUM)

- `best-panic-messages` - Provide clear, actionable panic messages
- `best-logging` - Use `env::log_str()` for debugging and event emission
- `best-nep297-events` - Use structured NEP-297 event format for indexers
- `best-documentation` - Document public methods, parameters, and complex logic
- `best-error-types` - Define custom error types or use descriptive strings
- `best-constants` - Use constants for magic numbers and configuration
- `best-require-macro` - Use `require!` instead of `assert!` for better error messages
- `best-promise-return` - Return promises from cross-contract calls for proper tracking
- `best-sdk-crates` - Reuse SDK-exported crates (borsh, serde, base64, etc.)
- `best-account-id-encoding` - Encode AccountIds in base32 for 40% storage savings
- `best-contract-tools` - Use `near-sdk-contract-tools` for NEP standards (FT, NFT, etc.)

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/security-storage-checks.md
rules/structure-near-bindgen.md
rules/state-collections.md
rules/xcc-promise-chaining.md
rules/upgrade-migration.md
rules/chain-signatures.md
rules/yield-resume.md
rules/best-nep297-events.md
rules/best-contract-tools.md
rules/testing-integration-tests.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and NEAR-specific considerations

## Latest Tools & Versions (2025-2026)

### Development Tools

- **cargo-near**: Latest - Build, deploy, and manage contracts (`cargo near build`, `cargo near deploy`)
- **near-cli-rs**: Latest - Command-line interface for NEAR (`near contract call`, `near contract view`)
- **rustc**: v1.86.0+ - Rust compiler
- **near-sandbox**: Latest - Local sandbox environment for integration testing
- **near-api-rs**: Latest - Rust API client for interacting with NEAR (replaces near-workspaces-rs for tests)
- **omni-transaction-rs**: Latest - Build transactions for multiple blockchains (Bitcoin, Ethereum, etc.)

### SDK Versions

- **near-sdk-rs**: v5.x (v6.x coming with structured errors support)
- **near-sdk-contract-tools**: Latest - Derive macros for NEP standards (FT, NFT, Storage Management)

### Key Features

- **Unified macro syntax**: `#[near(contract_state)]` replaces `#[near_bindgen]` + derives
- **Flexible serialization**: `#[near(serializers = [json, borsh])]` for data structs
- **Store collections**: `near_sdk::store::IterableMap`, `IterableSet`, `LookupMap`, `LookupSet`, `Vector`, `UnorderedMap`, `UnorderedSet`, `TreeMap`
- **Simplified cross-contract calls**: High-level promise API with `Promise::new()` and `.then()`
- **Built-in NEP support**: FT (NEP-141), NFT (NEP-171), and other standards
- **Yield/Resume**: Contracts can yield execution and wait for external services to resume
- **Chain Signatures**: Sign transactions for other blockchains (Bitcoin, Ethereum, Solana, etc.)
- **Contract Tools**: Derive macros for Owner, Pause, Role-based access control patterns

## Common Patterns

### NEP-297 Structured Events

```rust
use near_sdk::{env, log};

// Standard NEP-297 event format for indexers
fn emit_event(standard: &str, version: &str, event: &str, data: &str) {
    log!(
        r#"EVENT_JSON:{{"standard":"{}","version":"{}","event":"{}","data":[{}]}}"#,
        standard, version, event, data
    );
}

// Example: NFT mint event
fn emit_nft_mint(owner_id: &AccountId, token_ids: &[String]) {
    let tokens = token_ids.iter()
        .map(|id| format!(r#""{}""#, id))
        .collect::<Vec<_>>()
        .join(",");
    emit_event(
        "nep171",
        "1.0.0",
        "nft_mint",
        &format!(r#"{{"owner_id":"{}","token_ids":[{}]}}"#, owner_id, tokens)
    );
}
```

### Contract Upgrade with Migration

```rust
use near_sdk::{near, env, AccountId, PanicOnDefault};
use near_sdk::borsh::{BorshDeserialize, BorshSerialize};

// Old state structure
#[derive(BorshDeserialize)]
pub struct OldContract {
    owner: AccountId,
    data: Vec<String>,
}

// New state structure
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    owner: AccountId,
    data: Vec<String>,
    version: u32,  // New field
}

#[near]
impl Contract {
    /// Migrate from old state to new state
    /// Call this immediately after deploying the new contract code
    #[init(ignore_state)]
    #[private]
    pub fn migrate() -> Self {
        let old_state: OldContract = env::state_read().expect("Failed to read old state");

        Self {
            owner: old_state.owner,
            data: old_state.data,
            version: 1,  // Initialize new field
        }
    }

    /// Self-update: deploy new code to this contract
    #[private]
    pub fn update_contract(&self) -> Promise {
        let code = env::input().expect("No code provided");
        Promise::new(env::current_account_id())
            .deploy_contract(code)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_tgas(5))
                    .migrate()
            )
    }
}
```

### Chain Signatures Pattern

```rust
use near_sdk::{near, env, AccountId, Promise, Gas, NearToken};
use near_sdk::serde_json::json;

const MPC_CONTRACT: &str = "v1.signer";  // mainnet
// const MPC_CONTRACT: &str = "v1.signer-prod.testnet";  // testnet

#[near]
impl Contract {
    /// Request MPC signature for a foreign blockchain transaction
    pub fn sign_foreign_tx(&self, payload: Vec<u8>, path: String) -> Promise {
        let args = json!({
            "request": {
                "payload": payload,
                "path": path,
                "key_version": 0
            }
        }).to_string().into_bytes();

        Promise::new(MPC_CONTRACT.parse().unwrap())
            .function_call(
                "sign".to_string(),
                args,
                NearToken::from_yoctonear(1),  // 1 yoctoNEAR deposit
                Gas::from_tgas(250)  // MPC needs significant gas
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_tgas(10))
                    .on_signature_received()
            )
    }

    #[private]
    pub fn on_signature_received(&self) -> Option<Vec<u8>> {
        match env::promise_result(0) {
            PromiseResult::Successful(data) => Some(data),
            _ => {
                env::log_str("MPC signature failed");
                None
            }
        }
    }
}
```

### Yield & Resume Pattern

```rust
use near_sdk::{near, env, AccountId, Promise, PromiseResult};
use near_sdk::store::LookupMap;

#[near(contract_state)]
pub struct Contract {
    pending_requests: LookupMap<u64, RequestData>,
    next_request_id: u64,
}

#[near(serializers = [borsh, json])]
pub struct RequestData {
    requester: AccountId,
    prompt: String,
}

#[near]
impl Contract {
    /// Create a yielded promise that waits for external response
    pub fn request_external_data(&mut self, prompt: String) -> Promise {
        let request_id = self.next_request_id;
        self.next_request_id += 1;

        // Store request data
        self.pending_requests.insert(request_id, RequestData {
            requester: env::predecessor_account_id(),
            prompt,
        });

        // Create yielded promise - execution pauses here
        let yield_promise = env::promise_yield_create(
            "on_external_response",
            &serde_json::to_vec(&json!({"request_id": request_id})).unwrap(),
            Gas::from_tgas(20),
            GasWeight(1),
            env::register_len(YIELD_REGISTER).unwrap(),
        );

        yield_promise
    }

    /// External service calls this to resume execution
    /// IMPORTANT: Add proper access control in production!
    pub fn respond(&mut self, request_id: u64, response: String) -> bool {
        let data = serde_json::to_vec(&json!({"response": response})).unwrap();
        env::promise_yield_resume(&self.get_yield_id(request_id), &data)
    }

    /// Called when promise resumes (or times out after ~200 blocks)
    #[private]
    pub fn on_external_response(&mut self, request_id: u64, response: Option<String>) -> String {
        // Clean up stored request
        self.pending_requests.remove(&request_id);

        match response {
            Some(data) => data,
            None => {
                // Timeout occurred - handle gracefully, don't panic!
                "Request timed out".to_string()
            }
        }
    }
}
```

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
- [Contract Upgrades & Migration](https://docs.near.org/smart-contracts/release/upgrade)
- [Chain Signatures](https://docs.near.org/chain-abstraction/chain-signatures)
- [Yield & Resume](https://docs.near.org/smart-contracts/anatomy/yield-resume)
- [SDK Rust Reference](https://docs.rs/near-sdk)
- [NEAR Examples](https://github.com/near-examples)
- [Contract Tools](https://github.com/near/near-sdk-contract-tools)

## Resources

- NEAR Documentation: <https://docs.near.org>
- NEAR SDK Rust: <https://docs.near.org/tools/sdk>
- Storage & Collections: <https://docs.near.org/smart-contracts/anatomy/collections>
- Cross-Contract Calls: <https://docs.near.org/smart-contracts/anatomy/crosscontract>
- Yield & Resume: <https://docs.near.org/smart-contracts/anatomy/yield-resume>
- Contract Upgrades: <https://docs.near.org/smart-contracts/release/upgrade>
- Chain Signatures: <https://docs.near.org/chain-abstraction/chain-signatures>
- Chain Signatures Implementation: <https://docs.near.org/chain-abstraction/chain-signatures/implementation>
- NEP-297 Events: <https://github.com/near/NEPs/blob/master/neps/nep-0297.md>
- NEAR Examples: <https://github.com/near-examples>
- NEAR Standards (NEPs): <https://github.com/near/NEPs>
- Security Best Practices: <https://docs.near.org/smart-contracts/security/welcome>
- Sandbox Testing: <https://github.com/near/near-sandbox>
- NEAR API Rust: <https://github.com/near/near-api-rs>
- Omni Transaction RS: <https://github.com/near/omni-transaction-rs>
- Contract Tools: <https://github.com/near/near-sdk-contract-tools>

## Storage Costs Reference

| Storage | Cost | Notes |
|---------|------|-------|
| 1 byte | 0.00001 NEAR | ~10kb per 0.1 NEAR |
| 100 KB | ~1 NEAR | Approximate reference |
| AccountId | 64+ bytes | Can save 40% with base32 encoding |
| Contract code | Variable | Paid by contract account |

### Storage Management Pattern (NEP-145)

```rust
use near_sdk::{env, NearToken};

fn calculate_storage_cost(initial: u64, final_usage: u64) -> NearToken {
    let storage_used = final_usage.saturating_sub(initial);
    NearToken::from_yoctonear(storage_used as u128 * env::storage_byte_cost().as_yoctonear())
}

// Always refund unused deposit
fn refund_deposit(storage_cost: NearToken) {
    let refund = env::attached_deposit().saturating_sub(storage_cost);
    if refund > NearToken::from_yoctonear(1) {
        Promise::new(env::predecessor_account_id()).transfer(refund);
    }
}
```

## Contract Tools (near-sdk-contract-tools)

Simplify NEP standard implementations with derive macros:

```rust
use near_sdk_contract_tools::{
    FungibleToken, NonFungibleToken, Owner, Pause,
    standard::nep141::Nep141,
    standard::nep171::Nep171,
};

// Automatic FT implementation with NEP-141, NEP-145
#[derive(FungibleToken, Owner)]
#[near(contract_state)]
pub struct MyToken {
    // ... your custom fields
}

// Automatic NFT implementation with NEP-171, NEP-177, NEP-178
#[derive(NonFungibleToken, Owner, Pause)]
#[near(contract_state)]
pub struct MyNFT {
    // ... your custom fields
}
```

**Features:**

- `FungibleToken` - NEP-141, NEP-145 (storage management)
- `NonFungibleToken` - NEP-171, NEP-177 (metadata), NEP-178 (approval)
- `Owner` - Ownership pattern with transfer/renounce
- `Pause` - Pausable contract pattern
- `Rbac` - Role-based access control

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
