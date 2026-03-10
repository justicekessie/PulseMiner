import type { FastifyInstance } from 'fastify';
import { prisma } from '@pulseminer/database';

export async function anomalyRoutes(app: FastifyInstance) {
  app.get(
    '/anomalies',
    {
      schema: {
        tags: ['anomalies'],
        summary: 'Recent anomaly alerts',
        querystring: {
          type: 'object',
          properties: {
            country: { type: 'string', default: 'GH' },
            region: { type: 'string' },
            resolved: { type: 'boolean', default: false },
          },
        },
      },
    },
    async (req, reply) => {
      const { country = 'GH', region, resolved } = req.query as Record<string, string>;

      const since = new Date();
      since.setDate(since.getDate() - 30);

      const alerts = await prisma.anomalyAlert.findMany({
        where: {
          country,
          detected_at: { gte: since },
          resolved: resolved === 'true' ? true : false,
          ...(region ? { region } : {}),
        },
        orderBy: { detected_at: 'desc' },
        take: 50,
      });

      return reply.send({ count: alerts.length, alerts });
    }
  );
}
