# High Severity Vulnerabilities

Critical security issues that can lead to fund loss, unauthorized access, or contract compromise.

## Table of Contents

- [Non-Private Callback](#non-private-callback)
- [Reentrancy](#reentrancy)
- [Incorrect Argument/Return Types](#incorrect-argumentreturn-types)
- [Unsaved Changes](#unsaved-changes)
- [Owner Check](#owner-check)
- [Yocto Attach](#yocto-attach)
- [Storage Collision](#storage-collision)
- [Required Initialization Macro](#required-initialization-macro)

---

## Non-Private Callback

**Detector ID**: `non-private-callback`

Callback functions must have `#[private]` macro to prevent external invocation.

### Vulnerable Code

```rust
// ❌ Anyone can call this callback directly
pub fn callback_stake(&mut self) {
    // Attacker can trigger state changes
}
```

### Fixed Code

```rust
// ✅ Only contract itself can invoke
#[private]
pub fn callback_stake(&mut self) {
    // Protected callback
}
```

---

## Reentrancy

**Detector ID**: `reentrancy`

State must be updated BEFORE cross-contract calls. NEAR Protocol is an async blockchain, so promises are typically processed in the next blocks. Between the cross-contract call and the callback execution, other transactions targeting the same contract may be executed, potentially exploiting stale state. The best practice is to optimistically update state before the cross-contract call and roll it back in the callback if the original promise failed.

### Vulnerable Code

```rust
// ❌ State updated after external call (in callback)
pub fn withdraw(&mut self, amount: u128) -> Promise {
    assert!(self.balance >= amount);
    // Balance not updated yet - reentrant call can withdraw again
    ext_token::ft_transfer_call(amount)
        .then(ext_self::on_withdraw(amount))
}

#[private]
pub fn on_withdraw(&mut self, amount: u128) {
    match env::promise_result(0) {
        PromiseResult::Successful(_) => {
            self.balance -= amount;  // Too late!
        }
        _ => {}
    }
}
```

### Fixed Code

```rust
// ✅ State updated before external call
pub fn withdraw(&mut self, amount: u128) -> Promise {
    assert!(self.balance >= amount);
    self.balance -= amount;  // Update first
    ext_token::ft_transfer_call(amount)
        .then(ext_self::on_withdraw(amount))
}

#[private]
pub fn on_withdraw(&mut self, amount: u128) {
    match env::promise_result(0) {
        PromiseResult::Successful(_) => {
            // No action needed - state already updated
        }
        _ => {
            self.balance += amount;  // Restore on not successful result
        }
    }
}
```

---

## Incorrect Argument/Return Types

**Detector ID**: `incorrect-argument-or-return-types`

JSON only supports integers up to 2^53-1. Use wrapped types (U64, U128, I64, I128) from `near_sdk::json_types` for public method arguments and return values that can realistically exceed this limit (e.g. token amounts, timestamps in nanoseconds). For values that will never grow that large (e.g. a pagination page number), native Rust types like `u16` or `u32` are fine. Internally, always use native Rust types for state storage — wrappers are only needed at the JSON serialization boundary.

### Vulnerable Code

```rust
// ❌ u64 exceeds JSON safe integer range
pub fn get_balance(&self) -> u64 {
    self.total_supply  // May lose precision in JSON
}
```

```rust
use near_sdk::json_types::U128;

// ❌ storing as U128 in the state is inefficient
struct Contract {
    balances: UnorderedMap<AccountId, U128>
}
```

### Fixed Code

```rust
use near_sdk::json_types::U64;

// ✅ Wrapped argument type deserializes from a string
pub fn withdraw(&mut self, amount: U128) {
    // ...
}

// ✅ Wrapped return type serializes as string
pub fn get_balance(&self) -> U64 {
    U64(self.total_supply)
}

// ✅ Pagination arguments uses native types
pub fn read_with_pagination(&self, page: u16, limit: Option<u16>) {
    // ...
}
```

```rust
// ✅ Contract state uses native types
struct Contract {
    balances: UnorderedMap<AccountId, u128>
}
```

---

## Unsaved Changes

**Detector ID**: `unsaved-changes`

When using `near_sdk::store`, modifications to collection entries still require explicit writes: use `insert()` for maps and sets, and `push()` for vectors. Forgetting to persist changes will silently lose them.

### Vulnerable Code

```rust
// ❌ Changes lost - no insert after modification
pub fn modify(&mut self, change: i128) {
    let mut balance = self.accounts.get(&env::predecessor_account_id()).unwrap();
    balance = balance.checked_add(change).unwrap();
    // Missing: self.accounts.insert(&account, &balance);
}
```

### Fixed Code

```rust
// ✅ Changes persisted with insert()
pub fn modify(&mut self, change: i128) {
    let account = env::predecessor_account_id();
    let mut balance = self.accounts.get(&account).unwrap();
    balance = balance.checked_add(change).unwrap();
    self.accounts.insert(account, balance);  // Save!
}
```

---

## Owner Check

**Detector ID**: `owner-check`

Admin functions (e.g. that modify state, handle assets, etc) must verify the caller's identity via `predecessor_account_id()` to prevent unauthorized invocations.

### Vulnerable Code

```rust
// ❌ No caller verification - anyone can call
pub fn update_config(&mut self, new_value: u64) {
    self.config_value = new_value;
}
```

### Fixed Code

```rust
// ✅ Verify caller is owner
pub fn update_config(&mut self, new_value: u64) {
    require!(
        env::predecessor_account_id() == self.owner_id,
        "Only owner can update config"
    );
    self.config_value = new_value;
}
```

---

## Yocto Attach

**Detector ID**: `yocto-attach`

NEAR accounts support two types of keys - FullAccess and FunctionCall. Only FullAccess keys can sign transactions with an attached deposit. As an extra security measure, wallets require users to explicitly confirm transactions that need to be signed with a FullAccess key. Therefore, important functions (e.g. transfers, claims) should include `assert_one_yocto()`, as this forces the use of a FullAccess key and wallet confirmation, preventing a malicious dApp from silently invoking the function via a FunctionCall key.

### Vulnerable Code

```rust
// ❌ No deposit required - can be invoked with a FunctionCall key
pub fn claim(&mut self) {
    let account_id = env::predecessor_account_id();
    self.internal_claim(&account_id);
}
```

### Fixed Code

```rust
// ✅ Requires FullAccess key + wallet confirmation
#[payable]
pub fn claim(&mut self) {
    assert_one_yocto();
    let account_id = env::predecessor_account_id();
    self.internal_claim(&account_id);
}
```

---

## Storage Collision

**Detector ID**: `storage-collision`

NEAR smart contracts store data in a key-value storage. Collections from `near_sdk::store` provide gas-efficient access by storing each item at an individual key — when reading data, only the needed value is loaded rather than the entire collection. To prevent key collisions between different collections, each one is assigned a unique prefix. The recommended way to define prefixes is via an enum implementing the `BorshStorageKey` trait, which gives you human-readable names that internally resolve to a single byte.

Using the same prefix for different collections results in data corruption and potential loss of data.

### Vulnerable Code

```rust
#[near(contract_state)]
pub struct Contract {
    users: UnorderedMap<AccountId, UserInfo>,
    configurations: UnorderedMap<String, Config>,
}

impl Default for Contract {
    fn default() -> Self {
        // ❌ Both maps use the same prefix "a"
        Self {
            users: UnorderedMap::new(b"a"), // prefix: b"a"
            configurations: UnorderedMap::new(b"a"), // prefix: b"a"
        }
    }
}
```

### Fixed Code

```rust
#[near(contract_state)]
pub struct Contract {
    users: UnorderedMap<AccountId, UserInfo>,
    configurations: UnorderedMap<String, Config>,
}

impl Default for Contract {
    fn default() -> Self {
    // ✅ Distinct prefixes "u" and "c"
        Self {
            users: UnorderedMap::new(b"u"),
            configurations: UnorderedMap::new(b"c"),
        }
    }
}
```

### Fixed Code (Recommended)

```rust
#[derive(BorshSerialize, BorshStorageKey)]
enum StorageKey {
    Users,
    Configurations,
}

#[near(contract_state)]
pub struct Contract {
    users: UnorderedMap<AccountId, UserInfo>,
    configurations: UnorderedMap<String, Config>,
}

impl Default for Contract {
    fn default() -> Self {
    // ✅ Distinct prefixes via enum
        Self {
            users: UnorderedMap::new(StorageKey::Users),
            configurations: UnorderedMap::new(StorageKey::Configurations),
        }
    }
}
```

> **Warning**: Once the contract is deployed, never change the order of `StorageKey` enum variants and never delete them — doing so will shift the internal prefix bytes and break existing on-chain data.

---

## Required Initialization Macro

**Detector ID**: `required-initialization-macro`

The contract initialization method must be annotated with `#[init]` to prevent it from being executed multiple times. This macro checks whether the contract state already exists, and if so, fails the transaction. Without it, an attacker could re-initialize the contract with their own parameters (e.g. setting themselves as owner).

### Vulnerable Code

```rust
// ❌ No #[init] — can be called multiple times
#[near]
impl Contract {
    pub fn new(owner: AccountId) -> Self {
        Self { owner }
    }
}
```

### Fixed Code

```rust
// ✅ #[init] prevents re-initialization
#[near]
impl Contract {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self { owner }
    }
}
```
