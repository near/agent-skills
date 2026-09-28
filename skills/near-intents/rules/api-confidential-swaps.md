---
title: Confidential Swaps
impact: HIGH
tags: api, quote, privacy, confidential
source: https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/confidential-swaps.md
---

# Confidential Swaps

Private transaction layer on top of NEAR Intents: deposits and withdrawals cannot be linked to each other on-chain.

- **Public Intents**: deposits and withdrawals can be matched.
- **Confidential Intents**: deposits and withdrawals cannot be tracked to each other.

## Two Integration Paths

### 1. Foreign-to-foreign (most partners)

Run a normal `ORIGIN_CHAIN` → `DESTINATION_CHAIN` swap and add `confidentiality` to the quote request. **No `CONFIDENTIAL_INTENTS` fields or signed-intent execution needed** — user deposits and receives on external chains exactly like a standard swap.

```json
{
  "dry": false,
  "swapType": "EXACT_INPUT",
  "originAsset": "nep141:wrap.near",
  "depositType": "ORIGIN_CHAIN",
  "destinationAsset": "nep141:arb-0x912ce59144191c1204e64559fe8253a0e49e6548.omft.near",
  "amount": "100000000000000000000000",
  "recipient": "0xYourArbitrumAddress",
  "recipientType": "DESTINATION_CHAIN",
  "refundTo": "your-account.near",
  "refundType": "ORIGIN_CHAIN",
  "confidentiality": "basic",
  "deadline": "2025-01-01T00:00:00.000Z"
}
```

`confidentiality` values: `public` (default), `basic`, `advanced`.

### 2. Embedded account / wallet (advanced)

Funds already live in a Confidential Intents balance: set `depositType`, `recipientType`, and/or `refundType` to `CONFIDENTIAL_INTENTS` and authorize the swap via [Signed Intent Execution](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/signed-intent-execution.md). Used by integrations that keep user balances in Intents (e.g. near.com).

Viewing or privately managing a user's confidential balances and history is a separate flow — see `api-user-auth.md`.
