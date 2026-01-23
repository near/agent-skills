# Tokens Guide

Complete guide for NEAR token operations with near-api-js.

## Table of Contents

1. [Native NEAR Token](#native-near-token)
2. [Fungible Tokens (NEP-141)](#fungible-tokens-nep-141)
3. [NFTs (NEP-171)](#nfts-nep-171)
4. [Pre-defined Tokens](#pre-defined-tokens)
5. [Storage Management](#storage-management)

---

## Native NEAR Token

```typescript
import { Account } from "near-api-js"
import { NEAR } from "near-api-js/tokens"

// Unit conversion
NEAR.toUnits("1.5")           // 1500000000000000000000000n (yoctoNEAR)
NEAR.toDecimal(1_500_000_000_000_000_000_000_000n)  // "1.5"
NEAR.toDecimal(amount, 4)     // Limit precision to 4 decimals

// Transfer NEAR
await account.transfer({
  receiverId: "bob.near",
  amount: NEAR.toUnits("1"),
  token: NEAR
})

// Get balance
const balance = await NEAR.getBalance(account)
const { available, locked, total } = (await account.getState()).balance
```

---

## Fungible Tokens (NEP-141)

### Creating FT Instance

```typescript
import { FungibleToken } from "near-api-js/tokens"

// Create with metadata
const usdt = new FungibleToken("usdt.tether-token.near", {
  name: "Tether USD",
  symbol: "USDT",
  decimals: 6
})

// Use pre-defined tokens
import { USDC, wNEAR } from "near-api-js/tokens/mainnet"
```

### Transfer Operations

```typescript
// Simple transfer (receiver must be registered)
await token.transfer({
  from: account,
  receiverId: "bob.near",
  amount: token.toUnits("100")
})

// Transfer with contract call (ft_transfer_call)
await token.transferCall({
  from: account,
  receiverId: "dex.near",
  amount: token.toUnits("100"),
  msg: JSON.stringify({ action: "swap", out_token: "near" })
})
```

### Query Balance

```typescript
const balance = await token.getBalance(account)
console.log(`Balance: ${token.toDecimal(balance)} ${token.metadata.symbol}`)
```

### Account via transfer method

```typescript
// Simplified transfer via Account class
await account.transfer({
  receiverId: "bob.near",
  amount: USDC.toUnits("50"),
  token: USDC
})
```

---

## NFTs (NEP-171)

```typescript
import { NFTContract } from "near-api-js/tokens"

// View NFTs owned by account
const nfts = await provider.callFunction({
  contractId: "nft.near",
  method: "nft_tokens_for_owner",
  args: { account_id: "alice.near", limit: 10 }
})

// Transfer NFT
await account.callFunction({
  contractId: "nft.near",
  methodName: "nft_transfer",
  args: {
    receiver_id: "bob.near",
    token_id: "token-123"
  },
  deposit: 1n  // 1 yoctoNEAR required
})

// Transfer with call
await account.callFunction({
  contractId: "nft.near",
  methodName: "nft_transfer_call",
  args: {
    receiver_id: "marketplace.near",
    token_id: "token-123",
    msg: JSON.stringify({ price: "1000000000000000000000000" })
  },
  deposit: 1n,
  gas: 50_000_000_000_000n
})
```

---

## Pre-defined Tokens

### Mainnet

```typescript
import { USDC, USDT, wNEAR, DAI } from "near-api-js/tokens/mainnet"

// Usage
await account.transfer({
  receiverId: "bob.near",
  amount: USDC.toUnits("100"),
  token: USDC
})
```

### Testnet

```typescript
import { USDC as USDC_TESTNET } from "near-api-js/tokens/testnet"
```

### Token Metadata

```typescript
token.metadata.name       // "USD Coin"
token.metadata.symbol     // "USDC"
token.metadata.decimals   // 6
token.metadata.icon       // SVG data URI (optional)
token.accountId           // "a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near"
```

---

## Storage Management

FT contracts require storage deposits before receiving tokens.

### Register Account

```typescript
// Register receiver to receive tokens
await token.registerAccount({
  accountIdToRegister: "new-user.near",
  fundingAccount: account  // Pays for storage
})
```

### Unregister Account

```typescript
// Remove storage (only works if balance is 0)
await token.unregisterAccount({
  account: account,
  force: false  // true = forfeit remaining tokens
})
```

### Manual Storage Deposit

```typescript
// Check storage requirements
const bounds = await provider.callFunction({
  contractId: token.accountId,
  method: "storage_balance_bounds",
  args: {}
})
// bounds = { min: "1250000000000000000000", max: null }

// Check if registered
const balance = await provider.callFunction({
  contractId: token.accountId,
  method: "storage_balance_of",
  args: { account_id: "user.near" }
})
// null = not registered, { total, available } = registered

// Deposit storage
await account.callFunction({
  contractId: token.accountId,
  methodName: "storage_deposit",
  args: { account_id: "new-user.near" },
  deposit: bounds.min
})
```

---

## Common Patterns

### Swap Tokens via DEX

```typescript
// 1. Register for output token if needed
await outputToken.registerAccount({
  accountIdToRegister: account.accountId,
  fundingAccount: account
})

// 2. Transfer input token with swap message
await inputToken.transferCall({
  from: account,
  receiverId: "dex.near",
  amount: inputToken.toUnits("100"),
  msg: JSON.stringify({
    actions: [{
      pool_id: 0,
      token_in: inputToken.accountId,
      token_out: outputToken.accountId,
      min_amount_out: outputToken.toUnits("99").toString()
    }]
  })
})
```

### Batch Token Operations

```typescript
import { actions } from "near-api-js"

// Multiple FT transfers in one transaction
const calls = [
  actions.functionCall(
    "ft_transfer",
    { receiver_id: "alice.near", amount: "1000000" },
    30_000_000_000_000n,
    1n
  ),
  actions.functionCall(
    "ft_transfer",
    { receiver_id: "bob.near", amount: "2000000" },
    30_000_000_000_000n,
    1n
  )
]

await account.signAndSendTransaction({
  receiverId: token.accountId,
  actions: calls
})
```
