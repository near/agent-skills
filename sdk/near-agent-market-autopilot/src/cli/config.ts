import { readFile } from 'node:fs/promises';

import { z } from 'zod';

import type { AutopilotConfig } from '../types.js';

const policySchema = z
  .object({
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
  })
  .partial();

const configSchema = z.object({
  agentId: z.string().min(1),
  market: z.object({
    baseUrl: z.string().url(),
    apiKey: z.string().min(1),
    authHeader: z.string().optional(),
    timeoutMs: z.number().int().positive().optional(),
    retry: z
      .object({
        attempts: z.number().int().positive(),
        backoffMs: z.number().int().positive(),
      })
      .optional(),
  }),
  policy: policySchema.optional(),
  state: z.object({
    driver: z.enum(['file', 'sqlite']),
    path: z.string().min(1),
  }),
  nearPriceUsd: z.number().positive().optional(),
  submitSigningKey: z.string().optional(),
  submitSignerId: z.string().optional(),
});

export async function loadConfig(configPath: string): Promise<AutopilotConfig> {
  const text = await readFile(configPath, 'utf8');
  const parsed = JSON.parse(text) as unknown;
  return configSchema.parse(parsed) as AutopilotConfig;
}
