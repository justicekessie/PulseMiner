import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@pulseminer/database';
const WidgetResponseSchema = z.object({
  session_id: z.string().min(8).max(64),
  region: z.string().optional(),
  mood_rating: z.number().int().min(1).max(5),
  top_issue: z.string().max(100).optional(),
  open_text: z.string().max(500).optional(),
  anonymous_age_band: z.enum(['15-24', '25-34', '35-49', '50+']).optional(),
  country: z.string().default('GH'),
});

export async function widgetRoutes(app: FastifyInstance) {
  // POST /api/widget/respond — submit a micro-pulse response
  app.post(
    '/respond',
    {
      schema: {
        tags: ['widget'],
        summary: 'Submit a micro-pulse widget response',
        body: {
          type: 'object',
          required: ['session_id', 'mood_rating'],
          properties: {
            session_id: { type: 'string' },
            region: { type: 'string' },
            mood_rating: { type: 'number', minimum: 1, maximum: 5 },
            top_issue: { type: 'string' },
            open_text: { type: 'string', maxLength: 500 },
            anonymous_age_band: {
              type: 'string',
              enum: ['15-24', '25-34', '35-49', '50+'],
            },
            country: { type: 'string', default: 'GH' },
          },
        },
      },
    },
    async (req, reply) => {
      const body = WidgetResponseSchema.parse(req.body);

      // Store only anonymised, rate-limited data
      await prisma.widgetResponse.create({
        data: {
          session_id: body.session_id,
          region: body.region,
          country: body.country,
          mood_rating: body.mood_rating,
          top_issue: body.top_issue,
          // Strip open text to at most 300 chars before storing; no PII expected but limit exposure
          open_text: body.open_text ? body.open_text.slice(0, 300) : undefined,
          age_band: body.anonymous_age_band,
        },
      });

      return reply.code(201).send({
        received: true,
        message: 'Thank you — your anonymous response has been recorded.',
        disclaimer:
          'Your response is stored anonymously and used only in aggregated form to estimate public mood.',
      });
    }
  );

  // GET /api/widget/summary — aggregate widget stats for a region
  app.get(
    '/summary',
    {
      schema: {
        tags: ['widget'],
        summary: 'Aggregate widget mood ratings',
        querystring: {
          type: 'object',
          properties: {
            region: { type: 'string' },
            country: { type: 'string', default: 'GH' },
          },
        },
      },
    },
    async (req, reply) => {
      const { region, country = 'GH' } = req.query as Record<string, string>;

      const since = new Date();
      since.setDate(since.getDate() - 7);

      const responses = await prisma.widgetResponse.findMany({
        where: {
          country,
          submitted_at: { gte: since },
          ...(region ? { region } : {}),
        },
      });

      if (responses.length < 5) {
        return reply.send({
          note: 'Not enough responses yet to display aggregated data (minimum 5).',
          count: responses.length,
        });
      }

      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
      const ratings = responses.map((r) => r.mood_rating);
      const issueCount: Record<string, number> = {};
      for (const r of responses) {
        if (r.top_issue) issueCount[r.top_issue] = (issueCount[r.top_issue] ?? 0) + 1;
      }
      const topIssues = Object.entries(issueCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([issue, count]) => ({ issue, count }));

      return reply.send({
        response_count: responses.length,
        average_mood: Number(avg(ratings).toFixed(2)),
        distribution: [1, 2, 3, 4, 5].map((v) => ({
          rating: v,
          count: ratings.filter((r) => r === v).length,
        })),
        top_issues: topIssues,
        since: since.toISOString(),
      });
    }
  );
}
