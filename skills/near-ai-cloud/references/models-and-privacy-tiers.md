# Models and Privacy Tiers

Take model IDs from the live catalog, not from memory: `GET https://cloud-api.near.ai/v1/models` needs no API key. Older IDs can return 404 or resolve as aliases, and a resolved alias gets a `gateway` signature instead of `provider_tee`. Model names containing `/` must be URL-encoded in paths.

> Quick links:
> - [Privacy tiers](#privacy-tiers)
> - [Using models](#using-models)
> - [Common patterns](#common-patterns)

---

## Privacy tiers

The [model catalog](https://near.ai/models) labels every model with one of three tiers:

- **Confidential TEE**: runs on NEAR AI's own GPU fleet inside a TEE, with attestation, signatures and verification. Use these for sensitive data.
- **3P Confidential TEE**: runs inside a third-party provider's TEE. The provider is listed as Attested 3P and publishes its own attestation evidence. Model-level verification depends on the client.
- **Incognito**: routed through the NEAR AI Gateway, which runs in a TEE, then sent to the provider under NEAR AI's provider account. The model runs on the provider's infrastructure, outside a TEE, so the TEE guarantees do not extend to the upstream provider.

[near.ai/pricing.md](https://near.ai/pricing.md) lists the TEE models with their IDs and prices, and calls the first two tiers Private TEE and Private 3P TEE.

---

## Using Models

Make chat completion requests to NEAR AI Cloud with your chosen model:

### curl

```bash
curl https://cloud-api.near.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEAR_API_KEY" \
  -d '{
    "model": "z-ai/glm-5.3-flash",
    "messages": [
      {"role": "user", "content": "Explain quantum computing"}
    ]
  }'
```

### JavaScript

```js
const response = await fetch('https://cloud-api.near.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.NEAR_API_KEY}`
  },
  body: JSON.stringify({
    model: 'z-ai/glm-5.3-flash',
    messages: [
      { role: 'user', content: 'Explain quantum computing' }
    ]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### Python

```python
import os
import requests

response = requests.post(
    'https://cloud-api.near.ai/v1/chat/completions',
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {os.environ["NEAR_API_KEY"]}'
    },
    json={
        'model': 'z-ai/glm-5.3-flash',
        'messages': [
            {'role': 'user', 'content': 'Explain quantum computing'}
        ]
    }
)

data = response.json()
print(data['choices'][0]['message']['content'])
```

---

## Common Patterns

### Streaming Responses

```bash
curl https://cloud-api.near.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEAR_API_KEY" \
  -d '{
    "model": "z-ai/glm-5.3-flash",
    "messages": [{"role": "user", "content": "Write a story"}],
    "stream": true
  }'
```

### Model Reasoning

Reasoning controls differ by model. See [Reasoning Models](https://docs.near.ai/cloud/reasoning-models) for the current list and per-model parameters.

---

## Best Practices

### 1. Match the model to the task

`GET /v1/models` reports each model's context length, pricing and supported features such as `tools`, `structured_outputs` and `reasoning`.

### 2. Use Confidential TEE models for sensitive data

If you process user data, financial information or proprietary code, use a Confidential TEE model so the data stays inside TEE hardware.

---

## Next Steps

- [Model Verification Guide](model-verification.md): verify models run in genuine TEE hardware
- [API Reference](https://docs.near.ai/api): complete API documentation
- [NEAR AI Cloud Dashboard](https://cloud.near.ai): manage API keys and monitor usage
