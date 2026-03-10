FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter @pulseminer/web...

FROM deps AS builder
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY tsconfig.base.json .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @pulseminer/shared build
RUN pnpm --filter @pulseminer/web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
