# Wallet: Selector Setup

Use @near-wallet-selector for multi-wallet support and standardized wallet integration.

## Why It Matters

NEAR Wallet Selector provides:
- Support for multiple wallet types (MyNEARWallet, Meteor, Sender, etc.)
- Standardized API across different wallets
- Better user experience with wallet choice
- Easy migration between wallets
- Future-proof wallet integration

## ❌ Incorrect

```tsx
// Don't hardcode a single wallet implementation
import { connect, keyStores, WalletConnection } from 'near-api-js';

export default function App() {
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  
  useEffect(() => {
    const near = await connect({
      networkId: 'testnet',
      keyStore: new keyStores.BrowserLocalStorageKeyStore(),
      nodeUrl: 'https://rpc.testnet.near.org',
      walletUrl: 'https://wallet.testnet.near.org',
    });
    
    const wallet = new WalletConnection(near, 'my-app');
    setWallet(wallet);
  }, []);
  
  // Users are locked into one wallet type
}
```

**Problems:**
- Only supports legacy NEAR wallet
- No support for modern wallets (Meteor, Sender, etc.)
- Poor user experience - no wallet choice
- Harder to maintain

## ✅ Correct

```tsx
'use client';

import { useEffect, useState } from 'react';
import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupModal } from '@near-wallet-selector/modal-ui';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { setupSender } from '@near-wallet-selector/sender';
import '@near-wallet-selector/modal-ui/styles.css';
import type { WalletSelector } from '@near-wallet-selector/core';

const NETWORK_ID = 'testnet';
const CONTRACT_ID = 'your-contract.testnet';

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    const initWallet = async () => {
      // Setup wallet selector with multiple wallet options
      const _selector = await setupWalletSelector({
        network: NETWORK_ID,
        modules: [
          setupMyNearWallet(),
          setupMeteorWallet(),
          setupSender(),
        ],
      });

      // Setup modal UI for wallet selection
      const _modal = setupModal(_selector, {
        contractId: CONTRACT_ID,
      });

      setSelector(_selector);
      setModal(_modal);

      // Subscribe to account changes
      const state = _selector.store.getState();
      setAccountId(state.accounts[0]?.accountId || null);

      const subscription = _selector.store.observable.subscribe((state) => {
        setAccountId(state.accounts[0]?.accountId || null);
      });

      return () => subscription.unsubscribe();
    };

    initWallet();
  }, []);

  const signIn = () => {
    modal?.show();
  };

  const signOut = async () => {
    const wallet = await selector?.wallet();
    await wallet?.signOut();
    setAccountId(null);
  };

  return (
    <WalletContext.Provider value={{ selector, modal, accountId, signIn, signOut }}>
      {children}
    </WalletContext.Provider>
  );
}
```

**Benefits:**
- Multi-wallet support out of the box
- Standardized API across wallets
- Built-in UI modal for wallet selection
- Automatic account state management
- Easy to add more wallet types

## Context Hook Pattern

```tsx
import { createContext, useContext } from 'react';

interface WalletContextValue {
  selector: WalletSelector | null;
  modal: any;
  accountId: string | null;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  selector: null,
  modal: null,
  accountId: null,
  signIn: () => {},
  signOut: async () => {},
});

export const useWallet = () => useContext(WalletContext);
```

## Usage in Components

```tsx
function MyComponent() {
  const { accountId, signIn, signOut } = useWallet();

  if (!accountId) {
    return <button onClick={signIn}>Connect Wallet</button>;
  }

  return (
    <div>
      <p>Connected: {accountId}</p>
      <button onClick={signOut}>Disconnect</button>
    </div>
  );
}
```

## Additional Considerations

- Add wallet modules based on your target audience
- Use modal UI for better UX, or build custom UI
- Store selector in React Context for global access
- Handle wallet state changes with subscriptions
- Configure network ID (mainnet/testnet) via environment variables
- Consider adding hardware wallet support if needed

## References

- [Wallet Selector](https://github.com/near/wallet-selector)
- [Wallet Selector Docs](https://docs.near.org/tools/wallet-selector)
- [Available Wallets](https://github.com/near/wallet-selector#supported-wallets)
