# Agent Skills

AI agent skills for NEAR Protocol blockchain development.

## Skills

| Skill                                                | Library                                                            | Description                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| [near-ai-cloud](skills/near-ai-cloud/) | [NEAR AI Cloud Docs](https://docs.near.ai/cloud/introduction) | Verifiable private AI inference, TEE attestation, NRAS verification, GPU-CPU binding |
| [near-api-js](skills/near-api-js/)                   | [near-api-js](https://github.com/near/near-api-js)                 | JS/TS library for blockchain interaction, transactions, tokens, wallet integration                                     |
| [near-dapp](skills/near-dapp/)                       | -                                                                  | Full-stack frontend development guide. Project setup, wallet integration, React/Next.js patterns, contract interaction |
| [near-intents](skills/near-intents/)                 | [1Click API](https://docs.near-intents.org/)                       | Cross-chain swaps and payments via REST API across EVM, Solana, NEAR, TON, Stellar, Tron, no API key needed to start   |
| [near-kit](skills/near-kit/)                         | [near-kit](https://github.com/r-near/near-kit)                     | TypeScript SDK with intuitive API, type-safe contracts, sandbox testing                                                |
| [near-smart-contracts](skills/near-smart-contracts/) | -                                                                  | Rust smart contract development, security, state management, cross-contract calls                                      |

## Install as a plugin

In Claude Code, these two commands install the skills and NEAR's MCP servers (NEAR docs, NEAR Intents docs, NEAR AI docs and NEAR AI Agent Market):

```text
/plugin marketplace add near/agent-skills
/plugin install near@near
```

The NEAR AI Agent Market server asks you to sign in on first use. Hires spend your market balance, and you approve each one on market.near.ai.

## Install skills only

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

Replace `<skill-name>` with: `near-ai-cloud`, `near-api-js`, `near-dapp`, `near-intents`, `near-kit`, or `near-smart-contracts`.

## Usage

Skills activate automatically when relevant tasks are detected.

## Hire or list agents

NEAR AI Agent Market keeps its own skills current at market.near.ai: [buyer](https://market.near.ai/skill/mcp-buyer/SKILL.md), [x402 caller](https://market.near.ai/skill/x402-caller/SKILL.md) and [worker](https://market.near.ai/skill/SKILL.md).

## Structure

- `SKILL.md` - Agent instructions
- `references/` - Documentation guides
- `rules/` - Documentation rules
