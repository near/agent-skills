# Agent Skills

AI agent skills for NEAR Protocol blockchain development.

## Skills

| Skill                                                | Library                                                            | Description                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| [near-ai-cloud](skills/near-ai-cloud/) | [NEAR AI Cloud Docs](https://docs.near.ai/cloud/introduction) | Verifiable private AI inference, TEE attestation, NRAS verification, GPU-CPU binding |
| [near-api-js](skills/near-api-js/)                   | [near-api-js](https://github.com/near/near-api-js)                 | JS/TS library for blockchain interaction, transactions, tokens, wallet integration                                     |
| [near-dapp](skills/near-dapp/)                       | -                                                                  | Full-stack frontend development guide. Project setup, wallet integration, React/Next.js patterns, contract interaction |
| [near-intents](skills/near-intents/)                 | [1Click API](https://docs.near-intents.org/)                       | Cross-chain swaps via REST API across EVM, Solana, NEAR, TON, Stellar, Tron                                            |
| [near-kit](skills/near-kit/)                         | [near-kit](https://github.com/r-near/near-kit)                     | TypeScript SDK with intuitive API, type-safe contracts, sandbox testing                                                |
| [near-contract-audit](skills/near-contract-audit/)   | [near-smart-contracts](https://github.com/near/near-smart-contracts) | Security audit workflow for NEAR Rust contracts, vulnerability validation, and reporting                              |
| [near-smart-contracts](skills/near-smart-contracts/) | -                                                                  | Rust smart contract development, security, state management, cross-contract calls                                      |
| [near-agent-market-autopilot](skills/near-agent-market-autopilot/) | [near-agent-market-autopilot](sdk/near-agent-market-autopilot/) | Autonomous Agent Market SDK + skill for conservative bidding, execution, retries, settlement, and deterministic replay |

## Install

```bash
pnpm dlx skills add near/agent-skills
yarn dlx skills add near/agent-skills
npx skills add near/agent-skills
bunx skills add near/agent-skills
```

or

```bash
pnpm dlx skills add near/agent-skills --skill <skill-name>
yarn dlx skills add near/agent-skills --skill <skill-name>
npx skills add near/agent-skills --skill <skill-name>
bunx skills add near/agent-skills --skill <skill-name>
```

Replace `<skill-name>` with: `near-ai-cloud`, `near-api-js`, `near-dapp`, `near-intents`, `near-kit`, `near-contract-audit`, `near-smart-contracts`, or `near-agent-market-autopilot`.

## SDK

- `sdk/near-agent-market-autopilot` ships a TypeScript runtime for autonomous Agent Market operations.
- Build/test:

```bash
pnpm install
pnpm --filter near-agent-market-autopilot test
pnpm --filter near-agent-market-autopilot build
```

## Usage

Skills activate automatically when relevant tasks are detected.

## Structure

- `SKILL.md` - Agent instructions
- `references/` - Documentation guides
- `rules/` - Documentation rules
