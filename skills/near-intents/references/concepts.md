# 1Click API Concepts

## How It Works

1Click simplifies NEAR Intents by temporarily transferring assets to a trusted swapping agent that coordinates with Market Makers to execute your intent. The REST API abstracts intent creation, solver coordination, and transaction execution.

## Swap Lifecycle

```
Request Quote → Deposit Tokens → Submit Tx Hash → Monitor Status → Success/Refund
```

1. **Request a quote** - POST `/v0/quote` with your intent parameters
   - `dry: true` for preview (no deposit address)
   - `dry: false` to commit and receive deposit address (~10 min validity)

2. **Deposit tokens** - Send tokens to the unique deposit address
   - 1Click automatically begins processing upon receipt

3. **Submit deposit tx** (optional) - POST `/v0/deposit/submit`
   - Speeds up processing by notifying 1Click immediately

4. **Monitor progress** (optional) - GET `/v0/status`
   - Poll until terminal state

5. **Result** - Swap succeeds with tokens delivered, or fails with automatic refund

## Swap Statuses

| Status | Terminal | Description |
|--------|----------|-------------|
| `PENDING_DEPOSIT` | No | Waiting for deposit at deposit address |
| `KNOWN_DEPOSIT_TX` | No | Deposit transaction detected |
| `PROCESSING` | No | Swap being executed by Market Makers |
| `SUCCESS` | Yes | Tokens delivered to recipient |
| `INCOMPLETE_DEPOSIT` | Yes | Deposit below required amount |
| `REFUNDED` | Yes | Swap failed, funds returned to refund address |
| `FAILED` | Yes | Error occurred |

## CEX Deposit Warning

Centralized exchanges (CEXes) often use intermediate or per-user deposit addresses. These may not credit deposits sent via NEAR Intents until they are recognized or whitelisted.

**Recommendation:** Send a small test amount before attempting full-scale transfers to CEX addresses.

## Authentication

Register on the [Partners Portal](https://partners.near-intents.org/) to obtain an API key. Without it, 1Click adds an extra 0.25% (25 bps) fee on every non-`ANY_INPUT` quote. With an API key, the fee is 0.20% normally, or 0.01% (1 bp) for stablecoin pairs and same-asset multichain routes. See the [fee schedule](https://docs.near-intents.org/resources/fees.md).

```typescript
headers: { Authorization: `Bearer ${apiKey}` }
```

## Display vs Logic

The `amountOutUsd` field in quote responses is for **display purposes only**. Never use it in business logic or calculations. Always use actual token amounts (`amountOut`, `amountIn`).
