# High Severity Vulnerabilities

Critical security issues that can lead to fund loss, unauthorized access, or contract compromise.

## Table of Contents
- [Unhandled Promise](#unhandled-promise)
- [Non-Private Callback](#non-private-callback)
- [Reentrancy](#reentrancy)
- [Unsafe Math](#unsafe-math)
- [Self Transfer](#self-transfer)
- [Incorrect JSON Type](#incorrect-json-type)
- [Unsaved Changes](#unsaved-changes)
- [NFT Approval Check](#nft-approval-check)
- [NFT Owner Check](#nft-owner-check)
- [Storage Collision](#storage-collision)
- [Improper Initialization](#improper-initialization)

---

## Unhandled Promise

**Detector ID**: `unhandled-promise`

Promise results must be handled by a callback. Unhandled promises prevent state rollback on failure.

### Vulnerable Code
```rust
// ❌ Promise result not handled
token.ft_transfer_call(receiver, U128(amount), None, "".to_string());
// Contract won't know if transfer failed, state not rolled back
```

### Fixed Code
```rust
// ✅ Promise handled with callback
token.ft_transfer_call(receiver, U128(amount), None, "".to_string())
    .then(ext_self::on_transfer_complete(amount))
```

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

State must be updated BEFORE cross-contract calls. Updating state only in callbacks enables reentrancy.

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
    if env::promise_result(0).is_successful() {
        self.balance -= amount;  // Too late!
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
    if !env::promise_result(0).is_successful() {
        self.balance += amount;  // Restore on failure
    }
}
```

---

## Unsafe Math

**Detector ID**: `unsafe-math`

Arithmetic operations can overflow. Enable overflow checks or use checked math.

### Vulnerable Code
```toml
# Cargo.toml
[profile.release]
overflow-checks = false  # ❌ Overflow not checked
```

```rust
let a = b + c;  // ❌ Can overflow silently
```

### Fixed Code
```toml
# Cargo.toml
[profile.release]
overflow-checks = true  # ✅ Panics on overflow
```

Or use checked operations:
```rust
let a = b.checked_add(c).expect("overflow");  // ✅ Explicit check
```

---

## Self Transfer

**Detector ID**: `self-transfer`

Token transfers must validate sender ≠ receiver to prevent infinite minting exploits.

### Vulnerable Code
```rust
// ❌ No sender/receiver check
pub fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128) {
    let sender_id = env::predecessor_account_id();
    self.internal_transfer(&sender_id, &receiver_id, amount.0);
}
```

### Fixed Code
```rust
// ✅ Validate different accounts
pub fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128) {
    let sender_id = env::predecessor_account_id();
    require!(sender_id != receiver_id, "Sender and receiver must differ");
    self.internal_transfer(&sender_id, &receiver_id, amount.0);
}
```

---

## Incorrect JSON Type

**Detector ID**: `incorrect-json-type`

JSON only supports integers up to 2^53-1. Use wrapped types (U64, U128, I64, I128) for large numbers.

### Vulnerable Code
```rust
// ❌ u64 exceeds JSON safe integer range
pub fn get_balance(&self) -> u64 {
    self.total_supply  // May lose precision in JSON
}
```

### Fixed Code
```rust
use near_sdk::json_types::U64;

// ✅ Wrapped type serializes as string
pub fn get_balance(&self) -> U64 {
    U64(self.total_supply)
}
```

---

## Unsaved Changes

**Detector ID**: `unsaved-changes`

Changes to `near_sdk::collections` must be explicitly saved with `insert()`.

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
// ✅ Changes persisted
pub fn modify(&mut self, change: i128) {
    let account = env::predecessor_account_id();
    let mut balance = self.accounts.get(&account).unwrap();
    balance = balance.checked_add(change).unwrap();
    self.accounts.insert(&account, &balance);  // Save!
}
```

> **Note**: `near_sdk::store` (v4.1.0+) auto-saves changes, avoiding this issue.

---

## NFT Approval Check

**Detector ID**: `nft-approval-check`

NFT transfers by non-owners must validate `approval_id` to prevent unauthorized transfers.

### Vulnerable Code
```rust
// ❌ No approval_id validation
fn nft_transfer(&mut self, receiver_id: AccountId, token_id: TokenId) {
    // Anyone with any approval can transfer
    self.internal_transfer(sender, receiver_id, token_id, None);
}
```

### Fixed Code
```rust
// ✅ Verify approval_id matches
fn nft_transfer(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>) {
    let approved = self.tokens.get(&token_id).approved_accounts;
    let actual_id = approved.get(&sender_id).expect("Not approved");
    require!(approval_id.is_none() || approval_id == Some(*actual_id), "Invalid approval");
    self.internal_transfer(sender, receiver_id, token_id, approval_id);
}
```

---

## NFT Owner Check

**Detector ID**: `nft-owner-check`

NFT approve/revoke functions must verify caller is the token owner.

### Vulnerable Code
```rust
// ❌ Anyone can approve themselves
pub fn nft_approve(&mut self, token_id: TokenId, account_id: AccountId) {
    self.tokens.approve(token_id, account_id);
}
```

### Fixed Code
```rust
// ✅ Only owner can approve
pub fn nft_approve(&mut self, token_id: TokenId, account_id: AccountId) {
    let owner = self.tokens.owner_of(&token_id).expect("No token");
    require!(env::predecessor_account_id() == owner, "Not owner");
    self.tokens.approve(token_id, account_id);
}
```

---

## Storage Collision

**Detector ID**: `storage-collision`

Using the same storage prefix for different collections results in data corruption and potential fund loss.

### Vulnerable Code
```rust
#[near(contract_state)]
pub struct Contract {
    // ❌ Both maps use the same prefix "a"
    fungible_tokens: UnorderedMap<AccountId, u128>, // prefix: b"a"
    non_fungible_tokens: UnorderedMap<TokenId, AccountId>, // prefix: b"a"
}

impl Default for Contract {
    fn default() -> Self {
        Self {
            fungible_tokens: UnorderedMap::new(b"a"),
            non_fungible_tokens: UnorderedMap::new(b"a"),
        }
    }
}
```

### Fixed Code
```rust
#[near(contract_state)]
pub struct Contract {
    // ✅ Distinct prefixes
    fungible_tokens: UnorderedMap<AccountId, u128>,
    non_fungible_tokens: UnorderedMap<TokenId, AccountId>,
}

impl Default for Contract {
    fn default() -> Self {
        Self {
            fungible_tokens: UnorderedMap::new(b"a"),
            non_fungible_tokens: UnorderedMap::new(b"b"),
        }
    }
}
```
> **Tip**: Use `BorshStorageKey` enum to manage prefixes safely.

---

## Improper Initialization

**Detector ID**: `improper-init`

Failing to enforce initialization allows attackers to initialize the contract with their own parameters (e.g., setting themselves as owner).

### Vulnerable Code
```rust
// ❌ No initialization check
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    owner: AccountId,
}

#[near]
impl Contract {
    // Anyone can call this if not already initialized!
    pub fn new(owner: AccountId) -> Self {
        Self { owner }
    }
}
```

### Fixed Code
```rust
// ✅ Enforce initialization
#[near]
impl Contract {
    #[init]
    #[private] // Optional: if you want to restrict who can deploy+init
    pub fn new(owner: AccountId) -> Self {
        Self { owner }
    }
}
```
or use `#[init(ignore_state)]` if migrating. Ideally, ensure the contract is initialized in the same transaction as deployment (`deploy_and_init`).

