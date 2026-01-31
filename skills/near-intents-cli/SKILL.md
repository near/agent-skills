---
name: near-intents-cli
description: Cross-chain token swaps, deposits, and withdrawals via NEAR Intents. Use for crypto trades, balance checks, deposit addresses, and withdrawals across NEAR, Ethereum, Solana, Bitcoin and EVM.
homepage: https://github.com/NEARBuilders/near-intents-cli
metadata: {"clawdbot":{"emoji":"⚡","os":["darwin","linux","windows"],"requires":{"node":">=18"},"install":[{"id":"pnpm-near-intents","kind":"shell","command":"pnpm add -g near-intents-cli","bins":["near-intents"],"label":"Install near-intents-cli via pnpm"},{"id":"npm-near-intents","kind":"shell","command":"npm install -g near-intents-cli","bins":["near-intents"],"label":"Install near-intents-cli via npm"},{"id":"bun-near-intents","kind":"shell","command":"bun add -g near-intents-cli","bins":["near-intents-cli"],"label":"Install near-intents-cli via bun"}]}}
---

# near-intents-cli - Cross-Chain Token Operations

SDK and CLI for NEAR Intents - execute cross-chain token swaps, deposits, and withdrawals across NEAR, Ethereum, Solana, Stellar, and more.

## When to use (trigger phrases)

- "swap tokens between chains"
- "cross-chain swap USDC to NEAR"
- "get deposit address for crypto"
- "withdraw tokens to external wallet"
- "check my cross-chain balances"
- "search for supported tokens"
- "NEAR intents swap / deposit / withdraw"

## Default behavior (important)

- Always use `--dry-run` flag first to preview swaps/withdrawals before executing.
- Tokens are identified by symbol; use `--blockchain` when a token exists on multiple chains.
- Config is stored at `~/.near-intents/config.json`.
- An API key is optional but recommended for fee-free swaps (0.1% fee without one).

## Prerequisites

- Node.js >= 18
- A NEAR key pair (generate via `near-intents-cli config generate-key`)
- Optional: API key from [partners.near-intents.org](https://partners.near-intents.org/) for fee-free swaps

## Install

```bash
# Using pnpm (recommended)
pnpm add -g near-intents-cli

# Using npm
npm install -g near-intents-cli

# Using bun
bun add -g near-intents-cli
```

### Quick Start (No Installation Required)

```bash
# Using pnpm dlx
pnpm dlx near-intents-cli tokens --search USDC

# Using bunx
bunx near-intents-cli tokens --search USDC

# Using npx
npx near-intents-cli tokens --search USDC
```

## Setup

```bash
# Generate a new NEAR key pair
near-intents-cli config generate-key

# Optional: Set API key for fee-free swaps
near-intents-cli config set api-key YOUR_API_KEY

# Fund your wallet with a deposit
near-intents-cli deposit --token USDC --blockchain eth
```

## Supported blockchains

- NEAR Protocol
- Ethereum
- Solana
- Stellar (with memo support)
- And more chains supported by the Defuse Protocol

## Common commands

```bash
# Token operations
near-intents-cli tokens                        # List all tokens
near-intents-cli tokens --search USDC          # Search tokens

# Balance management
near-intents-cli balances                      # Show all balances

# Deposits
near-intents-cli deposit --token USDC --blockchain eth

# Swaps
near-intents-cli swap --from USDC --to NEAR --amount 100
near-intents-cli swap --from ETH --to SOL --amount 1.5 --from-chain eth --to-chain sol
near-intents-cli swap --from USDC --to NEAR --amount 100 --dry-run

# Withdrawals
near-intents-cli withdraw --to 0x1234... --amount 50 --token USDC --blockchain eth
near-intents-cli withdraw --to 0x1234... --amount 50 --token USDC --dry-run
```

## Command reference

### tokens

List and search supported tokens.

```bash
near-intents-cli tokens
near-intents-cli tokens --search <query>
```

Options:
- `--search <query>` - Filter by symbol, name, or token ID

### balances

Show wallet balances across all tokens/chains.

```bash
near-intents-cli balances
```

Requires a configured private key.

### deposit

Get a deposit address to fund your wallet.

```bash
near-intents-cli deposit --token <symbol>
near-intents-cli deposit --token <symbol> --blockchain <chain>
```

Options:
- `--token <symbol>` - Token symbol (required)
- `--blockchain <chain>` - Blockchain name (required if token exists on multiple chains)

### swap

Execute a cross-chain token swap.

```bash
near-intents-cli swap --from <symbol> --to <symbol> --amount <num>
```

Options:
- `--from <symbol>` - Source token symbol (required)
- `--from-chain <chain>` - Source blockchain (optional)
- `--to <symbol>` - Destination token symbol (required)
- `--to-chain <chain>` - Destination blockchain (optional)
- `--amount <num>` - Amount to swap (required)
- `--dry-run` - Preview without executing

### withdraw

Withdraw tokens to an external address.

```bash
near-intents-cli withdraw --to <address> --amount <num> --token <symbol>
```

Options:
- `--to <address>` - Destination address (required)
- `--amount <num>` - Amount to withdraw (required)
- `--token <symbol>` - Token symbol (required)
- `--blockchain <chain>` - Blockchain (required if token exists on multiple chains)
- `--dry-run` - Preview without executing

### config

Manage CLI configuration.

```bash
near-intents-cli config get                    # Show current config
near-intents-cli config set api-key <key>      # Set API key
near-intents-cli config set private-key <key>  # Set private key
near-intents-cli config generate-key           # Generate new NEAR key pair
near-intents-cli config clear                  # Clear all config
```

## Configuration

### Config file

Stored at `~/.near-intents/config.json`:

```json
{
  "apiKey": "your-api-key",
  "privateKey": "ed25519:your-private-key"
}
```

### Environment variables

| Variable           | Description                           |
| ------------------ | ------------------------------------- |
| `NEAR_PRIVATE_KEY` | NEAR private key (ed25519:xxx format) |
| `DEFUSE_JWT_TOKEN` | API key for fee-free swaps            |

Priority: Config file > Environment variables

## SDK usage

For programmatic access in JavaScript/TypeScript:

```typescript
import {
  getSupportedTokens,
  getTokenBalances,
  getSwapQuote,
  executeSwapQuote,
  getWithdrawQuote,
  executeWithdrawQuote,
  getDepositAddress,
  loadConfig,
} from "near-intents-cli";

// Load config
const config = loadConfig();

// Search tokens
const tokens = await getSupportedTokens();

// Get balances
const balances = await getTokenBalances({
  walletAddress: config.walletAddress,
});

// Execute swap
const quoteResult = await getSwapQuote({
  walletAddress: config.walletAddress,
  fromTokenId: "eth:usdc",
  toTokenId: "near:near",
  amount: "100",
});

if (quoteResult.status === "success") {
  const result = await executeSwapQuote({
    privateKey: config.privateKey,
    walletAddress: config.walletAddress,
    quote: quoteResult.quote,
  });
  console.log(`Transaction: ${result.txHash}`);
}
```

## API key

- **Without API key**: 0.1% fee on swaps and withdrawals
- **With API key**: Fee-free swaps (get free key at [partners.near-intents.org](https://partners.near-intents.org/))

## Performance notes

- Token searches and balance checks are typically instant.
- Swaps and withdrawals depend on blockchain confirmation times.
- Use `--dry-run` to preview operations before executing.
