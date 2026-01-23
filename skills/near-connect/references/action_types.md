# Action Types Reference

Complete reference for transaction action formats supported by near-connect.

## Table of Contents

1. [Overview](#overview)
2. [ConnectorAction Format](#connectoraction-format)
3. [near-api-js Action Format](#near-api-js-action-format)
4. [Action Type Details](#action-type-details)
5. [Examples](#examples)

## Overview

Near-connect supports **two action formats** for maximum compatibility:

1. **ConnectorAction** - near-wallet-selector compatible format (legacy)
2. **near-api-js Action** - Modern format using `transactions` module from near-api-js

You can use either format or mix them in the same transaction. Near-connect automatically handles conversion.

### Which Format to Use?

**Recommended**: Use **near-api-js format** for new code:
- Type-safe with TypeScript
- Official NEAR SDK format
- Better IDE support

**Use ConnectorAction format** when:
- Migrating from near-wallet-selector
- Working with existing codebases
- Need plain JSON (no library imports)

## ConnectorAction Format

Plain object format compatible with near-wallet-selector.

### Type Definition

```typescript
type ConnectorAction =
  | CreateAccountAction
  | DeployContractAction
  | FunctionCallAction
  | TransferAction
  | StakeAction
  | AddKeyAction
  | DeleteKeyAction
  | DeleteAccountAction;
```

### Action Types

#### CreateAccount

```typescript
{
  type: "CreateAccount"
}
```

Creates a new NEAR account.

#### DeployContract

```typescript
{
  type: "DeployContract",
  params: {
    code: Uint8Array  // Contract WASM bytecode
  }
}
```

Deploys smart contract code.

#### FunctionCall

```typescript
{
  type: "FunctionCall",
  params: {
    methodName: string;     // Contract method to call
    args: object;           // Method arguments (any JSON object)
    gas: string;            // Gas limit in yoctoNEAR (e.g., "30000000000000")
    deposit: string;        // Attached deposit in yoctoNEAR (e.g., "0")
  }
}
```

Calls a smart contract method.

**Example**:

```typescript
{
  type: "FunctionCall",
  params: {
    methodName: "ft_transfer",
    args: {
      receiver_id: "alice.near",
      amount: "1000000000000000000000000",  // 1 NEAR
      memo: "Payment for services"
    },
    gas: "30000000000000",  // 30 TGas
    deposit: "1"            // 1 yoctoNEAR (required for FT calls)
  }
}
```

#### Transfer

```typescript
{
  type: "Transfer",
  params: {
    deposit: string  // Amount in yoctoNEAR (1 NEAR = 10^24 yoctoNEAR)
  }
}
```

Transfers NEAR tokens.

**Example**:

```typescript
{
  type: "Transfer",
  params: {
    deposit: "1000000000000000000000000"  // 1 NEAR
  }
}
```

#### Stake

```typescript
{
  type: "Stake",
  params: {
    stake: string;       // Amount to stake in yoctoNEAR
    publicKey: string;   // Validator public key (e.g., "ed25519:...")
  }
}
```

Stakes NEAR tokens with a validator.

#### AddKey

```typescript
{
  type: "AddKey",
  params: {
    publicKey: string;
    accessKey: {
      nonce?: number;
      permission: "FullAccess" | {
        receiverId: string;        // Contract that can be called
        allowance?: string;        // Optional spending limit in yoctoNEAR
        methodNames?: string[];    // Allowed methods (empty = all)
      }
    }
  }
}
```

Adds an access key to account.

**Full Access Key**:

```typescript
{
  type: "AddKey",
  params: {
    publicKey: "ed25519:ABC123...",
    accessKey: {
      permission: "FullAccess"
    }
  }
}
```

**Function Call Access Key**:

```typescript
{
  type: "AddKey",
  params: {
    publicKey: "ed25519:ABC123...",
    accessKey: {
      permission: {
        receiverId: "game.near",
        methodNames: ["play_move", "claim_reward"],
        allowance: "1000000000000000000000000"  // 1 NEAR max spending
      }
    }
  }
}
```

#### DeleteKey

```typescript
{
  type: "DeleteKey",
  params: {
    publicKey: string  // Key to remove (e.g., "ed25519:...")
  }
}
```

Removes an access key from account.

#### DeleteAccount

```typescript
{
  type: "DeleteAccount",
  params: {
    beneficiaryId: string  // Account that receives remaining balance
  }
}
```

Deletes the account and transfers remaining balance.

## near-api-js Action Format

Modern format using the `transactions` module from near-api-js.

### Import

```typescript
import { transactions } from "near-api-js";
```

Or with individual imports:

```typescript
import {
  functionCall,
  transfer,
  createAccount,
  deployContract,
  stake,
  addKey,
  deleteKey,
  deleteAccount,
  fullAccessKey,
  functionCallAccessKey
} from "near-api-js/lib/transaction";
```

### Action Creators

#### functionCall

```typescript
transactions.functionCall(
  methodName: string,
  args: object,
  gas: BN | string,
  deposit: BN | string
)
```

**Example**:

```typescript
transactions.functionCall(
  "ft_transfer",
  { receiver_id: "alice.near", amount: "1000000000000000000000000" },
  "30000000000000",
  "1"
)
```

#### transfer

```typescript
transactions.transfer(
  deposit: BN | string
)
```

**Example**:

```typescript
transactions.transfer("1000000000000000000000000")  // 1 NEAR
```

#### createAccount

```typescript
transactions.createAccount()
```

#### deployContract

```typescript
transactions.deployContract(
  code: Uint8Array
)
```

#### stake

```typescript
transactions.stake(
  stake: BN | string,
  publicKey: PublicKey
)
```

#### addKey

```typescript
transactions.addKey(
  publicKey: PublicKey,
  accessKey: AccessKey
)
```

With full access:

```typescript
import { PublicKey } from "near-api-js/lib/utils";

transactions.addKey(
  PublicKey.from("ed25519:ABC123..."),
  transactions.fullAccessKey()
)
```

With function call permission:

```typescript
transactions.addKey(
  PublicKey.from("ed25519:ABC123..."),
  transactions.functionCallAccessKey(
    "game.near",
    ["play_move", "claim_reward"],
    "1000000000000000000000000"  // allowance
  )
)
```

#### deleteKey

```typescript
transactions.deleteKey(
  publicKey: PublicKey
)
```

#### deleteAccount

```typescript
transactions.deleteAccount(
  beneficiaryId: string
)
```

## Action Type Details

### Gas and Deposit Values

All gas and deposit values are in **yoctoNEAR** (1 NEAR = 10^24 yoctoNEAR).

**Common Gas Values**:
- Simple view call: `"30000000000000"` (30 TGas)
- Token transfer: `"30000000000000"` (30 TGas)
- Complex contract call: `"100000000000000"` (100 TGas)
- Maximum: `"300000000000000"` (300 TGas)

**Deposit Notes**:
- Use `"0"` for no deposit
- FT calls typically require `"1"` yoctoNEAR
- NFT minting may require storage deposit (e.g., `"10000000000000000000000"` = 0.01 NEAR)

### Method Arguments Encoding

Arguments are automatically JSON-encoded. Pass plain objects:

```typescript
// ✅ Correct
args: { receiver_id: "alice.near", amount: "1000" }

// ❌ Wrong - don't JSON.stringify manually
args: JSON.stringify({ receiver_id: "alice.near", amount: "1000" })
```

### Access Key Types

**Full Access Key**:
- Can perform any action on the account
- No spending limits
- Use for account recovery or full control

**Function Call Access Key**:
- Limited to calling specific contract
- Optional spending allowance
- Optional method whitelist
- Use for dApp sessions, games, automated actions

## Examples

### Complete Transaction Examples

#### Token Transfer (ConnectorAction)

```typescript
await wallet.signAndSendTransaction({
  receiverId: "token.near",
  actions: [{
    type: "FunctionCall",
    params: {
      methodName: "ft_transfer",
      args: {
        receiver_id: "bob.near",
        amount: "5000000000000000000000000",  // 5 NEAR worth of tokens
        memo: "Thanks for dinner!"
      },
      gas: "30000000000000",
      deposit: "1"
    }
  }]
});
```

#### Token Transfer (near-api-js)

```typescript
import { transactions } from "near-api-js";

await wallet.signAndSendTransaction({
  receiverId: "token.near",
  actions: [
    transactions.functionCall(
      "ft_transfer",
      {
        receiver_id: "bob.near",
        amount: "5000000000000000000000000",
        memo: "Thanks for dinner!"
      },
      "30000000000000",
      "1"
    )
  ]
});
```

#### Multiple Actions in One Transaction

```typescript
import { transactions } from "near-api-js";

await wallet.signAndSendTransaction({
  receiverId: "alice.near",
  actions: [
    // Send NEAR
    transactions.transfer("1000000000000000000000000"),  // 1 NEAR
    
    // Call contract method
    transactions.functionCall(
      "send_notification",
      { message: "Payment sent!" },
      "10000000000000",
      "0"
    )
  ]
});
```

#### Batch Transactions

```typescript
await wallet.signAndSendTransactions({
  transactions: [
    {
      receiverId: "token-a.near",
      actions: [
        transactions.functionCall(
          "ft_transfer",
          { receiver_id: "dex.near", amount: "1000000" },
          "30000000000000",
          "1"
        )
      ]
    },
    {
      receiverId: "dex.near",
      actions: [
        transactions.functionCall(
          "swap",
          { token_in: "token-a.near", token_out: "token-b.near" },
          "100000000000000",
          "0"
        )
      ]
    }
  ]
});
```

#### Add Function Call Access Key

**ConnectorAction**:

```typescript
await wallet.signAndSendTransaction({
  receiverId: "alice.near",
  actions: [{
    type: "AddKey",
    params: {
      publicKey: generatedPublicKey,
      accessKey: {
        permission: {
          receiverId: "game.near",
          methodNames: ["play_move", "end_game"],
          allowance: "1000000000000000000000000"  // 1 NEAR
        }
      }
    }
  }]
});
```

**near-api-js**:

```typescript
import { transactions } from "near-api-js";
import { PublicKey } from "near-api-js/lib/utils";

await wallet.signAndSendTransaction({
  receiverId: "alice.near",
  actions: [
    transactions.addKey(
      PublicKey.from(generatedPublicKey),
      transactions.functionCallAccessKey(
        "game.near",
        ["play_move", "end_game"],
        "1000000000000000000000000"
      )
    )
  ]
});
```

#### NFT Minting with Storage Deposit

```typescript
await wallet.signAndSendTransaction({
  receiverId: "nft.near",
  actions: [
    {
      type: "FunctionCall",
      params: {
        methodName: "nft_mint",
        args: {
          token_id: "unique-token-123",
          receiver_id: "alice.near",
          metadata: {
            title: "My NFT",
            description: "An amazing NFT",
            media: "https://example.com/image.png"
          }
        },
        gas: "100000000000000",
        deposit: "10000000000000000000000"  // 0.01 NEAR for storage
      }
    }
  ]
});
```

### Helper Functions

#### Convert NEAR to yoctoNEAR

```typescript
function nearToYocto(amount: string): string {
  return (parseFloat(amount) * 1e24).toFixed(0);
}

nearToYocto("1.5")  // "1500000000000000000000000"
```

#### Convert yoctoNEAR to NEAR

```typescript
function yoctoToNear(amount: string): string {
  return (parseInt(amount) / 1e24).toFixed(6);
}

yoctoToNear("1500000000000000000000000")  // "1.500000"
```

## Migration from near-wallet-selector

If migrating from near-wallet-selector, your existing action code works as-is:

```typescript
// This works in both near-wallet-selector AND near-connect
const actions = [{
  type: "FunctionCall",
  params: {
    methodName: "my_method",
    args: { key: "value" },
    gas: "30000000000000",
    deposit: "0"
  }
}];

await wallet.signAndSendTransaction({
  receiverId: "contract.near",
  actions
});
```

**Recommended**: Gradually migrate to near-api-js format for better type safety.

## Common Patterns

### Conditional Actions

```typescript
const actions = [
  transactions.functionCall("method_one", {}, "30000000000000", "0")
];

if (needsAdditionalCall) {
  actions.push(
    transactions.functionCall("method_two", {}, "30000000000000", "0")
  );
}

await wallet.signAndSendTransaction({
  receiverId: "contract.near",
  actions
});
```

### Dynamic Gas Calculation

```typescript
const baseGas = 30_000_000_000_000;  // 30 TGas
const additionalGas = items.length * 5_000_000_000_000;  // 5 TGas per item
const totalGas = (baseGas + additionalGas).toString();

await wallet.signAndSendTransaction({
  receiverId: "contract.near",
  actions: [{
    type: "FunctionCall",
    params: {
      methodName: "batch_process",
      args: { items },
      gas: totalGas,
      deposit: "0"
    }
  }]
});
```
