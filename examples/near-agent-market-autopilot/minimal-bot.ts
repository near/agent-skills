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
  artifactProvider: async ({ job, bid, assignment }) => ({
    deliverableUrl: `https://example.com/${job.job_id}/${assignment.assignment_id}`,
    artifactHash: `artifact-${bid.bidId}`,
    metadata: { mode: 'example' },
  }),
});

const result = await autopilot.runTick();
console.log(JSON.stringify(result, null, 2));
