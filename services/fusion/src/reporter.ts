/**
 * Weekly report generator.
 * Runs after fusion to produce a human-readable narrative summary.
 */

import { prisma } from '@pulseminer/database';
import { GHANA_TOPICS, GHANA_REGIONS } from '@pulseminer/shared';

function getISOWeekLabel(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export async function generateWeeklyReport(date: Date = new Date(), country = 'GH'): Promise<void> {
  const weekLabel = getISOWeekLabel(date);
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const moodRecords = await prisma.moodIndex.findMany({
    where: {
      country,
      date_bucket: { gte: weekStart },
    },
  });

  if (moodRecords.length === 0) {
    console.log('[report] No mood data for this week — skipping report generation.');
    return;
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  // National averages
  const national = moodRecords.filter((r) => r.region === 'national');
  const overall_sentiment = avg(national.map((r) => r.sentiment_index));
  const overall_concern = avg(national.map((r) => r.concern_index));
  const overall_optimism = avg(national.map((r) => r.optimism_index));

  // Top topics by salience
  const topicSalience: Record<string, number[]> = {};
  const topicSentiment: Record<string, number[]> = {};
  for (const r of moodRecords) {
    if (!topicSalience[r.topic]) topicSalience[r.topic] = [];
    if (!topicSentiment[r.topic]) topicSentiment[r.topic] = [];
    topicSalience[r.topic].push(r.issue_salience);
    topicSentiment[r.topic].push(r.sentiment_index);
  }

  const topTopics = GHANA_TOPICS.map((t) => ({
    topic_id: t.id,
    topic_label: t.label,
    salience: Number(avg(topicSalience[t.id] ?? []).toFixed(3)),
    sentiment: Number(avg(topicSentiment[t.id] ?? []).toFixed(3)),
    trend: 'stable' as const,
    trend_delta: 0,
  }))
    .sort((a, b) => b.salience - a.salience)
    .slice(0, 5);

  // Regional highlights
  const regionHighlights = GHANA_REGIONS.slice(0, 6).map((region) => {
    const regionMoods = moodRecords.filter((r) => r.region === region.id);
    const topTopic = [...new Set(regionMoods.map((r) => r.topic))]
      .map((t) => ({
        topic: t,
        salience: avg(regionMoods.filter((r) => r.topic === t).map((r) => r.issue_salience)),
      }))
      .sort((a, b) => b.salience - a.salience)[0]?.topic ?? 'economy';

    return {
      region_id: region.id,
      region_name: region.name,
      sentiment_index: Number(avg(regionMoods.map((r) => r.sentiment_index)).toFixed(3)),
      concern_index: Number(avg(regionMoods.map((r) => r.concern_index)).toFixed(3)),
      issue_salience: Number(avg(regionMoods.map((r) => r.issue_salience)).toFixed(3)),
      top_topic: topTopic,
      signal_count: regionMoods.reduce((a, r) => a + r.signal_count, 0),
      confidence: 0.72,
    };
  });

  // Anomaly alerts this week
  const anomalies = await prisma.anomalyAlert.findMany({
    where: { country, detected_at: { gte: weekStart } },
    orderBy: { detected_at: 'desc' },
    take: 5,
  });

  const report = {
    week_label: weekLabel,
    country,
    generated_at: new Date().toISOString(),
    national_mood: {
      country,
      as_of: date.toISOString(),
      overall_sentiment: Number(overall_sentiment.toFixed(3)),
      overall_concern: Number(overall_concern.toFixed(3)),
      overall_optimism: Number(overall_optimism.toFixed(3)),
      top_topics: topTopics,
      anomaly_flags: anomalies.map((a) => a.topic).filter(Boolean),
      confidence: 0.75,
      signal_count: moodRecords.reduce((a, r) => a + r.signal_count, 0),
      coverage_note:
        'Based on public signals aggregated across 16 Ghana regions. Does not represent the full population.',
    },
    top_emerging_topics: topTopics.slice(0, 3),
    regional_highlights: regionHighlights,
    notable_shifts: anomalies.map((a) => a.description),
    methodology_note:
      'PulseMiner estimates public mood by fusing synthetic signals, news signals, and micro-pulse widget responses. ' +
      'All scores are indicative and carry uncertainty. This is not a population survey.',
  };

  await prisma.weeklyReport.upsert({
    where: { week_label_country: { week_label: weekLabel, country } },
    update: { report_json: report },
    create: { week_label: weekLabel, country, report_json: report },
  });

  console.log(`[fusion] ✅ Weekly report generated for ${weekLabel}`);
}
