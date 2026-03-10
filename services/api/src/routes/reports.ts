import type { FastifyInstance } from 'fastify';
import { prisma } from '@pulseminer/database';

export async function reportsRoutes(app: FastifyInstance) {
  app.get(
    '/weekly',
    {
      schema: {
        tags: ['reports'],
        summary: 'Latest weekly narrative summary report',
        querystring: {
          type: 'object',
          properties: {
            country: { type: 'string', default: 'GH' },
            week: {
              type: 'string',
              description: 'ISO week label, e.g. 2026-W10. Defaults to current week.',
            },
          },
        },
      },
    },
    async (req, reply) => {
      const { country = 'GH', week } = req.query as Record<string, string>;

      const weekLabel = week ?? getISOWeekLabel(new Date());

      let report = await prisma.weeklyReport.findUnique({
        where: { week_label_country: { week_label: weekLabel, country } },
      });

      if (!report) {
        return reply.code(404).send({
          error: `No weekly report found for ${weekLabel}. Run the fusion service to generate it.`,
        });
      }

      return reply.send(report.report_json);
    }
  );
}

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
