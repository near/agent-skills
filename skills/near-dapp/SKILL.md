---
name: near-dapp
description: >-
  Full-stack NEAR Protocol frontend development guide. Use when: (1) starting a new NEAR dApp, 
  (2) choosing between near-kit vs near-api-js, (3) setting up wallet integration, 
  (4) building React/Next.js apps with NEAR, (5) implementing token transfers, 
  (6) displaying account balances/NFTs, (7) connecting to smart contracts from frontend.
  This skill orchestrates other NEAR skills (near-connect, near-kit, near-api-js, near-intents) 
  to provide the complete developer journey.
---

# NEAR dApp Development

Frontend development guide for NEAR Protocol applications.

## Quick Start - Choose Your Path

| Building | Use | When |
|----------|-----|------|
| **React App** | `near-connect-hooks` | Modern React apps with hooks |
| **TypeScript Backend** | `near-kit` or `near-api-js` | Node.js scripts, bots, servers |
| **Cross-chain Swaps** | `near-intents` | Swap widgets, bridge interfaces |

## Project Setup

### Vite + React (Recommended)

```bash
npm create vite@latest my-near-app -- --template react-ts
cd my-near-app
npm install near-connect-hooks @hot-labs/near-connect near-api-js @tanstack/react-query
```

### Next.js

```bash
npx create-next-app@latest my-near-app --typescript
cd my-near-app
npm install near-connect-hooks @hot-labs/near-connect near-api-js @tanstack/react-query
```

## Wallet Integration (React)

### 1. Add Providers

```tsx
// App.tsx
import { NearProvider } from 'near-connect-hooks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2 }
  }
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NearProvider config={{ network: 'mainnet' }}>
        <YourApp />
      </NearProvider>
    </QueryClientProvider>
  )
}
```

### 2. Connect Button

```tsx
import { useNearWallet } from 'near-connect-hooks'

function ConnectButton() {
  const { signedAccountId, loading, signIn, signOut } = useNearWallet()
  
  if (loading) return <div>Loading...</div>
  if (!signedAccountId) return <button onClick={signIn}>Connect Wallet</button>
  return <button onClick={signOut}>Disconnect {signedAccountId}</button>
}
```

**For advanced wallet integration**: See `near-connect` skill

## Contract Interaction

### View Functions (Read-Only, Free)

```tsx
import { useQuery } from '@tanstack/react-query'
import { useNearWallet } from 'near-connect-hooks'

function useBalance(accountId: string) {
  const { viewFunction } = useNearWallet()
  
  return useQuery<string>({
    queryKey: ['balance', accountId],
    queryFn: () => viewFunction({
      contractId: 'token.near',
      method: 'ft_balance_of',
      args: { account_id: accountId }
    }),
    enabled: !!accountId
  })
}
```

### Call Functions (State Changes)

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

function useTransferToken(contractId: string) {
  const { callFunction } = useNearWallet()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (args: { receiverId: string; amount: string }) => 
      callFunction({
        contractId,
        method: 'ft_transfer',
        args: { receiver_id: args.receiverId, amount: args.amount },
        deposit: '1'
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['balance'] })
  })
}
```

### Send NEAR

```tsx
function useSendNear() {
  const { transfer } = useNearWallet()
  
  return useMutation({
    mutationFn: (params: { receiverId: string; amount: string }) =>
      transfer({
        receiverId: params.receiverId,
        amount: params.amount
      })
  })
}
```

## Common Patterns

### Display Account Balance

```tsx
function Balance() {
  const { signedAccountId, getBalance } = useNearWallet()
  
  const { data: balance, isLoading } = useQuery<bigint>({
    queryKey: ['near-balance', signedAccountId],
    queryFn: () => getBalance(signedAccountId!),
    enabled: !!signedAccountId,
    select: (b) => b
  })
  
  if (isLoading) return <Skeleton />
  return <span>{(Number(balance) / 1e24).toFixed(2)} NEAR</span>
}
```

### FT Balance with Formatting

```tsx
interface TokenConfig {
  contractId: string
  decimals: number
  symbol: string
}

function useFormattedBalance(token: TokenConfig) {
  const { signedAccountId, viewFunction } = useNearWallet()
  
  return useQuery({
    queryKey: ['ft-balance', token.contractId, signedAccountId],
    queryFn: async () => {
      const raw = await viewFunction({
        contractId: token.contractId,
        method: 'ft_balance_of',
        args: { account_id: signedAccountId }
      })
      const formatted = (Number(raw) / Math.pow(10, token.decimals)).toFixed(2)
      return `${formatted} ${token.symbol}`
    },
    enabled: !!signedAccountId
  })
}
```

### Loading State Pattern

```tsx
interface TransactionButtonProps {
  contractId: string
  method: string
  args: Record<string, unknown>
  label: string
}

function TransactionButton({ contractId, method, args, label }: TransactionButtonProps) {
  const { callFunction } = useNearWallet()
  
  const { mutate, isPending, error } = useMutation({
    mutationFn: () => callFunction({ contractId, method, args })
  })
  
  return (
    <>
      <button onClick={() => mutate()} disabled={isPending}>
        {isPending ? 'Processing...' : label}
      </button>
      {error && <ErrorMessage error={error} />}
    </>
  )
}
```

## Skill Router

Use the appropriate skill based on your needs:

| Need | Skill |
|------|-------|
| React hooks for wallet/contracts | `near-connect-hooks` |
| Wallet selector UI customization | `near-connect` |
| Low-level transaction building | `near-api-js` |
| TypeScript library with cleaner API | `near-kit` |
| Cross-chain token swaps | `near-intents` |
| Smart contract development | `near-smart-contracts` |

## RPC Endpoints

| Network | URL |
|---------|-----|
| Mainnet | `https://free.rpc.fastnear.com` |
| Testnet | `https://test.rpc.fastnear.com` |

## References

- [Project Templates](references/project-templates.md) - Complete setup guides
- [Common Patterns](references/common-patterns.md) - Auth, errors, NFTs, transactions
- [Skill Router](references/skill-router.md) - When to use which skill
