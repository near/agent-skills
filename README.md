# Agent Skills

AI agent skills for NEAR Protocol blockchain development.

## Skills

| Skill | Library | Description |
|-------|---------|-------------|
| [near-api-js](skills/near-api-js/) | [near-api-js](https://github.com/near/near-api-js) | JS/TS library for blockchain interaction, transactions, tokens, wallet integration |
| [near-connect](skills/near-connect/) | [near-connect](https://github.com/azbang/near-connect) | React hooks and wallet connections for frontend apps |
| [near-connect-hooks](skills/near-connect-hooks/) | [near-connect-hooks](https://github.com/matiasbenary/near-connect-hooks) | React hook patterns for NEAR wallet integration |
| [near-kit](skills/near-kit/) | [near-kit](https://github.com/r-near/near-kit) | TypeScript SDK with intuitive API, type-safe contracts, sandbox testing |

## Install

```bash
pnpm dlx skills add NEARBuilders/near-skills
yarn dlx skills add NEARBuilders/near-skills
npx skills add NEARBuilders/near-skills
bunx skills add NEARBuilders/near-skills
```

or 

```bash
pnpm dlx skills add NEARBuilders/near-skills --skill <skill-name>
yarn dlx skills add NEARBuilders/near-skills --skill <skill-name>
npx skills add NEARBuilders/near-skills --skill <skill-name>
bunx skills add NEARBuilders/near-skills --skill <skill-name>
```

Replace `<skill-name>` with: `near-api-js`, `near-connect`, `near-connect-hooks`, or `near-kit`.

## Usage

Skills activate automatically when relevant tasks are detected.

## Structure

- `SKILL.md` - Agent instructions
- `references/` - Documentation guides

