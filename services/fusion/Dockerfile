FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY services/fusion/package.json ./services/fusion/
RUN pnpm install --frozen-lockfile --filter @pulseminer/fusion...

FROM deps AS runner
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY services/fusion ./services/fusion

CMD ["node", "--loader", "tsx/esm", "services/fusion/src/index.ts"]
