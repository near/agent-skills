# Medium Severity Vulnerabilities

Issues that can cause financial loss, contract malfunction, or degraded security.

## Table of Contents
- [Division Before Multiplication](#division-before-multiplication)
- [Ambiguous Rounding](#ambiguous-rounding)
- [Lock Callback](#lock-callback)
- [Yocto Attach](#yocto-attach)
- [Duplicate Collection ID](#duplicate-collection-id)
- [Unregistered Receiver](#unregistered-receiver)
- [NEP Interface](#nep-interface)
- [Gas Griefing / DoS](#gas-griefing--dos)
- [Insecure Randomness](#insecure-randomness)

---

## Division Before Multiplication

**Detector ID**: `div-before-mul`

Division before multiplication causes precision loss due to integer truncation.

### Vulnerable Code
```rust
// ❌ Division first truncates, then multiplication
let reward_per_session = 
    farm.amount / (farm.end_date - farm.start_date) as u128 
    * SESSION_INTERVAL as u128;
// Example: 3 / 2 * 6 = 1 * 6 = 6
```

### Fixed Code
```rust
// ✅ Multiply first to preserve precision
let reward_per_session = 
    farm.amount * SESSION_INTERVAL as u128 
    / (farm.end_date - farm.start_date) as u128;
// Example: 3 * 6 / 2 = 18 / 2 = 9
```

---

## Ambiguous Rounding

**Detector ID**: `round`

Using `round()` without specifying direction can lead to inconsistent financial calculations.

### Vulnerable Code
```rust
// ❌ Rounding direction unclear
let shares = (amount as f64 / price as f64).round() as u128;
```

### Fixed Code
```rust
// ✅ Explicit floor (favor protocol) or ceil (favor user)
let shares = amount / price;  // Integer division = floor

// Or for ceiling:
let shares = (amount + price - 1) / price;  // Ceiling division
```

---

## Lock Callback

**Detector ID**: `lock-callback`

Panic/assert in callbacks prevents state recovery when promises fail, potentially locking the contract.

### Vulnerable Code
```rust
fn process_order(&mut self, order_id: u32) -> Promise {
    self.delete_order(order_id);  // State changed
    ext_contract::do_transfer(receiver, amount)
        .then(ext_self::callback_transfer(order_id))
}

#[private]
pub fn callback_transfer(&mut self, order_id: u32) {
    assert!(order_id > 0);  // ❌ Panic before recovery check!
    
    match env::promise_result(0) {
        PromiseResult::Failed => self.recover_order(order_id),  // Never reached
        _ => {}
    }
}
```

### Fixed Code
```rust
#[private]
pub fn callback_transfer(&mut self, order_id: u32) {
    // ✅ Check promise result FIRST, handle recovery
    match env::promise_result(0) {
        PromiseResult::Successful(_) => {
            // Only validate on success
            assert!(order_id > 0);
        }
        PromiseResult::Failed => {
            self.recover_order(order_id);  // Always recovers
        }
        PromiseResult::NotReady => unreachable!(),
    }
}
```

---

## Yocto Attach

**Detector ID**: `yocto-attach`

Privileged functions should require 1 yoctoNEAR attachment for 2FA security.

### Vulnerable Code
```rust
// ❌ No 2FA protection for privileged action
pub fn set_owner(&mut self, owner_id: AccountId) {
    self.assert_owner();
    self.owner_id = owner_id;
}
```

### Fixed Code
```rust
// ✅ Requires wallet confirmation (2FA)
#[payable]
pub fn set_owner(&mut self, owner_id: AccountId) {
    assert_one_yocto();  // User must confirm in wallet
    self.assert_owner();
    self.owner_id = owner_id;
}
```

> **Why 1 yocto?** NEAR wallets require user confirmation for transactions with attached deposits, providing a second factor of authentication.

---

## Duplicate Collection ID

**Detector ID**: `dup-collection-id`

Using the same storage key for multiple collections causes data corruption.

### Vulnerable Code
```rust
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize)]
pub struct Contract {
    // ❌ Same prefix "a" for both collections
    users: UnorderedMap<AccountId, User>,     // StorageKey: b"a"
    balances: UnorderedMap<AccountId, u128>,  // StorageKey: b"a" - COLLISION!
}
```

### Fixed Code
```rust
#[derive(BorshSerialize, BorshStorageKey)]
enum StorageKey {
    Users,
    Balances,
}

pub struct Contract {
    // ✅ Unique storage keys
    users: UnorderedMap<AccountId, User>,
    balances: UnorderedMap<AccountId, u128>,
}

impl Default for Contract {
    fn default() -> Self {
        Self {
            users: UnorderedMap::new(StorageKey::Users),
            balances: UnorderedMap::new(StorageKey::Balances),
        }
    }
}
```

---

## Unregistered Receiver

**Detector ID**: `unregistered-receiver`

FT transfers to unregistered receivers should panic to prevent token loss.

### Vulnerable Code
```rust
// ❌ Silently fails, tokens may be lost
pub fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128) {
    if !self.accounts.contains_key(&receiver_id) {
        return;  // No error, but tokens lost from sender
    }
    // ... transfer logic
}
```

### Fixed Code
```rust
// ✅ Panic if receiver not registered
pub fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128) {
    require!(
        self.accounts.contains_key(&receiver_id),
        "Receiver not registered"
    );
    // ... transfer logic
}
```

---

// ... (existing content)

## NEP Interface

**Detector ID**: `nep141-interface`, `nep145-interface`, `nep171-interface`

Contracts implementing NEP standards must include all required interface methods.

### NEP-141 (Fungible Token) Required
```rust
trait FungibleTokenCore {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn ft_transfer_call(&mut self, receiver_id: AccountId, amount: U128, 
                        memo: Option<String>, msg: String) -> PromiseOrValue<U128>;
    fn ft_total_supply(&self) -> U128;
    fn ft_balance_of(&self, account_id: AccountId) -> U128;
}
```

### NEP-145 (Storage Management) Required
```rust
trait StorageManagement {
    fn storage_deposit(&mut self, account_id: Option<AccountId>, 
                       registration_only: Option<bool>) -> StorageBalance;
    fn storage_withdraw(&mut self, amount: Option<U128>) -> StorageBalance;
    fn storage_unregister(&mut self, force: Option<bool>) -> bool;
    fn storage_balance_bounds(&self) -> StorageBalanceBounds;
    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance>;
}
```

### NEP-171 (NFT Core) Required
```rust
trait NonFungibleTokenCore {
    fn nft_transfer(&mut self, receiver_id: AccountId, token_id: TokenId,
                    approval_id: Option<u64>, memo: Option<String>);
    fn nft_transfer_call(&mut self, receiver_id: AccountId, token_id: TokenId,
                         approval_id: Option<u64>, memo: Option<String>, 
                         msg: String) -> PromiseOrValue<bool>;
    fn nft_token(&self, token_id: TokenId) -> Option<Token>;
}
```

---

## Gas Griefing / DoS

**Detector ID**: `gas-griefing`

Unbounded loops over data structures that can grow indefinitely will eventually exceed the gas limit, rendering the contract unusable (DoS).

### Vulnerable Code
```rust
// ❌ Loop over unbounded collection
pub fn distribute_rewards(&mut self) {
    // If 'users' grows too large, this will fail
    for (user, _) in self.users.iter() {
        self.internal_transfer(user, REWARD_AMOUNT);
    }
}
```

### Fixed Code
```rust
// ✅ Process in batches
pub fn distribute_rewards(&mut self, from_index: u64, limit: u64) {
    let keys = self.users.keys_as_vector();
    for i in from_index..std::cmp::min(from_index + limit, keys.len()) {
        let user = keys.get(i).unwrap();
        self.internal_transfer(user, REWARD_AMOUNT);
    }
}
```

---

## Insecure Randomness

**Detector ID**: `insecure-random`

Using block data (timestamp, hatch, etc.) for randomness is insecure as it can be predicted or manipulated by validators.

### Vulnerable Code
```rust
// ❌ Predictable randomness
pub fn play_game(&mut self) -> bool {
    let random = env::block_timestamp() % 2; // Validators can manipulate
    random == 0
}
```

### Fixed Code
```rust
// ✅ Use NEAR's random seed (still handled with care!)
pub fn play_game(&mut self) -> bool {
    // env::random_seed() returns 32 bytes from VRF
    let seed = env::random_seed();
    let random_u8 = seed[0];
    random_u8 % 2 == 0
}
```
> **Note**: Even `env::random_seed()` is known to the validator *at the time of block production*. For high-stakes games, use a commit-reveal scheme or an external oracle.

