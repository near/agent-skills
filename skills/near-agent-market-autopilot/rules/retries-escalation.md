# Retries and Escalation

1. Submission retries are stateful per `(jobId,bidId)`.
2. Respect `nextAttemptAt`; do not retry early.
3. Increment attempts before each submit call.
4. On failure, set exponential backoff bounded by max backoff.
5. Escalate when wall-clock since `firstSeenAt` exceeds escalation window.
6. Stop at retry limit and expose explicit skip reason.
