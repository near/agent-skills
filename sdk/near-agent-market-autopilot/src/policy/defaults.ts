import { z } from 'zod';

import type { PolicyConfig } from '../types.js';

export const DEFAULT_POLICY: PolicyConfig = {
  minBudgetNear: 0.05,
  maxBudgetNear: 20,
  bidDiscountBps: 7000,
  minBidNear: 0.03,
  maxBidNear: 10,
  maxExistingBids: 12,
  minMarginNear: 0.01,
  stalePendingBidMinutes: 30,
  submitRetryLimit: 4,
  submitRetryBackoffMinutes: 10,
  submitRetryMaxBackoffMinutes: 180,
  submitEscalateAfterMinutes: 45,
  submitEscalationLimit: 4,
  failClosed: true,
};

const policySchema = z.object({
  minBudgetNear: z.number().nonnegative(),
  maxBudgetNear: z.number().positive(),
  bidDiscountBps: z.number().int().min(1).max(10_000),
  minBidNear: z.number().nonnegative(),
  maxBidNear: z.number().positive(),
  maxExistingBids: z.number().int().nonnegative(),
  minMarginNear: z.number().nonnegative(),
  stalePendingBidMinutes: z.number().int().positive(),
  submitRetryLimit: z.number().int().positive(),
  submitRetryBackoffMinutes: z.number().int().positive(),
  submitRetryMaxBackoffMinutes: z.number().int().positive(),
  submitEscalateAfterMinutes: z.number().int().positive(),
  submitEscalationLimit: z.number().int().positive(),
  failClosed: z.boolean(),
});

export function resolvePolicyConfig(partial: Partial<PolicyConfig> | undefined): PolicyConfig {
  const merged: PolicyConfig = {
    ...DEFAULT_POLICY,
    ...(partial ?? {}),
  };
  return policySchema.parse(merged);
}
