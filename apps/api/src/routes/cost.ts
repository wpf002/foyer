import type { FastifyInstance } from 'fastify';
import { prisma } from '@foyer/db';
import { costIndex, estimate, indexCsv, regionFactor } from '@foyer/cost';

/** Quotes and invoices older than this drop out of the index. */
const WINDOW_MS = 2 * 365 * 24 * 3600 * 1000;

/** Aggregates only. No zip5, no ids, no cell under the point floor. */
async function loadIndex(q: { zip3?: string; workType?: string }) {
  const zip3 = q.zip3 && /^\d{3}$/.test(q.zip3) ? q.zip3 : undefined;
  const rows = await prisma.costDataPoint.findMany({
    where: {
      ...(zip3 ? { zip: { startsWith: zip3 } } : {}),
      ...(q.workType ? { workType: q.workType } : {}),
      quantity: { gt: 0 },
      OR: [{ quotedCents: { not: null } }, { actualCents: { not: null } }],
      observedAt: { gte: new Date(Date.now() - WINDOW_MS) },
    },
    select: { zip: true, workType: true, quotedCents: true, actualCents: true, quantity: true, observedAt: true },
    take: 50_000,
  });
  return costIndex(rows);
}

export async function costRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { workType?: string; quantity?: string; zip?: string } }>(
    '/estimate',
    async (req, reply) => {
      const { workType, quantity, zip } = req.query;
      if (!workType || !zip) return reply.code(400).send({ error: 'workType and zip are required' });
      const qty = Number(quantity ?? 1);
      const range = await estimate(workType, Number.isFinite(qty) ? qty : 1, zip);
      if (!range) return reply.code(404).send({ error: 'unknown_work_type', workType });
      return { ...range, region: regionFactor(zip) };
    },
  );

  app.get<{ Querystring: { zip3?: string; workType?: string } }>('/index', async (req) => loadIndex(req.query));

  app.get<{ Querystring: { zip3?: string; workType?: string } }>('/index.csv', async (req, reply) => {
    const idx = await loadIndex(req.query);
    const name = `foyer-cost-index${req.query.zip3 ? `-${req.query.zip3}` : ''}.csv`;
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="${name}"`)
      .send(indexCsv(idx.cells));
  });
}
