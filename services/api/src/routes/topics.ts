import type { FastifyInstance } from 'fastify';
import { prisma } from '@pulseminer/database';
import { GHANA_TOPICS } from '@pulseminer/shared';

export async function topicsRoutes(app: FastifyInstance) {
  // GET /api/topics — all topics with current salience
  app.get(
    '/topics',
    {
      schema: {
        tags: ['topics'],
        summary: 'All tracked topics with current issue salience',
        querystring: {
          type: 'object',
          properties: {
            country: { type: 'string', default: 'GH' },
            region: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const { country = 'GH', region } = req.query as Record<string, string>;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const [todayRecords, yesterdayRecords] = await Promise.all([
        prisma.moodIndex.findMany({
          where: { country, date_bucket: { gte: today }, ...(region ? { region } : {}) },
        }),
        prisma.moodIndex.findMany({
          where: { country, date_bucket: { gte: yesterday, lt: today }, ...(region ? { region } : {}) },
        }),
      ]);

      const aggregate = (records: typeof todayRecords) => {
        const map: Record<string, { salience: number[]; sentiment: number[]; signals: number }> = {};
        for (const r of records) {
          if (!map[r.topic]) map[r.topic] = { salience: [], sentiment: [], signals: 0 };
          map[r.topic].salience.push(r.issue_salience);
          map[r.topic].sentiment.push(r.sentiment_index);
          map[r.topic].signals += r.signal_count;
        }
        return map;
      };

      const todayMap = aggregate(todayRecords);
      const yesterdayMap = aggregate(yesterdayRecords);

      const avg = (arr: number[]) =>
        arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

      const topics = GHANA_TOPICS.map((t) => {
        const td = todayMap[t.id];
        const yd = yesterdayMap[t.id];

        const todaySalience = td ? avg(td.salience) : 0;
        const yesterdaySalience = yd ? avg(yd.salience) : 0;
        const delta = todaySalience - yesterdaySalience;

        let trend: 'rising' | 'falling' | 'stable' = 'stable';
        if (delta > 0.03) trend = 'rising';
        else if (delta < -0.03) trend = 'falling';

        return {
          topic_id: t.id,
          topic_label: t.label,
          icon: t.icon,
          salience: Number(todaySalience.toFixed(3)),
          sentiment: Number((td ? avg(td.sentiment) : 0).toFixed(3)),
          trend,
          trend_delta: Number(delta.toFixed(3)),
          signal_count: td?.signals ?? 0,
        };
      });

      return reply.send({
        country,
        region: region ?? 'national',
        as_of: today.toISOString(),
        topics: topics.sort((a, b) => b.salience - a.salience),
      });
    }
  );

  // GET /api/topics/:topicId/timeseries
  app.get(
    '/topics/:topicId/timeseries',
    {
      schema: {
        tags: ['topics'],
        summary: 'Salience + sentiment time series for a specific topic',
        params: {
          type: 'object',
          properties: { topicId: { type: 'string' } },
          required: ['topicId'],
        },
        querystring: {
          type: 'object',
          properties: {
            country: { type: 'string', default: 'GH' },
            region: { type: 'string' },
            days: { type: 'number', default: 14 },
          },
        },
      },
    },
    async (req, reply) => {
      const { topicId } = req.params as { topicId: string };
      const { country = 'GH', region, days = 14 } = req.query as Record<string, string>;

      const topicMeta = GHANA_TOPICS.find((t) => t.id === topicId);
      if (!topicMeta) return reply.code(404).send({ error: `Unknown topic: ${topicId}` });

      const since = new Date();
      since.setDate(since.getDate() - Number(days));
      since.setHours(0, 0, 0, 0);

      const records = await prisma.moodIndex.findMany({
        where: {
          country,
          topic: topicId,
          date_bucket: { gte: since },
          ...(region ? { region } : {}),
        },
        orderBy: { date_bucket: 'asc' },
      });

      const grouped: Record<string, { sentiment: number[]; salience: number[]; signals: number }> = {};
      for (const r of records) {
        const key = r.date_bucket.toISOString().slice(0, 10);
        if (!grouped[key]) grouped[key] = { sentiment: [], salience: [], signals: 0 };
        grouped[key].sentiment.push(r.sentiment_index);
        grouped[key].salience.push(r.issue_salience);
        grouped[key].signals += r.signal_count;
      }

      const avg = (arr: number[]) =>
        arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

      const series = Object.entries(grouped).map(([date, v]) => ({
        date,
        salience: Number(avg(v.salience).toFixed(3)),
        sentiment: Number(avg(v.sentiment).toFixed(3)),
        signal_count: v.signals,
      }));

      return reply.send({
        topic_id: topicId,
        topic_label: topicMeta.label,
        country,
        region: region ?? 'national',
        series,
      });
    }
  );
}
