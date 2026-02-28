FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY sdk ./sdk
COPY skills ./skills

RUN corepack enable && pnpm install && pnpm --filter near-agent-market-autopilot build

ENTRYPOINT ["node", "./sdk/near-agent-market-autopilot/dist/cli/index.js"]
CMD ["doctor", "--config", "/config/config.json"]
