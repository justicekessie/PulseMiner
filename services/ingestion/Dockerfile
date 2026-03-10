FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY services/ingestion/package.json ./services/ingestion/
RUN pnpm install --frozen-lockfile --filter @pulseminer/ingestion...

FROM deps AS runner
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY services/ingestion ./services/ingestion

CMD ["node", "--loader", "tsx/esm", "services/ingestion/src/index.ts"]
