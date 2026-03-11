#!/usr/bin/env bash
#
# PulseMiner Full Pipeline Runner
#
# Runs the complete data pipeline: ingest → process → fuse
# This gives you real graphs from real scraped data.
#
# Prerequisites:
#   1. PostgreSQL running (DATABASE_URL in .env)
#   2. Python processing service running:
#      cd services/processing && pip install -r requirements.txt && python main.py
#   3. pnpm install completed
#
# Usage:
#   ./scripts/run-pipeline.sh           # run full pipeline
#   ./scripts/run-pipeline.sh --skip-ingest  # skip ingestion, just process + fuse
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

SKIP_INGEST=false
for arg in "$@"; do
  case "$arg" in
    --skip-ingest) SKIP_INGEST=true ;;
  esac
done

echo "═══════════════════════════════════════════════════════════"
echo "  PulseMiner Pipeline — $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════"

# ─── Step 1: Ingest ──────────────────────────────────────────────────────────
if [ "$SKIP_INGEST" = false ]; then
  echo ""
  echo "▸ Step 1/3: Ingesting data from all sources…"
  echo "  (Ghana news RSS, YouTube, Facebook, NewsAPI)"
  pnpm -F @pulseminer/ingestion ingest
  echo "  ✓ Ingestion complete"
else
  echo ""
  echo "▸ Step 1/3: Skipped (--skip-ingest)"
fi

# ─── Step 2: Process ─────────────────────────────────────────────────────────
echo ""
echo "▸ Step 2/3: Processing events through NLP pipeline…"
echo "  (sentiment, topics, language detection, urgency, spam)"
pnpm -F @pulseminer/ingestion process-events
echo "  ✓ Processing complete"

# ─── Step 3: Fuse ────────────────────────────────────────────────────────────
echo ""
echo "▸ Step 3/3: Running signal fusion engine…"
echo "  (mood indices, anomaly detection, topic trends, weekly report)"
pnpm -F @pulseminer/fusion fuse
echo "  ✓ Fusion complete"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Pipeline finished at $(date '+%H:%M:%S')"
echo "  Start the API:       pnpm -F @pulseminer/api dev"
echo "  Start the dashboard: pnpm -F @pulseminer/web dev"
echo "═══════════════════════════════════════════════════════════"
