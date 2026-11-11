import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { prisma, type Prisma } from '@foyer/db';
import { conceptPrompt, ModelError, publicModelMessage, renderConcept, SpendCapExceeded } from '@foyer/ai';
import { BOARD_GENERATOR, buildBoard, type Board } from '@foyer/artifacts';
import { ownedProject, uploadDir, userId } from './projects';

const ANGLE_RANK = ['WIDE', 'CORNER', 'UNKNOWN', 'FLOOR', 'CEILING', 'DETAIL'];
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

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

  /** Photoreal concept for one recommendation, edited from the room's widest photo. */
  app.post<{ Params: { id: string } }>('/recommendations/:id/concept', async (req, reply) => {
    const uid = await userId();
    const rec = await prisma.recommendation.findFirst({
      where: { id: req.params.id, project: { userId: uid } },
      include: { room: { include: { photos: true } } },
    });
    if (!rec) return reply.code(404).send({ error: 'Not found' });
    // A picture of structural work reads as a claim about it. Those go to a licensed pro.
    if (rec.needsProReview) return reply.code(409).send({ error: 'Needs a licensed professional first' });
    const photo = (rec.room?.photos ?? [])
      .filter((p) => p.storageKey && p.mime && EXT[p.mime])
      .sort((a, b) => ANGLE_RANK.indexOf(a.angle) - ANGLE_RANK.indexOf(b.angle))[0];
    if (!photo) return reply.code(409).send({ error: 'Upload a room photo first' });

    const board = buildBoard(rec);
    const prompt = conceptPrompt({
      title: rec.title,
      rationale: rec.rationale,
      preserve: rec.preserve,
      specs: [...(board?.specs.map((x) => `${x.label} ${x.value}`) ?? []), ...(board?.swatches.filter((x) => x.role === 'new').map((x) => x.name) ?? [])],
    });
    const dir = uploadDir();
    try {
      const data = (await readFile(path.join(dir, path.basename(photo.storageKey!)))).toString('base64');
      const out = await renderConcept({ userId: uid, prompt, image: { mime: photo.mime!, data } });
      const key = `render-${randomUUID()}.${EXT[out.mime] ?? 'jpg'}`;
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, key), out.bytes);
      const row = await prisma.render.create({
        data: {
          recommendationId: rec.id,
          kind: 'CONCEPT',
          url: `foyer:upload/${key}`,
          isDirectional: true,
          provenance: {
            model: out.model,
            seed: out.seed,
            controlPhotoId: photo.id,
            promptHash: createHash('sha256').update(prompt).digest('hex').slice(0, 16),
            prompt,
            mime: out.mime,
          },
        },
      });
      return reply.code(201).send({ id: row.id, url: `/v1/renders/${row.id}/file` });
    } catch (e) {
      if (e instanceof SpendCapExceeded) return reply.code(429).send({ error: 'Spend cap reached' });
      if (e instanceof ModelError) {
        req.log.error({ err: e }, 'render failed');
        return reply.code(e.status === 503 ? 503 : 502).send({ error: publicModelMessage(e.status) });
      }
      throw e;
    }
  });

  app.get<{ Params: { id: string } }>('/renders/:id/file', async (req, reply) => {
    const r = await prisma.render.findFirst({
      where: { id: req.params.id, kind: 'CONCEPT', recommendation: { project: { userId: await userId() } } },
    });
    const key = r?.url.startsWith('foyer:upload/') ? r.url.slice('foyer:upload/'.length) : null;
    if (!r || !key) return reply.code(404).send({ error: 'Not found' });
    const mime = (r.provenance as { mime?: string } | null)?.mime ?? 'image/jpeg';
    reply.header('cache-control', 'private, max-age=86400').type(mime);
    return reply.send(createReadStream(path.join(uploadDir(), path.basename(key))));
  });
}
