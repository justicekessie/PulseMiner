/**
 * PulseMiner — Signal Fusion Engine
 *
 * Implements:
 *   M(r, t, k) = f(P, T, W, V, N, C)
 *
 * Where:
 *   P = public post signal (processed social/news text)
 *   T = search trend signal (if available)
 *   W = micro-widget response signal
 *   V = voice submission signal
 *   N = news volume signal
 *   C = contextual/baseline signal
 *   r = region, t = time bucket, k = topic
 *
 * Outputs a MoodIndex record per (region × topic × day).
 */

import { prisma } from '@pulseminer/database';
import type { Prisma } from '@pulseminer/database';
import { GHANA_REGION_IDS, GHANA_TOPICS } from '@pulseminer/shared';

// ─── Source Weights ───────────────────────────────────────────────────────────
// Weights reflect data quality and breadth (0–1). Adjustable as pilot matures.
const SOURCE_WEIGHTS = {
  social_post: 0.35,
  news_article: 0.25,
  widget_response: 0.25,
  voice_submission: 0.10,
  search_trend: 0.05,
  public_comment: 0.15,
  synthetic: 0.20, // lower weight — clearly marked as synthetic
} as const;

// Minimum signals needed to generate a non-trivial MoodIndex
const MIN_SIGNALS = 3;

// Anomaly detection thresholds
const CONCERN_SPIKE_THRESHOLD = 0.25; // absolute jump in concern index
const SALIENCE_SPIKE_THRESHOLD = 0.3;

export async function runFusion(
  dateBucket: Date = new Date(),
  country = 'GH'
): Promise<number> {
  dateBucket.setHours(0, 0, 0, 0);

  const bucketStart = dateBucket;
  const bucketEnd = new Date(dateBucket);
  bucketEnd.setDate(bucketEnd.getDate() + 1);

  console.log(`[fusion] Running for ${dateBucket.toISOString().slice(0, 10)}, country=${country}`);

  let totalUpserted = 0;

  for (const regionId of GHANA_REGION_IDS) {
    for (const topic of GHANA_TOPICS) {
      const moodIndex = await computeMoodIndex(
        regionId,
        topic.id,
        country,
        bucketStart,
        bucketEnd
      );

      if (!moodIndex) continue;

      await prisma.moodIndex.upsert({
        where: {
          region_date_bucket_topic: {
            region: regionId,
            date_bucket: dateBucket,
            topic: topic.id,
          },
        },
        update: moodIndex,
        create: {
          ...moodIndex,
          region: regionId,
          date_bucket: dateBucket,
          topic: topic.id,
          country,
        },
      });

      // Detect anomalies
      await detectAndRecordAnomaly(regionId, topic.id, country, moodIndex, dateBucket);

      totalUpserted++;
    }

    // Compute topic trend snapshots for this region
    await computeTopicTrendSnapshots(regionId, country, dateBucket);
  }

  // Also compute national-level (region = 'national')
  for (const topic of GHANA_TOPICS) {
    const moodIndex = await computeNationalMoodIndex(topic.id, country, bucketStart, bucketEnd);
    if (!moodIndex) continue;

    await prisma.moodIndex.upsert({
      where: {
        region_date_bucket_topic: {
          region: 'national',
          date_bucket: dateBucket,
          topic: topic.id,
        },
      },
      update: moodIndex,
      create: {
        ...moodIndex,
        region: 'national',
        date_bucket: dateBucket,
        topic: topic.id,
        country,
      },
    });
    totalUpserted++;
  }

  console.log(`[fusion] Upserted ${totalUpserted} MoodIndex records`);
  return totalUpserted;
}

// ─── Per-region, per-topic mood index computation ─────────────────────────────

async function computeMoodIndex(
  region: string,
  topic: string,
  country: string,
  from: Date,
  to: Date
): Promise<Omit<Prisma.MoodIndexCreateInput, 'region' | 'date_bucket' | 'topic' | 'country'> | null> {
  // Fetch processed signals for region + topic in this time window
  const signals = await prisma.processedSignal.findMany({
    where: {
      source_event: {
        country,
        region,
        timestamp: { gte: from, lt: to },
        processed: true,
        source_type: { in: ['synthetic', 'social_post', 'news_article', 'public_comment'] },
      },
      topic_labels: { has: topic },
      spam_score: { lt: 0.5 },
    },
    include: { source_event: true },
    take: 500,
  });

  // Fetch widget responses for region in window
  const widgetResponses = await prisma.widgetResponse.findMany({
    where: {
      country,
      region,
      submitted_at: { gte: from, lt: to },
      ...(topic ? {} : {}), // no topic filter for widgets (they're general)
    },
    take: 200,
  });

  if (signals.length === 0 && widgetResponses.length === 0) return null;

  // ── Text Signal Fusion ──────────────────────────────────────────────────────
  let weightedSentiment = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    const sourceWeight =
      SOURCE_WEIGHTS[signal.source_event.source_type as keyof typeof SOURCE_WEIGHTS] ?? 0.15;
    const signalWeight = sourceWeight * signal.confidence_score * (1 - signal.spam_score);
    weightedSentiment += signal.sentiment_score * signalWeight;
    totalWeight += signalWeight;
  }

  const textSentiment = totalWeight > 0 ? weightedSentiment / totalWeight : 0;

  // ── Widget Fusion ───────────────────────────────────────────────────────────
  // Widget ratings 1–5 → mapped to –1 → +1
  let widgetSentiment = 0;
  if (widgetResponses.length >= 5) {
    const avg = widgetResponses.reduce((a, r) => a + r.mood_rating, 0) / widgetResponses.length;
    // 1→–1, 3→0, 5→+1 linear mapping
    widgetSentiment = (avg - 3) / 2;
  }

  // ── Final Fusion ────────────────────────────────────────────────────────────
  const textWeight = signals.length > 0 ? SOURCE_WEIGHTS.social_post : 0;
  const widgetWeight = widgetResponses.length >= 5 ? SOURCE_WEIGHTS.widget_response : 0;
  const combinedWeight = textWeight + widgetWeight;

  const finalSentiment =
    combinedWeight > 0
      ? (textSentiment * textWeight + widgetSentiment * widgetWeight) / combinedWeight
      : textSentiment;

  // ── Derived Indices ─────────────────────────────────────────────────────────
  const concern_index = Math.max(0, Math.min(1, 0.5 - finalSentiment * 0.5));
  const optimism_index = Math.max(0, Math.min(1, 0.5 + finalSentiment * 0.5));
  const frustration_index = _computeFrustration(signals);

  // Issue salience = normalised signal volume (logarithmic)
  const totalSignals = signals.length + widgetResponses.length;
  const issue_salience = Math.min(1, Math.log1p(totalSignals) / Math.log1p(50));

  // Uncertainty bounds (Wilson-like interval approximation)
  const n = Math.max(1, totalSignals);
  const margin = 1.96 * Math.sqrt((finalSentiment * (1 - Math.abs(finalSentiment))) / n);

  // Determine contributing sources
  const sourceTypes = [...new Set(signals.map((s) => s.source_event.source_type))] as
    (keyof typeof SOURCE_WEIGHTS)[];
  if (widgetResponses.length >= 5) sourceTypes.push('widget_response' as any);

  // Confidence
  const confidence = Math.min(0.95, 0.3 + (totalSignals / 50) * 0.65);

  return {
    sentiment_index: Number(clamp(finalSentiment, -1, 1).toFixed(4)),
    concern_index: Number(clamp(concern_index, 0, 1).toFixed(4)),
    optimism_index: Number(clamp(optimism_index, 0, 1).toFixed(4)),
    frustration_index: Number(clamp(frustration_index, 0, 1).toFixed(4)),
    issue_salience: Number(clamp(issue_salience, 0, 1).toFixed(4)),
    uncertainty_lower: Number(clamp(finalSentiment - margin, -1, 1).toFixed(4)),
    uncertainty_upper: Number(clamp(finalSentiment + margin, -1, 1).toFixed(4)),
    contributing_sources: sourceTypes,
    signal_count: totalSignals,
    anomaly_flag: false, // set later
  };
}

async function computeNationalMoodIndex(
  topic: string,
  country: string,
  from: Date,
  to: Date
): Promise<Omit<Prisma.MoodIndexCreateInput, 'region' | 'date_bucket' | 'topic' | 'country'> | null> {
  const existing = await prisma.moodIndex.findMany({
    where: {
      country,
      topic,
      date_bucket: from,
      region: { not: 'national' },
    },
  });

  if (existing.length === 0) return null;

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    sentiment_index: Number(avg(existing.map((r) => r.sentiment_index)).toFixed(4)),
    concern_index: Number(avg(existing.map((r) => r.concern_index)).toFixed(4)),
    optimism_index: Number(avg(existing.map((r) => r.optimism_index)).toFixed(4)),
    frustration_index: Number(avg(existing.map((r) => r.frustration_index)).toFixed(4)),
    issue_salience: Number(avg(existing.map((r) => r.issue_salience)).toFixed(4)),
    uncertainty_lower: Number(Math.min(...existing.map((r) => r.uncertainty_lower)).toFixed(4)),
    uncertainty_upper: Number(Math.max(...existing.map((r) => r.uncertainty_upper)).toFixed(4)),
    contributing_sources: [...new Set(existing.flatMap((r) => r.contributing_sources))] as any,
    signal_count: existing.reduce((a, r) => a + r.signal_count, 0),
    anomaly_flag: existing.some((r) => r.anomaly_flag),
  };
}

// ─── Anomaly Detection ────────────────────────────────────────────────────────

async function detectAndRecordAnomaly(
  region: string,
  topic: string,
  country: string,
  current: Omit<Prisma.MoodIndexCreateInput, 'region' | 'date_bucket' | 'topic' | 'country'>,
  today: Date
): Promise<void> {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const baseline = await prisma.moodIndex.findFirst({
    where: { region, topic, country, date_bucket: yesterday },
  });

  if (!baseline) return;

  const concernDelta = (current.concern_index as number) - baseline.concern_index;
  const salienceDelta = (current.issue_salience as number) - baseline.issue_salience;
  const sentimentDelta = (current.sentiment_index as number) - baseline.sentiment_index;

  let alertType: 'spike_concern' | 'spike_negativity' | 'sudden_salience' | 'rapid_shift' | null = null;
  let severity: 'low' | 'medium' | 'high' = 'low';
  let description = '';

  if (concernDelta > CONCERN_SPIKE_THRESHOLD) {
    alertType = 'spike_concern';
    severity = concernDelta > 0.5 ? 'high' : 'medium';
    description = `Concern index for '${topic}' in ${region} spiked by ${(concernDelta * 100).toFixed(1)}% (${baseline.concern_index.toFixed(2)} → ${(current.concern_index as number).toFixed(2)})`;
  } else if (Math.abs(sentimentDelta) > 0.4) {
    alertType = 'rapid_shift';
    severity = Math.abs(sentimentDelta) > 0.6 ? 'high' : 'medium';
    description = `Rapid sentiment shift for '${topic}' in ${region}: ${sentimentDelta > 0 ? '+' : ''}${(sentimentDelta * 100).toFixed(1)}%`;
  } else if (salienceDelta > SALIENCE_SPIKE_THRESHOLD) {
    alertType = 'sudden_salience';
    severity = 'medium';
    description = `Issue salience for '${topic}' in ${region} surged (salience: ${(current.issue_salience as number).toFixed(2)})`;
  }

  if (alertType) {
    await prisma.moodIndex.updateMany({
      where: { region, topic, country, date_bucket: today },
      data: { anomaly_flag: true },
    });

    await prisma.anomalyAlert.create({
      data: {
        region,
        country,
        topic,
        alert_type: alertType,
        severity,
        description,
        signal_count_change: (current.signal_count as number) - baseline.signal_count,
        baseline_value: baseline.concern_index,
        observed_value: current.concern_index as number,
      },
    });

    console.log(`[fusion] 🚨 Anomaly: ${description}`);
  }
}

// ─── Topic Trend Snapshots ────────────────────────────────────────────────────

async function computeTopicTrendSnapshots(
  region: string,
  country: string,
  dateBucket: Date
): Promise<void> {
  const yesterday = new Date(dateBucket);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayMoods = await prisma.moodIndex.findMany({
    where: { region, country, date_bucket: dateBucket },
  });
  const yesterdayMoods = await prisma.moodIndex.findMany({
    where: { region, country, date_bucket: yesterday },
  });

  const yesterdayMap = new Map(yesterdayMoods.map((m) => [m.topic, m]));

  for (const mood of todayMoods) {
    const yday = yesterdayMap.get(mood.topic);
    const delta = yday ? mood.issue_salience - yday.issue_salience : 0;
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (delta > 0.03) trend = 'rising';
    else if (delta < -0.03) trend = 'falling';

    await prisma.topicTrendSnapshot.upsert({
      where: {
        date_bucket_country_topic_region: {
          date_bucket: dateBucket,
          country,
          topic: mood.topic,
          region,
        },
      },
      update: {
        salience: mood.issue_salience,
        sentiment: mood.sentiment_index,
        trend,
        trend_delta: Number(delta.toFixed(4)),
        signal_count: mood.signal_count,
      },
      create: {
        date_bucket: dateBucket,
        country,
        region,
        topic: mood.topic,
        salience: mood.issue_salience,
        sentiment: mood.sentiment_index,
        trend,
        trend_delta: Number(delta.toFixed(4)),
        signal_count: mood.signal_count,
      },
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function _computeFrustration(signals: { sentiment_score: number; dominant_emotion: string }[]): number {
  if (signals.length === 0) return 0;
  const frustrationEmotions = new Set(['anger', 'disgust', 'fear']);
  const frustrationCount = signals.filter(
    (s) => s.sentiment_score < -0.1 || frustrationEmotions.has(s.dominant_emotion)
  ).length;
  return frustrationCount / signals.length;
}
