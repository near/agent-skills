---
name: near-ai-cloud
description: NEAR AI Cloud private inference and verification. Run LLM inference on private or sensitive data so that neither the host nor the model provider can read it, using the private (Confidential TEE) models on NEAR AI Cloud's OpenAI-compatible API, which run inside trusted execution environments (Intel TDX, NVIDIA confidential GPUs), with hardware attestation and response signatures you can verify. Use when integrating NEAR AI Cloud API for verifiable private AI inference, verifying model or gateway TEE attestation (NVIDIA NRAS, Intel TDX), verifying chat message signatures, implementing end-to-end encrypted chat, using specialized TEE endpoints (embeddings, reranking, images, audio, PII redaction), or using the OpenAI-compatible API with NEAR AI Cloud. Also use when someone needs confidential or private AI inference, wants an AI to analyze private business data safely, needs verifiable or attested inference with a receipt, or wants an OpenAI-compatible endpoint that keeps prompts private.
metadata:
  author: near
  version: "1.2.0"
---

# NEAR AI Cloud

Verifiable private AI inference through Trusted Execution Environments (TEEs). Private (Confidential TEE) models run inside Intel TDX confidential VMs with NVIDIA TEE GPUs — your data stays encrypted and isolated from infrastructure providers, model providers, and NEAR itself. Other models in the catalog have different guarantees; see [Models and Privacy Tiers](references/models-and-privacy-tiers.md).

## Quick Start

The API is OpenAI-compatible. Point any OpenAI SDK at `https://cloud-api.near.ai/v1`:

```python
import openai

client = openai.OpenAI(
    base_url="https://cloud-api.near.ai/v1",
    api_key="YOUR_API_KEY"  # from cloud.near.ai dashboard
)

response = client.chat.completions.create(
    model="z-ai/glm-5.3-flash",
    messages=[{"role": "user", "content": "Hello, NEAR AI!"}]
)
print(response.choices[0].message.content)
```

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'https://cloud-api.near.ai/v1',
    apiKey: 'YOUR_API_KEY',
});

const completion = await openai.chat.completions.create({
    model: 'z-ai/glm-5.3-flash',
    messages: [{ role: 'user', content: 'Hello, NEAR AI!' }]
});
console.log(completion.choices[0].message.content);
```

## How It Works

- Private model inference runs inside **Intel TDX** confidential VMs with **NVIDIA TEE** GPUs
- TLS terminates **inside the TEE**, not at a load balancer — prompts are never exposed in plaintext
- TEEs generate **cryptographic attestation proofs** verifiable via NVIDIA NRAS and Intel TDX
- Responses can carry a **`provider_tee`** signature from the model TEE or a **`gateway`** signature from the gateway TEE. Only `provider_tee` binds a response to a model-serving TEE
- You can independently verify hardware attestation and bind it to message signatures

## Verification Flow

```
1. Generate nonce
2. Request model attestation  →  get signing_address, nvidia_payload, intel_quote
3. Verify GPU attestation     →  submit nvidia_payload to NVIDIA NRAS, check JWT fields
4. Verify CPU attestation     →  verify intel_quote via dcap-qvl or TEE Explorer
5. Verify GPU-CPU binding     →  signing_address + nonce bound in TDX report data; same nonce in NRAS eat_nonce
6. Make chat request           →  use the API as normal
7. Fetch chat signature       →  GET /v1/signature/{chat_id}
8. Verify signature            →  recover signer, compare to attested signing_address
```

## API Endpoints

Base URL: `https://cloud-api.near.ai`

| Endpoint                                        | Method | Description                                        |
|-------------------------------------------------|--------|----------------------------------------------------|
| `/v1/chat/completions`                          | POST   | OpenAI-compatible chat completions                 |
| `/v1/models`                                    | GET    | List available models                              |
| `/v1/attestation/report?model={model}`          | GET    | Model attestation (GPU + CPU)                      |
| `/v1/attestation/report`                        | GET    | Gateway attestation                                |
| `/v1/signature/{chat_id}`                       | GET    | Chat message signature (also covers Responses API `resp_*`) |

## Critical Knowledge

- Base URL is `https://cloud-api.near.ai/v1` — use with any OpenAI SDK
- `signing_algo` can be `ecdsa` or `ed25519`
- Take model IDs from `GET /v1/models`, which needs no key. Older IDs can return 404 or resolve as aliases, and a resolved alias gets a `gateway` signature
- Attestation reports need no API key, except for a model enabled only for your organization; retrieval is free and non-billable
- Nonce should be a random 64-char hex string (32 bytes) for attestation freshness
- NRAS response is a two-part array: `[["JWT", "..."], {"GPU-0": "..."}]` — overall JWT + per-GPU JWTs
- For a `provider_tee` signature, the `signing_address` from model attestation **must match** the address that signed the response
- Response records expire after 60 minutes by default, so verify soon after completion

## References

| Topic                            | File                                                                                |
|----------------------------------|-------------------------------------------------------------------------------------|
| **Models and privacy tiers**     | [references/models-and-privacy-tiers.md](references/models-and-privacy-tiers.md)     |
| **Model TEE verification**       | [references/model-verification.md](references/model-verification.md)                |
| **Gateway verification + TLS**   | [references/gateway-verification.md](references/gateway-verification.md)            |
| **Chat message verification**    | [references/chat-verification.md](references/chat-verification.md)                  |
| **E2E encrypted chat (E2EE)**    | [references/e2ee-chat.md](references/e2ee-chat.md)                                  |
| **Specialized endpoints**        | [references/specialized-endpoints.md](references/specialized-endpoints.md)          |

## Upstream Docs (prefer live values)

- [OpenAI compatibility](https://docs.near.ai/cloud/guides/openai-compatibility) — streaming, reasoning, Files API behavior
- [Stateless Responses API](https://docs.near.ai/cloud/guides/stateless-responses) — `resp_*` stateless responses
- [Prompt caching](https://docs.near.ai/cloud/guides/prompt-caching)
- [Web search](https://docs.near.ai/cloud/guides/web-search) — server-side live web results
- [Staking for inference](https://docs.near.ai/cloud/staking-for-inference/overview) — pay with staking rewards
- [Usage reporting API](https://docs.near.ai/cloud/guides/usage-reporting)
- [Model discovery & refresh](https://docs.near.ai/cloud/guides/integrations/model-discovery)

## Resources

- NEAR AI Cloud: https://cloud.near.ai
- Documentation: https://docs.near.ai/cloud/introduction- Verification Example: https://github.com/near-examples/nearai-cloud-verification-example
- Full Verifier: https://github.com/nearai/nearai-cloud-verifier
- NVIDIA NRAS API: https://docs.api.nvidia.com/attestation/reference/attestmultigpu_1
- TEE Attestation Explorer: https://proof.t16z.com/
- DCAP QVL (TDX verification): https://github.com/Phala-Network/dcap-qvl
