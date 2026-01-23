# Keys and Testing

Key management options and local testing with Sandbox.

## Table of Contents
- [Key Stores](#key-stores)
- [Key Utilities](#key-utilities)
- [Sandbox Testing](#sandbox-testing)
- [NEP-413 Message Signing](#nep-413-message-signing)

---

## Key Stores

### InMemoryKeyStore

Ephemeral storage for runtime use.

```typescript
import { Near, InMemoryKeyStore } from "near-kit"

const keyStore = new InMemoryKeyStore({
  "alice.near": "ed25519:...",
  "bob.near": "ed25519:...",
})

const near = new Near({
  network: "mainnet",
  keyStore,
})
```

### FileKeyStore

Persistent file-based storage (NEAR CLI compatible).

```typescript
import { Near } from "near-kit"
import { FileKeyStore } from "near-kit/keys/file"

const near = new Near({
  network: "mainnet",
  keyStore: new FileKeyStore("~/.near-credentials"),
})
```

### NativeKeyStore

OS keyring integration (macOS Keychain, Windows Credential Manager).

```typescript
import { Near } from "near-kit"
import { NativeKeyStore } from "near-kit/keys/native"

const near = new Near({
  network: "mainnet",
  keyStore: new NativeKeyStore(),
})
```

### RotatingKeyStore

High-throughput concurrent transactions with multiple keys.

```typescript
import { Near, RotatingKeyStore } from "near-kit"

// Multiple keys per account for parallel transactions
const keyStore = new RotatingKeyStore({
  "bot.near": [
    "ed25519:key1...",
    "ed25519:key2...",
    "ed25519:key3...",
    "ed25519:key4...",
    "ed25519:key5...",
  ],
})

const near = new Near({ network: "mainnet", keyStore })

// Send 20 concurrent transactions - no nonce collisions!
await Promise.all(
  Array(20).fill(0).map(() => 
    near.send("recipient.near", "0.1 NEAR")
  )
)
```

### Direct Private Key

Simplest option for scripts.

```typescript
const near = new Near({
  network: "testnet",
  privateKey: "ed25519:...",
  defaultSignerId: "alice.testnet",
})
```

---

## Key Utilities

```typescript
import {
  generateKey,
  parseKey,
  generateSeedPhrase,
  parseSeedPhrase,
  isValidAccountId,
  isPrivateKey,
  isValidPublicKey,
  validatePrivateKey,
} from "near-kit"

// Generate new keypair
const { publicKey, privateKey, secretKey } = generateKey()

// Parse existing key
const keyPair = parseKey("ed25519:...")

// Seed phrase support
const seed = generateSeedPhrase()
// { seedPhrase: "word1 word2 ...", publicKey: "ed25519:...", privateKey: "ed25519:..." }

const restored = parseSeedPhrase("word1 word2 ... word12")
// { publicKey: "ed25519:...", privateKey: "ed25519:..." }

// Validation
isValidAccountId("alice.near")      // true
isValidAccountId("INVALID")         // false
isPrivateKey("ed25519:...")         // true
isValidPublicKey("ed25519:...")     // true
validatePrivateKey("ed25519:...")   // throws if invalid
```

---

## Sandbox Testing

Local NEAR node for integration testing.

### Basic Usage

```typescript
import { Near } from "near-kit"
import { Sandbox } from "near-kit/sandbox"

const sandbox = await Sandbox.start()
const near = new Near({ network: sandbox })

// Root account available for setup
console.log("Root account:", sandbox.rootAccount.id)
// e.g., "test.near"

// Create test account
const testAccount = `test-${Date.now()}.${sandbox.rootAccount.id}`
await near
  .transaction(sandbox.rootAccount.id)
  .createAccount(testAccount)
  .transfer(testAccount, "10 NEAR")
  .send()

// Run tests...

await sandbox.stop()
```

### Vitest Integration

```typescript
import { describe, test, beforeAll, afterAll, expect } from "vitest"
import { Near } from "near-kit"
import { Sandbox } from "near-kit/sandbox"

describe("My Contract Tests", () => {
  let sandbox: Sandbox
  let near: Near

  beforeAll(async () => {
    sandbox = await Sandbox.start()
    near = new Near({ network: sandbox })
  }, 60000) // Sandbox startup timeout

  afterAll(async () => {
    await sandbox.stop()
  })

  test("should create account", async () => {
    const account = `test-${Date.now()}.${sandbox.rootAccount.id}`
    
    await near
      .transaction(sandbox.rootAccount.id)
      .createAccount(account)
      .transfer(account, "5 NEAR")
      .send()

    const exists = await near.accountExists(account)
    expect(exists).toBe(true)

    const balance = await near.getBalance(account)
    expect(balance).toContain("NEAR")
  })

  test("should deploy and call contract", async () => {
    const contractWasm = await fs.readFile("./contract.wasm")
    const contract = `contract-${Date.now()}.${sandbox.rootAccount.id}`

    await near
      .transaction(sandbox.rootAccount.id)
      .createAccount(contract)
      .transfer(contract, "10 NEAR")
      .deployContract(contract, contractWasm)
      .functionCall(contract, "init", { owner: sandbox.rootAccount.id })
      .send()

    const result = await near.view(contract, "get_owner", {})
    expect(result).toBe(sandbox.rootAccount.id)
  })
})
```

### Unique Account Names

Always use unique names to avoid conflicts:

```typescript
const uniqueAccount = `test-${Date.now()}.${sandbox.rootAccount.id}`
// e.g., "test-1706012345678.test.near"
```

---

## NEP-413 Message Signing

Gasless authentication using cryptographic signatures.

### Client Side (Sign Message)

```typescript
import { Near, generateNonce } from "near-kit"

const near = new Near({
  network: "mainnet",
  privateKey: "ed25519:...",
  defaultSignerId: "user.near",
})

// Generate random nonce for replay protection
const nonce = generateNonce()

// Sign message (no gas cost)
const signedMessage = await near.signMessage({
  message: "Sign in to My App",
  recipient: "myapp.com",
  nonce,
})

// Send to server for verification
await fetch("/api/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    signedMessage,
    nonce: Array.from(nonce),
  }),
})
```

### Server Side (Verify Signature)

```typescript
import { verifyNep413Signature, type SignedMessage } from "near-kit"

function verifyLogin(
  signedMessage: SignedMessage,
  nonce: Uint8Array
): boolean {
  const isValid = verifyNep413Signature(signedMessage, {
    message: "Sign in to My App",
    recipient: "myapp.com",
    nonce,
  })

  if (!isValid) {
    return false
  }

  // Check nonce hasn't been used (prevent replay attacks)
  // await db.checkAndStoreNonce(nonce)

  // signedMessage.accountId contains the authenticated account
  console.log("Authenticated:", signedMessage.accountId)

  // Issue session token
  // const token = createJWT({ accountId: signedMessage.accountId })

  return true
}
```

### SignedMessage Structure

```typescript
interface SignedMessage {
  accountId: string
  publicKey: string
  signature: string
  message: string
  recipient: string
  nonce: number[]
}
```
