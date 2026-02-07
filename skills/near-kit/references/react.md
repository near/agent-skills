# @near-kit/react

React bindings for [near-kit](https://github.com/r-near/near-kit) — a simple, intuitive TypeScript library for interacting with NEAR Protocol.

## Installation

```bash
npm install @near-kit/react
# or
bun add @near-kit/react
```

## Quick Start

```tsx
import { NearProvider, useNear, useView, useCall } from "@near-kit/react"

function App() {
  return (
    <NearProvider config={{ network: "testnet" }}>
      <Counter />
    </NearProvider>
  )
}

function Counter() {
  const { data: count, isLoading } = useView<{}, number>({
    contractId: "counter.testnet",
    method: "get_count",
  })

  const { mutate: increment, isPending } = useCall({
    contractId: "counter.testnet",
    method: "increment",
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <button onClick={() => increment({})} disabled={isPending}>
      Count: {count}
    </button>
  )
}
```

## Philosophy

This package provides **thin, ergonomic wrappers** around `near-kit`. The hooks handle basic React state (loading, error, data) without reimplementing caching, deduplication, or advanced features.

**For simple apps:** Use the built-in hooks directly.

**For advanced use cases:** Use `useNear()` with [React Query](#react-query-integration) or [SWR](#swr-integration) for caching, polling, optimistic updates, and more.

## API Reference

### Provider & Context

#### `<NearProvider>`

Provides a `Near` client to all child components.

```tsx
// Option 1: Pass configuration (creates Near instance internally)
<NearProvider config={{ network: "testnet" }}>
  <App />
</NearProvider>

// Option 2: Pass an existing Near instance
const near = new Near({ network: "testnet", privateKey: "..." })
<NearProvider near={near}>
  <App />
</NearProvider>
```

#### `useNear()`

Returns the `Near` client from context. Use this for direct access or integration with React Query/SWR.

```tsx
function MyComponent() {
  const near = useNear()
  // near.view(), near.call(), near.send(), near.transaction(), etc.
}
```

### View Hooks

#### `useView<TArgs, TResult>(params)`

Calls a view method on a contract.

```tsx
const { data, isLoading, error, refetch } = useView<{ account_id: string }, string>({
  contractId: "token.testnet",
  method: "ft_balance_of",
  args: { account_id: "alice.testnet" },
  enabled: true, // optional, default: true
})
```

#### `useBalance(params)`

Fetches an account's NEAR balance.

```tsx
const { data: balance, isLoading } = useBalance({
  accountId: "alice.testnet",
})
```

#### `useAccountExists(params)`

Checks if an account exists.

```tsx
const { data: exists } = useAccountExists({
  accountId: "alice.testnet",
})
```

### Mutation Hooks

#### `useCall<TArgs, TResult>(params)`

Calls a change method on a contract.

```tsx
const { mutate, data, isPending, isSuccess, isError, error, reset } = useCall<
  { amount: number },
  void
>({
  contractId: "counter.testnet",
  method: "increment",
  options: { gas: "30 Tgas" }, // optional defaults
})

// Execute the call
await mutate({ amount: 1 })

// Override options per-call
await mutate({ amount: 1 }, { attachedDeposit: "0.1 NEAR" })
```

#### `useSend()`

Sends NEAR tokens.

```tsx
const { mutate: send, isPending, isSuccess, isError, error, reset } = useSend()

await send("bob.testnet", "1 NEAR")
```

### Account Hook

#### `useAccount()`

Returns the current connected account state.

```tsx
const { accountId, isConnected, isLoading, refetch } = useAccount()
```

### Typed Contract Hook

#### `useContract<T>(contractId)`

Returns a typed contract instance for full TypeScript inference.

```tsx
import type { Contract } from "near-kit"

type MyContract = Contract<{
  view: {
    get_balance: (args: { account_id: string }) => Promise<string>
  }
  call: {
    transfer: (args: { to: string; amount: string }) => Promise<void>
  }
}>

function TokenBalance() {
  const contract = useContract<MyContract>("token.testnet")

  // Fully typed!
  const balance = await contract.view.get_balance({ account_id: "..." })
}
```

## React Query Integration

For caching, polling, background refetching, and devtools, use React Query with `useNear()`:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNear } from "@near-kit/react"

function useContractView<TArgs extends object, TResult>(
  contractId: string,
  method: string,
  args: TArgs
) {
  const near = useNear()

  return useQuery({
    queryKey: ["near", "view", contractId, method, args],
    queryFn: () => near.view<TResult>(contractId, method, args),
  })
}

function useContractCall<TArgs extends object, TResult>(
  contractId: string,
  method: string
) {
  const near = useNear()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (args: TArgs) => near.call<TResult>(contractId, method, args),
    onSuccess: () => {
      // Invalidate relevant queries after mutation
      queryClient.invalidateQueries({ queryKey: ["near", "view", contractId] })
    },
  })
}

// Usage
function Counter() {
  const { data: count, isLoading } = useContractView<{}, number>(
    "counter.testnet",
    "get_count",
    {}
  )

  const { mutate: increment } = useContractCall<{}, void>(
    "counter.testnet",
    "increment"
  )

  return (
    <button onClick={() => increment({})}>
      Count: {isLoading ? "..." : count}
    </button>
  )
}
```

### With Polling

```tsx
const { data: balance } = useQuery({
  queryKey: ["near", "balance", accountId],
  queryFn: () => near.getBalance(accountId),
  refetchInterval: 5000, // Poll every 5 seconds
})
```

## SWR Integration

For a lighter alternative, use SWR with `useNear()`:

```tsx
import useSWR from "swr"
import useSWRMutation from "swr/mutation"
import { useNear } from "@near-kit/react"

function useContractView<TArgs extends object, TResult>(
  contractId: string,
  method: string,
  args: TArgs
) {
  const near = useNear()
  const key = ["near", "view", contractId, method, JSON.stringify(args)]

  return useSWR(key, () => near.view<TResult>(contractId, method, args))
}

function useContractCall<TArgs extends object, TResult>(
  contractId: string,
  method: string
) {
  const near = useNear()
  const key = ["near", "call", contractId, method]

  return useSWRMutation(key, (_key, { arg }: { arg: TArgs }) =>
    near.call<TResult>(contractId, method, arg)
  )
}

// Usage
function Counter() {
  const { data: count, isLoading } = useContractView<{}, number>(
    "counter.testnet",
    "get_count",
    {}
  )

  const { trigger: increment, isMutating } = useContractCall<{}, void>(
    "counter.testnet",
    "increment"
  )

  return (
    <button onClick={() => increment({})} disabled={isMutating}>
      Count: {isLoading ? "..." : count}
    </button>
  )
}
```

### With Polling

```tsx
const { data: balance } = useSWR(
  ["near", "balance", accountId],
  () => near.getBalance(accountId),
  { refreshInterval: 5000 }
)
```

## Wallet Integration

### With Wallet Selector

```tsx
import { setupWalletSelector } from "@near-wallet-selector/core"
import { fromWalletSelector } from "near-kit"

const selector = await setupWalletSelector({
  network: "testnet",
  modules: [/* your wallet modules */],
})
const wallet = await selector.wallet()

<NearProvider
  config={{
    network: "testnet",
    wallet: fromWalletSelector(wallet),
  }}
>
  <App />
</NearProvider>
```

### With HOT Connect

```tsx
import { setupNearConnect } from "@hot-labs/near-connect"
import { fromHotConnect } from "near-kit"

const connect = await setupNearConnect({ network: "testnet" })

<NearProvider
  config={{
    network: "testnet",
    wallet: fromHotConnect(connect),
  }}
>
  <App />
</NearProvider>
```

## SSR / Next.js

This package is marked with `"use client"` and is designed for client-side use only. In Next.js App Router, wrap the provider in a client component:

```tsx
// app/providers.tsx
"use client"

import { NearProvider } from "@near-kit/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NearProvider config={{ network: "testnet" }}>
      {children}
    </NearProvider>
  )
}
```

## License

MIT