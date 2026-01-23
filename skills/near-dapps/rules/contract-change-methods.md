# Contract: Change Methods

Execute contract change methods with proper transaction handling and error management.

## Why It Matters

Change methods:
- Modify blockchain state
- Require wallet signatures
- Cost gas (paid by user)
- Need proper gas and deposit allocation
- Can fail and need error handling

## ❌ Incorrect

```tsx
async function transfer(receiverId: string, amount: string) {
  const wallet = await selector?.wallet();
  
  // Missing error handling, gas configuration
  await wallet?.signAndSendTransaction({
    receiverId: CONTRACT_ID,
    actions: [{
      type: 'FunctionCall',
      params: {
        methodName: 'transfer',
        args: { receiver_id: receiverId, amount },
        // Missing gas and deposit configuration
      },
    }],
  });
  
  // No feedback to user, no error handling
}
```

**Problems:**
- No gas or deposit specified
- No error handling
- No user feedback
- No transaction confirmation
- Can't track transaction status

## ✅ Correct

```tsx
import { transactions, utils } from 'near-api-js';
import type { FinalExecutionOutcome } from 'near-api-js/lib/providers';

interface TransferArgs {
  receiver_id: string;
  amount: string;
}

async function transfer(
  receiverId: string,
  amount: string,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<FinalExecutionOutcome | null> {
  try {
    const wallet = await selector?.wallet();
    
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    // Prepare transaction with proper gas and deposit
    const result = await wallet.signAndSendTransaction({
      receiverId: CONTRACT_ID,
      actions: [
        {
          type: 'FunctionCall',
          params: {
            methodName: 'transfer',
            args: { 
              receiver_id: receiverId, 
              amount 
            } as TransferArgs,
            gas: '30000000000000', // 30 TGas
            deposit: '1', // 1 yoctoNEAR for security
          },
        },
      ],
    });

    // Check transaction status
    if (result && typeof result === 'object' && 'status' in result) {
      const status = (result as FinalExecutionOutcome).status;
      
      if ('SuccessValue' in status || 'SuccessReceiptId' in status) {
        console.log('Transfer successful:', result);
        onSuccess?.();
        return result as FinalExecutionOutcome;
      } else {
        throw new Error('Transaction failed');
      }
    }
    
    return null;
  } catch (error) {
    console.error('Transfer failed:', error);
    onError?.(error as Error);
    throw error;
  }
}

// Usage in component
function TransferButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accountId } = useWallet();

  const handleTransfer = async () => {
    if (!accountId) return;
    
    setLoading(true);
    setError(null);

    try {
      await transfer(
        'recipient.near',
        utils.format.parseNearAmount('1')!, // 1 NEAR
        () => {
          // Success callback
          alert('Transfer successful!');
          // Refresh balance or update UI
        },
        (error) => {
          // Error callback
          setError(error.message);
        }
      );
    } catch (error) {
      setError('Transfer failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleTransfer} disabled={loading || !accountId}>
        {loading ? 'Transferring...' : 'Transfer 1 NEAR'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

**Benefits:**
- Proper gas allocation (30 TGas is typical)
- Security deposit (1 yoctoNEAR)
- Error handling and user feedback
- Transaction status verification
- Loading states for better UX
- Type safety with TypeScript

## Gas and Deposit Guidelines

```tsx
// Common gas amounts
const GAS = {
  SIMPLE_CALL: '30000000000000',      // 30 TGas
  COMPLEX_CALL: '100000000000000',    // 100 TGas
  CROSS_CONTRACT: '150000000000000',  // 150 TGas
};

// Common deposits
const DEPOSIT = {
  SECURITY: '1',                      // 1 yoctoNEAR
  STORAGE: utils.format.parseNearAmount('0.1')!, // 0.1 NEAR
  ONE_NEAR: utils.format.parseNearAmount('1')!,  // 1 NEAR
};
```

## Handling Transaction Receipts

```tsx
async function transferWithReceipt(receiverId: string, amount: string) {
  const wallet = await selector?.wallet();
  const result = await wallet?.signAndSendTransaction({
    receiverId: CONTRACT_ID,
    actions: [{
      type: 'FunctionCall',
      params: {
        methodName: 'transfer',
        args: { receiver_id: receiverId, amount },
        gas: GAS.SIMPLE_CALL,
        deposit: DEPOSIT.SECURITY,
      },
    }],
  });

  // Parse receipts for detailed information
  if (result && 'transaction_outcome' in result) {
    const outcome = result as FinalExecutionOutcome;
    const transactionHash = outcome.transaction.hash;
    const gasUsed = outcome.transaction_outcome.outcome.gas_burnt;
    
    console.log(`Transaction: ${transactionHash}`);
    console.log(`Gas used: ${gasUsed}`);
    
    // Check for events or return values in receipts
    outcome.receipts_outcome.forEach((receipt) => {
      receipt.outcome.logs.forEach((log) => {
        console.log('Contract log:', log);
      });
    });
  }

  return result;
}
```

## Additional Considerations

- Always specify gas (default 30 TGas for simple calls)
- Add 1 yoctoNEAR deposit for security on change methods
- Handle wallet rejection (user cancels transaction)
- Show loading states during transaction
- Verify transaction success before updating UI
- Parse contract logs for events
- Consider transaction timeout (user might not approve immediately)
- Refresh related data after successful transaction

## References

- [Contract Methods](https://docs.near.org/sdk/rust/contract-interface/public-methods)
- [Transactions](https://docs.near.org/concepts/protocol/transactions)
- [Gas](https://docs.near.org/concepts/protocol/gas)
- [Wallet Selector API](https://github.com/near/wallet-selector/blob/main/packages/core/docs/api/wallet.md)
