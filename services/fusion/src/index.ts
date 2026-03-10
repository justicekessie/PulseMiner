import { prisma } from '@pulseminer/database';
import { runFusion } from './engine.js';
import { generateWeeklyReport } from './reporter.js';

const country = process.env.PILOT_COUNTRY ?? 'GH';

console.log(`[fusion] PulseMiner Signal Fusion Engine — ${country} pilot`);
console.log(`[fusion] Date: ${new Date().toISOString()}`);

// Run fusion for today
const today = new Date();
await runFusion(today, country);

// Generate weekly report
await generateWeeklyReport(today, country);

await prisma.$disconnect();

console.log('[fusion] Done.');
