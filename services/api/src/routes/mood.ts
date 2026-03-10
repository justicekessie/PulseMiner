import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@pulseminer/database';
import { GHANA_REGIONS } from '@pulseminer/shared';

const MoodQuerySchema = z.object({
  region: z.string().optional(),
  topic: z.string().optional(),
  country: z.string().default('GH'),
  date: z.string().optional(), // ISO date string
});

export async function moodRoutes(app: FastifyInstance) {
  // GET /api/mood — national (or regional+topic specific) mood snapshot
  app.get(
    '/mood',
    {
      schema: {
        tags: ['mood'],
        summary: 'Retrieve the latest public mood index',
        querystring: {
          type: 'object',
          properties: {
            region: { type: 'string', description: 'Region slug, e.g. greater-accra' },
            topic: { type: 'string', description: 'Topic id, e.g. economy' },
            country: { type: 'string', default: 'GH' },
            date: { type: 'string', description: 'ISO date YYYY-MM-DD (defaults to today)' },
          },
        },
      },
    },
    async (req, reply) => {
      const query = MoodQuerySchema.parse(req.query);
      const dateBucket = query.date ? new Date(query.date) : new Date();
      dateBucket.setHours(0, 0, 0, 0);

      if (query.region && query.topic) {
        // Specific region + topic
        const mood = await prisma.moodIndex.findFirst({
          where: {
            country: query.country,
            region: query.region,
            topic: query.topic,
            date_bucket: { gte: dateBucket },
          },
          orderBy: { date_bucket: 'desc' },
        });
        if (!mood) return reply.code(404).send({ error: 'No mood data found for given filters.' });
        return reply.send(mood);
      }

      // National overview — aggregate across regions for the date
      const records = await prisma.moodIndex.findMany({
        where: {
          country: query.country,
          date_bucket: { gte: dateBucket },
          ...(query.region ? { region: query.region } : {}),
          ...(query.topic ? { topic: query.topic } : {}),
        },
        orderBy: { date_bucket: 'desc' },
        take: 200,
      });

      if (records.length === 0) {
        return reply.code(404).send({ error: 'No mood data found.' });
      }

      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

      const sentiment_index = avg(records.map((r) => r.sentiment_index));
      const concern_index = avg(records.map((r) => r.concern_index));
      const optimism_index = avg(records.map((r) => r.optimism_index));
      const total_signals = records.reduce((a, r) => a + r.signal_count, 0);
      const has_anomaly = records.some((r) => r.anomaly_flag);

      // Top topics by salience
      const topicMap: Record<string, { salience: number; sentiment: number; count: number }> = {};
      for (const r of records) {
        if (!topicMap[r.topic]) topicMap[r.topic] = { salience: 0, sentiment: 0, count: 0 };
        topicMap[r.topic].salience += r.issue_salience;
        topicMap[r.topic].sentiment += r.sentiment_index;
        topicMap[r.topic].count += 1;
      }
      const topTopics = Object.entries(topicMap)
        .map(([id, v]) => ({
          topic_id: id,
          salience: v.salience / v.count,
          sentiment: v.sentiment / v.count,
        }))
        .sort((a, b) => b.salience - a.salience)
        .slice(0, 5);

      return reply.send({
        country: query.country,
        as_of: dateBucket.toISOString(),
        overall_sentiment: Number(sentiment_index.toFixed(3)),
        overall_concern: Number(concern_index.toFixed(3)),
        overall_optimism: Number(optimism_index.toFixed(3)),
        top_topics: topTopics,
        anomaly_flags: has_anomaly ? records.filter((r) => r.anomaly_flag).map((r) => r.topic) : [],
        confidence: 0.78,
        signal_count: total_signals,
        coverage_note:
          'Based on public online signals and widget responses. Does not represent the full population.',
      });
    }
  );

  // GET /api/mood/timeseries — 30-day trend
  app.get(
    '/mood/timeseries',
    {
      schema: {
        tags: ['mood'],
        summary: 'Time series of mood indices (last 30 days)',
        querystring: {
          type: 'object',
          properties: {
            region: { type: 'string' },
            topic: { type: 'string' },
            country: { type: 'string', default: 'GH' },
            days: { type: 'number', default: 30 },
          },
        },
      },
    },
    async (req, reply) => {
      const { region, topic, country = 'GH', days = 30 } = req.query as Record<string, string>;
      const since = new Date();
      since.setDate(since.getDate() - Number(days));
      since.setHours(0, 0, 0, 0);

      const records = await prisma.moodIndex.findMany({
        where: {
          country,
          ...(region ? { region } : {}),
          ...(topic ? { topic } : {}),
          date_bucket: { gte: since },
        },
        orderBy: { date_bucket: 'asc' },
      });

      // Group by date_bucket
      const grouped: Record<
        string,
        { sentiment: number[]; concern: number[]; optimism: number[]; signals: number }
      > = {};
      for (const r of records) {
        const key = r.date_bucket.toISOString().slice(0, 10);
        if (!grouped[key]) grouped[key] = { sentiment: [], concern: [], optimism: [], signals: 0 };
        grouped[key].sentiment.push(r.sentiment_index);
        grouped[key].concern.push(r.concern_index);
        grouped[key].optimism.push(r.optimism_index);
        grouped[key].signals += r.signal_count;
      }

      const avg = (arr: number[]) =>
        arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

      const series = Object.entries(grouped).map(([date, v]) => ({
        date,
        sentiment_index: Number(avg(v.sentiment).toFixed(3)),
        concern_index: Number(avg(v.concern).toFixed(3)),
        optimism_index: Number(avg(v.optimism).toFixed(3)),
        signal_count: v.signals,
      }));

      return reply.send({ country, region: region ?? 'national', topic: topic ?? 'all', series });
    }
  );
}
