/**
 * Standalone runner for the Facebook Comments collector.
 * Usage: pnpm ingest:facebook
 */

import { prisma } from '@pulseminer/database';
import { runFacebookCollector } from './facebook.js';

const count = await runFacebookCollector();
console.log(`[facebook] Done — ${count} comments ingested`);
await prisma.$disconnect();
