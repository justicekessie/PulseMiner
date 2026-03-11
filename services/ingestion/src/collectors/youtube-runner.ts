/**
 * Standalone runner for the YouTube Comments collector.
 * Usage: pnpm ingest:youtube
 */

import { prisma } from '@pulseminer/database';
import { runYouTubeCollector } from './youtube.js';

const count = await runYouTubeCollector();
console.log(`[youtube] Done — ${count} comments ingested`);
await prisma.$disconnect();
