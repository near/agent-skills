# Low & Informational Severity

Issues with limited direct impact but worth addressing for code quality and defense in depth.

## Table of Contents

- [Low Severity](#low-severity)
  - [Cover Storage Cost](#cover-storage-cost)
  - [Unsafe Math](#unsafe-math)
  - [Unclaimed Storage Fee](#unclaimed-storage-fee)
  - [Floating Point Math](#floating-point-math)
- [Informational](#informational)

---

## Low Severity

### Cover Storage Cost

**Detector ID**: `cover-storage-cost`

On NEAR, storage is paid by the contract account. When a user action expands the contract's storage (e.g. registering an account, adding data), the contract may want to require the user to attach enough deposit to cover the storage cost — otherwise users could drain the contract's balance by filling up storage for free.

To measure the storage delta reliably, note that collections from `near_sdk::store` buffer changes locally and write everything at once at the end of method execution as a gas optimization. Because of this, you must call `flush()` before comparing `env::storage_usage()`, otherwise the storage delta will be zero.

### Vulnerable Code

```rust
// ❌ Storage delta is always zero — insert() is buffered, not yet written
let prev_storage = env::storage_usage();

self.data.insert(&key, &value);

let storage_used = env::storage_usage() - prev_storage; // always 0!
let storage_cost = storage_used as u128 * env::storage_byte_cost();
require!(
    env::attached_deposit() >= storage_cost,
    "Insufficient storage deposit"
);
```

### Fixed Code

```rust
// ✅ flush() forces the buffered write to storage,
// so env::storage_usage() reflects the actual increase
let prev_storage = env::storage_usage();

self.data.insert(&key, &value);
self.data.flush();

let storage_used = env::storage_usage() - prev_storage;
let storage_cost = storage_used as u128 * env::storage_byte_cost();
require!(
    env::attached_deposit() >= storage_cost,
    "Insufficient storage deposit"
);
```

---

## Unsafe Math

**Detector ID**: `unsafe-math`

Arithmetic operations can overflow. It is recommended to enable overflow checks in `Cargo.toml` or use checked math.

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

## Floating Point Math

**Detector ID**: `float-math`

Most financial calculations in smart contracts are done using unsigned integers. Avoid using float types (`f32`, `f64`) unless it's necessary and you are 100% sure what you are doing.

```rust
// ❌ Potential precision loss
let amount = token_amount as f64 * 0.1;

// ✅ Use integer arithmetic
let amount = token_amount / 10;
// or
let amount = token_amount * 10 / 100;
```
