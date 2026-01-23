# Integration Examples

Complete code examples for integrating near-connect into your application.

## Table of Contents

1. [React Integration](#react-integration)
2. [Vue Integration](#vue-integration)
3. [Vanilla JavaScript](#vanilla-javascript)
4. [Advanced Patterns](#advanced-patterns)
5. [Error Handling](#error-handling)

## React Integration

### Basic Hook

```typescript
// hooks/useNearWallet.ts
import { useState, useEffect, useCallback } from 'react';
import { NearConnector, NearWalletBase } from '@hot-labs/near-connect';

const connector = new NearConnector({
  network: 'mainnet',
  walletConnect: {
    projectId: process.env.REACT_APP_WC_PROJECT_ID!,
    metadata: {
      name: 'My NEAR App',
      description: 'An awesome NEAR application',
      url: window.location.origin,
      icons: [`${window.location.origin}/logo.png`]
    }
  }
});

export function useNearWallet() {
  const [wallet, setWallet] = useState<NearWalletBase | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check for existing connection
    connector.wallet()
      .then(async w => {
        const accounts = await w.getAccounts();
        if (accounts.length > 0) {
          setWallet(w);
          setAccountId(accounts[0].accountId);
        }
      })
      .catch(() => {
        // Not connected
      });

    // Listen for auth changes
    connector.on('wallet:signIn', async ({ wallet, accounts }) => {
      setWallet(wallet);
      setAccountId(accounts[0].accountId);
      setIsConnecting(false);
    });

    connector.on('wallet:signOut', () => {
      setWallet(null);
      setAccountId(null);
    });
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await connector.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (wallet) {
      await connector.disconnect(wallet);
    }
  }, [wallet]);

  return {
    wallet,
    accountId,
    isConnected: !!accountId,
    isConnecting,
    connect,
    disconnect
  };
}
```

### Using the Hook

```typescript
// App.tsx
import { useNearWallet } from './hooks/useNearWallet';
import { transactions } from 'near-api-js';

function App() {
  const { wallet, accountId, isConnected, isConnecting, connect, disconnect } = useNearWallet();

  const sendTokens = async () => {
    if (!wallet) return;

    try {
      const result = await wallet.signAndSendTransaction({
        receiverId: 'token.near',
        actions: [
          transactions.functionCall(
            'ft_transfer',
            {
              receiver_id: 'alice.near',
              amount: '1000000000000000000000000'
            },
            '30000000000000',
            '1'
          )
        ]
      });

      console.log('Transaction:', result.transaction.hash);
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  return (
    <div>
      <h1>My NEAR App</h1>
      
      {!isConnected ? (
        <button onClick={connect} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div>
          <p>Connected: {accountId}</p>
          <button onClick={sendTokens}>Send Tokens</button>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

### Context Provider Pattern

```typescript
// contexts/WalletContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { NearConnector, NearWalletBase } from '@hot-labs/near-connect';

interface WalletContextType {
  wallet: NearWalletBase | null;
  accountId: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

const connector = new NearConnector({ network: 'mainnet' });

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<NearWalletBase | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    connector.wallet().then(async w => {
      const accounts = await w.getAccounts();
      if (accounts.length) {
        setWallet(w);
        setAccountId(accounts[0].accountId);
      }
    }).catch(() => {});

    const handleSignIn = async ({ wallet, accounts }) => {
      setWallet(wallet);
      setAccountId(accounts[0].accountId);
    };

    const handleSignOut = () => {
      setWallet(null);
      setAccountId(null);
    };

    connector.on('wallet:signIn', handleSignIn);
    connector.on('wallet:signOut', handleSignOut);

    return () => {
      connector.off('wallet:signIn', handleSignIn);
      connector.off('wallet:signOut', handleSignOut);
    };
  }, []);

  const connect = async () => {
    await connector.connect();
  };

  const disconnect = async () => {
    if (wallet) await connector.disconnect(wallet);
  };

  return (
    <WalletContext.Provider value={{ wallet, accountId, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
}
```

## Vue Integration

### Composable

```typescript
// composables/useNearWallet.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { NearConnector, NearWalletBase } from '@hot-labs/near-connect';

const connector = new NearConnector({ network: 'mainnet' });

export function useNearWallet() {
  const wallet = ref<NearWalletBase | null>(null);
  const accountId = ref<string | null>(null);
  const isConnecting = ref(false);

  const handleSignIn = async ({ wallet: w, accounts }) => {
    wallet.value = w;
    accountId.value = accounts[0].accountId;
    isConnecting.value = false;
  };

  const handleSignOut = () => {
    wallet.value = null;
    accountId.value = null;
  };

  onMounted(async () => {
    try {
      const w = await connector.wallet();
      const accounts = await w.getAccounts();
      if (accounts.length) {
        wallet.value = w;
        accountId.value = accounts[0].accountId;
      }
    } catch {}

    connector.on('wallet:signIn', handleSignIn);
    connector.on('wallet:signOut', handleSignOut);
  });

  onUnmounted(() => {
    connector.off('wallet:signIn', handleSignIn);
    connector.off('wallet:signOut', handleSignOut);
  });

  const connect = async () => {
    isConnecting.value = true;
    try {
      await connector.connect();
    } catch (error) {
      console.error('Connection failed:', error);
      isConnecting.value = false;
    }
  };

  const disconnect = async () => {
    if (wallet.value) {
      await connector.disconnect(wallet.value);
    }
  };

  return {
    wallet,
    accountId,
    isConnecting,
    connect,
    disconnect
  };
}
```

### Component Usage

```vue
<template>
  <div>
    <h1>My NEAR App</h1>
    
    <button v-if="!accountId" @click="connect" :disabled="isConnecting">
      {{ isConnecting ? 'Connecting...' : 'Connect Wallet' }}
    </button>
    
    <div v-else>
      <p>Connected: {{ accountId }}</p>
      <button @click="disconnect">Disconnect</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNearWallet } from '@/composables/useNearWallet';

const { wallet, accountId, isConnecting, connect, disconnect } = useNearWallet();
</script>
```

## Vanilla JavaScript

### Basic Integration

```javascript
import { NearConnector } from '@hot-labs/near-connect';

class WalletManager {
  constructor() {
    this.connector = new NearConnector({ network: 'mainnet' });
    this.wallet = null;
    this.accountId = null;

    this.init();
  }

  async init() {
    // Check existing connection
    try {
      this.wallet = await this.connector.wallet();
      const accounts = await this.wallet.getAccounts();
      if (accounts.length) {
        this.accountId = accounts[0].accountId;
        this.updateUI();
      }
    } catch {}

    // Setup event listeners
    this.connector.on('wallet:signIn', ({ wallet, accounts }) => {
      this.wallet = wallet;
      this.accountId = accounts[0].accountId;
      this.updateUI();
    });

    this.connector.on('wallet:signOut', () => {
      this.wallet = null;
      this.accountId = null;
      this.updateUI();
    });
  }

  async connect() {
    await this.connector.connect();
  }

  async disconnect() {
    if (this.wallet) {
      await this.connector.disconnect(this.wallet);
    }
  }

  updateUI() {
    const connectBtn = document.getElementById('connect-btn');
    const accountDisplay = document.getElementById('account-display');
    const disconnectBtn = document.getElementById('disconnect-btn');

    if (this.accountId) {
      connectBtn.style.display = 'none';
      accountDisplay.textContent = `Connected: ${this.accountId}`;
      disconnectBtn.style.display = 'block';
    } else {
      connectBtn.style.display = 'block';
      accountDisplay.textContent = '';
      disconnectBtn.style.display = 'none';
    }
  }
}

// Initialize
const walletManager = new WalletManager();

document.getElementById('connect-btn').addEventListener('click', () => {
  walletManager.connect();
});

document.getElementById('disconnect-btn').addEventListener('click', () => {
  walletManager.disconnect();
});
```

## Advanced Patterns

### Multiple Account Management

```typescript
import { NearConnector } from '@hot-labs/near-connect';

async function manageMultipleAccounts() {
  const connector = new NearConnector({ network: 'mainnet' });
  const wallet = await connector.wallet();

  // Get all accounts (some wallets support multiple)
  const accounts = await wallet.getAccounts();

  for (const account of accounts) {
    console.log('Account:', account.accountId);
    
    // Use specific account for signing
    await wallet.signAndSendTransaction({
      signerId: account.accountId,
      receiverId: 'contract.near',
      actions: [/* ... */]
    });
  }
}
```

### Transaction Batching

```typescript
import { transactions } from 'near-api-js';

async function batchTransactions(wallet: NearWalletBase) {
  // Multiple separate transactions (atomic per transaction)
  const results = await wallet.signAndSendTransactions({
    transactions: [
      {
        receiverId: 'token1.near',
        actions: [
          transactions.functionCall('ft_transfer', {
            receiver_id: 'dex.near',
            amount: '1000000'
          }, '30000000000000', '1')
        ]
      },
      {
        receiverId: 'token2.near',
        actions: [
          transactions.functionCall('ft_transfer', {
            receiver_id: 'dex.near',
            amount: '2000000'
          }, '30000000000000', '1')
        ]
      },
      {
        receiverId: 'dex.near',
        actions: [
          transactions.functionCall('swap', {
            token_in: 'token1.near',
            token_out: 'token2.near'
          }, '100000000000000', '0')
        ]
      }
    ]
  });

  // Each result is FinalExecutionOutcome
  results.forEach((result, i) => {
    console.log(`Transaction ${i}:`, result.transaction.hash);
  });
}
```

### Network Switching

```typescript
async function switchNetwork(connector: NearConnector) {
  // Switch to testnet (disconnects current wallet, reconnects same wallet on testnet)
  await connector.switchNetwork('testnet');

  // Get wallet on new network
  const wallet = await connector.wallet();
  const accounts = await wallet.getAccounts();
  console.log('Testnet account:', accounts[0].accountId);
}
```

### Filter Wallets by Features

```typescript
const connector = new NearConnector({
  features: {
    signMessage: true,  // Only show wallets that support NEP-413
    testnet: true       // Only show wallets with testnet support
  }
});

// Get filtered list
console.log('Available wallets:', connector.availableWallets.map(w => w.manifest.name));
```

### Custom Storage Backend

```typescript
import { NearConnector } from '@hot-labs/near-connect';

// Implement custom storage (e.g., using Redux store)
class ReduxStorage {
  constructor(store) {
    this.store = store;
  }

  async get(key) {
    return this.store.getState().walletStorage[key];
  }

  async set(key, value) {
    this.store.dispatch({ type: 'WALLET_STORAGE_SET', key, value });
  }

  async remove(key) {
    this.store.dispatch({ type: 'WALLET_STORAGE_REMOVE', key });
  }
}

const connector = new NearConnector({
  storage: new ReduxStorage(myReduxStore)
});
```

## Error Handling

### Comprehensive Error Handling

```typescript
import { NearConnector } from '@hot-labs/near-connect';

async function robustTransaction(wallet: NearWalletBase) {
  try {
    const result = await wallet.signAndSendTransaction({
      receiverId: 'contract.near',
      actions: [/* ... */]
    });

    console.log('Success:', result.transaction.hash);
    return result;
    
  } catch (error: any) {
    // User rejected transaction
    if (error.message?.includes('User rejected')) {
      console.log('User cancelled transaction');
      return null;
    }

    // Insufficient funds
    if (error.message?.includes('insufficient funds')) {
      console.error('Not enough NEAR to complete transaction');
      throw new Error('Insufficient balance');
    }

    // Gas exceeded
    if (error.message?.includes('Exceeded the prepaid gas')) {
      console.error('Transaction requires more gas');
      throw new Error('Increase gas limit');
    }

    // Contract panicked
    if (error.message?.includes('Smart contract panicked')) {
      console.error('Contract execution failed:', error.message);
      throw new Error('Contract error');
    }

    // Generic error
    console.error('Transaction failed:', error);
    throw error;
  }
}
```

### Retry Logic

```typescript
async function retryTransaction(
  wallet: NearWalletBase,
  params: any,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await wallet.signAndSendTransaction(params);
    } catch (error: any) {
      // Don't retry user rejections
      if (error.message?.includes('User rejected')) {
        throw error;
      }

      // Don't retry on last attempt
      if (i === maxRetries - 1) {
        throw error;
      }

      console.log(`Attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### Connection Error Handling

```typescript
async function safeConnect(connector: NearConnector) {
  try {
    await connector.connect();
  } catch (error: any) {
    if (error.message === 'User rejected') {
      console.log('User closed wallet selector');
      return;
    }

    if (error.message === 'No wallet selected') {
      console.error('Wallet not available');
      alert('Please install a NEAR wallet');
      return;
    }

    console.error('Connection failed:', error);
    throw error;
  }
}
```

### TypeScript Types

```typescript
import type {
  NearWalletBase,
  Account,
  FinalExecutionOutcome,
  SignedMessage
} from '@hot-labs/near-connect';

interface WalletState {
  wallet: NearWalletBase | null;
  accounts: Account[];
  isConnected: boolean;
}

async function typedTransfer(
  wallet: NearWalletBase,
  recipient: string,
  amount: string
): Promise<FinalExecutionOutcome> {
  return wallet.signAndSendTransaction({
    receiverId: recipient,
    actions: [{
      type: 'Transfer',
      params: { deposit: amount }
    }]
  });
}
```

## Testing

### Mock Wallet for Tests

```typescript
import { NearWalletBase, Account } from '@hot-labs/near-connect';

class MockWallet implements NearWalletBase {
  manifest = {
    id: 'mock',
    name: 'Mock Wallet',
    // ... other manifest fields
  };

  private accounts: Account[] = [];

  async signIn() {
    this.accounts = [{ accountId: 'test.near', publicKey: 'ed25519:...' }];
    return this.accounts;
  }

  async signOut() {
    this.accounts = [];
  }

  async getAccounts() {
    return this.accounts;
  }

  async signAndSendTransaction(params) {
    // Return mock transaction result
    return {
      transaction: { hash: 'mock-hash' },
      // ... other fields
    };
  }

  // ... implement other methods
}

// Use in tests
const mockWallet = new MockWallet();
await mockWallet.signIn();
const result = await mockWallet.signAndSendTransaction(/* ... */);
expect(result.transaction.hash).toBe('mock-hash');
```
