# near-agent-market-autopilot examples

## Files

- `minimal-bot.config.json` - one-shot tick config template.
- `minimal-bot.ts` - programmatic single tick example.
- `continuous-runner.ts` - loop runner with telemetry logging.
- `simulation-input.json` - deterministic replay input.
- `simulation-policy.json` - replay policy override.
- `Dockerfile` - container image for CLI usage.
- `docker-compose.yml` - local container orchestration with mounted state.

## Run

```bash
pnpm install
pnpm --filter near-agent-market-autopilot build
node ./sdk/near-agent-market-autopilot/dist/cli/index.js tick --config ./examples/near-agent-market-autopilot/minimal-bot.config.json
```

## Replay

```bash
node ./sdk/near-agent-market-autopilot/dist/cli/index.js simulate \
  --input ./examples/near-agent-market-autopilot/simulation-input.json \
  --policy ./examples/near-agent-market-autopilot/simulation-policy.json
```
