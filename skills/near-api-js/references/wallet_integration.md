# Wallet Integration Guide

Browser wallet integration patterns for NEAR applications.

## Table of Contents

1. [Overview](#overview)
2. [Direct Account Usage](#direct-account-usage)
3. [NEP-413 Message Signing](#nep-413-message-signing)
4. [Function Call Access Keys](#function-call-access-keys)
5. [Session Management](#session-management)

---

## Overview

near-api-js provides low-level primitives. For full wallet integration in web apps, use:
- **@near-wallet-selector/core** - Unified wallet interface
- **near-api-js** - Account and transaction operations after connection

---

## Direct Account Usage

### From Private Key

```typescript
import { Account, JsonRpcProvider } from "near-api-js"

const provider = new JsonRpcProvider({ url: "https://rpc.mainnet.near.org" })
const account = new Account("my-account.near", provider, "ed25519:privateKey...")

// Now ready to sign transactions
await account.callFunction({
  contractId: "contract.near",
  methodName: "some_method",
  args: { foo: "bar" }
})
```

### From Seed Phrase

```typescript
import { Account, KeyPair, JsonRpcProvider } from "near-api-js"
import { parseSeedPhrase } from "near-api-js/seed-phrase"

const { secretKey } = parseSeedPhrase("word1 word2 ... word12")
const keyPair = KeyPair.fromString(secretKey)

const provider = new JsonRpcProvider({ url: "https://rpc.mainnet.near.org" })
const account = new Account("my-account.near", provider, keyPair)
```

### Read-Only (No Signer)

```typescript
// Query only - no transaction capabilities
const provider = new JsonRpcProvider({ url: "https://rpc.mainnet.near.org" })

// View account state
const accountInfo = await provider.viewAccount({ accountId: "alice.near" })

// Call view methods
const result = await provider.callFunction({
  contractId: "contract.near",
  method: "get_data",
  args: { key: "value" }
})
```

---

## NEP-413 Message Signing

Sign off-chain messages for authentication (login, verification).

### Signing a Message

```typescript
import { Account } from "near-api-js"

const account = new Account(accountId, provider, privateKey)

// Sign message for verification
const signedMessage = await account.signNep413Message({
  message: "Login to MyApp",
  recipient: "myapp.com",
  nonce: crypto.getRandomValues(new Uint8Array(32))
})

// Returns:
// {
//   signature: Signature,
//   publicKey: PublicKey,
//   accountId: string
// }
```

### Verifying a Message

```typescript
import { verifyMessage } from "near-api-js/nep413"

const isValid = await verifyMessage({
  message: "Login to MyApp",
  recipient: "myapp.com",
  nonce: originalNonce,
  signature: signedMessage.signature,
  publicKey: signedMessage.publicKey,
  accountId: signedMessage.accountId
})

if (isValid) {
  // User authenticated
}
```

### Authentication Flow

```typescript
// 1. Server generates nonce
const nonce = crypto.getRandomValues(new Uint8Array(32))
const nonceB64 = btoa(String.fromCharCode(...nonce))

// 2. Client signs
const signedMessage = await account.signNep413Message({
  message: `Sign in to MyApp\nNonce: ${nonceB64}`,
  recipient: "myapp.com",
  nonce
})

// 3. Send to server
await fetch("/api/auth/verify", {
  method: "POST",
  body: JSON.stringify({
    accountId: signedMessage.accountId,
    publicKey: signedMessage.publicKey.toString(),
    signature: Array.from(signedMessage.signature.data),
    nonce: nonceB64,
    message: `Sign in to MyApp\nNonce: ${nonceB64}`
  })
})

// 4. Server verifies (see verifyMessage above)
```

---

## Function Call Access Keys

Limited keys for specific contract methods with gas allowance.

### Creating Session Key

```typescript
import { KeyPair, actions } from "near-api-js"
import { NEAR } from "near-api-js/tokens"

// Generate new key for this session
const sessionKey = KeyPair.fromRandom("ed25519")

// Add as function-call key (requires full-access key to add)
await account.addFunctionAccessKey({
  publicKey: sessionKey.getPublicKey(),
  contractId: "game.near",
  methodNames: ["play_move", "join_game", "leave_game"],
  allowance: NEAR.toUnits("0.25")  // Gas budget
})

// Store session key locally
localStorage.setItem("sessionKey", sessionKey.getSecretKey())
localStorage.setItem("sessionKeyContract", "game.near")
```

### Using Session Key

```typescript
const sessionKeyStr = localStorage.getItem("sessionKey")
const sessionKey = KeyPair.fromString(sessionKeyStr)

// Create account with session key
const sessionAccount = new Account(accountId, provider, sessionKey)

// Can only call allowed methods on allowed contract
await sessionAccount.callFunction({
  contractId: "game.near",
  methodName: "play_move",
  args: { x: 1, y: 2 }
  // Uses allowance for gas, no deposit allowed
})
```

### Checking Allowance

```typescript
const keyInfo = await account.getAccessKey(sessionKey.getPublicKey())

if (keyInfo.permission === "FullAccess") {
  console.log("Full access key")
} else {
  const { allowance, receiver_id, method_names } = keyInfo.permission.FunctionCall
  console.log(`Remaining allowance: ${NEAR.toDecimal(BigInt(allowance))} NEAR`)
  console.log(`Contract: ${receiver_id}`)
  console.log(`Methods: ${method_names.join(", ") || "all"}`)
}
```

---

## Session Management

### Local Storage Pattern

```typescript
interface Session {
  accountId: string
  secretKey: string
  contractId: string
  expiresAt: number
}

// Save session
function saveSession(accountId: string, keyPair: KeyPair, contractId: string) {
  const session: Session = {
    accountId,
    secretKey: keyPair.getSecretKey(),
    contractId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000  // 24 hours
  }
  localStorage.setItem("nearSession", JSON.stringify(session))
}

// Load session
function loadSession(): Account | null {
  const data = localStorage.getItem("nearSession")
  if (!data) return null
  
  const session: Session = JSON.parse(data)
  if (Date.now() > session.expiresAt) {
    localStorage.removeItem("nearSession")
    return null
  }
  
  const keyPair = KeyPair.fromString(session.secretKey)
  return new Account(session.accountId, provider, keyPair)
}

// Clear session
function logout() {
  localStorage.removeItem("nearSession")
}
```

### Cleanup Old Keys

```typescript
async function cleanupOldSessionKeys(account: Account) {
  const { keys } = await account.getAccessKeyList()
  
  for (const key of keys) {
    if (key.access_key.permission === "FullAccess") continue
    
    const { allowance } = key.access_key.permission.FunctionCall
    
    // Delete keys with depleted allowance
    if (BigInt(allowance) < NEAR.toUnits("0.01")) {
      await account.deleteKey({ publicKey: key.public_key })
    }
  }
}
```

---

## Provider Selection

### Multiple RPC Endpoints

```typescript
import { JsonRpcProvider, FailoverRpcProvider } from "near-api-js"

// Primary + backup RPCs
const provider = new FailoverRpcProvider([
  new JsonRpcProvider({ url: "https://rpc.mainnet.near.org" }),
  new JsonRpcProvider({ url: "https://rpc.mainnet.pagoda.co" }),
  new JsonRpcProvider({ url: "https://free.rpc.fastnear.com" })
])

const account = new Account(accountId, provider, keyPair)
```

### Network-Specific Providers

```typescript
const NETWORKS = {
  mainnet: "https://rpc.mainnet.near.org",
  testnet: "https://rpc.testnet.near.org"
}

function getProvider(network: "mainnet" | "testnet") {
  return new JsonRpcProvider({ url: NETWORKS[network] })
}
```
