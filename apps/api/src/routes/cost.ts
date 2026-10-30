import type { FastifyInstance } from 'fastify';
import { estimate, regionFactor } from '@foyer/cost';

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
}
