---
title: Orders (Limit Orders)
impact: HIGH
tags: api, orders, limit
---

# Limit Orders API

REST orders at a fixed price, on `/v0/orders`. JSON:API envelope (`{ data: { type, id, attributes } }`).

- Create: `POST /v0/orders` — creates a confidential order. Auth: `X-API-Key` (recommended) or `Authorization: Bearer <JWT>` (legacy).
- List: `GET /v0/orders` — visible orders, newest first.
- Get: `GET /v0/orders/{id}` — retrieve one order.
- Cancel: `POST /v0/orders/{id}/cancel` — requests **asynchronous cancellation**; unspent input is refunded and successfully filled output is withdrawn.

Source: https://docs.near-intents.org/integration/distribution-channels/1click-api/orders.md

## Create Request

Body: `{ data: { type: "orders", attributes: LimitOrderCreateRequest } }`.

Required attributes:

| Field | Description |
|-------|-------------|
| `orderType` | `"LIMIT"` (only type for now) |
| `baseAsset` | Base asset ID, e.g. `nep141:arb-0xaf88...omft.near` |
| `quoteAsset` | Quote asset ID used to price the base asset |
| `quantity` | Base-asset quantity, smallest unit. BUY targets this as **output**; SELL targets this as **input** |
| `side` | `SELL` (spends base asset) or `BUY` (spends quote asset) |
| `price` | Positive **human-unit** limit price: quote units per base unit (e.g. `100`, `0.5`) |
| `depositType` | `ORIGIN_CHAIN` returns a chain deposit address; `INTENTS` / `CONFIDENTIAL_INTENTS` use the generate-intent + submit-intent flow |
| `refundTo` / `refundType` | Refund address + type |
| `recipient` / `recipientType` | Who receives filled output |
| `confidentiality` | **Required for orders.** `basic` / `advanced` |

Optional: `deadline` (ISO), `depositMode` (`SIMPLE`/`MEMO`), `timeInForce` (default `GTC`), `appFees` (deducted from input, included in the submitted limit price).

## Response & Tracking

Order attributes include:

- `depositAddress`, `depositMemo` — fund the order by sending to `depositAddress` (include `depositMemo` when present): **SELL** → send `swapView.amountIn`, **BUY** → send `swapView.maxAmountIn`
- `fillStatus`: `AWAITING_DEPOSIT`, `PENDING_CANCEL`, `UNTRIGGERED`, `OPEN`, `PARTIALLY_FILLED`, `FILLED`, `CANCELED`, `EXPIRED`
- `payoutStatus`: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `FAILED` — progress of withdrawal/refund legs; **use `isPayoutStatusFinal` to check terminality** (fill status ending does not mean payout arrived)
- `partialFills[]` — successful fills only (in-flight/failed fills are not reported)
- `swapView` — read-only swap rep: `EXACT_INPUT { amountIn, minAmountOut }` or `EXACT_OUTPUT { maxAmountIn, amountOut }`
- `estimatedWithdrawFee`, `estimatedRefundFee` — per-leg fee estimates

## Errors

Branch on the machine-readable `code`, **never** on `title`/`detail`; treat unknown codes as the HTTP status.

| Status | Codes |
|--------|-------|
| 400 | `malformed-request`, `validation-failed`, `request-rejected`, `order-rejected` |
| 401 | `authentication-required` |
| 403 | `client-generated-id` |
| 409 | `resource-type-mismatch` |
| 429 | `rate-limit-exceeded` |
| 500 | `internal-error` |
| 503 | `service-unavailable` |
