import type { FastifyInstance } from 'fastify';
import { prisma } from '@pulseminer/database';

export async function statsRoutes(app: FastifyInstance) {
  // GET /api/stats/sources — breakdown of source types feeding the system
  app.get(
    '/stats/sources',
    {
      schema: {
        tags: ['stats'],
        summary: 'Source type breakdown for signals ingested today',
      },
    },
    async (_req, reply) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const counts = await prisma.sourceEvent.groupBy({
        by: ['source_type'],
        where: {
          timestamp: { gte: today },
        },
        _count: { id: true },
      });

      const total = counts.reduce((a, c) => a + c._count.id, 0);

      const sources = counts
        .map((c) => ({
          source_type: c.source_type,
          count: c._count.id,
          percentage: total > 0 ? Number(((c._count.id / total) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Also get all-time totals
      const allTimeCounts = await prisma.sourceEvent.groupBy({
        by: ['source_type'],
        _count: { id: true },
      });

      const allTimeTotal = allTimeCounts.reduce((a, c) => a + c._count.id, 0);

      const allTimeSources = allTimeCounts
        .map((c) => ({
          source_type: c.source_type,
          count: c._count.id,
          percentage: allTimeTotal > 0 ? Number(((c._count.id / allTimeTotal) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return reply.send({
        today: { total, sources },
        all_time: { total: allTimeTotal, sources: allTimeSources },
      });
    }
  );
}
