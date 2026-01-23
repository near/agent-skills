# API Reference

## Table of Contents

1. [NearProvider](#nearprovider)
2. [useNearWallet Hook](#useneärwallet-hook)
3. [Type Definitions](#type-definitions)
4. [Actions](#actions)

---

## NearProvider

React context provider for NEAR wallet functionality.

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
  providers?: {
    mainnet?: string[];
    testnet?: string[];
  };
};
```

### Default RPC URLs

| Network | URL |
|---------|-----|
| mainnet | https://free.rpc.fastnear.com |
| testnet | https://test.rpc.fastnear.com |

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
  // State
  network: "mainnet" | "testnet";
  signedAccountId: string;
  loading: boolean;
  
  // Low-level access
  provider: JsonRpcProvider;
  connector: NearConnector;
  
  // Authentication
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  
  // Account info
  getBalance: (accountId: string) => Promise<bigint>;
  getAccessKeyList: (accountId: string) => Promise<AccessKeyList & { 
    block_hash: string; 
    block_height: number; 
  }>;
  
  // Contract calls
  viewFunction: (params: ViewFunctionParams) => Promise<any>;
  callFunction: (params: FunctionCallParams) => Promise<FinalExecutionOutcome>;
  
  // Transfers
  transfer: (params: TransferParams) => Promise<FinalExecutionOutcome>;
  
  // Key management
  addFunctionCallKey: (params: AddFunctionCallKeyParams) => Promise<FinalExecutionOutcome>;
  deleteKey: (params: DeleteKeyParams) => Promise<FinalExecutionOutcome>;
  
  // Message signing
  signNEP413Message: (params: { 
    message: string; 
    recipient: string; 
    nonce: Uint8Array; 
  }) => Promise<SignedMessage>;
  
  // Low-level transactions
  signAndSendTransaction: (params: { 
    receiverId: string; 
    actions: Action[]; 
  }) => Promise<FinalExecutionOutcome>;
  signAndSendTransactions: (transactions: SignAndSendTransactionsParams) => Promise<FinalExecutionOutcome[]>;
}
```

---

## Type Definitions

### ViewFunctionParams

```typescript
interface ViewFunctionParams {
  contractId: string;
  method: string;
  args?: Record<string, unknown>;
}
```

### FunctionCallParams

```typescript
interface FunctionCallParams {
  contractId: string;
  method: string;
  args?: Record<string, unknown>;
  gas?: string;      // Default: "30000000000000" (30 TGas)
  deposit?: string;  // Default: "0"
}
```

### TransferParams

```typescript
interface TransferParams {
  receiverId: string;
  amount: string;  // yoctoNEAR
}
```

### AddFunctionCallKeyParams

```typescript
interface AddFunctionCallKeyParams {
  publicKey: string;
  contractId: string;
  methodNames?: string[];  // Empty array = all methods
  allowance?: string;      // yoctoNEAR
}
```

### DeleteKeyParams

```typescript
interface DeleteKeyParams {
  publicKey: string;
}
```

---

## Actions

Action builders for constructing transactions.

```typescript
import { Actions, type Action } from 'near-connect-hooks';
```

### Actions.transfer

```typescript
Actions.transfer(amount: string): Action
// Returns: { type: "Transfer", params: { deposit: amount } }
```

### Actions.functionCall

```typescript
Actions.functionCall(
  methodName: string,
  args: Record<string, unknown>,
  gas: string,
  deposit: string
): Action
// Returns: { type: "FunctionCall", params: { methodName, args, gas, deposit } }
```

### Actions.addFullAccessKey

```typescript
Actions.addFullAccessKey(publicKey: string): Action
// Returns: { type: "AddKey", params: { publicKey, accessKey: { permission: "FullAccess" } } }
```

### Actions.addFunctionCallKey

```typescript
Actions.addFunctionCallKey(
  publicKey: string,
  receiverId: string,
  methodNames?: string[],  // Default: []
  allowance?: string
): Action
// Returns: { type: "AddKey", params: { publicKey, accessKey: { permission: { receiverId, methodNames, allowance } } } }
```

### Actions.deleteKey

```typescript
Actions.deleteKey(publicKey: string): Action
// Returns: { type: "DeleteKey", params: { publicKey } }
```

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
  AddFunctionCallKeyParams,
  DeleteKeyParams,
  NearContextValue
} from './types';
```

## Dependencies

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
