# Gateway Verification

Verify that the NEAR AI Cloud API gateway runs inside a genuine TEE. Two steps:

1. [Request gateway attestation](#request-gateway-attestation) from NEAR AI Cloud
2. [Verify the attestation](#verifying-gateway-attestation) via Intel TDX

Source: https://docs.near.ai/cloud/verification/gateway

> **Direct completions — no gateway verification needed.** Requests to a model's direct completions endpoint (e.g. `https://qwen35-122b.completions.near.ai`) skip the gateway entirely; only [Model Verification](model-verification.md) is required.

> Working implementation: [NEAR AI Cloud Verifier](https://github.com/nearai/nearai-cloud-verifier)

---

## Request Gateway Attestation

```
GET https://cloud-api.near.ai/v1/attestation/report?signing_algo=ecdsa&nonce={nonce}
```

- Omit `model` to get **gateway** attestation (with `model`, the response also includes the gateway attestation alongside model attestations)
- `signing_algo` — `ecdsa` or `ed25519`
- `nonce` — random 64-char hex (32 bytes), optional but recommended; server generates one if omitted
- **Requires an API key** (`Authorization: Bearer <api-key>`); report retrieval is free and never counts against usage
- Add `include_tls_fingerprint=true` to bind the gateway's TLS certificate fingerprint into `report_data` (see TLS verification note below)

```bash
NONCE=$(openssl rand -hex 32)

curl "https://cloud-api.near.ai/v1/attestation/report?signing_algo=ecdsa&nonce=${NONCE}" \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <YOUR-NEAR-AI-CLOUD-API-KEY>'
```

```js
import crypto from 'crypto';

const nonce = crypto.randomBytes(32).toString('hex');

const response = await fetch(
  `https://cloud-api.near.ai/v1/attestation/report?signing_algo=ecdsa&nonce=${nonce}`,
  {
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${process.env.NEAR_AI_CLOUD_API_KEY}`,
    },
  }
);
```

```python
import os
import requests
import secrets

nonce = secrets.token_hex(32)

response = requests.get(
    'https://cloud-api.near.ai/v1/attestation/report?signing_algo=ecdsa&nonce=' + nonce,
    headers={
        'accept': 'application/json',
        'Authorization': f'Bearer {os.environ["NEAR_AI_CLOUD_API_KEY"]}',
    }
)
```

### Response Structure

```json
{
  "gateway_attestation": {
    "request_nonce": "...",
    "intel_quote": "...",
    "event_log": [...],
    "info": { "compose": "..." }
  }
}
```

- `gateway_attestation` — attestation report for the private inference gateway
- `request_nonce` — nonce you provided
- `intel_quote` — Intel TDX quote for the gateway TEE
- `event_log` — TDX event log
- `info` — TCB info including the Docker compose manifest

## TLS Attestation Verification

To verify your HTTPS connection to `cloud-api.near.ai` terminates inside the gateway TEE, request the report with `include_tls_fingerprint=true` and follow [TLS Attestation Verification](https://docs.near.ai/cloud/verification/tls). The flag binds the gateway's TLS certificate fingerprint into `report_data`; disabled by default for compatibility with existing clients.

---

## Verifying Gateway Attestation

### Verify TDX Quote

Verify the `intel_quote` from `gateway_attestation` with the [`dcap-qvl`](https://github.com/Phala-Network/dcap-qvl) library, or paste it at the [TEE Attestation Explorer](https://proof.t16z.com/). This verifies CPU TEE measurements, that the quote is Intel-signed, and that the TEE environment is genuine.

### Verify TDX Report Data

The report data validates:

- The report data binds the signing address (ECDSA or Ed25519)
- The report data embeds the request nonce

This proves cryptographic binding between the signing address and the hardware and prevents replay via nonce freshness.

### Verify Compose Manifest

1. Extract the Docker compose manifest from `gateway_attestation.info`
2. SHA-256 hash it
3. Compare with the `mr_config` measurement from the verified TDX quote
4. Match proves the exact container configuration deployed in the TEE

### Verify Source Code Provenance

Extract the `nearaidev/cloud-api` container image digests from the compose manifest (`@sha256:xxx`) and check the Sigstore provenance for each image:

- Verify images were built from the expected source repository and release tag
- Review the GitHub Actions workflow that built them
- `cloud-api` builds are reproducible: build from a release tag and the resulting digest matches the attested digest

Example: <https://search.sigstore.dev/?hash=sha256:f75c2a8f1a3d8a36ed6cd7479e848edf0a0e814381d7b83993a703201594bc14> from the [v0.1.7 release](https://github.com/nearai/cloud-api/releases/tag/v0.1.7) of [cloud-api](https://github.com/nearai/cloud-api).
