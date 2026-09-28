# Specialized Endpoints

Beyond chat completions, NEAR AI Cloud serves TEE-hosted models for embeddings, reranking, image generation, audio, and PII detection — same gateway (`cloud-api.near.ai`), same API key, OpenAI-compatible conventions.

Source: https://docs.near.ai/cloud/guides/specialized-endpoints

- Gateway responses carry an `X-Request-Id` header — opaque support/debugging value, not W3C `traceparent`. If you set your own, use a non-sensitive UUID (no secrets/PII).
- Several models also have **direct completions** endpoints (`{slug}.completions.near.ai`) — e.g. `qwen3-embedding.completions.near.ai`, `flux2-klein.completions.near.ai` — where TLS terminates inside the model's own TEE. The direct route list also serves `/v1/tokenize`, `/v1/score`, `/v1/images/edits`.

## Embeddings

`Qwen/Qwen3-Embedding-0.6B`:

```bash
curl https://cloud-api.near.ai/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "Qwen/Qwen3-Embedding-0.6B",
    "input": "NEAR AI Cloud runs models inside TEEs."
  }'
```

OpenAI format (`data[0].embedding`); `input` accepts an array for batch embedding.

## Reranking

`Qwen/Qwen3-Reranker-0.6B`:

```bash
curl https://cloud-api.near.ai/v1/rerank \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "Qwen/Qwen3-Reranker-0.6B",
    "query": "what is the capital of France",
    "documents": ["Paris is the capital of France", "Berlin is in Germany"]
  }'
```

Response `results[]` ordered by `relevance_score`; `index` refers to positions in your `documents` array.

## Image Generation

`black-forest-labs/FLUX.2-klein-4B` (billed per image — see Models page):

```bash
curl https://cloud-api.near.ai/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "black-forest-labs/FLUX.2-klein-4B",
    "prompt": "a red circle on a white background",
    "n": 1
  }'
```

Image returned as base64 in `data[0].b64_json`. `/v1/images/edits` exists for image-to-image editing.

## Audio Transcription

`openai/whisper-large-v3` (multipart form upload, OpenAI-compatible; 25 MB max; MP3/WAV/WEBM/FLAC/OGG/M4A):

```bash
curl https://cloud-api.near.ai/v1/audio/transcriptions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F file=@recording.wav \
  -F model=openai/whisper-large-v3
```

→ `{ "text": "...", "id": "trans-..." }`

## PII Detection & Redaction

`openai/privacy-filter` is **not a chat model** — it exposes dedicated endpoints. `input` accepts a string or array of strings.

**Classify** — labeled character spans with confidence scores:

```bash
curl https://cloud-api.near.ai/v1/privacy/classify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "openai/privacy-filter",
    "input": "My name is John Smith and my email is john@example.com"
  }'
```

```json
{
  "id": "pt-...",
  "data": [{
    "spans": [
      { "category": "private_person", "start": 10, "end": 21, "text": " John Smith", "score": 0.999 },
      { "category": "private_email", "start": 37, "end": 54, "text": " john@example.com", "score": 0.999 }
    ]
  }]
}
```

**Redact** (**gateway only**) — text with PII replaced:

```bash
curl https://cloud-api.near.ai/v1/privacy/redact \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "openai/privacy-filter",
    "input": "My name is John Smith and my email is john@example.com"
  }'
```

`/v1/privacy/classify` can also be served on a model's direct completions endpoint (`https://{slug}.completions.near.ai/v1`).

## Vision (Image Input)

`Qwen/Qwen3-VL-30B-A3B-Instruct` accepts images via standard OpenAI chat format (`image_url` content parts) on `/v1/chat/completions`. Check `input_modalities` in `GET /v1/models` to see which models accept images.
