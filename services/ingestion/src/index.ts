/**
 * PulseMiner — Ingestion service entry point.
 *
 * Orchestrates all data collectors and sends raw events to the
 * processing service for NLP enrichment before writing ProcessedSignals.
 */

import { prisma } from '@pulseminer/database';
import { runSyntheticCollector } from './collectors/synthetic.js';
import { runNewsCollector } from './collectors/news.js';
import { runGhanaNewsCollector } from './collectors/ghana-news.js';
import { runYouTubeCollector } from './collectors/youtube.js';
import { runFacebookCollector } from './collectors/facebook.js';

const INTERVAL_MS = Number(process.env.INGESTION_INTERVAL_MS ?? 300_000); // 5 min default

async function runIngestionCycle() {
  console.log(`[ingestion] Starting cycle at ${new Date().toISOString()}`);

  try {
    const [syntheticCount, newsCount, ghanaNewsCount, youtubeCount, facebookCount] = await Promise.all([
      runSyntheticCollector(),
      runNewsCollector(),
      runGhanaNewsCollector(),
      runYouTubeCollector(),
      runFacebookCollector(),
    ]);

    console.log(
      `[ingestion] Cycle complete — synthetic: ${syntheticCount}, news: ${newsCount}, ghana-portals: ${ghanaNewsCount}, youtube: ${youtubeCount}, facebook: ${facebookCount} events ingested`
    );
  } catch (err) {
    console.error('[ingestion] Cycle error:', err);
  }
}

// Run once immediately, then on interval
await runIngestionCycle();

if (process.env.INGESTION_LOOP === 'true') {
  setInterval(runIngestionCycle, INTERVAL_MS);
  console.log(`[ingestion] Loop running every ${INTERVAL_MS / 1000}s`);
}

await prisma.$disconnect();
