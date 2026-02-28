import { createAutopilot } from '../../sdk/near-agent-market-autopilot/src/index.js';

const autopilot = createAutopilot({
  agentId: process.env.AGENT_ID ?? 'replace-with-agent-id',
  market: {
    baseUrl: process.env.MARKET_BASE_URL ?? 'https://market.near.ai',
    apiKey: process.env.MARKET_API_KEY ?? 'replace-with-api-key',
  },
  state: {
    driver: 'file',
    path: './state/autopilot-state.json',
  },
  nearPriceUsd: Number(process.env.NEAR_PRICE_USD ?? '4'),
  submitSigningKey: process.env.SUBMIT_SIGNING_KEY,
  submitSignerId: process.env.SUBMIT_SIGNER_ID ?? 'autopilot',
  artifactProvider: async ({ job, bid, assignment }) => ({
    deliverableUrl: `https://example.com/${job.job_id}/${assignment.assignment_id}`,
    artifactHash: `artifact-${bid.bidId}`,
  }),
});

autopilot.telemetry().on(event => {
  console.log(JSON.stringify(event));
});

await autopilot.runLoop({
  intervalMs: Number(process.env.INTERVAL_MS ?? '120000'),
  onTick: async result => {
    console.log(`[tick] ${result.tickId} errors=${result.errors.length} halted=${result.halted}`);
  },
});
