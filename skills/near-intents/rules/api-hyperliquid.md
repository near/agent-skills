---
title: Hyperliquid
impact: MEDIUM
tags: api, hyperliquid, usdc, deposit
---

# Hyperliquid

Send USDC to Hyperliquid, or deposit USDC from Hyperliquid, via the standard quote → deposit → status flow.

Source: https://docs.near-intents.org/integration/distribution-channels/1click-api/hyperliquid.md

## Hyperliquid USDC asset ID

```
1cs_v1:hypercore:hip1:0x6d1e7cde53ba9467b783cb7c530ce054
```

(8 decimals)

## Send USDC TO Hyperliquid

- `destinationAsset` = Hyperliquid USDC, `recipient` = user's Hyperliquid EVM `0x` address, `recipientType: DESTINATION_CHAIN`
- Funds credit the perp balance — **not** HyperEVM ERC-20, **not** spot

```typescript
const quote = await fetch('https://1click.chaindefuser.com/v0/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_JWT_TOKEN' }, // authenticated quotes avoid the +0.25% unauthenticated fee
  body: JSON.stringify({
    dry: false,
    swapType: 'EXACT_INPUT',
    slippageTolerance: 100,
    originAsset: 'nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near', // ETH USDT
    destinationAsset: '1cs_v1:hypercore:hip1:0x6d1e7cde53ba9467b783cb7c530ce054',
    amount: '5000000', // 5 USDT (6 decimals)
    depositType: 'ORIGIN_CHAIN',
    recipient: '0xYOUR_HYPERLIQUID_ADDRESS',
    recipientType: 'DESTINATION_CHAIN',
    refundTo: '0xYOUR_ETHEREUM_ADDRESS',
    refundType: 'ORIGIN_CHAIN',
    deadline: '2026-12-31T00:00:00.000Z',
  }),
}).then(r => r.json());
```

## Deposit USDC FROM Hyperliquid

Same endpoint; swap origin/destination. `originAsset` = Hyperliquid USDC, `depositType: ORIGIN_CHAIN`. Send `quote.amountIn` to the deposit address.

## Critical Rules

1. **Fee:** flat **0.2 USDC** deducted from each FROM-Hyperliquid deposit (5 arrives → 4.8 credited). Send `quote.amountIn` — do **not** add 0.2 yourself.
2. **Minimum deposit 0.5 USDC** — smaller amounts are not processed.
3. **Transfer methods:**
   - `sendAsset` ✅ supported (spot or perp; standard Hyperliquid Send)
   - `spotSend` ✅ supported (spot only)
   - `usdSend` ⚠️ perp only; an extra **1 USDC** is deducted on top of the 0.2 fee → send `quote.amountIn` **+ 1 USDC** or you'll end in `INCOMPLETE_DEPOSIT`
   - ❌ anything else (direct bridge transfers like CCTP / native Arbitrum↔Hyperliquid) — **no guarantee of processing or crediting**
4. Hyperliquid network/gas fees are paid on the transfer and are separate from the USDC figures.
