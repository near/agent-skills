---
title: Swap SDK
impact: MEDIUM
tags: sdk, typescript, go, rust
source: https://docs.near-intents.org/integration/distribution-channels/1click-api/sdk.md
---

# Swap SDK

Official client libraries for the 1Click Swap API. Prefer the SDK over raw `fetch` — types come generated from the OpenAPI spec.

| Language | Package | Source |
|----------|---------|--------|
| TypeScript | `@defuse-protocol/one-click-sdk-typescript` | [github.com/defuse-protocol/one-click-sdk-typescript](https://github.com/defuse-protocol/one-click-sdk-typescript) |
| Go | `github.com/defuse-protocol/one-click-sdk-go` | [github.com/defuse-protocol/one-click-sdk-go](https://github.com/defuse-protocol/one-click-sdk-go) |
| Rust | `one_click_sdk_rs` (git dependency, no crates.io release) | [github.com/defuse-protocol/one-click-sdk-rs](https://github.com/defuse-protocol/one-click-sdk-rs) |

**WARNING: There is no testnet version of NEAR Intents.** Use small amounts for test swaps.

## Install

```bash
# TypeScript
npm install @defuse-protocol/one-click-sdk-typescript

# Go
go get github.com/defuse-protocol/one-click-sdk-go

# Rust — clone next to project, add to Cargo.toml:
# one-click-sdk-rs = { path = "./one-click-sdk-rs" }
```

## Configure + Full Flow (TypeScript)

```typescript
import { OpenAPI, OneClickService } from '@defuse-protocol/one-click-sdk-typescript';
import type { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';

// Base URL defaults to https://1click.chaindefuser.com
OpenAPI.BASE = 'https://1click.chaindefuser.com';
// Required for getQuote, submitDepositTx, getExecutionStatus
OpenAPI.TOKEN = 'YOUR_JWT_TOKEN';

// 1. Tokens (no auth required)
const tokens = await OneClickService.getTokens();

// 2. Quote
const quoteRequest: QuoteRequest = {
  dry: false,                        // true = simulate only, no depositAddress
  swapType: QuoteRequest.swapType.EXACT_INPUT,
  slippageTolerance: 100,            // basis points (100 = 1%)
  originAsset: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
  depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
  destinationAsset: 'nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near',
  amount: '1000000',                 // smallest units
  refundTo: '0xYourArbitrumAddress',
  refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
  recipient: 'YourSolanaAddress',
  recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
  deadline: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
};
const quote = await OneClickService.getQuote(quoteRequest);

// 3. Build deposit tx to quote.quote.depositAddress, then (optional):
await OneClickService.submitDepositTx({
  depositAddress: quote.quote.depositAddress!,
  txHash: '0xYourTransactionHash',
});

// 4. Poll to terminal state
const status = await OneClickService.getExecutionStatus(quote.quote.depositAddress!);
```

## Go

```go
import (
  "context"
  openapiclient "github.com/defuse-protocol/one-click-sdk-go"
)

configuration := openapiclient.NewConfiguration()
apiClient := openapiclient.NewAPIClient(configuration)
authCtx := context.WithValue(
  context.Background(),
  openapiclient.ContextAccessToken,
  "YOUR_JWT_TOKEN",
)

// GetTokens does not require authentication
tokens, _, err := apiClient.OneClickAPI.GetTokens(context.Background()).Execute()

// Quote — build via NewQuoteRequest, then:
quote, _, err := apiClient.OneClickAPI.GetQuote(authCtx).QuoteRequest(quoteRequest).Execute()

// Status
status, _, err := apiClient.OneClickAPI.GetExecutionStatus(authCtx).
  DepositAddress(*quote.Quote.DepositAddress).Execute()
```

## Rust

```rust
use one_click_sdk_rs::apis::configuration::Configuration;
use one_click_sdk_rs::apis::one_click_api;

// base_path defaults to https://1click.chaindefuser.com
let config = Configuration {
    bearer_access_token: Some("YOUR_JWT_TOKEN".to_string()),
    ..Default::default()
};

let tokens = one_click_api::get_tokens(&config).await?;
let quote = one_click_api::get_quote(&config, quote_request).await?;
let status = one_click_api::get_execution_status(&config, deposit_address).await?;
```

## Method Mapping

| SDK method | HTTP endpoint | Auth |
|------------|---------------|------|
| `getTokens` | `GET /v0/tokens` | none |
| `getQuote` | `POST /v0/quote` | JWT |
| `submitDepositTx` | `POST /v0/deposit/submit` | JWT |
| `getExecutionStatus` | `GET /v0/status` | JWT |

Terminal statuses: `SUCCESS`, `REFUNDED`, `FAILED` (see `api-status.md`). The User Auth / Balance / Order endpoints are available via dedicated services (e.g. `UserAuthService.authenticate`) — see `api-user-auth.md`.
