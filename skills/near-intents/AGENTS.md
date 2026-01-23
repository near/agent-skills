# NEAR Intents 1Click API — Complete Reference

Version 1.0.0
NEAR Intents
January 2026

---

**Note:**
This document is primarily for agents and LLMs to follow when implementing,
generating, or maintaining cross-chain swap integrations using the 1Click API.
Humans may also find it useful, but guidance here is optimized for automation
and consistency by AI-assisted workflows.

---

## Abstract

Comprehensive integration guide for the NEAR Intents 1Click API, designed for AI agents and LLMs. Enables cross-chain token swaps via REST API — the API provides deposit addresses, you build the deposit transaction. Contains examples, API reference, and chain-specific deposit patterns across 6 blockchains. Each section includes working code examples optimized for one-shot implementation. Default mode is chain-to-chain (deposit on origin → receive on destination).

**Base URL:** `https://1click.chaindefuser.com`

---

## Table of Contents

**Examples — HIGH**
[1.1 React Swap Widget](#11-react-swap-widget)
[1.2 Server/Script Example (Node.js)](#12-serverscript-example-nodejs)

**API Reference — CRITICAL**
[2.1 GET /v0/tokens](#21-get-v0tokens)
[2.2 POST /v0/quote](#22-post-v0quote)
[2.3 POST /v0/deposit/submit](#23-post-v0depositsubmit)
[2.4 GET /v0/status](#24-get-v0status)

**Chain Deposits — HIGH**
[3.1 EVM (Ethereum, Base, Arbitrum, Polygon, BSC)](#31-evm-ethereum-base-arbitrum-polygon-bsc)
[3.2 Solana](#32-solana)
[3.3 NEAR](#33-near)
[3.4 TON](#34-ton)
[3.5 Tron](#35-tron)
[3.6 Stellar (MEMO REQUIRED)](#36-stellar-memo-required)

**Advanced — LOW**
[4.1 Intents Balance Mode](#41-intents-balance-mode)
[4.2 Passive Deposit (QR Code)](#42-passive-deposit-qr-code)

**Resources**
[5. Links & Documentation](#5-resources)

---

# 1. Examples

## 1.1 React Swap Widget

Example showing the minimum viable swap implementation. Adapt to your app's architecture and design system.

### Dependencies

```bash
npm install @tanstack/react-query wagmi viem
```

### Example

```tsx
'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSendTransaction,
  useWriteContract,
  WagmiProvider,
  createConfig,
  http,
} from 'wagmi';
import { mainnet, base, arbitrum, polygon, bsc } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { erc20Abi, parseUnits } from 'viem';

const API_BASE = 'https://1click.chaindefuser.com';

const wagmiConfig = createConfig({
  chains: [mainnet, base, arbitrum, polygon, bsc],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
  },
});

const queryClient = new QueryClient();

const CHAIN_IDS: Record<string, number> = {
  eth: mainnet.id,
  base: base.id,
  arb: arbitrum.id,
  polygon: polygon.id,
  bsc: bsc.id,
};

interface Token {
  assetId: string;
  symbol: string;
  decimals: number;
  blockchain: string;
  contractAddress?: string;
}

function useTokens() {
  return useQuery<Token[]>({
    queryKey: ['1click-tokens'],
    queryFn: () => fetch(`${API_BASE}/v0/tokens`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}

function useQuote(params: { originAsset: string; destinationAsset: string; amount: string; recipient: string; refundTo: string } | null, apiKey?: string) {
  return useQuery({
    queryKey: ['1click-quote', params],
    queryFn: () =>
      fetch(`${API_BASE}/v0/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey && { Authorization: `Bearer ${apiKey}` }) },
        body: JSON.stringify({ dry: true, swapType: 'EXACT_INPUT', slippageTolerance: 100, ...params }),
      }).then((r) => r.json()),
    enabled: !!params?.amount && params.amount !== '0',
    refetchInterval: 10_000,
  });
}

function useSwapStatus(depositAddress: string | null, apiKey?: string) {
  return useQuery({
    queryKey: ['1click-status', depositAddress],
    queryFn: () =>
      fetch(`${API_BASE}/v0/status?depositAddress=${depositAddress}`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      }).then((r) => r.json()),
    enabled: !!depositAddress,
    refetchInterval: (q) =>
      ['SUCCESS', 'FAILED', 'REFUNDED', 'INCOMPLETE_DEPOSIT'].includes(q.state.data?.status) ? false : 2000,
  });
}

function useExecuteSwap(apiKey?: string) {
  return useMutation({
    mutationFn: async ({ params, sendTransaction }: { params: any; sendTransaction: (addr: string, amt: string) => Promise<string> }) => {
      const quote = await fetch(`${API_BASE}/v0/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey && { Authorization: `Bearer ${apiKey}` }) },
        body: JSON.stringify({ dry: false, swapType: 'EXACT_INPUT', slippageTolerance: 100, ...params }),
      }).then((r) => r.json());
      const txHash = await sendTransaction(quote.quote.depositAddress, quote.quote.amountIn);
      fetch(`${API_BASE}/v0/deposit/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey && { Authorization: `Bearer ${apiKey}` }) },
        body: JSON.stringify({ txHash, depositAddress: quote.quote.depositAddress }),
      }).catch(() => {});
      return { depositAddress: quote.quote.depositAddress, txHash };
    },
  });
}

function SwapWidgetInner({ apiKey }: { apiKey?: string }) {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [depositAddress, setDepositAddress] = useState<string | null>(null);

  const { data: tokens = [] } = useTokens();
  const executeSwap = useExecuteSwap(apiKey);
  const { data: statusData } = useSwapStatus(depositAddress, apiKey);

  const evmTokens = useMemo(() => tokens.filter((t) => ['eth', 'base', 'arb', 'polygon', 'bsc'].includes(t.blockchain)), [tokens]);
  const amountRaw = useMemo(() => {
    if (!amount || !fromToken) return '';
    try { return parseUnits(amount, fromToken.decimals).toString(); } catch { return ''; }
  }, [amount, fromToken]);

  const quoteParams = useMemo(() => {
    if (!fromToken || !toToken || !amountRaw || !recipient || !address) return null;
    return { originAsset: fromToken.assetId, destinationAsset: toToken.assetId, amount: amountRaw, recipient, refundTo: address };
  }, [fromToken, toToken, amountRaw, recipient, address]);

  const { data: quoteData, isLoading: quoteLoading } = useQuote(quoteParams, apiKey);

  const handleSwap = async () => {
    if (!quoteParams || !fromToken) return;
    const targetChainId = CHAIN_IDS[fromToken.blockchain];
    if (chain?.id !== targetChainId) { alert(`Please switch to ${fromToken.blockchain} network`); return; }
    const result = await executeSwap.mutateAsync({
      params: quoteParams,
      sendTransaction: async (depositAddr, depositAmount) => {
        if (fromToken.contractAddress) {
          return writeContractAsync({ address: fromToken.contractAddress as `0x${string}`, abi: erc20Abi, functionName: 'transfer', args: [depositAddr as `0x${string}`, BigInt(depositAmount)] });
        }
        return sendTransactionAsync({ to: depositAddr as `0x${string}`, value: BigInt(depositAmount) });
      },
    });
    setDepositAddress(result.depositAddress);
  };

  const isTerminal = statusData?.status && ['SUCCESS', 'FAILED', 'REFUNDED', 'INCOMPLETE_DEPOSIT'].includes(statusData.status);

  return (
    <div className="space-y-4 p-4 border rounded-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold">Swap</h2>
      {!isConnected ? (
        <button onClick={() => connect({ connector: connectors[0] })} className="w-full py-2 bg-blue-600 text-white rounded">Connect Wallet</button>
      ) : (
        <div className="flex justify-between items-center text-sm">
          <span className="truncate">{address}</span>
          <button onClick={() => disconnect()} className="text-red-600">Disconnect</button>
        </div>
      )}
      <select value={fromToken?.assetId || ''} onChange={(e) => setFromToken(evmTokens.find((t) => t.assetId === e.target.value) || null)} className="w-full p-2 border rounded">
        <option value="">Select source token</option>
        {evmTokens.map((t) => <option key={t.assetId} value={t.assetId}>{t.symbol} ({t.blockchain})</option>)}
      </select>
      <select value={toToken?.assetId || ''} onChange={(e) => setToToken(tokens.find((t) => t.assetId === e.target.value) || null)} className="w-full p-2 border rounded">
        <option value="">Select destination token</option>
        {tokens.map((t) => <option key={t.assetId} value={t.assetId}>{t.symbol} ({t.blockchain})</option>)}
      </select>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="w-full p-2 border rounded" />
      <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient address" className="w-full p-2 border rounded" />
      {quoteLoading && <div className="text-sm text-gray-500">Getting quote...</div>}
      {quoteData?.quote && <div className="p-3 bg-gray-50 rounded text-sm">You'll receive: <strong>{quoteData.quote.amountOutFormatted} {toToken?.symbol}</strong></div>}
      {statusData && <div className="p-3 bg-blue-50 rounded text-sm">Status: <strong>{statusData.status}</strong></div>}
      <button onClick={handleSwap} disabled={!isConnected || !quoteData?.quote || executeSwap.isPending || (depositAddress && !isTerminal)} className="w-full py-3 bg-blue-600 text-white rounded font-medium disabled:opacity-50">
        {executeSwap.isPending ? 'Confirming...' : depositAddress && !isTerminal ? `${statusData?.status || 'Processing'}...` : 'Swap'}
      </button>
    </div>
  );
}

export function SwapWidget({ apiKey }: { apiKey?: string }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SwapWidgetInner apiKey={apiKey} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

---

## 1.2 Server/Script Example (Node.js)

Example showing minimum viable server-side swap. Adapt to your use case.

> **Note:** This uses chain-to-chain mode. For high-frequency trading or faster execution, consider Intents balance mode — see section 4.1.

### Dependencies

```bash
npm install viem
```

### Example

```typescript
import { createWalletClient, http, parseUnits, erc20Abi, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, base, arbitrum } from 'viem/chains';

const API_BASE = 'https://1click.chaindefuser.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const API_KEY = process.env.ONE_CLICK_API_KEY;

const CHAINS = { eth: mainnet, base: base, arb: arbitrum };

interface Token { assetId: string; symbol: string; decimals: number; blockchain: string; contractAddress?: string; }

async function fetchTokens(): Promise<Token[]> {
  return fetch(`${API_BASE}/v0/tokens`).then((r) => r.json());
}

async function getQuote(params: { originAsset: string; destinationAsset: string; amount: string; recipient: string; refundTo: string }) {
  const res = await fetch(`${API_BASE}/v0/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(API_KEY && { Authorization: `Bearer ${API_KEY}` }) },
    body: JSON.stringify({ dry: false, swapType: 'EXACT_INPUT', slippageTolerance: 100, ...params }),
  });
  if (!res.ok) throw new Error(`Quote failed: ${await res.text()}`);
  return res.json();
}

async function pollStatus(depositAddress: string) {
  const terminal = ['SUCCESS', 'FAILED', 'REFUNDED', 'INCOMPLETE_DEPOSIT'];
  for (let i = 0; i < 180; i++) {
    const status = await fetch(`${API_BASE}/v0/status?depositAddress=${depositAddress}`, {
      headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
    }).then((r) => r.json());
    console.log(`Status: ${status.status}`);
    if (terminal.includes(status.status)) return status;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Timeout');
}

async function executeSwap(params: { fromToken: Token; toToken: Token; amount: string; recipient: string }) {
  const { fromToken, toToken, amount, recipient } = params;
  const chain = CHAINS[fromToken.blockchain as keyof typeof CHAINS];
  if (!chain) throw new Error(`Unsupported chain: ${fromToken.blockchain}`);

  const account = privateKeyToAccount(PRIVATE_KEY);
  const client = createWalletClient({ account, chain, transport: http() }).extend(publicActions);
  const amountRaw = parseUnits(amount, fromToken.decimals).toString();

  console.log(`Swapping ${amount} ${fromToken.symbol} → ${toToken.symbol}`);

  const quote = await getQuote({ originAsset: fromToken.assetId, destinationAsset: toToken.assetId, amount: amountRaw, recipient, refundTo: account.address });
  console.log(`Deposit ${quote.quote.amountIn} to ${quote.quote.depositAddress}`);

  let txHash: string;
  if (fromToken.contractAddress) {
    txHash = await client.writeContract({ address: fromToken.contractAddress as `0x${string}`, abi: erc20Abi, functionName: 'transfer', args: [quote.quote.depositAddress as `0x${string}`, BigInt(quote.quote.amountIn)] });
  } else {
    txHash = await client.sendTransaction({ to: quote.quote.depositAddress as `0x${string}`, value: BigInt(quote.quote.amountIn) });
  }
  console.log(`Deposit TX: ${txHash}`);

  await fetch(`${API_BASE}/v0/deposit/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(API_KEY && { Authorization: `Bearer ${API_KEY}` }) },
    body: JSON.stringify({ txHash, depositAddress: quote.quote.depositAddress }),
  });

  return pollStatus(quote.quote.depositAddress);
}

function findToken(tokens: Token[], symbol: string, blockchain: string): Token {
  const token = tokens.find((t) => t.symbol.toLowerCase() === symbol.toLowerCase() && t.blockchain === blockchain);
  if (!token) throw new Error(`Token not found: ${symbol} on ${blockchain}`);
  return token;
}

async function main() {
  const tokens = await fetchTokens();
  const usdc = findToken(tokens, 'USDC', 'eth');
  const wNear = findToken(tokens, 'wNEAR', 'near');
  await executeSwap({ fromToken: usdc, toToken: wNear, amount: '100', recipient: 'your-account.near' });
}

main().catch(console.error);
```

Run: `PRIVATE_KEY=0x... ONE_CLICK_API_KEY=... npx tsx swap.ts`

---

# 2. API Reference

## 2.1 GET /v0/tokens

Fetch supported tokens. Cache result (5 min recommended).

```typescript
const tokens = await fetch('https://1click.chaindefuser.com/v0/tokens').then(r => r.json());
```

Response:
```typescript
interface Token {
  assetId: string;          // Use in originAsset/destinationAsset
  decimals: number;         // For amount conversion
  blockchain: string;       // 'eth', 'sol', 'near', 'base', 'arb', etc.
  symbol: string;           // 'USDC', 'ETH', 'wNEAR'
  price: string;            // USD price
  contractAddress?: string; // Token contract (for transfers)
}
```

**Important:** Always use `assetId` from this endpoint. Never construct manually.

---

## 2.2 POST /v0/quote

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `dry` | boolean | `true` = preview only. `false` = get deposit address |
| `swapType` | string | `EXACT_INPUT`, `EXACT_OUTPUT`, `FLEX_INPUT`, `ANY_INPUT` |
| `originAsset` | string | Source token `assetId` |
| `destinationAsset` | string | Destination token `assetId` |
| `amount` | string | Amount in smallest unit |
| `recipient` | string | Address to receive output |
| `refundTo` | string | Address for refunds |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `slippageTolerance` | number | - | Max slippage in basis points (100 = 1%) |
| `depositType` | string | `ORIGIN_CHAIN` | `ORIGIN_CHAIN` or `INTENTS` |
| `recipientType` | string | `DESTINATION_CHAIN` | `DESTINATION_CHAIN` or `INTENTS` |
| `depositMode` | string | `SIMPLE` | `MEMO` required for Stellar |
| `referral` | string | - | Your app identifier |
| `appFees` | array | - | `[{ recipient: "fee.near", fee: 100 }]` |

### Swap Types

- **EXACT_INPUT** — Fixed input, variable output (most common)
- **EXACT_OUTPUT** — Fixed output, variable input
- **FLEX_INPUT** — Variable input with slippage range
- **ANY_INPUT** — Accumulating deposits until deadline

### Example

```typescript
const quote = await fetch('https://1click.chaindefuser.com/v0/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_API_KEY' },
  body: JSON.stringify({
    dry: false,
    swapType: 'EXACT_INPUT',
    slippageTolerance: 100,
    originAsset: 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near',
    destinationAsset: 'nep141:wrap.near',
    amount: '1000000',
    recipient: 'user.near',
    refundTo: '0xYourAddress',
  })
}).then(r => r.json());

// quote.quote.depositAddress = "0x..." → send tokens here
// quote.quote.deadline = "2025-01-16T15:00:00Z"
```

---

## 2.3 POST /v0/deposit/submit

Notify API after deposit. Speeds up processing.

```typescript
await fetch('https://1click.chaindefuser.com/v0/deposit/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    txHash: '0x123...',
    depositAddress: quote.quote.depositAddress,
    // For NEAR: nearSenderAccount: 'user.near'
    // For Stellar: memo: quote.quote.depositMemo
  })
});
```

---

## 2.4 GET /v0/status

Poll until terminal state.

```typescript
const status = await fetch(`https://1click.chaindefuser.com/v0/status?depositAddress=${depositAddress}`).then(r => r.json());
```

For Stellar: `?depositAddress=...&depositMemo=123456`

| Status | Terminal | Description |
|--------|----------|-------------|
| `PENDING_DEPOSIT` | No | Waiting for deposit |
| `PROCESSING` | No | Swap executing |
| `SUCCESS` | Yes | Complete |
| `FAILED` | Yes | Error occurred |
| `REFUNDED` | Yes | Funds returned |
| `INCOMPLETE_DEPOSIT` | Yes | Deposit below required |

---

# 3. Chain Deposits

## 3.1 EVM (Ethereum, Base, Arbitrum, Polygon, BSC)

### Native Token

```typescript
import { useSendTransaction } from 'wagmi';
const { sendTransactionAsync } = useSendTransaction();
const hash = await sendTransactionAsync({ to: depositAddress as `0x${string}`, value: BigInt(amountIn) });
```

### ERC-20

```typescript
import { useWriteContract } from 'wagmi';
import { erc20Abi } from 'viem';
const { writeContractAsync } = useWriteContract();
const hash = await writeContractAsync({
  address: tokenAddress as `0x${string}`,
  abi: erc20Abi,
  functionName: 'transfer',
  args: [depositAddress as `0x${string}`, BigInt(amountIn)],
});
```

---

## 3.2 Solana

### Native SOL

```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, PublicKey } from '@solana/web3.js';

const { publicKey, sendTransaction } = useWallet();
const { connection } = useConnection();

const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: publicKey!,
    toPubkey: new PublicKey(depositAddress),
    lamports: BigInt(amountIn),
  })
);
const signature = await sendTransaction(tx, connection);
```

### SPL Token

```typescript
import { getAssociatedTokenAddressSync, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';

const mintPubkey = new PublicKey(tokenMint);
const toPubkey = new PublicKey(depositAddress);
const fromATA = getAssociatedTokenAddressSync(mintPubkey, publicKey!);
const toATA = getAssociatedTokenAddressSync(mintPubkey, toPubkey);

const tx = new Transaction();
try { await getAccount(connection, toATA); } catch { tx.add(createAssociatedTokenAccountInstruction(publicKey!, toATA, toPubkey, mintPubkey)); }
tx.add(createTransferInstruction(fromATA, toATA, publicKey!, BigInt(amountIn)));
const signature = await sendTransaction(tx, connection);
```

---

## 3.3 NEAR

### NEP-141 Token

```typescript
import { useWalletSelector } from '@near-wallet-selector/react';
const { selector } = useWalletSelector();
const wallet = await selector.wallet();

const result = await wallet.signAndSendTransactions({
  transactions: [{
    receiverId: tokenContract,
    actions: [{
      type: 'FunctionCall',
      params: { methodName: 'ft_transfer', args: { receiver_id: depositAddress, amount: amountIn }, gas: '50000000000000', deposit: '1' },
    }],
  }],
});
```

For `/v0/deposit/submit`, include `nearSenderAccount: 'user.near'`.

---

## 3.4 TON

### Native TON

```typescript
import { useTonConnectUI } from '@tonconnect/ui-react';
const [tonConnect] = useTonConnectUI();

const result = await tonConnect.sendTransaction({
  validUntil: Math.floor(Date.now() / 1000) + 600,
  messages: [{ address: depositAddress, amount: amountIn }],
});
```

---

## 3.5 Tron

### Native TRX

```typescript
import TronWeb from 'tronweb';
const tx = await tronWeb.transactionBuilder.sendTrx(depositAddress, Number(amountIn), tronWeb.defaultAddress.base58);
const signedTx = await tronWeb.trx.sign(tx);
const result = await tronWeb.trx.sendRawTransaction(signedTx);
```

---

## 3.6 Stellar (MEMO REQUIRED)

Request quote with `depositMode: 'MEMO'`. Transaction MUST include memo.

```typescript
import { Horizon, Asset, Memo, Networks, Operation, TransactionBuilder, Keypair } from '@stellar/stellar-sdk';

const server = new Horizon.Server('https://horizon.stellar.org');
const keypair = Keypair.fromSecret(userSecret);
const account = await server.loadAccount(keypair.publicKey());

const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.PUBLIC })
  .addOperation(Operation.payment({ destination: depositAddress, asset: Asset.native(), amount: amountFormatted }))
  .addMemo(Memo.text(quote.quote.depositMemo))  // CRITICAL
  .setTimeout(30)
  .build();

tx.sign(keypair);
await server.submitTransaction(tx);
```

---

# 4. Advanced

## 4.1 Intents Balance Mode

Alternative architecture for apps that hold balances in intents.near. Enables faster swaps by avoiding on-chain deposits/withdrawals for each trade.

### Deposit to Intents

```typescript
{ depositType: 'ORIGIN_CHAIN', recipientType: 'INTENTS', originAsset: 'nep141:eth-usdc...', destinationAsset: 'nep141:eth-usdc...' }
```

### Withdraw from Intents

```typescript
{ depositType: 'INTENTS', recipientType: 'DESTINATION_CHAIN', refundType: 'INTENTS' }
```

---

## 4.2 Passive Deposit (QR Code)

For manual transfers. Use `FLEX_INPUT` for amount tolerance.

```typescript
const quote = await fetch('https://1click.chaindefuser.com/v0/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dry: false,
    swapType: 'FLEX_INPUT',
    slippageTolerance: 100,
    originAsset: 'nep141:btc.omft.near',
    destinationAsset: 'nep141:wrap.near',
    amount: '100000000',
    recipient: 'user.near',
    refundTo: 'bc1q...',
  })
}).then(r => r.json());

// Display: quote.quote.depositAddress, quote.quote.amountInFormatted, quote.quote.deadline
// If depositMemo exists, user MUST include it
```

---

# 5. Resources

- **Docs:** https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api
- **API Keys:** https://partners.near-intents.org/
- **OpenAPI:** https://1click.chaindefuser.com/docs/v0/openapi.yaml
