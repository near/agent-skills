# Error Handling

Typed errors for clean exception handling in near-kit.

## Table of Contents
- [Error Hierarchy](#error-hierarchy)
- [Error Types](#error-types)
- [Panic Messages](#panic-messages)

---

## Error Hierarchy

All errors extend `NearError`. Use `instanceof` to handle specific types:

```typescript
import {
  FunctionCallError,
  AccountDoesNotExistError,
  NetworkError,
  InsufficientBalanceError,
  InvalidNonceError,
  TimeoutError,
} from "near-kit"

try {
  await near.call("contract.near", "method", {})
} catch (e) {
  if (e instanceof FunctionCallError) {
    console.log("Panic:", e.panic)
    console.log("Logs:", e.logs)
  } else if (e instanceof AccountDoesNotExistError) {
    console.log(`Account ${e.accountId} not found`)
  } else if (e instanceof NetworkError) {
    if (e.retryable) {
      // Safe to retry
    }
  }
}
```

---

## Error Types

### FunctionCallError

Thrown when a smart contract call fails (panics or runs out of gas).

**Properties:**
- `panic` - The panic message from the contract
- `logs` - Any logs emitted before the failure

```typescript
if (e instanceof FunctionCallError) {
  console.log("Contract panicked:", e.panic)
  console.log("Logs before failure:", e.logs)
}
```

### AccountDoesNotExistError

Thrown when trying to interact with an account that doesn't exist.

**Properties:**
- `accountId` - The account that wasn't found

```typescript
if (e instanceof AccountDoesNotExistError) {
  console.log(`Account ${e.accountId} not found`)
}
```

### NetworkError

Thrown when there's a network or RPC issue.

**Properties:**
- `retryable` - Whether it's safe to retry
- `statusCode` - HTTP status code (if applicable)

```typescript
if (e instanceof NetworkError && e.retryable) {
  // Wait and try again
}
```

### TimeoutError

Thrown when a request times out. Extends `NetworkError`.

```typescript
if (e instanceof TimeoutError) {
  console.log("Request timed out - already retried automatically")
}
```

### InsufficientBalanceError

Thrown when an account doesn't have enough NEAR for the operation.

**Properties:**
- `accountId` - The account with insufficient balance
- `required` - Amount needed
- `available` - Amount available

```typescript
if (e instanceof InsufficientBalanceError) {
  console.log(`Need ${e.required}, have ${e.available}`)
}
```

### InvalidNonceError

Thrown when a transaction's nonce is stale (usually from concurrent transactions).

> **Tip:** Use `RotatingKeyStore` to avoid nonce issues in high-concurrency scenarios.

---

## Panic Messages

When a contract fails, the most important info is the **panic message**. near-kit extracts this from the deep RPC response and puts it on `error.panic`.

Common panics:
- `ERR_NOT_ENOUGH_FUNDS`
- `ERR_INVALID_ARGUMENT`
- `Smart contract panicked: ...`

Use this string to debug or show user-friendly error messages in your UI.
