# Chat Message Verification

Verify each chat message was produced inside the trusted environment. Three values:

1. **Request hash** — SHA-256 of the exact JSON request body sent over the wire
2. **Response hash** — SHA-256 of the exact response payload string received
3. **Signature** — fetched from NEAR AI Cloud via the chat `id`

> Working implementation: [NEAR AI Cloud Verification Example](https://github.com/near-examples/nearai-cloud-verification-example)

Source: https://docs.near.ai/cloud/verification/chat

## Two Signature Kinds

Distinguished by the `signature_kind` field on the gateway's signature response:

- **`provider_tee`** — signed **inside the model TEE** over the exact bytes the TEE received and sent. Always what you get from a model's direct completions endpoint (`{slug}.completions.near.ai`).
- **`gateway`** — signed **inside the gateway TEE** (`cloud-api.near.ai`) over the exact bytes the gateway returned. Occurs when the gateway rewrites streamed response bytes (OpenAI-spec usage accounting/stripping), so the model TEE's byte-exact signature no longer matches what you received.

> Legacy signatures stored before `signature_kind` was introduced omit the field (provenance unknown): `text` with three `:`-separated fields (`model_id:request:response`) is a model-TEE payload, two fields is a gateway payload.

## 1. Request Hash

Hash the exact JSON request body string as sent:

```js
import crypto from 'crypto';

const requestBody = JSON.stringify({
  messages: [{ content: 'Respond with only two words.', role: 'user' }],
  stream: true,
  model: 'Qwen/Qwen3.5-122B-A10B',
  chat_template_kwargs: { enable_thinking: false },
});

const hash = crypto.createHash('sha256').update(requestBody).digest('hex');
```

```python
import hashlib, json

request_body = {
    "messages": [{"content": "Respond with only two words.", "role": "user"}],
    "stream": True,
    "model": "Qwen/Qwen3.5-122B-A10B",
    "chat_template_kwargs": {"enable_thinking": False},
}

# Same formatting as the JS example: compact separators
request_body_str = json.dumps(request_body, separators=(',', ':'))
hash_hex = hashlib.sha256(request_body_str.encode()).hexdigest()
```

## 2. Response Hash

Hash the exact response payload string:

```js
const response = await fetch('https://qwen35-122b.completions.near.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.NEARAI_CLOUD_API_KEY}`,
  },
  body: requestBody,
});

const responseBody = await response.text();
const hash = crypto.createHash('sha256').update(responseBody).digest('hex');
```

**Watch out:** a streaming response ends with **two new lines** — include them, or the hash changes.

## 3. Fetch Chat Message Signature

Use the response `id` (chat id):

- **Via direct completions:** `GET https://{slug}.completions.near.ai/v1/signature/{chat_id}?signing_algo=ecdsa`
- **Via gateway:** `GET https://cloud-api.near.ai/v1/signature/{chat_id}?model={model_id}&signing_algo=ecdsa`

```bash
curl -X GET 'https://qwen35-122b.completions.near.ai/v1/signature/afa7975eaf844b1888776cf41548e230?signing_algo=ecdsa' \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <YOUR-NEARAI-CLOUD-API-KEY>"
```

> A model may be served by multiple TEE nodes; the signature is cached on the node that served your completion, so a lookup can transiently return `Chat id not found or expired` — **retry** until you hit the right node.

### Response

```json
{
  "text": "Qwen/Qwen3.5-122B-A10B:{request_hash}:{response_hash}",
  "signature": "0x...",
  "signing_address": "0x...",
  "signing_algo": "ecdsa"
}
```

- `text` — signed payload: `{model_id}:{request_hash}:{response_hash}` for `provider_tee`; `{request_hash}:{response_hash}` for `gateway`
- `signature` — signature of `text` with the TEE's private key
- `signing_address` — signer TEE's public key (model TEE or gateway TEE)
- `signature_kind` — `"provider_tee"` or `"gateway"` (gateway endpoint responses only)

## Verify the Signature

Recover the signer with any ECDSA library (e.g. [ethers](https://www.npmjs.com/package/ethers)) and compare — case-insensitively — to the expected address:

```js
import { ethers } from 'ethers';

const recovered = ethers.verifyMessage(text, signature);
const valid = recovered.toLowerCase() === expectedAddress.toLowerCase();
```

```python
from eth_account import Account
from eth_account.messages import encode_defunct

message = encode_defunct(text=text)
recovered_address = Account.recover_message(message, signature=signature)
is_valid = recovered_address.lower() == expected_address.lower()
```

The expected address comes from the corresponding attestation:

- `provider_tee` → verify against the model attestation's `signing_address` (see Model Verification)
- `gateway` → the signing address returned by the [gateway attestation report](gateway-verification.md)

Full chain of trust:

```
hardware attestation → signing_address → chat signature (over request+response hashes)
```
