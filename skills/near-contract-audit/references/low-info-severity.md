# Low & Informational Severity

Issues with limited direct impact but worth addressing for code quality and defense in depth.

## Table of Contents

- [Low Severity](#low-severity)
  - [Prepaid Gas](#prepaid-gas)
  - [Non-Callback Private](#non-callback-private)
  - [Unused Return](#unused-return)
  - [Upgrade Function](#upgrade-function)
  - [Tautology](#tautology)
  - [Storage Gas](#storage-gas)
  - [Unclaimed Storage Fee](#unclaimed-storage-fee)
  - [Floating Point Math](#floating-point-math)
- [Informational](#informational)

---

## Low Severity

### Prepaid Gas

**Detector ID**: `prepaid-gas`

`ft_transfer_call` should verify sufficient gas to complete cross-contract calls.

```rust
// ✅ Check minimum gas
pub fn ft_transfer_call(&mut self, receiver_id: AccountId, amount: U128,
                        memo: Option<String>, msg: String) -> PromiseOrValue<U128> {
    require!(
        env::prepaid_gas() >= GAS_FOR_FT_TRANSFER_CALL,
        "Insufficient gas"
    );
    // ... implementation
}
```

---

### Non-Callback Private

**Detector ID**: `non-callback-private`

`#[private]` on non-callback functions may indicate design issues. The macro is meant for callbacks.

```rust
// ⚠️ Unusual - private macro on non-callback
#[private]
pub fn internal_helper(&mut self) {
    // Should this be a regular private fn instead?
}

// ✅ Correct use - callback function
#[private]
pub fn on_transfer_complete(&mut self) {
    // Callback pattern
}
```

---

### Unused Return

**Detector ID**: `unused-ret`

Function return values should be used or explicitly ignored to prevent logic errors.

```rust
// ❌ Return value ignored
self.accounts.insert(&account_id, &balance);

// ✅ Handle the return
let prev = self.accounts.insert(&account_id, &balance);
if prev.is_some() {
    // Account already existed
}

// ✅ Or explicitly ignore
let _ = self.accounts.insert(&account_id, &balance);
```

---

### Upgrade Function

**Detector ID**: `upgrade-func`

Contracts should include upgrade capability for bug fixes and migrations.

```rust
// ✅ Upgrade function pattern
mod upgrade {
    use super::*;
    use near_sys as sys;

    #[no_mangle]
    pub extern "C" fn upgrade() {
        env::setup_panic_hook();
        let contract: Contract = env::state_read().expect("Not initialized");
        contract.assert_owner();

        unsafe {
            sys::input(0);
            let promise_id = sys::promise_batch_create(/*...*/);
            sys::promise_batch_action_deploy_contract(promise_id, u64::MAX as _, 0);
            sys::promise_batch_action_function_call(
                promise_id,
                b"migrate_state".len() as _,
                b"migrate_state".as_ptr() as _,
                /*...*/
            );
            sys::promise_return(promise_id);
        }
    }
}
```

---

### Tautology

**Detector ID**: `tautology`

Conditions that are always true/false indicate logic errors.

```rust
// ❌ Tautology - always true
if amount >= 0 {  // u128 is always >= 0
    // ...
}

// ✅ Meaningful condition
if amount > 0 {
    // ...
}
```

---

### Storage Gas

**Detector ID**: `storage-gas`

Storage expansion should verify attached deposit covers the cost.

```rust
// ✅ Check storage cost
let prev_storage = env::storage_usage();

self.data.insert(&key, &value);

let storage_used = env::storage_usage() - prev_storage;
let storage_cost = storage_used as u128 * env::storage_byte_cost();
require!(
    env::attached_deposit() >= storage_cost,
    "Insufficient storage deposit"
);
```

---

### Unclaimed Storage Fee

**Detector ID**: `unclaimed-storage-fee`

Before unregistering storage, verify user has withdrawn all funds.

```rust
// ✅ Check balance before unregister
pub fn storage_unregister(&mut self, force: Option<bool>) -> bool {
    let account_id = env::predecessor_account_id();
    let balance = self.accounts.get(&account_id).unwrap_or(0);

    if balance > 0 && !force.unwrap_or(false) {
        env::panic_str("Account has remaining balance");
    }

    // Refund storage deposit
    self.accounts.remove(&account_id);
    true
}
```

## Floating Point Math

**Detector ID**: `float-math`

Using floating point types (`f32`, `f64`) for financial calculations causes precision loss.

```rust
// ❌ Potential precision loss
let amount = token_amount as f64 * 0.1;

// ✅ Use integer arithmetic
let amount = token_amount / 10;
// or
let amount = token_amount * 10 / 100;
```

---

## Informational

These detectors highlight areas for manual review rather than indicating bugs.

### Timestamp (`timestamp`)

Block timestamps can be manipulated by validators within bounds. Review usage for time-sensitive logic.

```rust
// ⚠️ Validators can tweak this slightly
let now = env::block_timestamp();

// ✅ Acceptable for broad timeouts (e.g. 1 day lockup), risky for short intervals (e.g. 10 sec lottery)
if now > lockup_end {
    // ...
}
```

### Complex Loop (`complex-loop`)

Loops with complex logic may cause DoS if gas exhausted. Review for unbounded iterations.

### External Call (`ext-call`)

Lists all cross-contract calls. Review for proper callback handling and error recovery.

### Promise Result (`promise-result`)

Lists all promise result accesses. Review for proper handling of all result states.

### Transfer (`transfer`)

Lists all token transfer operations. Review for proper access control and validation.

### Public Interface (`public-interface`)

Lists all public entry points. Review for proper access control on sensitive functions.

### Inconsistency (`inconsistency`)

Flags similar but different symbol names that may indicate typos:

- `balanace` vs `balance`
- `ammount` vs `amount`
- `reciever` vs `receiver`
