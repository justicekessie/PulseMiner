import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

import { healthRoutes } from './routes/health.js';
import { moodRoutes } from './routes/mood.js';
import { regionsRoutes } from './routes/regions.js';
import { topicsRoutes } from './routes/topics.js';
import { widgetRoutes } from './routes/widget.js';
import { reportsRoutes } from './routes/reports.js';
import { anomalyRoutes } from './routes/anomalies.js';

const PORT = Number(process.env.API_PORT ?? 3001);

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

await app.register(cors, { origin: process.env.NEXT_PUBLIC_APP_URL ?? '*' });

await app.register(rateLimit, {
  max: 200,
  timeWindow: '1 minute',
  allowList: ['127.0.0.1'],
});

await app.register(swagger, {
  openapi: {
    info: {
      title: 'PulseMiner API',
      description: 'Ethical public sentiment intelligence — Ghana pilot',
      version: '0.1.0',
    },
    tags: [
      { name: 'health', description: 'Service health' },
      { name: 'mood', description: 'Public mood indices' },
      { name: 'regions', description: 'Regional sentiment snapshots' },
      { name: 'topics', description: 'Issue/topic analytics' },
      { name: 'widget', description: 'Micro-pulse widget endpoints' },
      { name: 'reports', description: 'Weekly narrative reports' },
      { name: 'anomalies', description: 'Anomaly detection alerts' },
    ],
  },
});

await app.register(swaggerUI, { routePrefix: '/docs' });

// ─── Routes ───────────────────────────────────────────────────────────────────
await app.register(healthRoutes, { prefix: '/api' });
await app.register(moodRoutes, { prefix: '/api' });
await app.register(regionsRoutes, { prefix: '/api' });
await app.register(topicsRoutes, { prefix: '/api' });
await app.register(widgetRoutes, { prefix: '/api/widget' });
await app.register(reportsRoutes, { prefix: '/api/reports' });
await app.register(anomalyRoutes, { prefix: '/api' });

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`PulseMiner API live on http://0.0.0.0:${PORT}`);
  console.log(`Swagger docs: http://0.0.0.0:${PORT}/docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
