# PulseMiner — System Architecture (Ghana Pilot)

## Overview

PulseMiner is a five-layer ethical AI signal-fusion platform that aggregates public sentiment from multiple sources into a civic intelligence dashboard. The Ghana pilot covers all 16 administrative regions across 10 civic topics.

```
┌──────────────────────────────────────────────────────────────────┐
│  Data Sources                                                    │
│  (RSS feeds, News APIs, Public Posts, Widget, Voice)            │
└─────────────────────────┬────────────────────────────────────────┘
                          │ raw SourceEvents
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Layer 1 — INGESTION  (services/ingestion)                       │
│  • News collector: myjoyonline, citinewsroom, ghanaweb, pulse.gh │
│  • Synthetic generator: realistic Ghana-context signals          │
│  • Widget responses: MicroPulse embedded widget                  │
│  • Writes: SourceEvent rows, queues to ProcessedSignal           │
└─────────────────────────┬────────────────────────────────────────┘
                          │ SourceEvent IDs
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Layer 2 — PROCESSING  (services/processing, Python FastAPI)     │
│  • Language detection (English, Twi, Ga, Ewe, Dagbani, Hausa)   │
│  • Sentiment analysis (VADER + Ghana English + Twi/Akan lexicon) │
│  • Topic extraction (keyword matching, 10 civic topics)          │
│  • Urgency scoring, spam filtering                               │
│  • Emotion derivation (7 categories)                             │
│  • Writes: ProcessedSignal rows                                  │
└─────────────────────────┬────────────────────────────────────────┘
                          │ ProcessedSignal rows
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Layer 3 — FUSION  (services/fusion)                             │
│  • Groups signals by region × topic × date                       │
│  • Weighted aggregation: M(r,t,k) = f(P,T,W,V,N,C)              │
│    – social_post: 0.35, news: 0.25, widget: 0.25, voice: 0.10   │
│    – synthetic: 0.20, search_trend: 0.05                         │
│  • Computes concern/optimism/frustration indices                 │
│  • Uncertainty bounds (Wilson interval approximation)            │
│  • Anomaly detection (concern spike, sentiment shift, salience)  │
│  • Writes: MoodIndex rows, AnomalyAlert rows                     │
│  • Weekly: WeeklyReport JSON blob                                │
└─────────────────────────┬────────────────────────────────────────┘
                          │ MoodIndex + AnomalyAlert
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Layer 4 — API  (services/api, Fastify + TypeScript)             │
│  • REST JSON API on port 3001                                    │
│  • Swagger docs at /docs                                         │
│  • Rate limiting, CORS, Zod validation                           │
│  • Routes: mood, regions, topics, widget, reports, anomalies     │
└─────────────────────────┬────────────────────────────────────────┘
                          │ JSON responses
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Layer 5 — DELIVERY  (apps/web, Next.js 14)                      │
│  • National Mood Gauge (SVG arc)                                 │
│  • 30-day Sentiment Time Series (Recharts AreaChart)             │
│  • All 16 Regions grid with sentiment cards                      │
│  • Topics Ranking with issue salience bars                       │
│  • Anomaly Alert Feed                                            │
│  • MicroPulse Widget (citizen voice, 3-step, privacy-first)      │
│  • Confidence/methodology disclosure                             │
│  • Demo mode fallback (mock-data.ts) when API unavailable        │
└──────────────────────────────────────────────────────────────────┘
```

## Service Topology

| Service        | Technology         | Port | Profile   |
|----------------|--------------------|------|-----------|
| PostgreSQL 16  | postgres:16-alpine | 5432 | always    |
| Redis 7        | redis:7-alpine     | 6379 | always    |
| Processing NLP | Python FastAPI     | 8000 | always    |
| API            | Fastify + Node     | 3001 | always    |
| Web Dashboard  | Next.js 14         | 3000 | always    |
| Ingestion      | Node.js            | —    | `ingest`  |
| Fusion         | Node.js            | —    | `fuse`    |

Start all always-on services:
```bash
docker-compose up -d
```

Start with live data collection:
```bash
docker-compose --profile ingest --profile fuse up -d
```

## Data Flow

1. **Ingestion** fires on cron: every 15 minutes (news collector), every 5 minutes (synthetic), on-demand (widget).
2. **Processing** is called synchronously by ingestion for news/social signals; synthetic signals are pre-scored.
3. **Fusion** runs every hour, aggregates all signals from the past window, and upserts MoodIndex records.
4. **API** reads directly from PostgreSQL; Redis caches 5-minute TTL for the national mood endpoint.
5. **Dashboard** polls the API every 60 seconds; falls back to `mock-data.ts` if unreachable.

## Package Structure

```
PulseMiner/
├── apps/
│   └── web/               # Next.js 14 dashboard
├── packages/
│   ├── shared/            # Types + Ghana constants (shared across all TS packages)
│   └── database/          # Prisma schema + client singleton + seed script
├── services/
│   ├── api/               # Fastify REST API
│   ├── fusion/            # Signal fusion engine
│   ├── ingestion/         # News + synthetic collectors
│   └── processing/        # Python NLP microservice
├── docs/                  # This directory
├── docker-compose.yml
└── turbo.json             # Turborepo pipeline
```

## Database Schema

```
SourceEvent           Raw ingested signal (pre-NLP)
ProcessedSignal       NLP-enriched signal with sentiment/topic labels
MoodIndex             Fused daily mood record per region × topic
WidgetResponse        Citizen widget submissions
VoiceSubmission       (reserved) Audio sentiment submissions
AnomalyAlert          Triggered alerts for significant deviations
WeeklyReport          Aggregated weekly JSON report
TopicTrendSnapshot    Short-term trend snapshots for sparklines
```

The unique constraint on `MoodIndex(region, date_bucket, topic)` prevents duplicate fusion runs; the fusion engine uses `upsert`.

## Fusion Formula

$$M(r,t,k) = \sum_{s} w_s \cdot \bar{x}_{r,t,s,k}$$

Where:
- $r$ = region, $t$ = topic, $k$ = time bucket
- $s$ = source type (with weight $w_s$)
- $\bar{x}$ = mean sentiment across signals of source type $s$

Uncertainty bounds approximate a Wilson-like interval based on signal count and variance.

## Scaling Path

The Ghana pilot uses synchronous fusion and a single PostgreSQL instance. Scaling to multiple countries requires:

1. **Horizontal ingestion workers** (multiple instances with distributed locking via Redis)
2. **Stream processing** (replace batch fusion with Kafka + Flink or similar)
3. **Country-scoped routing** (`country` column present on all models)
4. **Federated NLP** (per-language model routing vs. single VADER instance)
5. **Read replicas** for the API layer once signal volume exceeds ~50K signals/day
