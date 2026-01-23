# NEAR Agent Skills

A collection of skills for AI coding agents focused on NEAR Protocol development. Skills are packaged instructions and code examples that extend agent capabilities for building on NEAR.

Skills follow the [Agent Skills](https://agentskills.io/) format.

## Available Skills

### near-smart-contracts

NEAR Protocol smart contract development in Rust. Comprehensive guide covering contract structure, state management, cross-contract calls, testing, security, and optimization patterns.

**Use when:**
- Writing new NEAR smart contracts in Rust
- Reviewing contract code for security and optimization
- Implementing cross-contract calls and callbacks
- Managing contract state and storage
- Testing and deploying NEAR contracts

**Categories covered:**
- Security & Safety (CRITICAL)
- Contract Structure (HIGH)
- State Management (HIGH)
- Cross-Contract Calls (MEDIUM-HIGH)
- Gas Optimization (MEDIUM)
- Testing (MEDIUM)
- Best Practices (MEDIUM)

### near-dapps

NEAR Protocol dApp development with Next.js, React, and near-api-js. Complete guide for building frontend applications that interact with NEAR blockchain.

**Use when:**
- Building NEAR dApp frontends with Next.js/React
- Integrating NEAR wallet connections
- Making contract calls from the browser
- Handling transactions and account state
- Implementing authentication with NEAR accounts

**Categories covered:**
- Wallet Integration (CRITICAL)
- Contract Interaction (HIGH)
- State Management (HIGH)
- Authentication (MEDIUM-HIGH)
- User Experience (MEDIUM)
- Error Handling (MEDIUM)
- Best Practices (MEDIUM)

### near-ai

NEAR AI agent development and integration. Guide for building AI agents on NEAR, integrating AI models, and creating agent workflows.

**Use when:**
- Building AI agents on NEAR
- Integrating AI models with NEAR smart contracts
- Creating agent-based workflows
- Implementing AI-powered dApps
- Using NEAR AI infrastructure

**Categories covered:**
- Agent Architecture (CRITICAL)
- AI Integration (HIGH)
- Agent Communication (HIGH)
- Model Deployment (MEDIUM-HIGH)
- Agent Workflows (MEDIUM)
- Security & Privacy (MEDIUM)
- Best Practices (MEDIUM)

### near-intents

Cross-chain token swap integration using NEAR Intents 1Click API. Covers API endpoints, chain-specific deposit transactions, TypeScript patterns, and React hooks.

**Use when:**
- Building swap widgets or bridge interfaces
- Implementing cross-chain token transfers
- Integrating NEAR Intents API
- Creating multi-chain dApps

**Categories covered:**
- Examples (HIGH)
- API Reference (CRITICAL)
- Chain Deposits (HIGH)
- React Hooks (MEDIUM)
- Advanced Features (LOW)

## Installation

```bash
# Clone this repository
git clone https://github.com/near/agent-skills.git

# Or add to your agent configuration
```

## Usage

Skills are automatically available to agents once installed. Agents will use them when relevant tasks are detected.

**Examples:**

```
Write a NEAR smart contract for a simple token
```

```
Help me set up wallet connection in my Next.js app
```

```
Create an AI agent that monitors NEAR blockchain events
```

```
Implement cross-chain swap from Ethereum to NEAR
```

## Skill Structure

Each skill contains:

- `SKILL.md` - Instructions and rule index for the agent
- `rules/` - Individual rule files with code examples
- `AGENTS.md` - Full compiled document (optional)
- `metadata.json` - Skill metadata (optional)

## Resources

- [NEAR Documentation](https://docs.near.org)
- [NEAR AI](https://docs.near.ai)
- [NEAR Examples](https://github.com/near-examples)
- [NEAR SDK Rust](https://docs.near.org/sdk/rust/introduction)
- [near-api-js](https://docs.near.org/tools/near-api-js/quick-reference)
- [NEAR Wallet Selector](https://github.com/near/wallet-selector)

## Contributing

Contributions are welcome! To add or improve skills:

1. Fork this repository
2. Create a new skill directory in `skills/`
3. Follow the existing skill structure
4. Add comprehensive rules and examples
5. Submit a pull request

## License

MIT