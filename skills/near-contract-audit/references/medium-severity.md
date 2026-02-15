# Medium Severity Vulnerabilities

Issues that can cause financial loss, contract malfunction, or degraded security.

## Table of Contents

- [Lock Callback](#lock-callback)
- [Gas Griefing / DoS](#gas-griefing--dos)
- [Insecure Randomness](#insecure-randomness)
- [Prepaid Gas](#prepaid-gas)

---

## Lock Callback

**Detector ID**: `lock-callback`

Never panic in callbacks or in between cross-contract call functions. Panicking in a callback prevents state recovery when promises fail, potentially locking the contract permanently.

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

## Gas Griefing / DoS

**Detector ID**: `gas-griefing`

Unbounded loops over data structures that can grow indefinitely will eventually exceed the gas limit, making some contract methods unusable (DoS).

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
pub fn distribute_rewards(&mut self, limit: u64) {
    let keys = self.users.keys_as_vector();
    for i in 0..limit {
        let user = keys.get(i).unwrap();
        self.internal_transfer(user, REWARD_AMOUNT);
    }
}
```

---

## Insecure Randomness

**Detector ID**: `insecure-random`

Using block data (timestamp, hash, etc.) for randomness is insecure as it can be predicted or manipulated by validators. Use `env::random_seed()` instead, which returns 32 bytes derived. Only the block-producing validator can predict the random seed, since it depends on the validator's private key — no one else can predict it.

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
// ✅ Use NEAR's random seed
pub fn play_game(&mut self) -> bool {
    let seed = env::random_seed();
    let random_u8 = seed[0];
    random_u8 % 2 == 0
}
```

> **Important**: While `env::random_seed()` is the recommended approach, it is still vulnerable to certain validator-level attacks:
>
> **1. Gaming the input.** If a method takes user input and decides a reward based on a random seed (e.g. "guess the number"), the block-producing validator already knows the random seed before including transactions. They can craft a transaction with the winning input and guarantee a win.
>
> **2. Commit-reveal mitigation and its limits.** A common fix is to split the game into two stages: a **bet** (user commits input) and a **resolve** (outcome decided in a later block with a different random seed). This prevents gaming the input, since the random seed is not known at bet time. However, a validator can still improve their odds: when it is their turn to produce a block, they can check if the random seed makes them win and only include their **resolve** transaction if it does, skipping it otherwise. For example, in a coin-flip game this increases the validator's win probability from 1/2 to 3/4 — a 25% edge. These odds dilute in games with more possible outcomes, but it remains a concern for high-stakes applications.
>
> For high-stakes randomness, consider external oracle solutions.

---

### Prepaid Gas

**Detector ID**: `prepaid-gas`

Always ensure enough gas is available to execute callbacks. If a callback runs out of gas, it cannot rollback state, potentially leaving the contract in an inconsistent state.

```rust
// ✅ Reserve enough gas for the callback
pub fn do_cross_contract_call(&mut self, amount: U128) -> Promise {
    require!(
        env::prepaid_gas() >= Gas::from_tgas(45),
        "Not enough gas to guarantee callback execution"
    );

    ext_contract::external_method(amount)
        .with_static_gas(Gas::from_tgas(30))
        .then(
            ext_self::on_complete(amount)
                .with_static_gas(Gas::from_tgas(10))  // Guarantee callback has enough gas
        )
}
```
