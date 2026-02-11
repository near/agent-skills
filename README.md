# Agent Skills

AI agent skills for NEAR Protocol blockchain development.

## Skills

| Skill                                                | Library                                                            | Description                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| [near-ai](skills/near-ai/)                           | [near-ai](https://near.ai/)                                        | AI agent development and integration on NEAR Protocol                                                                  |
| [near-ai-cloud](skills/near-ai-cloud/) | [NEAR AI Cloud Docs](https://docs.near.ai/cloud/introduction) | Verifiable private AI inference, TEE attestation, NRAS verification, GPU-CPU binding |
| [near-api-js](skills/near-api-js/)                   | [near-api-js](https://github.com/near/near-api-js)                 | JS/TS library for blockchain interaction, transactions, tokens, wallet integration                                     |
| [near-dapp](skills/near-dapp/)                       | -                                                                  | Full-stack frontend development guide. Project setup, wallet integration, React/Next.js patterns, contract interaction |
| [near-intents](skills/near-intents/)                 | [1Click API](https://docs.near-intents.org/)                       | Cross-chain swaps via REST API across EVM, Solana, NEAR, TON, Stellar, Tron                                            |
| [near-kit](skills/near-kit/)                         | [near-kit](https://github.com/r-near/near-kit)                     | TypeScript SDK with intuitive API, type-safe contracts, sandbox testing                                                |
| [near-smart-contracts](skills/near-smart-contracts/) | -                                                                  | Rust smart contract development, security, state management, cross-contract calls                                      |

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

Replace `<skill-name>` with: `near-ai`, `near-ai-cloud`, `near-api-js`, `near-dapp`, `near-intents`, `near-kit`, or `near-smart-contracts`.

## Usage

Skills activate automatically when relevant tasks are detected.

## Structure

- `SKILL.md` - Agent instructions
- `references/` - Documentation guides
- `rules/` - Documentation rules
