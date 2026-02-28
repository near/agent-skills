import { describe, expect, it } from 'vitest';

import {
  signDeliverableManifest,
  verifyDeliverableManifestSignature,
} from '../src/manifest/manifest.js';
import { simulateTick } from '../src/simulation/simulate.js';

describe('determinism', () => {
  it('produces stable simulation digests for identical input', () => {
    const input = {
      nowIso: '2026-02-28T00:00:00.000Z',
      jobs: [
        {
          job_id: 'job-1',
          title: 'A',
          budget_amount: '2',
          budget_token: 'NEAR',
          job_type: 'standard' as const,
        },
      ],
      bidsByJobId: {
        'job-1': [{ bid_id: 'existing-1', amount: '0.9' }],
      },
      trackedBids: [
        { bidId: 'bid-accepted', jobId: 'job-1', status: 'accepted' as const, amountNear: 1.2 },
      ],
    };

    const first = simulateTick(input);
    const second = simulateTick(input);

    expect(first.deterministicDigest).toBe(second.deterministicDigest);
    expect(first.bidDecisions).toEqual(second.bidDecisions);
  });

  it('generates stable manifest signatures', () => {
    const signed = signDeliverableManifest({
      manifest: {
        jobId: 'job-1',
        assignmentId: 'asg-1',
        bidId: 'bid-1',
        agentId: 'agent-1',
        deliverableUrl: 'https://example.com/report.md',
        artifactHash: 'abc123',
        createdAt: '2026-02-28T00:00:00.000Z',
        metadata: { section: 'security' },
      },
      signingKey: 'secret-key',
      signerId: 'agent-1',
    });

    const same = signDeliverableManifest({
      manifest: signed.manifest,
      signingKey: 'secret-key',
      signerId: 'agent-1',
    });

    expect(signed.manifestHash).toBe(same.manifestHash);
    expect(signed.signature.signatureHex).toBe(same.signature.signatureHex);
    expect(verifyDeliverableManifestSignature({ signed, signingKey: 'secret-key' })).toBe(true);
  });
});
