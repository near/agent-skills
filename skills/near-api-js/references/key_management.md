# Key Management Guide

Comprehensive guide for cryptographic key operations in near-api-js.

## Table of Contents

1. [KeyPair Types](#keypair-types)
2. [Key Generation](#key-generation)
3. [Seed Phrases (BIP39)](#seed-phrases-bip39)
4. [Signers](#signers)
5. [Access Keys](#access-keys)
6. [Key Rotation](#key-rotation)

---

## KeyPair Types

```typescript
import { KeyPair, KeyPairEd25519, KeyPairSecp256k1, KeyType, PublicKey } from "near-api-js"

// Ed25519 (default, recommended)
const ed25519Key = KeyPair.fromRandom("ed25519")

// Secp256k1 (Ethereum-compatible)
const secp256k1Key = KeyPair.fromRandom("secp256k1")

// Type checking
ed25519Key.getPublicKey().keyType === KeyType.ED25519  // true
```

### Key String Formats

```typescript
// Private key string format: "curve:base58EncodedKey"
const privateKeyString = "ed25519:5Fg2xvP1s..."
const keyPair = KeyPair.fromString(privateKeyString)

// Get components
const publicKey = keyPair.getPublicKey()     // PublicKey object
const secretKey = keyPair.getSecretKey()     // Base58 string "ed25519:..."

// Public key string
publicKey.toString()  // "ed25519:BGCCDDHf..."
publicKey.data        // Uint8Array (32 bytes for ed25519)
```

---

## Key Generation

### Random Key Generation

```typescript
import { KeyPair } from "near-api-js"

// Generate random keypair
const keyPair = KeyPair.fromRandom("ed25519")

console.log("Public Key:", keyPair.getPublicKey().toString())
console.log("Secret Key:", keyPair.getSecretKey())
```

### From Existing Key

```typescript
// From private key string
const keyPair = KeyPair.fromString("ed25519:5Fg2xvPr...")

// Parse public key only
const publicKey = PublicKey.fromString("ed25519:BGCCDDHf...")
```

### Signing and Verification

```typescript
const message = new TextEncoder().encode("Hello NEAR")

// Sign data
const { signature, publicKey } = keyPair.sign(message)
// signature: Uint8Array, publicKey: PublicKey

// Verify signature
const isValid = keyPair.verify(message, signature)  // true/false

// Verify with public key only
const isValid2 = publicKey.verify(message, signature)
```

---

## Seed Phrases (BIP39)

```typescript
import { generateSeedPhrase, parseSeedPhrase } from "near-api-js/seed-phrase"

// Generate new 12-word seed phrase
const { seedPhrase, secretKey, publicKey } = generateSeedPhrase()
// seedPhrase: "word1 word2 word3 ... word12"
// secretKey: "ed25519:..."
// publicKey: "ed25519:..."

// Parse existing seed phrase
const keys = parseSeedPhrase("abandon abandon abandon ... about")
// keys.secretKey: "ed25519:..."
// keys.publicKey: "ed25519:..."

// Use with Account
const keyPair = KeyPair.fromString(keys.secretKey)
const account = new Account(accountId, provider, keyPair)
```

---

## Signers

### KeyPairSigner

```typescript
import { KeyPairSigner, KeyPair } from "near-api-js"

// Create signer from keypair
const keyPair = KeyPair.fromString("ed25519:...")
const signer = new KeyPairSigner(keyPair)

// Use with Account
const account = new Account(accountId, provider, signer)
```

### InMemorySigner (deprecated alias)

```typescript
import { InMemorySigner as KeyPairSigner } from "near-api-js"
```

### MultiKeySigner (Parallel Transactions)

```typescript
import { MultiKeySigner, KeyPair, Account } from "near-api-js"
import { NEAR } from "near-api-js/tokens"

// Create multiple keys
const keys = Array.from({ length: 10 }, () => KeyPair.fromRandom("ed25519"))

// First, add all keys to the account
await account.signAndSendTransaction({
  receiverId: account.accountId,
  actions: keys.map(k => actions.addFullAccessKey(k.getPublicKey()))
})

// Create multi-key signer
const multiSigner = new MultiKeySigner(keys)
const multiAccount = new Account(accountId, provider, multiSigner)

// Send parallel transactions (each uses different nonce)
const transfers = Array.from({ length: 100 }, (_, i) =>
  multiAccount.transfer({
    receiverId: `user${i}.near`,
    amount: NEAR.toUnits("0.01"),
    token: NEAR
  })
)
await Promise.all(transfers)
```

### Custom Signer

```typescript
import { Signer } from "near-api-js"

class CustomSigner extends Signer {
  async signBytes(message: Uint8Array): Promise<{
    signature: Uint8Array
    publicKey: PublicKey
  }> {
    // Custom signing logic (HSM, hardware wallet, etc.)
    const signature = await myHsm.sign(message)
    return { signature, publicKey: this.publicKey }
  }
}
```

---

## Access Keys

### Full Access Keys

```typescript
import { actions } from "near-api-js"

// Add full access key
await account.addFullAccessKey({
  publicKey: newKeyPair.getPublicKey()
})

// Or via transaction
await account.signAndSendTransaction({
  receiverId: account.accountId,
  actions: [actions.addFullAccessKey(publicKey)]
})
```

### Function Call Keys

```typescript
// Add function-call key with allowance
await account.addFunctionAccessKey({
  publicKey: newKeyPair.getPublicKey(),
  contractId: "contract.near",
  methodNames: ["method1", "method2"],  // Empty = all methods
  allowance: NEAR.toUnits("0.25")       // Gas allowance
})

// Query key info
const keyInfo = await account.getAccessKey(publicKey)
// keyInfo.permission = { FunctionCall: { allowance, receiver_id, method_names } }
```

### Delete Key

```typescript
await account.deleteKey({ publicKey: oldKey.getPublicKey() })
```

### List All Keys

```typescript
const { keys } = await account.getAccessKeyList()
// keys: Array<{ public_key, access_key: { nonce, permission } }>

keys.forEach(k => {
  if (k.access_key.permission === "FullAccess") {
    console.log("Full access key:", k.public_key)
  } else {
    const { receiver_id, method_names } = k.access_key.permission.FunctionCall
    console.log(`Function call key for ${receiver_id}:`, method_names)
  }
})
```

---

## Key Rotation

### Rotate Full Access Key

```typescript
// Generate new key
const newKeyPair = KeyPair.fromRandom("ed25519")

// Add new key, delete old key in single transaction
await account.signAndSendTransaction({
  receiverId: account.accountId,
  actions: [
    actions.addFullAccessKey(newKeyPair.getPublicKey()),
    actions.deleteKey(oldKeyPair.getPublicKey())
  ]
})

// Update account signer
account.setSigner(new KeyPairSigner(newKeyPair))
```

### Rotate Function Call Key

```typescript
const newKey = KeyPair.fromRandom("ed25519")

await account.signAndSendTransaction({
  receiverId: account.accountId,
  actions: [
    actions.addFunctionAccessKey(
      newKey.getPublicKey(),
      "contract.near",
      ["allowed_method"],
      NEAR.toUnits("0.25")
    ),
    actions.deleteKey(oldKey.getPublicKey())
  ]
})
```

### Check Allowance Remaining

```typescript
const keyInfo = await account.getAccessKey(publicKey)
const remaining = keyInfo.permission.FunctionCall.allowance
console.log(`Remaining allowance: ${NEAR.toDecimal(BigInt(remaining))} NEAR`)
```
