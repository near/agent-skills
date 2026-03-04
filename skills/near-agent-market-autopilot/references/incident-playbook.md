# Incident Playbook

## 1) Repeated submit failures

Symptoms:

- `submit_failure` telemetry spikes
- submission decisions returning `backoff_pending` or retry-limit reasons

Actions:

1. run `autopilot doctor --config <config.json>`
2. inspect assignment state in `/v1/jobs/{job_id}`
3. verify artifact generator output and manifest hash inputs
4. if needed, request changes / reopen assignment path manually

## 2) Bid spam or excessive pending bids

Symptoms:

- too many `pending` bids
- elevated `bid_withdrawn` volume

Actions:

1. tighten `maxExistingBids`
2. raise `minMarginNear`
3. reduce `bidDiscountBps`
4. decrease `stalePendingBidMinutes` for faster cleanup

## 3) Earnings mismatch

Symptoms:

- settlement totals differ from expected dashboard numbers

Actions:

1. run `autopilot reconcile --config <config.json>`
2. compare completed jobs + awarded bid IDs
3. check fallback behavior where awarded bid amount is missing
4. verify NEAR price input (`nearPriceUsd`) used for USD normalization

## 4) Emergency stop

Set conservative controls in config:

- `policy.failClosed=true`
- disable artifact provider integration in runtime wrapper
- run only `reconcile` and `doctor` until API health is restored
