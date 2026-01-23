# near-api-js API Patterns Reference

Detailed patterns and advanced usage examples for near-api-js.

## Table of Contents

1. [Account Methods Reference](#account-methods-reference)
2. [Provider Methods Reference](#provider-methods-reference)
3. [Action Types](#action-types)
4. [Type Definitions](#type-definitions)
5. [Advanced Patterns](#advanced-patterns)

---

## Account Methods Reference

### State & Information

| Method | Description | Returns |
|--------|-------------|---------|
| `getState()` | Account balance, storage usage, code hash | `AccountState` |
| `getAccessKey(publicKey)` | Single access key info | `AccessKeyView` |
| `getAccessKeyList()` | All access keys | `AccessKeyList` |
| `getContractCode()` | Deployed contract WASM | `{ code_base64, hash }` |
| `getContractState(prefix?)` | Contract key-value storage | `{ values }` |

### Transactions

| Method | Description |
|--------|-------------|
| `signAndSendTransaction({ receiverId, actions })` | Sign and broadcast single tx |
| `signAndSendTransactions({ transactions })` | Batch multiple transactions |
| `createTransaction({ receiverId, actions, publicKey })` | Create unsigned tx |
| `createSignedTransaction({ receiverId, actions })` | Create signed tx without sending |

### Account Management

| Method | Description |
|--------|-------------|
| `createAccount({ newAccountId, publicKey, nearToTransfer? })` | Create named account |
| `createSubAccount({ accountOrPrefix, publicKey, nearToTransfer? })` | Create `prefix.parent.near` |
| `deleteAccount({ beneficiaryId })` | Delete account, send funds to beneficiary |

### Key Management

| Method | Description |
|--------|-------------|
| `addFunctionAccessKey({ publicKey, contractId, methodNames?, allowance? })` | Add limited key |
| `addFullAccessKey({ publicKey })` | Add full access key |
| `deleteKey({ publicKey })` | Remove access key |

### Tokens

| Method | Description |
|--------|-------------|
| `transfer({ receiverId, amount, token? })` | Transfer NEAR or FT |
| `callFunction({ contractId, methodName, args, deposit?, gas? })` | Call contract method |

---

## Provider Methods Reference

### Account Queries

```typescript
// View account
await provider.viewAccount({ accountId, blockQuery? })  // AccountView

// View access key
await provider.viewAccessKey({ accountId, publicKey, finalityQuery? })

// View all access keys
await provider.viewAccessKeyList({ accountId, finalityQuery? })
```

### Contract Queries

```typescript
// Call view method (read-only)
await provider.callFunction<ReturnType>({ 
  contractId, 
  method, 
  args,  // JSON object or Uint8Array
  blockQuery?
})

// View contract code
await provider.viewContractCode({ contractId, blockQuery? })

// View contract state (raw key-values)
await provider.viewContractState({ contractId, prefix?, blockQuery? })
```

### Block & Chunk

```typescript
// View block
await provider.viewBlock({ finality: "final" })
await provider.viewBlock({ blockId: 12345 })
await provider.viewBlock({ blockId: "9eVs..." })

// View chunk
await provider.viewChunk({ chunkId: "HFks..." })
await provider.viewChunk({ blockId: 12345, shardId: 0 })
```

### Transaction

```typescript
// Send signed transaction
await provider.sendTransaction(signedTx)

// Send and wait
await provider.sendTransactionAsync({ signedTx, waitUntil: "EXECUTED_OPTIMISTIC" })

// View transaction status
await provider.viewTransactionStatus({ txHash, accountId, waitUntil? })
await provider.viewTransactionStatusWithReceipts({ txHash, accountId })
```

### Network

```typescript
await provider.viewNodeStatus()
await provider.viewGasPrice(blockId?)
await provider.viewValidators({ blockId? } | { epochId? })
await provider.getNetworkId()
```

---

## Action Types

All actions from `near-api-js`:

```typescript
import { actions } from "near-api-js"

// Transfer NEAR
actions.transfer(amount: bigint)

// Function call
actions.functionCall(
  methodName: string,
  args: object | Uint8Array,
  gas: bigint,
  deposit: bigint
)

// Account creation
actions.createAccount()

// Deploy contract
actions.deployContract(code: Uint8Array)

// Key management
actions.addFullAccessKey(publicKey: PublicKey)
actions.addFunctionAccessKey(
  publicKey: PublicKey,
  contractId: string,
  methodNames: string[],
  allowance?: bigint
)
actions.deleteKey(publicKey: PublicKey)

// Account deletion
actions.deleteAccount(beneficiaryId: string)

// Use global contract
actions.useGlobalContract(identifier: string | Uint8Array)

// Staking
actions.stake(amount: bigint, publicKey: PublicKey)

// Meta transaction
actions.signedDelegate(signedDelegateAction: SignedDelegateAction)
```

---

## Type Definitions

### Key Types

```typescript
type CurveType = "ed25519" | "secp256k1"
type KeyPairString = `${CurveType}:${string}`
```

### Block Reference

```typescript
type BlockReference = 
  | { finality: "final" | "optimistic" }
  | { blockId: number | string }  // height or hash
  | { syncCheckpoint: "genesis" | "earliest_available" }
```

### Transaction Status

```typescript
type TxExecutionStatus = 
  | "NONE"
  | "INCLUDED"
  | "INCLUDED_FINAL"
  | "EXECUTED"
  | "EXECUTED_OPTIMISTIC"
  | "FINAL"
```

### AccountState

```typescript
interface AccountState {
  balance: {
    total: bigint
    usedOnStorage: bigint
    locked: bigint
    available: bigint
  }
  storageUsage: number
  codeHash: string
}
```

---

## Advanced Patterns

### Parallel Transactions with MultiKeySigner

```typescript
import { Account, MultiKeySigner, KeyPair, actions } from "near-api-js"
import { NEAR } from "near-api-js/tokens"

// Add multiple keys to account first
const keys = Array.from({ length: 10 }, () => KeyPair.fromRandom("ed25519"))
await account.signAndSendTransaction({
  receiverId: account.accountId,
  actions: keys.map(k => actions.addFullAccessKey(k.getPublicKey()))
})

// Use MultiKeySigner for parallel txs
const multiSigner = new MultiKeySigner(keys)
const multiAccount = new Account(accountId, provider, multiSigner)

// Send 100 transfers in parallel
const transfers = Array.from({ length: 100 }, (_, i) =>
  multiAccount.transfer({
    receiverId: `user${i}.testnet`,
    amount: NEAR.toUnits("0.01"),
    token: NEAR
  })
)
await Promise.all(transfers)
```

### Custom Contract Interface

```typescript
import { Contract, Account } from "near-api-js"

interface MyContract {
  // View methods (read-only)
  get_message(): Promise<string>
  get_count(): Promise<number>
  
  // Change methods (require gas)
  set_message(args: { message: string }): Promise<void>
  increment(): Promise<void>
}

const contract = new Contract(
  account,
  "my-contract.near",
  {
    viewMethods: ["get_message", "get_count"],
    changeMethods: ["set_message", "increment"]
  }
) as unknown as MyContract

// Usage
const message = await contract.get_message()
await contract.set_message({ message: "Hello" })
```

### NEP-413 Message Signing

```typescript
// Sign off-chain message (for authentication)
const signed = await account.signNep413Message({
  message: "Login to MyApp",
  recipient: "myapp.com",
  nonce: crypto.getRandomValues(new Uint8Array(32))
})

// Returns: { signature, publicKey, accountId }
```

### Handling Nonce Errors

```typescript
import { InvalidNonceError } from "near-api-js"

try {
  await account.signAndSendTransaction({
    receiverId,
    actions,
    retries: 3  // Auto-retry on nonce errors
  })
} catch (error) {
  if (error instanceof InvalidNonceError) {
    // Handle stale nonce
  }
}
```

### Access Key Allowance Management

```typescript
// Add function call key with 1 NEAR allowance
await account.addFunctionAccessKey({
  publicKey: newKey.getPublicKey(),
  contractId: "contract.near",
  methodNames: ["method1", "method2"],  // empty = all methods
  allowance: NEAR.toUnits("1")  // gas allowance in NEAR
})

// Check remaining allowance
const keyInfo = await account.getAccessKey(newKey.getPublicKey())
console.log(keyInfo.permission.FunctionCall.allowance)
```

### Wait for Transaction Finality

```typescript
const result = await account.signAndSendTransaction({
  receiverId: "contract.near",
  actions: [...],
  waitUntil: "FINAL",  // Wait for finality
  throwOnFailure: true  // Throw on execution failure
})
```
