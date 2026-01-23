# Meta Transactions Guide

Gasless (relayer-sponsored) transaction patterns in near-api-js.

## Table of Contents

1. [Overview](#overview)
2. [Creating Signed Delegate Actions](#creating-signed-delegate-actions)
3. [Relayer Integration](#relayer-integration)
4. [Block Height TTL](#block-height-ttl)
5. [Error Handling](#error-handling)

---

## Overview

Meta transactions allow users to sign transactions without paying gas. A relayer submits the transaction on their behalf and covers gas costs.

**Flow:**
1. User creates and signs a `DelegateAction`
2. User sends signed delegate to relayer (off-chain)
3. Relayer wraps it in a transaction and submits to NEAR
4. Relayer pays gas, user's action executes

---

## Creating Signed Delegate Actions

```typescript
import { Account, actions } from "near-api-js"

const account = new Account(accountId, provider, privateKey)

// Create signed meta transaction
const signedDelegate = await account.createSignedMetaTransaction({
  receiverId: "contract.near",
  actions: [
    actions.functionCall(
      "some_method",
      { arg: "value" },
      30_000_000_000_000n,  // 30 TGas
      0n                    // No deposit
    )
  ]
})

// signedDelegate contains:
// - delegateAction: { senderId, receiverId, actions, nonce, maxBlockHeight, publicKey }
// - signature: Signature
```

### With Custom TTL

```typescript
const signedDelegate = await account.createSignedMetaTransaction({
  receiverId: "contract.near",
  actions: [actions.functionCall("method", {}, 30_000_000_000_000n, 0n)],
  blockHeightTtl: 100  // Valid for next 100 blocks (~100 seconds)
})
```

### Multiple Actions

```typescript
const signedDelegate = await account.createSignedMetaTransaction({
  receiverId: "contract.near",
  actions: [
    actions.functionCall("method1", { a: 1 }, 10_000_000_000_000n, 0n),
    actions.functionCall("method2", { b: 2 }, 10_000_000_000_000n, 0n),
    actions.transfer(1_000_000_000_000_000_000_000n)
  ]
})
```

---

## Relayer Integration

### Relayer-Side: Submit Meta Transaction

```typescript
import { Account, actions } from "near-api-js"

// Relayer account (has NEAR for gas)
const relayerAccount = new Account("relayer.near", provider, relayerPrivateKey)

// Receive signedDelegate from user (e.g., via HTTP API)
const signedDelegate = await receiveFromUser()

// Submit the meta transaction
const result = await relayerAccount.signAndSendTransaction({
  receiverId: signedDelegate.delegateAction.senderId,
  actions: [actions.signedDelegate(signedDelegate)]
})
```

### Full Example: User + Relayer

```typescript
// =====================
// USER SIDE
// =====================
const userAccount = new Account("user.near", provider, userPrivateKey)

const signedDelegate = await userAccount.createSignedMetaTransaction({
  receiverId: "nft.near",
  actions: [
    actions.functionCall(
      "nft_mint",
      { token_id: "123", receiver_id: "user.near" },
      50_000_000_000_000n,
      0n
    )
  ]
})

// Send to relayer via HTTP/WebSocket
const response = await fetch("https://relayer.example.com/relay", {
  method: "POST",
  body: JSON.stringify({
    signedDelegate: {
      delegateAction: signedDelegate.delegateAction,
      signature: Array.from(signedDelegate.signature.data)
    }
  })
})

// =====================
// RELAYER SIDE
// =====================
const relayerAccount = new Account("relayer.near", provider, relayerPrivateKey)

// Reconstruct from HTTP request
const { signedDelegate } = await request.json()

await relayerAccount.signAndSendTransaction({
  receiverId: signedDelegate.delegateAction.senderId,
  actions: [actions.signedDelegate(signedDelegate)]
})
```

---

## Block Height TTL

Meta transactions expire after a certain block height to prevent replay attacks.

```typescript
// Default: 100 blocks (~100 seconds at 1 block/second)
const signedDelegate = await account.createSignedMetaTransaction({
  receiverId: "contract.near",
  actions: [...],
  blockHeightTtl: 100
})

// Check expiration
const currentBlock = await provider.viewBlock({ finality: "final" })
const expiresAt = signedDelegate.delegateAction.maxBlockHeight
const blocksRemaining = Number(expiresAt) - currentBlock.header.height

if (blocksRemaining <= 0) {
  throw new Error("Meta transaction expired")
}
```

### Short TTL for Security

```typescript
// Very short window (10 blocks = ~10 seconds)
const signedDelegate = await account.createSignedMetaTransaction({
  receiverId: "contract.near",
  actions: [actions.functionCall("sensitive_action", {}, 30_000_000_000_000n, 0n)],
  blockHeightTtl: 10
})
```

### Long TTL for Async Workflows

```typescript
// Longer window (1000 blocks = ~16 minutes)
const signedDelegate = await account.createSignedMetaTransaction({
  receiverId: "contract.near",
  actions: [...],
  blockHeightTtl: 1000
})
```

---

## Error Handling

### Expired Meta Transaction

```typescript
try {
  await relayerAccount.signAndSendTransaction({
    receiverId: signedDelegate.delegateAction.senderId,
    actions: [actions.signedDelegate(signedDelegate)]
  })
} catch (error) {
  if (error.message.includes("Expired")) {
    // Request fresh signedDelegate from user
  }
}
```

### Invalid Signature

```typescript
try {
  await relayerAccount.signAndSendTransaction({...})
} catch (error) {
  if (error.message.includes("InvalidSignature")) {
    // User's signature doesn't match public key
  }
}
```

### Nonce Issues

```typescript
try {
  await relayerAccount.signAndSendTransaction({...})
} catch (error) {
  if (error.message.includes("InvalidNonce")) {
    // Meta transaction already used or nonce expired
  }
}
```

---

## Use Cases

### Gasless NFT Minting

```typescript
// User signs mint action without needing NEAR
const signedDelegate = await userAccount.createSignedMetaTransaction({
  receiverId: "nft.near",
  actions: [actions.functionCall("nft_mint", { token_id: "1" }, 50_000_000_000_000n, 0n)]
})
// Relayer sponsors the gas
```

### Social Recovery

```typescript
// Recovery guardian signs on behalf of locked account
const signedDelegate = await recoveryAccount.createSignedMetaTransaction({
  receiverId: "social-recovery.near",
  actions: [actions.functionCall("recover_account", { new_public_key: "ed25519:..." }, 30_000_000_000_000n, 0n)]
})
```

### Batch Onboarding

```typescript
// Single relayer tx can include multiple user meta txs
const signedDelegates = await Promise.all(
  users.map(user => user.account.createSignedMetaTransaction({...}))
)

// Submit all in parallel
await Promise.all(
  signedDelegates.map(sd =>
    relayerAccount.signAndSendTransaction({
      receiverId: sd.delegateAction.senderId,
      actions: [actions.signedDelegate(sd)]
    })
  )
)
```
