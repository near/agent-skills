# End-to-End Encrypted Chat (E2EE)

Encrypt messages to a NEAR AI Cloud model's TEE-attested public key before they leave your machine — a second, independent layer on top of TLS.

Source: https://docs.near.ai/cloud/guides/e2ee-chat-completions

## Why

- Messages are encrypted client-side with the model's public key, which is cryptographically **bound to its TEE attestation** — only the attested model instance can decrypt
- Each request uses ephemeral keys (**forward secrecy**)
- Model-specific: gateway routes the encrypted request to the exact attested model

## Encryption Protocol (v2)

| Curve | Key Exchange | Key Derivation | Encryption | Public Key |
|-------|--------------|----------------|------------|------------|
| Curve25519 | X25519 ECDH | HKDF-SHA256 (info `ed25519_encryption`) | XChaCha20-Poly1305 | 32 bytes (64 hex) |

Wire format for every encrypted field:

```
[ephemeral_pubkey (32 bytes)][nonce (24 bytes)][ciphertext + tag]
```

Keys are **Ed25519** on both sides, converted to/from X25519 for ECDH.

## Quick Start (Python)

Requirements: `pip install requests PyNaCl cryptography`

```python
import secrets, requests
from nacl.signing import SigningKey
from nacl.bindings import (
    crypto_sign_ed25519_pk_to_curve25519,
    crypto_sign_ed25519_sk_to_curve25519,
    crypto_aead_xchacha20poly1305_ietf_encrypt,
    crypto_aead_xchacha20poly1305_ietf_decrypt,
    crypto_aead_xchacha20poly1305_ietf_NPUBBYTES,
)
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

ENDPOINT = "https://cloud-api.near.ai"
API_KEY  = "sk-..."
MODEL    = "zai-org/GLM-5.1-FP8"

def v2_encrypt(plaintext: bytes, recipient_x25519_pub: bytes) -> bytes:
    eph = X25519PrivateKey.generate()
    shared = eph.exchange(X25519PublicKey.from_public_bytes(recipient_x25519_pub))
    key = HKDF(hashes.SHA256(), 32, None, b"ed25519_encryption").derive(shared)
    nonce = secrets.token_bytes(crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
    ct = crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, None, nonce, key)
    return eph.public_key().public_bytes_raw() + nonce + ct

def v2_decrypt(data: bytes, secret_x25519: bytes) -> bytes:
    eph_pub = X25519PublicKey.from_public_bytes(data[:32])
    nonce, ct = data[32:56], data[56:]
    shared = X25519PrivateKey.from_private_bytes(secret_x25519).exchange(eph_pub)
    key = HKDF(hashes.SHA256(), 32, None, b"ed25519_encryption").derive(shared)
    return crypto_aead_xchacha20poly1305_ietf_decrypt(ct, None, nonce, key)

# 1. Model's Ed25519 public key (from attestation; gateway version requires API key)
attestation = requests.get(
    f"{ENDPOINT}/v1/attestation/report",
    headers={"Authorization": f"Bearer {API_KEY}"},
    params={"model": MODEL, "signing_algo": "ed25519"},
).json()
model_ed25519_pub = bytes.fromhex(attestation["model_attestations"][0]["signing_public_key"])
model_x25519_pub = crypto_sign_ed25519_pk_to_curve25519(model_ed25519_pub)

# 2. Client Ed25519 key pair
client_sk = SigningKey.generate()
client_pub_hex = bytes(client_sk.verify_key).hex()
client_x25519_secret = crypto_sign_ed25519_sk_to_curve25519(
    bytes(client_sk) + bytes(client_sk.verify_key)
)

# 3. Encrypt + send
encrypted_content = v2_encrypt(b"What is the capital of France?", model_x25519_pub).hex()

resp = requests.post(
    f"{ENDPOINT}/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "X-Signing-Algo": "ed25519",
        "X-Client-Pub-Key": client_pub_hex,
        "X-Encryption-Version": "2",
    },
    json={
        "model": MODEL,
        "messages": [{"role": "user", "content": encrypted_content}],
        "stream": False,
    },
)
resp.raise_for_status()
msg = resp.json()["choices"][0]["message"]

# 4. Decrypt response
if msg.get("reasoning_content"):
    print("Reasoning:", v2_decrypt(bytes.fromhex(msg["reasoning_content"]), client_x25519_secret).decode())
if msg.get("content"):
    print("Content:", v2_decrypt(bytes.fromhex(msg["content"]), client_x25519_secret).decode())
```

## JavaScript Encryption

```js
import { x25519, edwardsToMontgomeryPub } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from 'crypto';

function encryptForModel(plaintext, modelEd25519PubHex) {
  const modelX25519Pub = edwardsToMontgomeryPub(Buffer.from(modelEd25519PubHex, 'hex'));
  const ephemeralPrivate = randomBytes(32);
  const sharedSecret = x25519.getSharedSecret(ephemeralPrivate, modelX25519Pub);
  const symmetricKey = hkdf(sha256, sharedSecret, undefined, 'ed25519_encryption', 32);
  const nonce = randomBytes(24);
  const ciphertext = xchacha20poly1305(symmetricKey, nonce)
    .encrypt(new TextEncoder().encode(plaintext));
  return Buffer.concat([
    Buffer.from(x25519.getPublicKey(ephemeralPrivate)),
    nonce,
    Buffer.from(ciphertext),
  ]).toString('hex');
}
```

Decrypt matches the same shape — parse `[eph 32][nonce 24][ct+tag]`, ECDH with the ephemeral pubkey, HKDF, XChaCha20.

## Required Headers

| Header | Description |
|--------|-------------|
| `X-Signing-Algo` | `ed25519` |
| `X-Client-Pub-Key` | Your Ed25519 public key, hex (32 bytes / 64 hex chars) |
| `X-Encryption-Version` | `2` |
| `X-Model-Pub-Key` | Model's Ed25519 public key from attestation (**required via gateway**; not needed on direct completions) |
| `X-Encrypt-All-Fields` | Optional; `true` extends encryption to tool-calling fields (below) |

## Important Notes

- **Supported endpoints:** `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`, `/v1/images/generations`. The Responses API does not support encrypted input.
- Encrypted content must be **hex-encoded**; responses return hex in `content` / `reasoning_content`; each streaming chunk is independently encrypted.
- Verify the model public key's authenticity via the attestation report (see Model Verification).
- Legacy ECDSA protocol (`signing_algo: ecdsa`, SECP256K1 ECDH + HKDF + AES-256-GCM, 128-hex public keys, info `ecdsa_encryption`, `[eph 65][nonce 12][ct]`) still works with `X-Signing-Algo: ecdsa` — prefer Ed25519/v2 for new integrations.

## Encrypting All Fields (Tool Calling)

Default E2EE covers message `content`, `reasoning_content`, `reasoning`, and `audio.data`. With tool calling, tool definitions and tool calls are also sensitive — send `X-Encrypt-All-Fields: true` and encrypt/decrypt these fields with the model's/client's key exactly like message content:

| Direction | Additionally encrypted |
|-----------|------------------------|
| Request | `tools[].function.name`, `.description`, `.parameters` (JSON schema stringified, encrypted whole), `tool_choice.function.name`, message `name`/`refusal`, `tool_calls[].function.{name,arguments}` on assistant/tool messages |
| Response | `tool_calls[].function.{name,arguments}`, `refusal`, `logprobs` token strings |

```python
tool = {
    "type": "function",
    "function": {
        "name": v2_encrypt(b"get_weather", model_x25519_pub).hex(),
        "description": v2_encrypt(b"Get current weather for a city", model_x25519_pub).hex(),
        "parameters": v2_encrypt(json.dumps({
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"],
        }).encode(), model_x25519_pub).hex(),
    },
}
```

When continuing the conversation, encrypt the echoed `tool_calls` and the tool-result `content` the same way. Server-side web-search tool results (`nearai_tool_result.output` chunks) are always encrypted to your key regardless of this flag.
