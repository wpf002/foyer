import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { prisma, type Prisma } from '@foyer/db';
import { BOARD_GENERATOR, buildBoard, type Board } from '@foyer/artifacts';
import { ownedProject } from './projects';

const hashOf = (b: Board) => createHash('sha256').update(JSON.stringify(b)).digest('hex').slice(0, 16);

export async function renderRoutes(app: FastifyInstance) {
  /** Draw a material board for every recommendation that names a finish or spec. */
  app.post<{ Params: { id: string } }>('/projects/:id/renders', async (req, reply) => {
    const p = await ownedProject(req.params.id);
    if (!p) return reply.code(404).send({ error: 'Not found' });
    const recs = p.rooms.flatMap((r) => r.recommendations);
    if (!recs.length) return reply.code(409).send({ error: 'Critique a room first' });

    const latest = await prisma.render.findMany({
      where: { recommendationId: { in: recs.map((r) => r.id) }, kind: 'MATERIAL_BOARD' },
      orderBy: { createdAt: 'desc' },
      distinct: ['recommendationId'],
      select: { recommendationId: true, provenance: true },
    });
    const prior = new Map(latest.map((r) => [r.recommendationId, (r.provenance as { hash?: string } | null)?.hash]));

    const rows: Prisma.RenderCreateManyInput[] = [];
    let empty = 0;
    for (const rec of recs) {
      const board = buildBoard(rec);
      if (!board) {
        empty++;
        continue;
      }
      const hash = hashOf(board);
      if (prior.get(rec.id) === hash) continue;
      rows.push({
        recommendationId: rec.id,
        kind: 'MATERIAL_BOARD',
        url: `foyer:board/${hash}`,
        provenance: { generator: BOARD_GENERATOR, hash, board } as unknown as Prisma.InputJsonValue,
        isDirectional: true,
      });
    }
    if (rows.length) await prisma.render.createMany({ data: rows });
    return { written: rows.length, unchanged: recs.length - rows.length - empty, empty };
  });
}
