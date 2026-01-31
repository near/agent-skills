# Common Patterns

Reusable patterns for NEAR dApp development using React Query and type-safe approaches.

## Authentication Flow

```tsx
import { useNearWallet } from 'near-connect-hooks'

function AuthenticatedApp() {
  const { signedAccountId, loading } = useNearWallet()
  
  if (loading) return <LoadingScreen />
  if (!signedAccountId) return <LoginScreen />
  return <Dashboard accountId={signedAccountId} />
}
```

## Error Handling

```tsx
import { 
  FunctionCallError, 
  InsufficientBalanceError,
  NearError 
} from 'near-kit'

async function handleTransaction(): Promise<void> {
  try {
    await callFunction({ ... })
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      alert(`Need ${error.required} NEAR, have ${error.available}`)
    } else if (error instanceof FunctionCallError) {
      console.error('Contract error:', error.panic)
      console.log('Logs:', error.logs)
    } else if (error instanceof NearError && error.message?.includes('User rejected')) {
      // User cancelled in wallet
    } else {
      console.error('Unknown error:', error)
    }
  }
}
```

## Data Fetching with React Query

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNearWallet } from 'near-connect-hooks'

interface TokenBalance {
  balance: string
  decimals: number
}

function useTokenBalance(tokenId: string) {
  const { signedAccountId, viewFunction } = useNearWallet()
  
  return useQuery<string>({
    queryKey: ['ft-balance', tokenId, signedAccountId],
    queryFn: () => viewFunction({
      contractId: tokenId,
      method: 'ft_balance_of',
      args: { account_id: signedAccountId }
    }),
    enabled: !!signedAccountId,
    staleTime: 30_000
  })
}

function TokenBalance({ tokenId, decimals }: { tokenId: string; decimals: number }) {
  const { data: balance, isLoading, error } = useTokenBalance(tokenId)
  
  if (isLoading) return <Skeleton />
  if (error) return <ErrorDisplay error={error} />
  
  const formatted = (Number(balance) / Math.pow(10, decimals)).toFixed(2)
  return <span>{formatted}</span>
}
```

## Mutation with Optimistic Updates

```tsx
interface TransferArgs {
  receiverId: string
  amount: string
}

function useTransfer() {
  const { transfer } = useNearWallet()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ receiverId, amount }: TransferArgs) => 
      transfer({ receiverId, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] })
    }
  })
}

function TransferButton({ receiverId, amount }: TransferArgs) {
  const { mutate, isPending, error } = useTransfer()
  
  return (
    <button 
      onClick={() => mutate({ receiverId, amount })}
      disabled={isPending}
    >
      {isPending ? 'Sending...' : 'Send'}
    </button>
  )
}
```

## NFT Gallery with Typed Response

```tsx
interface NFTToken {
  token_id: string
  owner_id: string
  metadata: {
    title: string
    description: string
    media: string
    copies: number | null
  }
}

function useNFTsForOwner(contractId: string) {
  const { signedAccountId, viewFunction } = useNearWallet()
  
  return useQuery<NFTToken[]>({
    queryKey: ['nft-tokens', contractId, signedAccountId],
    queryFn: () => viewFunction({
      contractId,
      method: 'nft_tokens_for_owner',
      args: { 
        account_id: signedAccountId,
        from_index: '0',
        limit: 50
      }
    }),
    enabled: !!signedAccountId
  })
}

function NFTGallery({ contractId }: { contractId: string }) {
  const { data: nfts, isLoading, error } = useNFTsForOwner(contractId)
  
  if (isLoading) return <GridSkeleton count={6} />
  if (error) return <ErrorDisplay error={error} />
  if (!nfts?.length) return <EmptyState message="No NFTs found" />
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {nfts.map(nft => (
        <NFTCard key={nft.token_id} nft={nft} />
      ))}
    </div>
  )
}
```

## Contract Call with Type Safety

```tsx
interface SetGreetingArgs {
  message: string
}

interface GreetingResponse {
  message: string
  timestamp: number
}

function useGreetingContract(contractId: string) {
  const { viewFunction, callFunction } = useNearWallet()
  const queryClient = useQueryClient()
  
  const greeting = useQuery<GreetingResponse>({
    queryKey: ['greeting', contractId],
    queryFn: () => viewFunction({
      contractId,
      method: 'get_greeting',
      args: {}
    })
  })
  
  const setGreeting = useMutation({
    mutationFn: (args: SetGreetingArgs) => callFunction({
      contractId,
      method: 'set_greeting',
      args,
      gas: '30000000000000',
      deposit: '0'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['greeting', contractId] })
    }
  })
  
  return { greeting, setGreeting }
}
```

## Multiple Actions in One Transaction

```tsx
import { Actions } from 'near-connect-hooks'

interface FTTransferParams {
  tokenContract: string
  receiverId: string
  amount: string
  storageDeposit: string
}

async function transferFTWithStorage({
  tokenContract,
  receiverId,
  amount,
  storageDeposit
}: FTTransferParams): Promise<void> {
  await signAndSendTransaction({
    receiverId: tokenContract,
    actions: [
      Actions.functionCall(
        'storage_deposit',
        { account_id: receiverId },
        '30000000000000',
        storageDeposit
      ),
      Actions.functionCall(
        'ft_transfer',
        { receiver_id: receiverId, amount },
        '30000000000000',
        '1'
      )
    ]
  })
}
```

## Unit Conversion Utilities

```tsx
const NEAR_DECIMALS = 24
const USDC_DECIMALS = 6
const USDT_DECIMALS = 6

function toYoctoNear(near: string): string {
  return (BigInt(Math.floor(parseFloat(near) * 1e6)) * BigInt(1e18)).toString()
}

function fromYoctoNear(yocto: string): string {
  return (Number(yocto) / 1e24).toFixed(4)
}

function formatToken(amount: string, decimals: number, precision = 2): string {
  return (Number(amount) / Math.pow(10, decimals)).toFixed(precision)
}

// Usage
toYoctoNear('1.5')  // '1500000000000000000000000'
formatToken('1000000', USDC_DECIMALS)  // '1.00'
```

## Responsive Wallet Button

```tsx
interface WalletButtonProps {
  className?: string
}

function truncateAddress(address: string, startChars = 8, endChars = 6): string {
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

function WalletButton({ className }: WalletButtonProps) {
  const { signedAccountId, loading, signIn, signOut } = useNearWallet()
  
  if (loading) return <Button disabled className={className}>Connecting...</Button>
  
  if (!signedAccountId) {
    return <Button onClick={signIn} className={className}>Connect Wallet</Button>
  }
  
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button className={className}>{truncateAddress(signedAccountId)}</Button>
      </DropdownTrigger>
      <DropdownMenu>
        <DropdownItem onClick={() => navigator.clipboard.writeText(signedAccountId)}>
          Copy Address
        </DropdownItem>
        <DropdownItem onClick={signOut}>Disconnect</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
```

## Polling Pattern (When Needed)

```tsx
function useTransactionStatus(txHash: string | null) {
  const { provider } = useNearWallet()
  
  return useQuery({
    queryKey: ['tx-status', txHash],
    queryFn: async () => {
      const result = await provider.txStatus(txHash!, signedAccountId)
      return {
        success: result.status.SuccessValue !== undefined,
        failure: result.status.Failure,
        receipts: result.receipts_outcome
      }
    },
    enabled: !!txHash,
    refetchInterval: (query) => 
      query.state.data?.success || query.state.data?.failure ? false : 2000
  })
}
```
