import type { FastifyInstance } from 'fastify';
import { prisma } from '@pulseminer/database';

export async function healthRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Service liveness check',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              version: { type: 'string' },
              pilot: { type: 'string' },
              timestamp: { type: 'string' },
              db: { type: 'string' },
            },
          },
        },
      },
    },
    async (_req, reply) => {
      let dbStatus = 'ok';
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        dbStatus = 'unavailable';
      }

      return reply.send({
        status: 'ok',
        version: '0.1.0',
        pilot: process.env.PILOT_LABEL ?? 'Ghana',
        timestamp: new Date().toISOString(),
        db: dbStatus,
      });
    }
  );
}
