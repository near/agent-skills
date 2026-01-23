# Agent Skills

A collection of skills for AI coding agents specializing in NEAR Protocol blockchain development. Skills are packaged instructions and documentation that extend agent capabilities for building decentralized applications on NEAR.

## Available Skills

### near-api-js

JavaScript/TypeScript library for NEAR blockchain interaction. Works in browser and Node.js.

**Use when:**

- Building apps that interact with NEAR blockchain
- Creating/signing transactions
- Calling smart contracts
- Managing accounts and keys
- Working with NEAR RPC API
- Handling FT/NFT tokens on NEAR
- NEAR cryptographic operations (KeyPair, signing)
- Converting between NEAR units (yocto, gas)
- Gasless/meta transactions with relayers
- Wallet integration and session management
- NEP-413 message signing for authentication

### near-kit

TypeScript library for NEAR Protocol with an intuitive, fetch-like API.

**Use when:**

- Writing TypeScript code that interacts with NEAR Protocol
- Viewing contract data
- Calling contract methods
- Sending NEAR tokens
- Building transactions
- Creating type-safe contract wrappers
- Integrating wallets (Wallet Selector, HOT Connect)
- Managing keys
- Testing with sandbox
- Meta-transactions (NEP-366)
- Message signing (NEP-413)

## Installation

Install individual skills using the CLI:

```bash
npx skills add https://github.com/NEARBuilders/near-skills --skill near-api-js
npx skills add https://github.com/NEARBuilders/near-skills --skill near-kit
```

## Usage

Skills are automatically available once installed. The agent will use them when relevant tasks are detected.

**Examples:**

```
Set up a NEAR project with near-kit
Integrate NEAR wallet using near-api-js
Create a fungible token on NEAR
Build and test NEAR contracts locally
```

## Skill Structure

Each skill contains:

- `SKILL.md` - Instructions for the agent
- `references/` - Supporting documentation and guides

## License

MIT
