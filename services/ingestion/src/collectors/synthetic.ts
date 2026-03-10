/**
 * Synthetic Ghana data collector.
 *
 * Generates realistic synthetic public signals for the Ghana pilot.
 * This is used when live data sources are unavailable or during seeding.
 *
 * The synthetic data is clearly tagged as `source_type: 'synthetic'` and
 * `consent_type: 'synthetic'` — it is NEVER presented as real public data.
 */

import { prisma } from '@pulseminer/database';
import { GHANA_REGION_IDS, GHANA_TOPICS, type GhanaRegionId } from '@pulseminer/shared';

// ─── Realistic Ghana-context text templates ───────────────────────────────────

const SYNTHETIC_TEMPLATES: { text: string; region_bias?: GhanaRegionId; topics: string[] }[] = [
  // Economy
  { text: 'The cost of everything has gone up again. Cedis cannot buy what it used to. We are struggling.', topics: ['economy'] },
  { text: 'Dollar rate is killing businesses in Ghana. Importers are suffering.', topics: ['economy'] },
  { text: 'Fuel price hike again this week. How are we supposed to manage?', topics: ['economy', 'energy'] },
  { text: "Ghana's economy is slowly recovering. I'm seeing more jobs advertised this month.", topics: ['economy', 'jobs'] },
  { text: 'Cost of living in Accra is unbearable. The market prices have tripled.', region_bias: 'greater-accra', topics: ['economy'] },
  // Energy
  { text: 'Dumsor is back. ECG has not explained why lights have been off for 12 hours.', topics: ['energy'] },
  { text: 'Generator fuel is expensive but we have no choice with these constant power cuts.', topics: ['energy', 'economy'] },
  { text: "ECG please fix the Kumasi grid. We can't run businesses like this.", region_bias: 'ashanti', topics: ['energy'] },
  { text: 'At least power has been stable this week in my area. Thank you ECG.', topics: ['energy'] },
  // Jobs
  { text: 'Just graduated from KNUST. No job in sight. The youth unemployment is too high.', region_bias: 'ashanti', topics: ['jobs', 'education'] },
  { text: 'Companies are not hiring. Even internship positions are scarce this year.', topics: ['jobs'] },
  { text: 'The government should do more for youth employment. Ghana has talent being wasted.', topics: ['jobs', 'governance'] },
  // Education
  { text: 'Free SHS has been transformative for many families. My children are in school now.', topics: ['education'] },
  { text: 'BECE results this year were disappointing. We need better classroom resources.', topics: ['education'] },
  { text: 'Teachers are underpaid. How do we expect quality education without investing in educators?', topics: ['education', 'governance'] },
  // Healthcare
  { text: 'NHIS card is not working at many hospitals. Patients are forced to pay cash.', topics: ['healthcare'] },
  { text: 'Malaria cases are rising in the Northern Region. We need more CHPs compounds.', region_bias: 'northern', topics: ['healthcare'] },
  { text: 'Grateful for the new district hospital opening in Tamale.', region_bias: 'northern', topics: ['healthcare', 'infrastructure'] },
  // Infrastructure
  { text: 'The roads in Accra are terrible after the rains. Potholes everywhere on the N1.', region_bias: 'greater-accra', topics: ['infrastructure'] },
  { text: 'Trotro fares have gone up again because of the bad roads. We are suffering.', topics: ['infrastructure', 'economy'] },
  { text: 'Finally the Kejetia interchange renovations seem to be progressing.', region_bias: 'ashanti', topics: ['infrastructure'] },
  // Agriculture
  { text: 'Cocoa prices are low this season. Farmers in the Western Region are frustrated.', region_bias: 'western', topics: ['agriculture', 'economy'] },
  { text: 'Galamsey is destroying our farmlands and water bodies. Government must act.', topics: ['agriculture', 'governance'] },
  { text: 'Good harvest this year in Brong Ahafo. Grateful for the rains.', region_bias: 'bono', topics: ['agriculture'] },
  // Governance
  { text: 'Parliament is debating the budget but nobody is addressing the real issues people face.', topics: ['governance'] },
  { text: 'Corruption at the local level is destroying service delivery. Enough is enough.', topics: ['governance'] },
  { text: 'Government accountability is improving slowly. At least there are audit reports now.', topics: ['governance'] },
  // Security
  { text: 'Armed robbery incidents in Accra are increasing. We need more police presence.', region_bias: 'greater-accra', topics: ['security'] },
  { text: 'Cybercrime targeting mobile money users is on the rise. Be careful online.', topics: ['security', 'digital'] },
  // Digital
  { text: 'Mobile money has transformed daily transactions in Ghana. Chale fintech is growing.', topics: ['digital'] },
  { text: 'The new e-levy changes are confusing. Government should explain clearly.', topics: ['digital', 'governance'] },
  { text: 'Ghana fintech ecosystem is one of the best in Africa. Proud of our startups.', topics: ['digital', 'economy'] },
];

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomBool(probability: number): boolean {
  return Math.random() < probability;
}

export async function runSyntheticCollector(eventsPerCycle = 30): Promise<number> {
  const now = new Date();
  let created = 0;

  for (let i = 0; i < eventsPerCycle; i++) {
    const template = randomItem(SYNTHETIC_TEMPLATES);

    // Assign to a region — biased towards template region if set, otherwise random
    const region: GhanaRegionId = randomBool(0.6) && template.region_bias
      ? template.region_bias
      : randomItem(GHANA_REGION_IDS);

    // Add slight variation to text
    const variation = randomBool(0.3) ? ` [Signal ${Math.floor(Math.random() * 9999)}]` : '';

    // Timestamp within the last 6 hours
    const jitterMs = randomFloat(0, 6 * 60 * 60 * 1000);
    const timestamp = new Date(now.getTime() - jitterMs);

    const event = await prisma.sourceEvent.create({
      data: {
        source_type: 'synthetic',
        source_name: 'pulseminer-synthetic-gh',
        text_content: template.text + variation,
        language: 'en',
        timestamp,
        region,
        country: 'GH',
        metadata: { topics_hint: template.topics, generated: true },
        consent_type: 'synthetic',
        privacy_level: 'public',
        processed: false,
      },
    });

    // Immediately process synthetically (skip external NLP call for synthetic)
    const sentimentScore = await _syntheticSentimentScore(template.text);
    await prisma.processedSignal.create({
      data: {
        source_event_id: event.id,
        sentiment_score: sentimentScore,
        sentiment_label: sentimentScore >= 0.05 ? 'positive' : sentimentScore <= -0.05 ? 'negative' : 'neutral',
        sentiment_conf: randomFloat(0.6, 0.9),
        dominant_emotion: sentimentScore < -0.3 ? 'anger' : sentimentScore < 0 ? 'sadness' : sentimentScore > 0.3 ? 'joy' : 'neutral',
        emotion_scores: {
          anger: Math.max(0, -sentimentScore * 0.4),
          fear: Math.max(0, -sentimentScore * 0.2),
          sadness: Math.max(0, -sentimentScore * 0.3),
          joy: Math.max(0, sentimentScore * 0.5),
          trust: Math.max(0, sentimentScore * 0.3),
          disgust: Math.max(0, -sentimentScore * 0.2),
          neutral: 0.2,
        },
        topic_labels: template.topics,
        urgency_score: randomFloat(0.05, 0.35),
        spam_score: 0.0,
        confidence_score: randomFloat(0.7, 0.95),
        detected_language: 'en',
      },
    });

    await prisma.sourceEvent.update({
      where: { id: event.id },
      data: { processed: true },
    });

    created++;
  }

  return created;
}

// Simple Ghana-aware heuristic sentiment scorer for synthetic data
async function _syntheticSentimentScore(text: string): Promise<number> {
  const negative = ['struggling', 'terrible', 'suffering', 'unbearable', 'frustrated',
    'corrupt', 'problem', 'bad', 'expensive', 'killing', 'destroying', 'failing',
    'no job', 'dumsor', 'potholes', 'not working', 'scam', 'robbery', 'disappointing'];
  const positive = ['grateful', 'transformative', 'growing', 'proud', 'progressing',
    'stable', 'good harvest', 'improving', 'opening', 'transformative', 'best in africa',
    'thank you'];

  const lower = text.toLowerCase();
  let score = 0;
  for (const w of negative) if (lower.includes(w)) score -= 0.2;
  for (const w of positive) if (lower.includes(w)) score += 0.2;

  // Add some noise
  score += (Math.random() - 0.5) * 0.15;
  return Math.max(-1, Math.min(1, score));
}
