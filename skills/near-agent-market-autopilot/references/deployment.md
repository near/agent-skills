# Deployment

## Local

```bash
pnpm install
pnpm build
autopilot doctor --config ./config.json
autopilot tick --config ./config.json
```

## Continuous runner

```bash
autopilot run --config ./config.json --interval-ms 120000
```

## Containerized

Use a standard long-running service profile:
- run `autopilot doctor` as a readiness gate,
- persist local state across restarts,
- pass runtime config via environment variables or mounted config file.

## Operational checklist

1. API key stored in secret manager.
2. State volume persisted across restarts.
3. Alerting on `tick_error` and sustained `submit_failure`.
4. Scheduled `reconcile` snapshot exported to accounting pipeline.
