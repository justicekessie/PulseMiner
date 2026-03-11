/**
 * Processing Bridge
 *
 * Picks up unprocessed SourceEvents from the database, sends them in
 * batches to the Python NLP processing service, and writes the results
 * back as ProcessedSignal records.
 *
 * This is the critical link between ingestion and fusion.
 *
 * Usage:
 *   pnpm process-events               # process all pending events
 *   PROCESSING_SERVICE_URL=... pnpm process-events  # point to custom NLP service
 */

import { prisma } from '@pulseminer/database';

const PROCESSING_URL = process.env.PROCESSING_SERVICE_URL ?? 'http://localhost:8000';
const BATCH_SIZE = 50; // Python service max is 100, keep some headroom
const MAX_EVENTS_PER_RUN = 500; // Safety cap per run

// ─── Types matching the Python processing service ────────────────────────────

interface ProcessRequest {
  text: string;
  source_type: string;
  hint_language?: string;
}

interface SentimentResponse {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

interface EmotionResponse {
  dominant: string;
  scores: Record<string, number>;
}

interface ProcessResponse {
  sentiment: SentimentResponse;
  emotion: EmotionResponse;
  topic_labels: string[];
  urgency_score: number;
  spam_score: number;
  confidence_score: number;
  detected_language: string;
}

interface BatchResponse {
  results: ProcessResponse[];
}

// ─── NLP service client ──────────────────────────────────────────────────────

async function callProcessingService(items: ProcessRequest[]): Promise<ProcessResponse[]> {
  const res = await fetch(`${PROCESSING_URL}/process/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Processing service returned ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as BatchResponse;
  return data.results;
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${PROCESSING_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Main bridge logic ───────────────────────────────────────────────────────

export async function processUnprocessedEvents(): Promise<number> {
  // Check if the NLP service is reachable
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    console.error(`[process-bridge] Processing service at ${PROCESSING_URL} is not reachable. Is it running?`);
    console.error('[process-bridge] Start it with: cd services/processing && python main.py');
    return 0;
  }

  console.log(`[process-bridge] Connected to processing service at ${PROCESSING_URL}`);

  // Fetch unprocessed events
  const unprocessed = await prisma.sourceEvent.findMany({
    where: {
      processed: false,
      text_content: { not: null },
    },
    orderBy: { timestamp: 'desc' },
    take: MAX_EVENTS_PER_RUN,
  });

  if (unprocessed.length === 0) {
    console.log('[process-bridge] No unprocessed events found');
    return 0;
  }

  console.log(`[process-bridge] Found ${unprocessed.length} unprocessed events, processing in batches of ${BATCH_SIZE}…`);

  let processed = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < unprocessed.length; i += BATCH_SIZE) {
    const batch = unprocessed.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(unprocessed.length / BATCH_SIZE);

    // Build requests
    const requests: ProcessRequest[] = batch.map((event) => ({
      text: event.text_content!,
      source_type: event.source_type,
      hint_language: event.language ?? undefined,
    }));

    let results: ProcessResponse[];
    try {
      results = await callProcessingService(requests);
    } catch (err) {
      console.error(`[process-bridge] Batch ${batchNum}/${totalBatches} failed:`, (err as Error).message);
      failed += batch.length;
      continue;
    }

    // Write ProcessedSignal records and mark SourceEvents as processed
    for (let j = 0; j < results.length; j++) {
      const event = batch[j];
      const result = results[j];

      try {
        await prisma.processedSignal.create({
          data: {
            source_event_id: event.id,
            sentiment_score: result.sentiment.score,
            sentiment_label: result.sentiment.label,
            sentiment_conf: result.sentiment.confidence,
            dominant_emotion: mapEmotionLabel(result.emotion.dominant),
            emotion_scores: result.emotion.scores,
            topic_labels: result.topic_labels,
            urgency_score: result.urgency_score,
            spam_score: result.spam_score,
            confidence_score: result.confidence_score,
            detected_language: result.detected_language,
          },
        });

        await prisma.sourceEvent.update({
          where: { id: event.id },
          data: { processed: true },
        });

        processed++;
      } catch (err) {
        // Skip duplicates (source_event_id is unique)
        const msg = (err as Error).message;
        if (msg.includes('Unique constraint')) {
          await prisma.sourceEvent.update({
            where: { id: event.id },
            data: { processed: true },
          });
          processed++;
        } else {
          console.error(`[process-bridge] Failed to save signal for event ${event.id}:`, msg);
          failed++;
        }
      }
    }

    console.log(`[process-bridge] Batch ${batchNum}/${totalBatches} done (${processed} processed, ${failed} failed)`);
  }

  console.log(`[process-bridge] Complete — ${processed} events processed, ${failed} failed`);
  return processed;
}

// Map free-form emotion string to Prisma enum values
function mapEmotionLabel(emotion: string): 'anger' | 'fear' | 'sadness' | 'joy' | 'trust' | 'disgust' | 'neutral' {
  const valid = new Set(['anger', 'fear', 'sadness', 'joy', 'trust', 'disgust', 'neutral']);
  const lower = emotion.toLowerCase();
  if (valid.has(lower)) return lower as any;
  return 'neutral';
}

// ─── CLI entry point ─────────────────────────────────────────────────────────

const count = await processUnprocessedEvents();
console.log(`[process-bridge] Done — ${count} events processed`);
await prisma.$disconnect();
