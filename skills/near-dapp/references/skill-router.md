# Skill Router

Decide which NEAR skill to use based on your needs.

## Decision Tree

```
What are you building?
│
├─► React/Next.js app with wallet connection
│   └─► Use: near-connect-hooks
│       └─► Need custom wallet UI? Also see: near-connect
│
├─► TypeScript backend/script
│   ├─► Simple operations (view, call, send)
│   │   └─► Use: near-kit (cleaner API)
│   └─► Complex transactions, low-level control
│       └─► Use: near-api-js
│
├─► Cross-chain swaps/bridge
│   └─► Use: near-intents
│
├─► Smart contract development
│   └─► Use: near-smart-contracts
│
└─► Vanilla JS (no framework)
    └─► Use: near-kit or near-api-js via CDN
```

## Feature Matrix

| Feature | near-connect-hooks | near-kit | near-api-js | near-connect |
|---------|-------------------|----------|-------------|--------------|
| React hooks | ✅ | ❌ | ❌ | ❌ |
| Wallet selector | ✅ | ❌ | ❌ | ✅ |
| View methods | ✅ | ✅ | ✅ | ❌ |
| Call methods | ✅ | ✅ | ✅ | ✅ |
| Transaction builder | ✅ | ✅ | ✅ | ❌ |
| Meta-transactions | ❌ | ✅ | ✅ | ❌ |
| Key management | ✅ | ✅ | ✅ | ❌ |
| NEP-413 signing | ✅ | ✅ | ✅ | ✅ |
| Server-side | ❌ | ✅ | ✅ | ❌ |

## Common Scenarios

### "I want to build a dApp with wallet connection"

**Start with**: `near-connect-hooks` for React, or `near-connect` for custom wallet UI

### "I need to run a script that interacts with contracts"

**Start with**: `near-kit` for clean API, or `near-api-js` for full control

### "I want to add a swap widget to my app"

**Start with**: `near-intents` for cross-chain swap integration

### "I need gasless transactions"

**Start with**: `near-api-js` → `references/meta_transactions.md`

### "I want to integrate a custom wallet"

**Start with**: `near-connect` → `references/wallet_integration.md`

### "I'm building an NFT marketplace"

**Start with**: `near-dapp` patterns, reference `near-api-js` → `references/tokens_guide.md` for NFT specifics

## Skill Dependencies

```
near-dapp (orchestration)
    ├── near-connect-hooks (React integration)
    │   └── @hot-labs/near-connect
    ├── near-connect (wallet selector)
    ├── near-kit (TypeScript library)
    ├── near-api-js (low-level API)
    └── near-intents (cross-chain)
```

## When to Upgrade Skills

| Situation | Current Skill | Upgrade To |
|-----------|---------------|------------|
| Need more wallet control | near-connect-hooks | near-connect |
| Need transaction batching | near-connect-hooks | near-api-js |
| Need meta-transactions | near-connect-hooks | near-api-js |
| Need server-side execution | near-connect-hooks | near-kit |
| Need cross-chain | any | near-intents |
