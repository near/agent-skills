# Transaction Builder

Fluent API for constructing multi-action NEAR transactions.

## Table of Contents
- [Basic Usage](#basic-usage)
- [Available Actions](#available-actions)
- [Multi-Action Transactions](#multi-action-transactions)
- [Meta-Transactions (NEP-366)](#meta-transactions-nep-366)
- [Advanced Patterns](#advanced-patterns)

---

## Basic Usage

```typescript
const receipt = await near
  .transaction("alice.near")  // Signer account
  .transfer("bob.near", "1 NEAR")
  .send()

console.log("Transaction hash:", receipt.transaction.hash)
```

---

## Available Actions

### Transfer

```typescript
.transfer(receiverId: string, amount: Amount)

await near
  .transaction("alice.near")
  .transfer("bob.near", "10 NEAR")
  .send()
```

### Function Call

```typescript
.functionCall(
  contractId: string,
  methodName: string,
  args?: object | Uint8Array,
  options?: { gas?: Gas; attachedDeposit?: Amount }
)

await near
  .transaction("alice.near")
  .functionCall(
    "contract.near",
    "store_data",
    { key: "value" },
    { gas: "30 Tgas", attachedDeposit: "0.1 NEAR" }
  )
  .send()
```

### Create Account

```typescript
.createAccount(accountId: string)

await near
  .transaction("alice.near")
  .createAccount("sub.alice.near")
  .transfer("sub.alice.near", "1 NEAR")
  .send()
```

### Delete Account

```typescript
.deleteAccount({ beneficiary: string })

await near
  .transaction("account-to-delete.near")
  .deleteAccount({ beneficiary: "alice.near" })
  .send()
```

### Deploy Contract

```typescript
.deployContract(accountId: string, code: Uint8Array)

const wasm = await fs.readFile("./contract.wasm")
await near
  .transaction("alice.near")
  .deployContract("contract.alice.near", wasm)
  .send()
```

### Add Key

```typescript
.addKey(
  accountId: string,
  publicKey: string,
  permission: AccessKeyPermission
)

// Full access key
await near
  .transaction("alice.near")
  .addKey("alice.near", "ed25519:...", { type: "fullAccess" })
  .send()

// Function call access key
await near
  .transaction("alice.near")
  .addKey("alice.near", "ed25519:...", {
    type: "functionCall",
    receiverId: "contract.near",
    methodNames: ["transfer", "approve"],
    allowance: "1 NEAR",
  })
  .send()
```

### Delete Key

```typescript
.deleteKey(accountId: string, publicKey: string)

await near
  .transaction("alice.near")
  .deleteKey("alice.near", "ed25519:...")
  .send()
```

### Stake

```typescript
.stake(amount: Amount, publicKey: string)

await near
  .transaction("alice.near")
  .stake("100 NEAR", "ed25519:...")
  .send()
```

### Signed Delegate Action

```typescript
.signedDelegateAction(signedDelegate: SignedDelegateAction)

// Used by relayers to submit meta-transactions
await near
  .transaction("relayer.near")
  .signedDelegateAction(signedDelegate)
  .send()
```

---

## Multi-Action Transactions

Chain multiple actions in a single atomic transaction:

```typescript
await near
  .transaction("alice.near")
  // Create new account
  .createAccount("app.alice.near")
  // Fund it
  .transfer("app.alice.near", "5 NEAR")
  // Add access key
  .addKey("app.alice.near", publicKey, { type: "fullAccess" })
  // Deploy contract
  .deployContract("app.alice.near", contractWasm)
  // Initialize contract
  .functionCall("app.alice.near", "init", { owner: "alice.near" })
  .send()
```

---

## Meta-Transactions (NEP-366)

Gasless transactions where a relayer pays for gas.

### User Side (Signs Off-Chain)

```typescript
import { Near } from "near-kit"

const userNear = new Near({
  network: "testnet",
  privateKey: "ed25519:...",
  defaultSignerId: "user.testnet",
})

// Build and sign delegate action (no gas cost)
const { payload, signedDelegateAction } = await userNear
  .transaction("user.testnet")
  .functionCall(
    "contract.near",
    "do_something",
    { arg: "value" },
    { gas: "30 Tgas" }
  )
  .delegate({
    blockHeightOffset: 100, // Valid for 100 blocks (~100 seconds)
  })

// Send payload to relayer via API
await fetch("/api/relay", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ payload }),
})
```

### Relayer Side (Pays Gas)

```typescript
import { decodeSignedDelegateAction, Near } from "near-kit"

const relayerNear = new Near({
  network: "testnet",
  privateKey: "ed25519:...",
  defaultSignerId: "relayer.testnet",
})

// Decode the payload from user
const signedDelegate = decodeSignedDelegateAction(payload)

// Submit to blockchain (relayer pays gas)
const result = await relayerNear
  .transaction("relayer.testnet")
  .signedDelegateAction(signedDelegate)
  .send()

// Contract sees user as the signer, relayer paid the gas
```

### Delegate Options

```typescript
.delegate({
  blockHeightOffset?: number,  // Validity window (default: 100 blocks)
  maxBlockHeight?: bigint,     // Explicit max block height
  receiverId?: string,         // Override receiver
  nonce?: bigint,              // Explicit nonce
  publicKey?: string,          // Specific key to use
  payloadFormat?: "base64" | "bytes", // Output format
})
```

---

## Advanced Patterns

### Building Without Sending

```typescript
// Build the transaction
const tx = await near
  .transaction("alice.near")
  .transfer("bob.near", "1 NEAR")
  .build()

// Sign it
const signedTx = await near
  .transaction("alice.near")
  .transfer("bob.near", "1 NEAR")
  .sign()

// Send separately
const result = await signedTx.send()
```

### Custom Signer Key

```typescript
await near
  .transaction("alice.near")
  .signWith("ed25519:...") // Use specific private key
  .transfer("bob.near", "1 NEAR")
  .send()
```

### Wait Until Options

```typescript
await near
  .transaction("alice.near")
  .transfer("bob.near", "1 NEAR")
  .send({ waitUntil: "FINAL" })  // Wait for finality

// Options: "NONE" | "INCLUDED" | "EXECUTED_OPTIMISTIC" | "FINAL"
```
