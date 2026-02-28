# Safe Defaults

1. Keep `failClosed=true`.
2. Use bounded retries with exponential backoff.
3. Enforce stale pending bid withdrawal windows.
4. Enforce strict budget and margin filters before bidding.
5. Persist state markers to durable storage, never in-memory only.
