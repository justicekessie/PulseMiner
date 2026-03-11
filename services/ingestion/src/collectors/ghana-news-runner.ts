/**
 * Standalone runner for the Ghana News RSS collector.
 * Usage: pnpm ingest:ghana-news
 */

import { prisma } from '@pulseminer/database';
import { runGhanaNewsCollector } from './ghana-news.js';

const count = await runGhanaNewsCollector();
console.log(`[ghana-news] Done — ${count} articles ingested`);
await prisma.$disconnect();
