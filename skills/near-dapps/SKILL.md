---
name: near-dapps
description: NEAR Protocol dApp development with Next.js, React, and near-api-js. Use when building frontend applications that interact with NEAR blockchain, including wallet integration, contract calls, and transaction handling.
license: MIT
metadata:
  author: near
  version: "1.0.0"
---

# NEAR dApps Development

Comprehensive guide for building decentralized applications on NEAR Protocol using Next.js, React, NEAR Wallet Selector, and near-api-js.

## When to Apply

Reference these guidelines when:
- Building NEAR dApp frontends with Next.js/React
- Integrating NEAR wallet connections
- Making contract calls from the browser
- Handling transactions and account state
- Implementing authentication with NEAR accounts
- Managing user sessions and permissions

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Wallet Integration | CRITICAL | `wallet-` |
| 2 | Contract Interaction | HIGH | `contract-` |
| 3 | State Management | HIGH | `state-` |
| 4 | Authentication | MEDIUM-HIGH | `auth-` |
| 5 | User Experience | MEDIUM | `ux-` |
| 6 | Error Handling | MEDIUM | `error-` |
| 7 | Best Practices | MEDIUM | `best-` |

## Quick Reference

### 1. Wallet Integration (CRITICAL)

- `wallet-selector-setup` - Use @near-wallet-selector for multi-wallet support
- `wallet-connection-state` - Properly manage wallet connection state
- `wallet-network-config` - Configure network (mainnet/testnet) correctly
- `wallet-modal-ui` - Implement wallet selection modal
- `wallet-account-detection` - Detect and handle connected accounts

### 2. Contract Interaction (HIGH)

- `contract-view-methods` - Call view methods without signing
- `contract-change-methods` - Execute change methods with transactions
- `contract-gas-deposit` - Properly configure gas and deposits
- `contract-type-safety` - Use TypeScript types for contract interfaces
- `contract-error-handling` - Handle contract call failures gracefully

### 3. State Management (HIGH)

- `state-wallet-context` - Use React Context for wallet state
- `state-account-data` - Cache and update account data efficiently
- `state-transaction-status` - Track transaction states (pending/success/failed)
- `state-balance-updates` - Refresh balances after transactions
- `state-optimistic-updates` - Implement optimistic UI updates

### 4. Authentication (MEDIUM-HIGH)

- `auth-account-id` - Validate and use account IDs correctly
- `auth-signature-verification` - Verify signatures when needed
- `auth-session-management` - Manage user sessions properly
- `auth-protected-routes` - Implement protected routes for authenticated users
- `auth-reconnection` - Handle wallet reconnection on page reload

### 5. User Experience (MEDIUM)

- `ux-loading-states` - Show loading indicators during transactions
- `ux-transaction-feedback` - Provide clear transaction feedback
- `ux-error-messages` - Display user-friendly error messages
- `ux-network-indicator` - Show current network (mainnet/testnet)
- `ux-balance-display` - Format and display NEAR balances correctly

### 6. Error Handling (MEDIUM)

- `error-transaction-failures` - Handle transaction rejections gracefully
- `error-network-issues` - Detect and handle network problems
- `error-contract-panics` - Parse and display contract errors
- `error-wallet-disconnection` - Handle unexpected wallet disconnections
- `error-rate-limiting` - Handle RPC rate limits

### 7. Best Practices (MEDIUM)

- `best-near-api-js` - Use near-api-js efficiently
- `best-rpc-endpoints` - Configure reliable RPC endpoints
- `best-transaction-receipts` - Verify transaction receipts
- `best-local-storage` - Store wallet preferences in localStorage
- `best-nextjs-patterns` - Follow Next.js App Router patterns

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/wallet-selector-setup.md
rules/contract-view-methods.md
```

Each rule file contains:
- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and integration patterns

## Resources

- NEAR Wallet Selector: https://github.com/near/wallet-selector
- near-api-js: https://docs.near.org/tools/near-api-js/quick-reference
- NEAR Examples: https://github.com/near-examples
- Next.js NEAR Template: https://github.com/near/create-near-app
- RPC Endpoints: https://docs.near.org/api/rpc/providers

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
