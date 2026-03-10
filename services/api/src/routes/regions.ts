import type { FastifyInstance } from 'fastify';
import { prisma } from '@pulseminer/database';
import { GHANA_REGIONS } from '@pulseminer/shared';

export async function regionsRoutes(app: FastifyInstance) {
  // GET /api/regions — list all supported regions with latest mood
  app.get(
    '/regions',
    {
      schema: {
        tags: ['regions'],
        summary: 'All Ghana regions with their latest sentiment summary',
        querystring: {
          type: 'object',
          properties: {
            country: { type: 'string', default: 'GH' },
          },
        },
      },
    },
    async (req, reply) => {
      const { country = 'GH' } = req.query as Record<string, string>;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Latest mood index per region
      const latestMoods = await prisma.moodIndex.findMany({
        where: { country, date_bucket: { gte: today } },
        orderBy: { date_bucket: 'desc' },
      });

      const moodByRegion: Record<
        string,
        { sentiment: number[]; concern: number[]; salience: number[]; signals: number; topic: string }
      > = {};

      for (const m of latestMoods) {
        if (!moodByRegion[m.region]) {
          moodByRegion[m.region] = {
            sentiment: [],
            concern: [],
            salience: [],
            signals: 0,
            topic: m.topic,
          };
        }
        moodByRegion[m.region].sentiment.push(m.sentiment_index);
        moodByRegion[m.region].concern.push(m.concern_index);
        moodByRegion[m.region].salience.push(m.issue_salience);
        moodByRegion[m.region].signals += m.signal_count;
        if (m.issue_salience > (moodByRegion[m.region].salience.at(-2) ?? 0)) {
          moodByRegion[m.region].topic = m.topic;
        }
      }

      const avg = (arr: number[]) =>
        arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

      const regions = GHANA_REGIONS.map((r) => {
        const data = moodByRegion[r.id];
        return {
          region_id: r.id,
          region_name: r.name,
          capital: r.capital,
          zone: r.zone,
          population_est: r.population_est,
          sentiment_index: data ? Number((avg(data.sentiment) ?? 0).toFixed(3)) : null,
          concern_index: data ? Number((avg(data.concern) ?? 0).toFixed(3)) : null,
          issue_salience: data ? Number((avg(data.salience) ?? 0).toFixed(3)) : null,
          top_topic: data?.topic ?? null,
          signal_count: data?.signals ?? 0,
          has_data: !!data,
        };
      });

      return reply.send({ country, as_of: today.toISOString(), regions });
    }
  );

  // GET /api/regions/:regionId — single region detail
  app.get(
    '/regions/:regionId',
    {
      schema: {
        tags: ['regions'],
        summary: 'Detailed mood breakdown for a single region',
        params: {
          type: 'object',
          properties: { regionId: { type: 'string' } },
          required: ['regionId'],
        },
      },
    },
    async (req, reply) => {
      const { regionId } = req.params as { regionId: string };
      const regionMeta = GHANA_REGIONS.find((r) => r.id === regionId);

      if (!regionMeta) {
        return reply.code(404).send({ error: `Unknown region: ${regionId}` });
      }

      const since = new Date();
      since.setDate(since.getDate() - 7);
      since.setHours(0, 0, 0, 0);

      const records = await prisma.moodIndex.findMany({
        where: { region: regionId, date_bucket: { gte: since } },
        orderBy: { date_bucket: 'desc' },
      });

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
          salience: Number((v.salience / v.count).toFixed(3)),
          sentiment: Number((v.sentiment / v.count).toFixed(3)),
        }))
        .sort((a, b) => b.salience - a.salience)
        .slice(0, 5);

      const avg = (arr: number[]) =>
        arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

      return reply.send({
        region_id: regionMeta.id,
        region_name: regionMeta.name,
        capital: regionMeta.capital,
        zone: regionMeta.zone,
        sentiment_index: Number(avg(records.map((r) => r.sentiment_index)).toFixed(3)),
        concern_index: Number(avg(records.map((r) => r.concern_index)).toFixed(3)),
        optimism_index: Number(avg(records.map((r) => r.optimism_index)).toFixed(3)),
        top_topics: topTopics,
        signal_count: records.reduce((a, r) => a + r.signal_count, 0),
        anomaly_flag: records.some((r) => r.anomaly_flag),
        since: since.toISOString(),
      });
    }
  );
}
