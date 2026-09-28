---
title: User Auth & Private Balances
impact: HIGH
tags: api, auth, user, balances
---

# User Auth & Private Balances

Reveal a **user's** confidential balances and transaction history. Separate from the Partner JWT: the Partner JWT authenticates your integration; a User-Session token authenticates an individual user.

Source: https://docs.near-intents.org/api-reference/user-auth/authenticate-user-with-signed-data.md

## Flow

1. Build a **NEP-413** payload: `recipient: "intents.near"`, fresh random `nonce`, `message` = stringified JSON with an **empty `intents` array**, `deadline`, `signer_id`. The empty intents array makes this a **proof of ownership**, not a swap.
2. User's wallet signs it → `public_key` + `signature` (both `ed25519:`-prefixed).
3. `POST /v0/auth/authenticate` with the signed data.

With `@defuse-protocol/intents-sdk`, `createIntentSignerNEP413` + `buildAndSign()` do steps 1–2.

```typescript
import { createIntentSignerNEP413, IntentsSDK } from '@defuse-protocol/intents-sdk';
import { UserAuthService } from '@defuse-protocol/one-click-sdk-typescript';

const signer = createIntentSignerNEP413({
  accountId: userAccountId,
  signMessage: async (_payload, hash) => {
    const { publicKey, signature } = await userWallet.signMessage(hash);
    return { publicKey: publicKey.toString(), signature: Buffer.from(signature).toString('base64') };
  },
});

const sdk = new IntentsSDK({ referral: 'your-integration', env: 'production' });
const { signed } = await sdk
  .intentBuilder()
  .setDeadline(new Date(Date.now() + 5 * 60_000))
  .buildAndSign(signer);

const auth = await UserAuthService.authenticate({ signedData: signed });
// auth.accessToken, auth.refreshToken, auth.expiresIn, auth.refreshExpiresIn
```

Raw equivalent:

```bash
curl -X POST https://1click.chaindefuser.com/v0/auth/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "signedData": {
      "standard": "nep413",
      "payload": {
        "recipient": "intents.near",
        "nonce": "<base64 32-byte nonce>",
        "message": "{\"deadline\":\"2026-07-16T12:00:00.000Z\",\"intents\":[],\"signer_id\":\"your-account.near\"}"
      },
      "public_key": "ed25519:YOUR_PUBLIC_KEY",
      "signature": "ed25519:YOUR_SIGNATURE"
    }
  }'
```

Response: `{ accessToken, refreshToken, expiresIn, refreshExpiresIn }`.

**WARNING:** store `refreshToken` securely — anyone holding it can mint access tokens for that account until it expires.

## Refresh

Exchange the refresh token for a new access token (see [Refresh Access Token](https://docs.near-intents.org/api-reference/user-auth/refresh-access-token.md)).

## Balances (User-Session auth)

`GET /v0/account/balances?tokenIds=<comma-separated>` — token balances from `private` balance sources. Empty `tokenIds` returns all non-zero balances.

```typescript
const res = await fetch('https://1click.chaindefuser.com/v0/account/balances', {
  headers: { Authorization: `Bearer ${accessToken}` },
});
// { balances: [{ tokenId: "nep141:wrap.near", available: "1000000...", source: "private" }] }
```

Use `available` as a string — precision matters. 401 = session token invalid or expired.

## Transaction History

Paginated public + confidential transaction history (cursor-based: omit cursors for latest; pass `nextCursor`/`prevCursor` from the prior response). **Invite-only for now.** See [Get transaction history](https://docs.near-intents.org/api-reference/account/get-transaction-history.md).

_signedData is the same `MultiPayload` format used for signing intents (see Verifier docs), reused with an empty intents array._
