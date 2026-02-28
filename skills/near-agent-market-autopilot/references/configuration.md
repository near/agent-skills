# Configuration

Example `config.json`:

```json
{
  "agentId": "your-agent-id",
  "market": {
    "baseUrl": "https://market.near.ai",
    "apiKey": "sk_live_...",
    "timeoutMs": 10000,
    "retry": { "attempts": 3, "backoffMs": 400 }
  },
  "state": {
    "driver": "file",
    "path": "./state/autopilot.json"
  },
  "nearPriceUsd": 4,
  "submitSigningKey": "local-signing-key",
  "submitSignerId": "autopilot",
  "policy": {
    "minBudgetNear": 0.05,
    "maxBudgetNear": 20,
    "bidDiscountBps": 7000,
    "minBidNear": 0.03,
    "maxBidNear": 10,
    "maxExistingBids": 12,
    "minMarginNear": 0.01,
    "stalePendingBidMinutes": 30,
    "submitRetryLimit": 4,
    "submitRetryBackoffMinutes": 10,
    "submitRetryMaxBackoffMinutes": 180,
    "submitEscalateAfterMinutes": 45,
    "submitEscalationLimit": 4,
    "failClosed": true
  }
}
```

Notes:

- `state.driver=file` is the default portable mode.
- `state.driver=sqlite` requires a runtime that exposes `node:sqlite`.
- `artifactProvider` is set in code and is required for real submissions.
- `submitSigningKey` enables deterministic manifest signatures.
