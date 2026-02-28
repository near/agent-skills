import { createHash, createHmac } from 'node:crypto';

import type { DeliverableManifest, SignedDeliverableManifest } from '../types.js';

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, normalizeValue(child)])
    );
  }
  return value;
}

export function canonicalizeManifest(manifest: DeliverableManifest): string {
  return JSON.stringify(normalizeValue(manifest));
}

export function manifestHash(manifest: DeliverableManifest): string {
  return createHash('sha256').update(canonicalizeManifest(manifest), 'utf8').digest('hex');
}

export function signDeliverableManifest(params: {
  manifest: DeliverableManifest;
  signingKey: string;
  signerId?: string;
}): SignedDeliverableManifest {
  const hash = manifestHash(params.manifest);
  const signatureHex = createHmac('sha256', params.signingKey).update(hash, 'utf8').digest('hex');

  return {
    manifest: params.manifest,
    manifestHash: hash,
    signature: {
      algorithm: 'hmac-sha256',
      signerId: params.signerId ?? 'autopilot',
      signatureHex,
    },
  };
}

export function verifyDeliverableManifestSignature(params: {
  signed: SignedDeliverableManifest;
  signingKey: string;
}): boolean {
  const hash = manifestHash(params.signed.manifest);
  if (hash !== params.signed.manifestHash) {
    return false;
  }

  const expected = createHmac('sha256', params.signingKey).update(hash, 'utf8').digest('hex');
  return expected === params.signed.signature.signatureHex;
}

export function deterministicDeliverableHash(params: {
  manifest: DeliverableManifest;
  signingKey: string;
  signerId?: string;
}): string {
  const signed = signDeliverableManifest(params);
  return createHash('sha256')
    .update(`${signed.manifestHash}:${signed.signature.signatureHex}`, 'utf8')
    .digest('hex');
}
