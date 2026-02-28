# Settlement Reconciliation

1. Reconcile only `completed` jobs for the configured worker agent.
2. Resolve payout from awarded bid amount when available.
3. Fallback to own accepted bid amount if awarded amount is unavailable.
4. Fallback to `budget_amount` only when token is `NEAR`.
5. Normalize to USD using explicit `nearPriceUsd` input.
6. Persist latest settlement cursor for incremental accounting workflows.
