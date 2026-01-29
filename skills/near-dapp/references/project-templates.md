# Project Templates

Complete setup guides for NEAR dApps with React Query integration.

## Vite + React + TypeScript

```bash
npm create vite@latest my-near-app -- --template react-ts
cd my-near-app
npm install near-connect-hooks @hot-labs/near-connect near-api-js @tanstack/react-query
```

### Directory Structure

```
my-near-app/
├── src/
│   ├── main.tsx          # Entry point with providers
│   ├── App.tsx           # Main app
│   ├── components/
│   │   ├── ConnectButton.tsx
│   │   ├── Balance.tsx
│   │   └── ContractInteraction.tsx
│   ├── hooks/
│   │   ├── useBalance.ts
│   │   └── useContract.ts
│   ├── types/
│   │   └── contract.ts
│   └── config/
│       └── near.ts
├── package.json
└── vite.config.ts
```

### main.tsx

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NearProvider } from 'near-connect-hooks'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <NearProvider config={{ 
        network: 'mainnet',
        providers: {
          mainnet: ['https://free.rpc.fastnear.com'],
          testnet: ['https://test.rpc.fastnear.com']
        }
      }}>
        <App />
      </NearProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
```

### hooks/useBalance.ts

```tsx
import { useQuery } from '@tanstack/react-query'
import { useNearWallet } from 'near-connect-hooks'

export function useNearBalance(accountId: string | undefined) {
  const { getBalance } = useNearWallet()
  
  return useQuery<bigint>({
    queryKey: ['near-balance', accountId],
    queryFn: () => getBalance(accountId!),
    enabled: !!accountId,
    staleTime: 30_000
  })
}

export function useTokenBalance(contractId: string, accountId: string | undefined) {
  const { viewFunction } = useNearWallet()
  
  return useQuery<string>({
    queryKey: ['ft-balance', contractId, accountId],
    queryFn: () => viewFunction({
      contractId,
      method: 'ft_balance_of',
      args: { account_id: accountId }
    }),
    enabled: !!accountId
  })
}
```

### types/contract.ts

```tsx
export interface NFTToken {
  token_id: string
  owner_id: string
  metadata: NFTMetadata
}

export interface NFTMetadata {
  title: string
  description: string
  media: string
  media_hash: string | null
  copies: number | null
  issued_at: string | null
  expires_at: string | null
  starts_at: string | null
  updated_at: string | null
  extra: string | null
  reference: string | null
  reference_hash: string | null
}

export interface TokenMetadata {
  spec: string
  name: string
  symbol: string
  icon: string | null
  decimals: number
}
```

### ConnectButton.tsx

```tsx
import { useNearWallet } from 'near-connect-hooks'

export function ConnectButton() {
  const { signedAccountId, loading, signIn, signOut } = useNearWallet()

  if (loading) {
    return <button disabled>Loading...</button>
  }

  if (!signedAccountId) {
    return <button onClick={signIn}>Connect Wallet</button>
  }

  return (
    <div className="wallet-info">
      <span>{signedAccountId}</span>
      <button onClick={signOut}>Disconnect</button>
    </div>
  )
}
```

---

## Next.js 14+ (App Router)

```bash
npx create-next-app@latest my-near-app --typescript --app --tailwind
cd my-near-app
npm install near-connect-hooks @hot-labs/near-connect near-api-js @tanstack/react-query
```

### providers.tsx

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NearProvider } from 'near-connect-hooks'
import { ReactNode, useState } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 2 }
    }
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <NearProvider config={{ network: 'mainnet' }}>
        {children}
      </NearProvider>
    </QueryClientProvider>
  )
}
```

### layout.tsx

```tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Client Component

```tsx
'use client'

import { useNearWallet } from 'near-connect-hooks'
import { useQuery } from '@tanstack/react-query'

export function WalletStatus() {
  const { signedAccountId, getBalance } = useNearWallet()
  
  const { data: balance } = useQuery({
    queryKey: ['balance', signedAccountId],
    queryFn: () => getBalance(signedAccountId!),
    enabled: !!signedAccountId,
    select: (b) => (Number(b) / 1e24).toFixed(2)
  })
  
  if (!signedAccountId) return <div>Not connected</div>
  return <div>{signedAccountId}: {balance} NEAR</div>
}
```

---

## Plain HTML + JavaScript (ESM)

For static sites or vanilla JS:

```html
<!DOCTYPE html>
<html>
<head>
  <title>NEAR dApp</title>
</head>
<body>
  <h1>NEAR dApp</h1>
  <div id="balance"></div>
  
  <script type="module">
    import { Near } from 'https://esm.sh/near-kit'
    
    const near = new Near({ network: 'mainnet' })
    
    async function fetchBalance(accountId: string): Promise<string> {
      const balance = await near.view('token.near', 'ft_balance_of', {
        account_id: accountId
      })
      return balance
    }
    
    fetchBalance('alice.near')
      .then(balance => {
        document.getElementById('balance').textContent = balance
      })
      .catch(console.error)
  </script>
</body>
</html>
```

---

## Package Versions (Recommended)

```json
{
  "dependencies": {
    "near-connect-hooks": "^1.0.0",
    "@hot-labs/near-connect": "^1.0.0",
    "near-api-js": "^7.0.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_CONTRACT_ID=your-contract.near
```

## TypeScript Config

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```
