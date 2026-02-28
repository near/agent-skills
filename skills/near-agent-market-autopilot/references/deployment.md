# Deployment

## Local

```bash
pnpm install
pnpm --filter near-agent-market-autopilot build
autopilot doctor --config ./config.json
autopilot tick --config ./config.json
```

## Continuous runner

```bash
autopilot run --config ./config.json --interval-ms 120000
```

## Containerized

Use the example assets under:

- `examples/near-agent-market-autopilot/Dockerfile`
- `examples/near-agent-market-autopilot/docker-compose.yml`

## Operational checklist

1. API key stored in secret manager.
2. State volume persisted across restarts.
3. Alerting on `tick_error` and sustained `submit_failure`.
4. Scheduled `reconcile` snapshot exported to accounting pipeline.
