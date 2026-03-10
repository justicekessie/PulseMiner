/**
 * PulseMiner — Ghana Seed Script
 *
 * Seeds the database with 30 days of synthetic MoodIndex data for all
 * 16 Ghana regions × 10 topics. Run once after `pnpm db:push`.
 *
 * Usage:
 *   pnpm seed
 *   pnpm --filter @pulseminer/database run seed
 */

import { PrismaClient } from '@prisma/client';
import { GHANA_REGION_IDS, GHANA_TOPICS } from '@pulseminer/shared';

const prisma = new PrismaClient();

const COUNTRY = 'GH';
const DAYS = 30;

// Region-topic baseline sentiment (realistic Ghana context)
const REGION_TOPIC_BASELINE: Record<string, Record<string, number>> = {
  'greater-accra': { economy: -0.30, energy: -0.42, jobs: -0.25, infrastructure: -0.20, governance: -0.28, healthcare: -0.10, education: 0.12, agriculture: 0.05, security: -0.35, digital: 0.25 },
  'ashanti': { economy: -0.22, energy: -0.38, jobs: -0.20, infrastructure: -0.18, governance: -0.22, healthcare: -0.08, education: 0.15, agriculture: 0.10, security: -0.20, digital: 0.20 },
  'western': { economy: -0.15, energy: -0.18, jobs: -0.18, infrastructure: -0.15, governance: -0.15, healthcare: -0.12, education: 0.08, agriculture: -0.10, security: -0.10, digital: 0.15 },
  'western-north': { economy: -0.10, energy: -0.12, jobs: -0.20, infrastructure: -0.22, governance: -0.18, healthcare: -0.15, education: 0.05, agriculture: 0.15, security: -0.08, digital: 0.10 },
  'eastern': { economy: -0.18, energy: -0.22, jobs: -0.22, infrastructure: -0.18, governance: -0.20, healthcare: -0.10, education: 0.12, agriculture: 0.05, security: -0.12, digital: 0.18 },
  'central': { economy: -0.14, energy: -0.20, jobs: -0.18, infrastructure: -0.12, governance: -0.12, healthcare: -0.08, education: 0.20, agriculture: 0.08, security: -0.10, digital: 0.15 },
  'volta': { economy: -0.12, energy: -0.15, jobs: -0.15, infrastructure: -0.20, governance: -0.10, healthcare: -0.10, education: 0.10, agriculture: 0.12, security: -0.08, digital: 0.10 },
  'oti': { economy: -0.10, energy: -0.12, jobs: -0.18, infrastructure: -0.25, governance: -0.12, healthcare: -0.18, education: 0.05, agriculture: 0.15, security: -0.10, digital: 0.05 },
  'bono': { economy: -0.08, energy: -0.10, jobs: -0.15, infrastructure: -0.12, governance: -0.10, healthcare: -0.08, education: 0.12, agriculture: 0.25, security: -0.05, digital: 0.08 },
  'bono-east': { economy: -0.10, energy: -0.12, jobs: -0.15, infrastructure: -0.15, governance: -0.10, healthcare: -0.10, education: 0.10, agriculture: 0.20, security: -0.05, digital: 0.08 },
  'ahafo': { economy: -0.08, energy: -0.10, jobs: -0.12, infrastructure: -0.15, governance: -0.08, healthcare: -0.08, education: 0.08, agriculture: 0.22, security: -0.05, digital: 0.05 },
  'northern': { economy: -0.22, energy: -0.20, jobs: -0.25, infrastructure: -0.28, governance: -0.18, healthcare: -0.22, education: 0.05, agriculture: 0.08, security: -0.15, digital: 0.08 },
  'savannah': { economy: -0.20, energy: -0.18, jobs: -0.22, infrastructure: -0.30, governance: -0.15, healthcare: -0.20, education: 0.02, agriculture: 0.05, security: -0.12, digital: 0.05 },
  'north-east': { economy: -0.18, energy: -0.15, jobs: -0.20, infrastructure: -0.28, governance: -0.14, healthcare: -0.22, education: 0.03, agriculture: 0.05, security: -0.10, digital: 0.04 },
  'upper-east': { economy: -0.18, energy: -0.15, jobs: -0.22, infrastructure: -0.25, governance: -0.15, healthcare: -0.20, education: 0.05, agriculture: 0.08, security: -0.10, digital: 0.05 },
  'upper-west': { economy: -0.15, energy: -0.12, jobs: -0.20, infrastructure: -0.22, governance: -0.12, healthcare: -0.18, education: 0.05, agriculture: 0.10, security: -0.08, digital: 0.05 },
};

// Topic salience baseline
const TOPIC_SALIENCE_BASELINE: Record<string, number> = {
  economy: 0.82,
  energy: 0.72,
  jobs: 0.64,
  infrastructure: 0.55,
  education: 0.48,
  healthcare: 0.44,
  agriculture: 0.40,
  governance: 0.38,
  security: 0.29,
  digital: 0.25,
};

function noise(): number {
  return (Math.random() - 0.5) * 0.08;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

async function seed() {
  console.log('🌱 PulseMiner Ghana Seed — starting...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let created = 0;

  for (let d = 0; d < DAYS; d++) {
    const dateBucket = new Date(today);
    dateBucket.setDate(dateBucket.getDate() - (DAYS - 1 - d));

    for (const regionId of GHANA_REGION_IDS) {
      for (const topic of GHANA_TOPICS) {
        const baseSentiment = REGION_TOPIC_BASELINE[regionId]?.[topic.id] ?? -0.1;
        const baseSalience = TOPIC_SALIENCE_BASELINE[topic.id] ?? 0.3;

        // Add trend: economy/energy slightly worsening over the 30 days
        const trendAdj = ['economy', 'energy'].includes(topic.id) ? -0.003 * d : 0;

        const sentiment = clamp(baseSentiment + trendAdj + noise(), -1, 1);
        const concern = clamp(0.5 - sentiment * 0.5 + noise() * 0.3, 0, 1);
        const optimism = clamp(0.5 + sentiment * 0.5 + noise() * 0.2, 0, 1);
        const frustration = clamp(-Math.min(sentiment, 0) + noise() * 0.2, 0, 1);
        const salience = clamp(baseSalience + noise() * 0.1, 0, 1);

        const signalCount = Math.floor(10 + Math.random() * 40);

        await prisma.moodIndex.upsert({
          where: {
            region_date_bucket_topic: {
              region: regionId,
              date_bucket: dateBucket,
              topic: topic.id,
            },
          },
          update: {
            sentiment_index: Number(sentiment.toFixed(4)),
            concern_index: Number(concern.toFixed(4)),
            optimism_index: Number(optimism.toFixed(4)),
            frustration_index: Number(frustration.toFixed(4)),
            issue_salience: Number(salience.toFixed(4)),
            uncertainty_lower: Number(clamp(sentiment - 0.12, -1, 1).toFixed(4)),
            uncertainty_upper: Number(clamp(sentiment + 0.12, -1, 1).toFixed(4)),
            contributing_sources: ['synthetic', 'news_article'],
            signal_count: signalCount,
            anomaly_flag: false,
          },
          create: {
            region: regionId,
            date_bucket: dateBucket,
            topic: topic.id,
            country: COUNTRY,
            sentiment_index: Number(sentiment.toFixed(4)),
            concern_index: Number(concern.toFixed(4)),
            optimism_index: Number(optimism.toFixed(4)),
            frustration_index: Number(frustration.toFixed(4)),
            issue_salience: Number(salience.toFixed(4)),
            uncertainty_lower: Number(clamp(sentiment - 0.12, -1, 1).toFixed(4)),
            uncertainty_upper: Number(clamp(sentiment + 0.12, -1, 1).toFixed(4)),
            contributing_sources: ['synthetic', 'news_article'],
            signal_count: signalCount,
            anomaly_flag: false,
          },
        });

        created++;
      }
    }
  }

  // Also seed national aggregate for each day × topic
  for (let d = 0; d < DAYS; d++) {
    const dateBucket = new Date(today);
    dateBucket.setDate(dateBucket.getDate() - (DAYS - 1 - d));

    for (const topic of GHANA_TOPICS) {
      const regionalRecords = await prisma.moodIndex.findMany({
        where: { topic: topic.id, date_bucket: dateBucket, country: COUNTRY, region: { not: 'national' } },
      });

      if (regionalRecords.length === 0) continue;

      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

      await prisma.moodIndex.upsert({
        where: { region_date_bucket_topic: { region: 'national', date_bucket: dateBucket, topic: topic.id } },
        update: {
          sentiment_index: Number(avg(regionalRecords.map((r) => r.sentiment_index)).toFixed(4)),
          concern_index: Number(avg(regionalRecords.map((r) => r.concern_index)).toFixed(4)),
          optimism_index: Number(avg(regionalRecords.map((r) => r.optimism_index)).toFixed(4)),
          frustration_index: Number(avg(regionalRecords.map((r) => r.frustration_index)).toFixed(4)),
          issue_salience: Number(avg(regionalRecords.map((r) => r.issue_salience)).toFixed(4)),
          uncertainty_lower: Number(Math.min(...regionalRecords.map((r) => r.uncertainty_lower)).toFixed(4)),
          uncertainty_upper: Number(Math.max(...regionalRecords.map((r) => r.uncertainty_upper)).toFixed(4)),
          contributing_sources: ['synthetic', 'news_article'],
          signal_count: regionalRecords.reduce((a, r) => a + r.signal_count, 0),
          anomaly_flag: false,
        },
        create: {
          region: 'national',
          date_bucket: dateBucket,
          topic: topic.id,
          country: COUNTRY,
          sentiment_index: Number(avg(regionalRecords.map((r) => r.sentiment_index)).toFixed(4)),
          concern_index: Number(avg(regionalRecords.map((r) => r.concern_index)).toFixed(4)),
          optimism_index: Number(avg(regionalRecords.map((r) => r.optimism_index)).toFixed(4)),
          frustration_index: Number(avg(regionalRecords.map((r) => r.frustration_index)).toFixed(4)),
          issue_salience: Number(avg(regionalRecords.map((r) => r.issue_salience)).toFixed(4)),
          uncertainty_lower: Number(Math.min(...regionalRecords.map((r) => r.uncertainty_lower)).toFixed(4)),
          uncertainty_upper: Number(Math.max(...regionalRecords.map((r) => r.uncertainty_upper)).toFixed(4)),
          contributing_sources: ['synthetic', 'news_article'],
          signal_count: regionalRecords.reduce((a, r) => a + r.signal_count, 0),
          anomaly_flag: false,
        },
      });
      created++;
    }
  }

  // Seed one high-severity anomaly for today
  await prisma.anomalyAlert.create({
    data: {
      country: COUNTRY,
      region: 'greater-accra',
      topic: 'energy',
      alert_type: 'spike_concern',
      severity: 'high',
      description: "Concern index for 'energy' in greater-accra spiked 38% — possible dumsor spike.",
      signal_count_change: 145,
      baseline_value: 0.48,
      observed_value: 0.72,
    },
  });

  await prisma.anomalyAlert.create({
    data: {
      country: COUNTRY,
      region: 'ashanti',
      topic: 'economy',
      alert_type: 'spike_negativity',
      severity: 'medium',
      description: "Rapid sentiment shift for 'economy' in Ashanti: –42% over 24 hours.",
      signal_count_change: 88,
      baseline_value: -0.18,
      observed_value: -0.45,
    },
  });

  console.log(`✅ Seeded ${created} MoodIndex records + 2 anomaly alerts`);
  console.log(`   Regions: ${GHANA_REGION_IDS.length} + national`);
  console.log(`   Topics: ${GHANA_TOPICS.length}`);
  console.log(`   Days: ${DAYS}`);
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
