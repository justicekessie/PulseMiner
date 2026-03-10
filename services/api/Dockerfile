FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

# ─── Install deps ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY services/api/package.json ./services/api/
RUN pnpm install --frozen-lockfile --filter @pulseminer/api...

# ─── Build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY services/api ./services/api

RUN pnpm --filter @pulseminer/shared build
RUN pnpm --filter @pulseminer/database run db:generate
RUN pnpm --filter @pulseminer/api build

# ─── Runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/package.json ./services/api/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .

EXPOSE 3001
CMD ["node", "services/api/dist/index.js"]
