# API Reference

## Table of Contents

1. [NearProvider](#nearprovider)
2. [useNearWallet Hook](#usenearwallet-hook)
3. [Type Definitions](#type-definitions)
4. [Actions](#actions)
5. [Error Handling](#error-handling)

---

## NearProvider

React context provider for NEAR wallet functionality. Wrap your app with this provider to enable wallet features.

```tsx
import { NearProvider } from 'near-connect-hooks';

<NearProvider config={NearConnectorOptions}>
  {children}
</NearProvider>
```

### Config Options

```typescript
type NearConnectorOptions = {
  network?: 'mainnet' | 'testnet';  // Default: 'testnet'
  rpcUrl?: string;  // Default: 'https://test.rpc.fastnear.com'
};
```

### Default RPC URLs

| Network | Default URL                        |
|---------|------------------------------------|
| testnet | `https://test.rpc.fastnear.com`    |
| mainnet | `https://free.rpc.fastnear.com`    |

---

## useNearWallet Hook

Returns `NearContextValue` with all wallet functionality.

```tsx
import { useNearWallet } from 'near-connect-hooks';

const wallet = useNearWallet();
```

### NearContextValue

```typescript
interface NearContextValue {
  // ============================================
  // State Properties
  // ============================================

  /** Current network configuration */
  network: "mainnet" | "testnet";

  /** Connected wallet account ID, empty string if not connected */
  signedAccountId: string;

  /** True while initializing wallet connection on mount */
  loading: boolean;

  // ============================================
  // Low-level Access
  // ============================================

  /** Direct access to near-api-js JsonRpcProvider for custom RPC calls */
  provider: JsonRpcProvider;

  /** Direct access to @hot-labs/near-connect NearConnector instance */
  connector: NearConnector;

  // ============================================
  // Authentication
  // ============================================

  /** Opens wallet selector modal to connect a wallet */
  signIn: () => Promise<void>;

  /** Disconnects the currently connected wallet */
  signOut: () => Promise<void>;

  // ============================================
  // Account Information
  // ============================================

  /**
   * Fetches account balance in yoctoNEAR
   * @param accountId - The account ID to check
   * @returns Balance as bigint in yoctoNEAR (1 NEAR = 10^24 yoctoNEAR)
   */
  getBalance: (accountId: string) => Promise<bigint>;

  /**
   * Fetches all access keys for an account
   * @param accountId - The account ID to query
   * @returns Access key list with block metadata
   */
  getAccessKeyList: (accountId: string) => Promise<AccessKeyList & {
    block_hash: string;
    block_height: number;
  }>;

  // ============================================
  // Contract Interactions
  // ============================================

  /**
   * Calls a read-only contract method (no gas required, no signature)
   * @returns The decoded return value from the contract method
   */
  viewFunction: <T = unknown>(params: ViewFunctionParams) => Promise<T>;

  /**
   * Calls a contract method that modifies state (requires wallet signature)
   * @throws Error if wallet is not connected
   */
  callFunction: (params: FunctionCallParams) => Promise<FinalExecutionOutcome>;

  // ============================================
  // Transfers
  // ============================================

  /**
   * Sends NEAR tokens to another account
   * @throws Error if wallet is not connected
   */
  transfer: (params: TransferParams) => Promise<FinalExecutionOutcome>;

  // ============================================
  // Key Management
  // ============================================

  /**
   * Adds a function call access key to the connected account
   * @throws Error if wallet is not connected
   */
  addFunctionCallKey: (params: AddFunctionCallKeyParams) => Promise<FinalExecutionOutcome>;

  /**
   * Deletes an access key from the connected account
   * @throws Error if wallet is not connected
   */
  deleteKey: (params: DeleteKeyParams) => Promise<FinalExecutionOutcome>;

  // ============================================
  // Message Signing
  // ============================================

  /**
   * Signs an off-chain message following NEP-413 standard
   * Used for authentication/verification without on-chain transactions
   * @throws Error if wallet is not connected
   */
  signNEP413Message: (params: {
    message: string;
    recipient: string;
    nonce: Uint8Array;
  }) => Promise<SignedMessage>;

  // ============================================
  // Low-level Transactions
  // ============================================

  /**
   * Signs and sends a single transaction with custom actions
   * @throws Error if wallet is not connected
   */
  signAndSendTransaction: (params: {
    receiverId: string;
    actions: Action[];
  }) => Promise<FinalExecutionOutcome>;

  /**
   * Signs and sends multiple transactions in one request
   * @throws Error if wallet is not connected
   */
  signAndSendTransactions: (transactions: SignAndSendTransactionsParams) => Promise<FinalExecutionOutcome[]>;
}
```

---

## Type Definitions

### ViewFunctionParams

Parameters for calling read-only contract methods.

```typescript
interface ViewFunctionParams {
  /** Contract account ID (e.g., "contract.near") */
  contractId: string;
  /** Method name to call */
  method: string;
  /** Method arguments (optional) */
  args?: Record<string, unknown>;
}
```

### FunctionCallParams

Parameters for calling state-changing contract methods.

```typescript
interface FunctionCallParams {
  /** Contract account ID */
  contractId: string;
  /** Method name to call */
  method: string;
  /** Method arguments (optional) */
  args?: Record<string, unknown>;
  /** Gas to attach in yoctoNEAR (default: "30000000000000" = 30 TGas) */
  gas?: string;
  /** NEAR deposit in yoctoNEAR (default: "0") */
  deposit?: string;
}
```

### TransferParams

Parameters for sending NEAR tokens.

```typescript
interface TransferParams {
  /** Recipient account ID */
  receiverId: string;
  /** Amount in yoctoNEAR (1 NEAR = "1000000000000000000000000") */
  amount: string;
}
```

### AddFullAccessKeyParams

Parameters for adding a full access key.

```typescript
interface AddFullAccessKeyParams {
  /** Public key in "ed25519:..." format */
  publicKey: string;
}
```

### AddFunctionCallKeyParams

Parameters for adding a function call access key.

```typescript
interface AddFunctionCallKeyParams {
  /** Public key in "ed25519:..." format */
  publicKey: string;
  /** Contract this key can call */
  contractId: string;
  /** Allowed methods (empty array = all methods) */
  methodNames?: string[];
  /** Allowance in yoctoNEAR (optional) */
  allowance?: string;
}
```

### DeleteKeyParams

Parameters for deleting an access key.

```typescript
interface DeleteKeyParams {
  /** Public key to remove in "ed25519:..." format */
  publicKey: string;
}
```

---

## Actions

Action builders for constructing low-level transactions.

```typescript
import { Actions, type Action } from 'near-connect-hooks';
```

### Actions.transfer

Creates a transfer action.

```typescript
Actions.transfer(amount: string): Action

// Example
Actions.transfer("1000000000000000000000000")  // 1 NEAR
// Returns: { type: "Transfer", params: { deposit: amount } }
```

### Actions.functionCall

Creates a function call action.

```typescript
Actions.functionCall(
  methodName: string,
  args: Record<string, unknown>,
  gas: string,
  deposit: string
): Action

// Example
Actions.functionCall("set_greeting", { message: "Hello" }, "30000000000000", "0")
// Returns: { type: "FunctionCall", params: { methodName, args, gas, deposit } }
```

### Actions.addFullAccessKey

Creates an action to add a full access key.

```typescript
Actions.addFullAccessKey(publicKey: string): Action

// Example
Actions.addFullAccessKey("ed25519:ABC123...")
// Returns: { type: "AddKey", params: { publicKey, accessKey: { permission: "FullAccess" } } }
```

### Actions.addFunctionCallKey

Creates an action to add a function call access key.

```typescript
Actions.addFunctionCallKey(
  publicKey: string,
  receiverId: string,
  methodNames?: string[],  // Default: []
  allowance?: string
): Action

// Example
Actions.addFunctionCallKey("ed25519:ABC...", "contract.near", ["method1"], "250000000000000000000000")
// Returns: { type: "AddKey", params: { publicKey, accessKey: { permission: { receiverId, methodNames, allowance } } } }
```

### Actions.deleteKey

Creates an action to delete an access key.

```typescript
Actions.deleteKey(publicKey: string): Action

// Example
Actions.deleteKey("ed25519:ABC123...")
// Returns: { type: "DeleteKey", params: { publicKey } }
```

---

## Error Handling

### Common Errors

#### "Wallet is not connected"

- **When:** Calling transaction methods without a connected wallet
- **Solution:** Check `signedAccountId` before calling, or call `signIn()` first

#### "useNear must be used within a NearProvider"

- **When:** Using `useNearWallet()` outside of provider
- **Solution:** Wrap your app with `<NearProvider>`

### Error Handling Example

```tsx
import { useNearWallet } from 'near-connect-hooks';

function TransferButton() {
  const { signedAccountId, transfer } = useNearWallet();

  const handleTransfer = async () => {
    if (!signedAccountId) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const result = await transfer({
        receiverId: "recipient.near",
        amount: "1000000000000000000000000"
      });
      console.log("Transfer successful:", result);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Transfer failed:", error.message);
      }
    }
  };

  return <button onClick={handleTransfer}>Send 1 NEAR</button>;
}
```

### Methods That Require Wallet Connection

The following methods will throw `"Wallet is not connected"` if called without a connected wallet:

- `callFunction()`
- `transfer()`
- `addFunctionCallKey()`
- `deleteKey()`
- `signNEP413Message()`
- `signAndSendTransaction()`
- `signAndSendTransactions()`

### Methods That Work Without Wallet

These methods work without a connected wallet (read-only operations):

- `viewFunction()` - Read contract state
- `getBalance()` - Check any account's balance
- `getAccessKeyList()` - List any account's keys

---

## Exports

```typescript
// Main exports from 'near-connect-hooks'
export { NearProvider, useNearWallet } from './useNearWallet';
export { Actions, type Action } from './actions';
export type {
  ViewFunctionParams,
  FunctionCallParams,
  TransferParams,
  AddFullAccessKeyParams,
  AddFunctionCallKeyParams,
  DeleteKeyParams,
  NearContextValue
} from './types';
```

## Peer Dependencies

```json
{
  "peerDependencies": {
    "@hot-labs/near-connect": "^0.8.2",
    "near-api-js": "^7.0.0",
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  }
}
```
