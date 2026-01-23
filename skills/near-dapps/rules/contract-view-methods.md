# Contract: View Methods

Call view (read-only) contract methods efficiently without wallet signatures.

## Why It Matters

View methods:
- Don't require wallet signatures
- Don't cost gas
- Return data instantly
- Can be called without authentication
- Should be used for all read operations

## ❌ Incorrect

```tsx
// Don't use wallet for view methods
async function getBalance() {
  const wallet = await selector?.wallet();
  
  // Incorrect: Using wallet transaction for view method
  const result = await wallet?.signAndSendTransaction({
    receiverId: CONTRACT_ID,
    actions: [{
      type: 'FunctionCall',
      params: {
        methodName: 'get_balance',
        args: { account_id: accountId },
        gas: '30000000000000',
        deposit: '0',
      },
    }],
  });
  
  return result;
}
```

**Problems:**
- Requires wallet signature for read operation
- Slower (needs user approval)
- Wastes gas (view methods are free)
- Poor user experience

## ✅ Correct

```tsx
import { providers } from 'near-api-js';

const NETWORK_ID = 'testnet';
const CONTRACT_ID = 'your-contract.testnet';

// Setup provider (can be reused)
const provider = new providers.JsonRpcProvider({
  url: NETWORK_ID === 'mainnet' 
    ? 'https://rpc.mainnet.near.org'
    : 'https://rpc.testnet.near.org',
});

async function getBalance(accountId: string): Promise<string> {
  try {
    // Call view method directly via RPC
    const result = await provider.query<CodeResult>({
      request_type: 'call_function',
      account_id: CONTRACT_ID,
      method_name: 'get_balance',
      args_base64: Buffer.from(JSON.stringify({ 
        account_id: accountId 
      })).toString('base64'),
      finality: 'final',
    });

    // Parse the result
    const balance = JSON.parse(
      Buffer.from(result.result).toString()
    );
    
    return balance;
  } catch (error) {
    console.error('Failed to get balance:', error);
    throw error;
  }
}

// Usage in component
function BalanceDisplay() {
  const [balance, setBalance] = useState<string>('0');
  const { accountId } = useWallet();

  useEffect(() => {
    if (accountId) {
      getBalance(accountId).then(setBalance);
    }
  }, [accountId]);

  return <div>Balance: {balance}</div>;
}
```

**Benefits:**
- No wallet signature required
- Instant results
- Free (no gas cost)
- Works even without connected wallet
- Better performance

## Using near-api-js Account

```tsx
import { Account, connect } from 'near-api-js';

async function getBalanceWithAccount(accountId: string) {
  const near = await connect({
    networkId: NETWORK_ID,
    nodeUrl: NETWORK_ID === 'mainnet'
      ? 'https://rpc.mainnet.near.org'
      : 'https://rpc.testnet.near.org',
  });

  const account = new Account(near.connection, CONTRACT_ID);
  
  // View method call
  const balance = await account.viewFunction({
    contractId: CONTRACT_ID,
    methodName: 'get_balance',
    args: { account_id: accountId },
  });

  return balance;
}
```

## TypeScript Type Safety

```tsx
interface BalanceArgs {
  account_id: string;
}

interface BalanceResponse {
  balance: string;
  locked: string;
}

async function getBalanceTyped(
  accountId: string
): Promise<BalanceResponse> {
  const args: BalanceArgs = { account_id: accountId };
  
  const result = await provider.query({
    request_type: 'call_function',
    account_id: CONTRACT_ID,
    method_name: 'get_balance',
    args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
    finality: 'final',
  });

  return JSON.parse(Buffer.from(result.result).toString());
}
```

## Additional Considerations

- Use RPC provider directly for best performance
- Cache view method results when appropriate
- Handle errors gracefully (contract might not exist)
- Use TypeScript interfaces for type safety
- Consider using React Query for caching and refetching
- Set finality to 'optimistic' for faster (but less final) results
- Batch multiple view calls when possible

## References

- [View Methods](https://docs.near.org/sdk/rust/contract-interface/public-methods#view-methods)
- [RPC API](https://docs.near.org/api/rpc/contracts)
- [near-api-js](https://docs.near.org/tools/near-api-js/quick-reference)
