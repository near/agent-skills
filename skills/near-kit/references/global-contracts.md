# Global Contracts

Publish contract code once, deploy instances by reference. Based on NEP-616.

## Table of Contents
- [Use Cases](#use-cases)
- [Publishing Code](#publishing-code)
- [Deploying by Reference](#deploying-by-reference)
- [Deterministic Account IDs](#deterministic-account-ids-nep-616)

---

## Use Cases

- **Factories:** Deploy new contracts for users at ~0.1 NEAR instead of ~4 NEAR
- **Standard Libraries:** Publish trusted implementations everyone can use

---

## Publishing Code

Publishing requires storage deposit (~1 NEAR per 100KB).

### Updatable Contracts (Default)

Identified by **your account ID**. You can update the code later.

```typescript
import { readFileSync } from "fs"

const wasm = readFileSync("./my-token.wasm")

// Publish updatable contract
await near.transaction("factory.near").publishContract(wasm).send()

// Update later:
const updatedWasm = readFileSync("./my-token-v2.wasm")
await near
  .transaction("factory.near")
  .publishContract(updatedWasm) // Overwrites previous version
  .send()
```

### Immutable Contracts (Trustless)

Identified by **SHA-256 hash**. Can never be changed.

```typescript
import { readFileSync } from "fs"
import { createHash } from "crypto"

const wasm = readFileSync("./my-token.wasm")

// Calculate hash locally
const codeHash = createHash("sha256").update(wasm).digest()

// Publish as immutable
await near
  .transaction("deployer.near")
  .publishContract(wasm, { identifiedBy: "hash" })
  .send()

console.log("Hash:", codeHash.toString("base64"))
```

---

## Deploying by Reference

Use `deployFromPublished` instead of `deployContract`. Extremely cheap - uses almost no bandwidth or storage.

### From Account (Updatable)

```typescript
await near
  .transaction("user.near")
  .createAccount("dao.user.near")
  .transfer("dao.user.near", "1 NEAR") // Storage for state, not code!
  .deployFromPublished({ accountId: "factory.near" })
  .functionCall("dao.user.near", "init", {})
  .send()
```

### From Hash (Immutable)

```typescript
const codeHash = "5FzD8..." // Base58-encoded hash

await near
  .transaction("user.near")
  .createAccount("token.user.near")
  .transfer("token.user.near", "1 NEAR")
  .deployFromPublished({ codeHash })
  .functionCall("token.user.near", "init", { supply: "1000" })
  .send()
```

---

## Deterministic Account IDs (NEP-616)

Deploy contracts to deterministic addresses (starting with `0s`) derived from initialization state.

### Deploying with StateInit

```typescript
import { deriveAccountId } from "near-kit"

const encoder = new TextEncoder();

// Deploy to deterministic address (auto-derived from state)
await near
  .transaction("alice.near")
  .stateInit({
    code: { accountId: "publisher.near" },
    data: new Map([
      [encoder.encode("owner"), encoder.encode("alice.near")]
    ]),
    deposit: "1 NEAR",
  })
  .send()

// If already deployed, deposit is refunded automatically
```

### Computing Addresses

```typescript
const encoder = new TextEncoder();

// Derive address without deploying
const accountId = deriveAccountId({
  code: { accountId: "publisher.near" },
  data: new Map([
    [encoder.encode("owner"), encoder.encode("alice.near")]
  ]),
})
// => "0s1234567890abcdef1234567890abcdef12345678"

// Check if account is deterministic
isDeterministicAccountId("0s123...") // true
isDeterministicAccountId("alice.near") // false
```

### Why Use This?

- **Anyone can deploy:** Predictable addresses let anyone pay to deploy
- **Sharded contracts:** Deploy many instances with predictable addresses
- **Code verification:** Verify another contract is running specific code
