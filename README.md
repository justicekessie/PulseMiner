# PulseMiner 🇬🇭

> An ethical AI-powered civic intelligence dashboard — Ghana pilot.

PulseMiner aggregates public sentiment from multiple sources and fuses them into a real-time mood observatory covering all 16 Ghana regions across 10 civic topics. Built for transparency, privacy-by-default, and responsible civic use.

**Dashboard:** http://localhost:3000
**API:** http://localhost:3001
**API Docs (Swagger):** http://localhost:3001/docs
**NLP Service:** http://localhost:8000

---

## Quick Start

### Prerequisites

- Docker 24+ and Docker Compose v2
- Node.js 20+ and pnpm 9+
- (Optional) Python 3.11+ for local NLP development

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env — set a strong DATABASE_URL password and NEWS_API_KEY if you have one
```

### 2. Start infrastructure

```bash
docker-compose up -d postgres redis
```

### 3. Install dependencies and push schema

```bash
pnpm install
pnpm db:push      # Runs prisma db push — creates all tables
```

### 4. Seed 30 days of Ghana data

```bash
pnpm seed         # Populates MoodIndex for 16 regions × 10 topics × 30 days
```

### 5. Start all services

```bash
docker-compose up
```

The first build takes 3–5 minutes. Once running:

| URL                          | What you see                     |
|------------------------------|-----------------------------------|
| http://localhost:3000        | Live Ghana dashboard              |
| http://localhost:3001/docs   | Swagger API reference             |
| http://localhost:8000/docs   | NLP service Swagger               |

### 6. (Optional) Enable live data collection

```bash
docker-compose --profile ingest --profile fuse up
```

This starts the ingestion service (news + synthetic signals every 15 min) and the fusion engine (hourly aggregation).

---

## Demo Mode

The dashboard works **without a running backend**. If the API is unreachable, it automatically falls back to `src/lib/mock-data.ts` — a realistic snapshot of Ghana public sentiment including all 16 regions, 10 topics, 30-day time series, and 3 anomaly alerts. The header shows `DEMO` in amber when using mock data.

---

## Project Structure

```
PulseMiner/
├── apps/
│   └── web/               # Next.js 14 dashboard (port 3000)
├── packages/
│   ├── shared/            # TypeScript types + Ghana constants
│   └── database/          # Prisma schema + seed script
├── services/
│   ├── api/               # Fastify REST API (port 3001)
│   ├── fusion/            # Signal fusion engine (cron)
│   ├── ingestion/         # News + synthetic collectors (cron)
│   └── processing/        # Python NLP microservice (port 8000)
├── docs/
│   ├── architecture.md    # System design + data flow
│   ├── ethics.md          # Ethics charter
│   └── api.md             # Full API reference
└── docker-compose.yml
```

---

## Ghana Coverage

**Regions (16):** Greater Accra, Ashanti, Western, Western North, Eastern, Central, Volta, Oti, Bono, Bono East, Ahafo, Northern, Savannah, North East, Upper East, Upper West

**Topics (10):** Economy & Cost of Living, Energy & Dumsor, Jobs & Employment, Education, Healthcare & NHIS, Infrastructure & Roads, Agriculture & Cocoa, Governance, Security, Digital & Mobile Money

**Languages:** English, Twi/Akan, Ga, Ewe, Dagbani, Hausa, Fante, Nzema

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full five-layer architecture diagram and service topology.

**Signal fusion formula:**

$$M(r,t,k) = \sum_{s} w_s \cdot \bar{x}_{r,t,s,k}$$

Source weights: social_post (0.35), news (0.25), widget (0.25), voice (0.10), synthetic (0.20), search_trend (0.05)

---

## Ethics

PulseMiner is built around a strict ethics charter. Key commitments:

- **No individual tracking** — all outputs are population-level aggregates
- **No private community scraping** — only publicly published content
- **Minimum threshold** — MoodIndex requires ≥ 5 signals before display
- **Language equity** — Ghana-specific NLP lexicons for underrepresented languages
- **Transparent uncertainty** — every score comes with confidence bounds
- **Human in the loop** — critical anomalies require human review before any action

Read the full charter: [docs/ethics.md](docs/ethics.md)

---

## Development

```bash
# Run all services in dev mode (hot reload)
pnpm dev

# Run API only
pnpm api

# Run web dashboard only
pnpm web

# Run NLP processing service
cd services/processing && uvicorn main:app --reload

# Lint and type-check everything
pnpm build
```

### Environment Variables

Copy `.env.example` to `.env`. Key variables:

| Variable              | Description                              |
|-----------------------|------------------------------------------|
| `DATABASE_URL`        | PostgreSQL connection string             |
| `REDIS_URL`           | Redis connection string                  |
| `PROCESSING_URL`      | Python NLP service URL                   |
| `NEWS_API_KEY`        | (Optional) newsapi.org key for live news |
| `API_PORT`            | API service port (default: 3001)         |
| `NEXT_PUBLIC_API_URL` | Dashboard → API URL                      |

---

## Scaling to Other Countries

The codebase is Ghana-scoped for the pilot but designed to scale:

1. Add country constants to `packages/shared/src/constants/`
2. Add country-specific topic keywords to `services/processing/app/topics.py`
3. Update the seed script with country-appropriate baselines
4. Extend the dashboard region grid with the new country's administrative units
5. All database models have a `country` column for multi-country records

See [docs/architecture.md](docs/architecture.md#scaling-path) for the full scaling roadmap.

---

## License

Built for civic good. Ethics charter applies to all deployments.