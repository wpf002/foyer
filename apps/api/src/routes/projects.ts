import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { FastifyInstance, FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import { prisma, Prisma, type RoomType } from '@foyer/db';
import { isStoredMime, photoKind, storablePhoto, type ImageMime } from '@foyer/ai';
import {
  analyzePhotos,
  buildRoadmap,
  critiqueRoom,
  mergeRead,
  parseIntake,
  question,
  QUESTIONS,
  type BriefEntry,
  type ParsedAnswer,
  type RoomInput,
} from '@foyer/rubric';
import { boardOf } from '@foyer/artifacts';
import { readScan, regionFactor } from '@foyer/cost';
import { priceProject } from '../pricing';

const ROOM_TYPES: RoomType[] = ['KITCHEN', 'BATHROOM', 'LIVING', 'DINING', 'BEDROOM', 'ENTRY', 'OFFICE', 'BASEMENT', 'OUTDOOR', 'OTHER'];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export const uploadDir = () => path.resolve(process.env.FOYER_UPLOAD_DIR ?? path.join(process.cwd(), '../../.uploads'));

/** Phase 1 has one local user and no auth. */
const DEV_EMAIL = 'dev@foyer.local';
let devUserId: string | undefined;
export async function userId(): Promise<string> {
  devUserId ??= (
    await prisma.user.upsert({ where: { email: DEV_EMAIL }, update: {}, create: { email: DEV_EMAIL, name: 'Dev' } })
  ).id;
  return devUserId;
}

const bad = (reply: FastifyReply, error: string, status = 400) => reply.code(status).send({ error });
export const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && !!s.trim()).map((s) => s.trim()) : [];
const inches = (v: unknown): number | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n < 2400 ? n : undefined;
};

function toRoomInput(r: {
  name: string;
  type: RoomType;
  widthIn: number | null;
  lengthIn: number | null;
  ceilingIn: number | null;
  fixedElements: Prisma.JsonValue;
  movableElements: Prisma.JsonValue;
  description: string | null;
}): RoomInput {
  return {
    name: r.name,
    type: r.type.toLowerCase(),
    widthIn: r.widthIn ?? undefined,
    lengthIn: r.lengthIn ?? undefined,
    ceilingIn: r.ceilingIn ?? undefined,
    fixed: strList(r.fixedElements),
    movable: strList(r.movableElements),
    description: r.description ?? '',
  };
}

const projectInclude = {
  brief: { include: { answers: { orderBy: { questionId: 'asc' } } } },
  rooms: {
    orderBy: { createdAt: 'asc' },
    include: {
      photos: { orderBy: { createdAt: 'asc' } },
      recommendations: {
        orderBy: { priority: 'asc' },
        include: {
          briefAnswer: { select: { questionId: true } },
          renders: {
            where: { kind: { in: ['MATERIAL_BOARD', 'CONCEPT'] } },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: { id: true, kind: true, provenance: true, createdAt: true },
          },
        },
      },
    },
  },
  roadmapItems: {
    orderBy: [{ phase: 'asc' }, { order: 'asc' }],
    include: {
      dependsOn: { select: { prerequisiteId: true, reason: true } },
      recommendation: {
        select: {
          costEstimate: {
            select: { midCents: true, source: true, regionFactor: true, workType: true, quantity: true, basis: true, localPoints: true, actualCents: true },
          },
        },
      },
    },
  },
} satisfies Prisma.ProjectInclude;

function conceptOf(r: { id: string; createdAt: Date } | undefined) {
  return r ? { id: r.id, url: `/v1/renders/${r.id}/file`, createdAt: r.createdAt } : null;
}

export async function ownedProject(id: string) {
  return prisma.project.findFirst({ where: { id, userId: await userId() }, include: projectInclude });
}

async function ownedRoom(id: string) {
  return prisma.room.findFirst({
    where: { id, project: { userId: await userId() } },
    include: { photos: { orderBy: { createdAt: 'asc' } }, project: { include: { brief: { include: { answers: true } } } } },
  });
}

function serializeProject(p: NonNullable<Awaited<ReturnType<typeof ownedProject>>>) {
  return {
    ...p,
    region: regionFactor(p.zip),
    roadmapItems: p.roadmapItems.map(({ recommendation, ...it }) => ({ ...it, cost: recommendation?.costEstimate ?? null })),
    rooms: p.rooms.map((r) => ({
      ...r,
      photos: r.photos.map(({ storageKey: _k, ...ph }) => ({ ...ph, url: `/v1/photos/${ph.id}/file` })),
      recommendations: r.recommendations.map(({ briefAnswer, renders, ...rec }) => ({
        ...rec,
        citation: briefAnswer.questionId,
        board: boardOf(renders.find((x) => x.kind === 'MATERIAL_BOARD')?.provenance ?? null),
        concept: conceptOf(renders.find((x) => x.kind === 'CONCEPT')),
      })),
    })),
  };
}

export async function projectRoutes(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: MAX_PHOTO_BYTES, files: 6 } });

  app.get('/questions', async () =>
    QUESTIONS.map((q) => ({ id: q.id, section: q.section, prompt: q.prompt, choices: q.choices ? Object.keys(q.choices) : null })),
  );

  app.get('/projects', async () => {
    const rows = await prisma.project.findMany({
      where: { userId: await userId() },
      orderBy: { updatedAt: 'desc' },
      include: { brief: { select: { completedAt: true } }, _count: { select: { rooms: true, roadmapItems: true, artifacts: true } } },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      zip: p.zip,
      clientName: p.clientName,
      status: p.status,
      updatedAt: p.updatedAt,
      briefComplete: !!p.brief?.completedAt,
      rooms: p._count.rooms,
      roadmapItems: p._count.roadmapItems,
      artifacts: p._count.artifacts,
    }));
  });

  app.post<{ Body: { name?: string; zip?: string; clientName?: string } }>('/projects', async (req, reply) => {
    const name = req.body?.name?.trim();
    const zip = req.body?.zip?.trim();
    const clientName = typeof req.body?.clientName === 'string' ? req.body.clientName.trim().slice(0, 120) || null : null;
    if (!name) return bad(reply, 'name is required');
    if (!zip || !/^\d{5}$/.test(zip)) return bad(reply, 'zip must be 5 digits');
    const p = await prisma.project.create({ data: { name, zip, clientName, userId: await userId(), brief: { create: {} } } });
    return reply.code(201).send({ id: p.id });
  });

  app.get<{ Params: { id: string } }>('/projects/:id', async (req, reply) => {
    const p = await ownedProject(req.params.id);
    if (!p) return bad(reply, 'not_found', 404);
    return serializeProject(p);
  });

  /** Saves raw answers. Parsing happens on complete, so a draft costs nothing. */
  app.put<{ Params: { id: string }; Body: { answers?: { questionId: string; raw: string }[] } }>(
    '/projects/:id/brief',
    async (req, reply) => {
      const p = await ownedProject(req.params.id);
      if (!p?.brief) return bad(reply, 'not_found', 404);
      const answers = req.body?.answers;
      if (!Array.isArray(answers)) return bad(reply, 'answers must be an array');
      for (const a of answers) {
        try {
          question(a.questionId);
        } catch {
          return bad(reply, `unknown question ${String(a.questionId)}`);
        }
        if (typeof a.raw !== 'string' || a.raw.length > 4000) return bad(reply, `${a.questionId}: raw must be text under 4000 chars`);
      }
      const briefId = p.brief.id;
      await prisma.$transaction(
        answers.map((a) => {
          const q = question(a.questionId);
          const raw = a.raw.trim();
          return raw
            ? prisma.briefAnswer.upsert({
                where: { briefId_questionId: { briefId, questionId: q.id } },
                // A changed answer drops its stale parse.
                update: { raw, parsed: Prisma.DbNull },
                create: { briefId, questionId: q.id, section: q.section, prompt: q.prompt, raw },
              })
            : prisma.briefAnswer.deleteMany({ where: { briefId, questionId: q.id, recommendations: { none: {} } } });
        }),
      );
      await prisma.brief.update({ where: { id: briefId }, data: { completedAt: null } });
      return { saved: answers.length };
    },
  );

  app.post<{ Params: { id: string } }>('/projects/:id/brief/complete', async (req, reply) => {
    const p = await ownedProject(req.params.id);
    if (!p?.brief) return bad(reply, 'not_found', 404);
    const answers = p.brief.answers;
    if (answers.length < 8) return bad(reply, 'Answer at least 8 questions first');
    const entries = await parseIntake(
      answers.map((a) => ({ questionId: a.questionId, raw: a.raw })),
      await userId(),
    );
    const budget = entries.map((e) => e.parsed).find((x) => x.budgetLowUsd || x.budgetHighUsd);
    await prisma.$transaction([
      ...entries.map((e) =>
        prisma.briefAnswer.update({
          where: { briefId_questionId: { briefId: p.brief!.id, questionId: e.questionId } },
          data: { parsed: e.parsed as unknown as Prisma.InputJsonValue },
        }),
      ),
      prisma.brief.update({ where: { id: p.brief.id }, data: { completedAt: new Date() } }),
      prisma.project.update({
        where: { id: p.id },
        data: {
          status: 'BRIEF_READY',
          budgetLowCents: budget?.budgetLowUsd ? Math.round(budget.budgetLowUsd * 100) : null,
          budgetHighCents: budget?.budgetHighUsd ? Math.round(budget.budgetHighUsd * 100) : null,
        },
      }),
    ]);
    return { parsed: entries.length };
  });

  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>('/projects/:id/rooms', async (req, reply) => {
    const p = await ownedProject(req.params.id);
    if (!p) return bad(reply, 'not_found', 404);
    const b = req.body ?? {};
    const name = typeof b.name === 'string' ? b.name.trim() : '';
    const type = typeof b.type === 'string' ? (b.type.toUpperCase() as RoomType) : undefined;
    if (!name) return bad(reply, 'name is required');
    if (!type || !ROOM_TYPES.includes(type)) return bad(reply, `type must be one of ${ROOM_TYPES.join(', ')}`);
    const r = await prisma.room.create({
      data: {
        projectId: p.id,
        name,
        type,
        widthIn: inches(b.widthIn) ?? null,
        lengthIn: inches(b.lengthIn) ?? null,
        ceilingIn: inches(b.ceilingIn) ?? null,
        fixedElements: strList(b.fixed),
        movableElements: strList(b.movable),
        description: typeof b.description === 'string' ? b.description.trim() || null : null,
      },
    });
    return reply.code(201).send({ id: r.id });
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>('/rooms/:id', async (req, reply) => {
    const r = await ownedRoom(req.params.id);
    if (!r) return bad(reply, 'not_found', 404);
    const b = req.body ?? {};
    const data: Prisma.RoomUpdateInput = {};
    if (typeof b.name === 'string' && b.name.trim()) data.name = b.name.trim();
    for (const k of ['widthIn', 'lengthIn', 'ceilingIn'] as const) {
      const v = inches(b[k]);
      if (v !== undefined) data[k] = v;
    }
    // Typed dimensions replace the scan.
    if (['widthIn', 'lengthIn', 'ceilingIn'].some((k) => k in data)) {
      data.dimsFromScan = false;
      data.scan = Prisma.DbNull;
    }
    if ('fixed' in b) data.fixedElements = strList(b.fixed);
    if ('movable' in b) data.movableElements = strList(b.movable);
    if (typeof b.description === 'string') data.description = b.description.trim() || null;
    await prisma.room.update({ where: { id: r.id }, data });
    return { ok: true };
  });

  // RoomPlan CapturedRoom JSON. Exports run a few hundred KB.
  app.post<{ Params: { id: string }; Body: unknown }>('/rooms/:id/scan', { bodyLimit: 8 * 1024 * 1024 }, async (req, reply) => {
    const r = await ownedRoom(req.params.id);
    if (!r) return bad(reply, 'not_found', 404);
    const scan = readScan(req.body);
    if (!scan) return bad(reply, 'No walls in this scan. Export a RoomPlan CapturedRoom JSON.', 422);
    await prisma.room.update({
      where: { id: r.id },
      data: {
        widthIn: scan.widthIn,
        lengthIn: scan.lengthIn,
        ceilingIn: scan.ceilingIn,
        dimsFromScan: true,
        scan: scan as unknown as Prisma.InputJsonValue,
      },
    });
    const repriced = (await prisma.roadmapItem.count({ where: { projectId: r.projectId } })) > 0;
    if (repriced) await priceProject(r.projectId);
    return { scan, repriced };
  });

  app.post<{ Params: { id: string } }>('/rooms/:id/photos', async (req, reply) => {
    const r = await ownedRoom(req.params.id);
    if (!r) return bad(reply, 'not_found', 404);
    const dir = uploadDir();
    await mkdir(dir, { recursive: true });
    const ids: string[] = [];
    for await (const part of req.files()) {
      const kind = photoKind(part.mimetype, part.filename);
      if (!kind) return bad(reply, `${part.filename}: JPEG, PNG, WebP, or HEIC only`, 415);
      const raw = await part.toBuffer();
      if (part.file.truncated) return bad(reply, `${part.filename}: over 10 MB`, 413);
      let photo;
      try {
        photo = await storablePhoto(raw, kind);
      } catch (err) {
        req.log.warn({ err, file: part.filename }, 'heic conversion failed');
        return bad(reply, `${part.filename}: couldn't read this HEIC file`, 422);
      }
      const key = `${randomUUID()}.${photo.ext}`;
      await writeFile(path.join(dir, key), photo.buf);
      const ph = await prisma.photo.create({
        data: { roomId: r.id, storageKey: key, mime: photo.mime, url: '' },
      });
      ids.push(ph.id);
    }
    if (!ids.length) return bad(reply, 'no files');
    return reply.code(201).send({ ids });
  });

  app.get<{ Params: { id: string } }>('/photos/:id/file', async (req, reply) => {
    const ph = await prisma.photo.findFirst({ where: { id: req.params.id, room: { project: { userId: await userId() } } } });
    if (!ph?.storageKey) return bad(reply, 'not_found', 404);
    reply.header('cache-control', 'private, max-age=86400').type(ph.mime ?? 'application/octet-stream');
    return reply.send(createReadStream(path.join(uploadDir(), path.basename(ph.storageKey))));
  });

  /** Vision read. Fills only blank fields: typed dimensions and text always win. */
  app.post<{ Params: { id: string } }>('/rooms/:id/analyze', async (req, reply) => {
    const r = await ownedRoom(req.params.id);
    if (!r) return bad(reply, 'not_found', 404);
    const stored = r.photos.filter((p) => p.storageKey && p.mime && isStoredMime(p.mime));
    if (!stored.length) return bad(reply, 'Upload a photo first');
    const photos = await Promise.all(
      stored.map(async (p) => ({
        mime: p.mime as ImageMime,
        data: (await readFile(path.join(uploadDir(), path.basename(p.storageKey!)))).toString('base64'),
      })),
    );
    const { read, model, usage } = await analyzePhotos(photos, toRoomInput(r), await userId());
    const merged = mergeRead(toRoomInput(r), read);
    const now = new Date();
    await prisma.$transaction([
      prisma.room.update({
        where: { id: r.id },
        data: { description: merged.description, fixedElements: merged.fixed, movableElements: merged.movable },
      }),
      prisma.photo.updateMany({
        where: { id: { in: stored.map((p) => p.id) } },
        data: { analysis: { ...read, model } as unknown as Prisma.InputJsonValue, analyzedAt: now },
      }),
    ]);
    return { read, model, costUsd: usage.costUsd };
  });

  /** Critique one room. Each recommendation must map to a stored brief answer or it's dropped. */
  app.post<{ Params: { id: string } }>('/rooms/:id/critique', async (req, reply) => {
    const r = await ownedRoom(req.params.id);
    if (!r) return bad(reply, 'not_found', 404);
    const brief = r.project.brief;
    if (!brief?.completedAt) return bad(reply, 'Finish the brief first', 409);
    const room = toRoomInput(r);
    if (!room.description.trim() && !room.fixed.length) return bad(reply, 'Describe the room or analyze a photo first', 409);

    const entries: BriefEntry[] = brief.answers.map((a) => ({
      questionId: a.questionId,
      section: a.section,
      prompt: a.prompt,
      raw: a.raw,
      parsed: (a.parsed as unknown as ParsedAnswer | null) ?? { tags: [], flags: [] },
    }));
    const answerId = new Map(brief.answers.map((a) => [a.questionId, a.id]));
    const { critique, model, usage } = await critiqueRoom(entries, room, await userId());

    const kept = critique.recommendations.flatMap((rec, i) => {
      const id = answerId.get(rec.citation.trim().toUpperCase());
      return id ? [{ rec, i, briefAnswerId: id }] : [];
    });
    const dropped = critique.recommendations.length - kept.length;

    await prisma.$transaction([
      // The roadmap sequenced the old recommendations. Rebuild it after a new critique.
      prisma.roadmapItem.deleteMany({ where: { projectId: r.projectId } }),
      prisma.recommendation.deleteMany({ where: { roomId: r.id } }),
      ...kept.map(({ rec, i, briefAnswerId }) =>
        prisma.recommendation.create({
          data: {
            projectId: r.projectId,
            roomId: r.id,
            briefAnswerId,
            category: rec.category,
            title: rec.title,
            rationale: rec.needsProReview && rec.proReviewReason ? `${rec.rationale}\n\n${rec.proReviewReason}` : rec.rationale,
            preserve: rec.preserve ?? null,
            supportingQuestionIds: [...new Set((rec.supporting ?? []).map((q) => q.trim().toUpperCase()))].filter(
              (q) => answerId.has(q) && q !== rec.citation.trim().toUpperCase(),
            ),
            effort: rec.effort,
            priority: i,
            needsProReview: rec.needsProReview,
          },
        }),
      ),
      prisma.room.update({
        where: { id: r.id },
        data: {
          critique: { ...critique, recommendations: undefined } as unknown as Prisma.InputJsonValue,
          critiqueModel: model,
          critiquedAt: new Date(),
        },
      }),
      prisma.project.update({ where: { id: r.projectId }, data: { status: 'IN_PROGRESS' } }),
    ]);
    return { kept: kept.length, dropped, model, costUsd: usage.costUsd };
  });

  /** Sequences every recommendation on the project. Replaces the previous roadmap. */
  app.post<{ Params: { id: string } }>('/projects/:id/roadmap', async (req, reply) => {
    const p = await ownedProject(req.params.id);
    if (!p) return bad(reply, 'not_found', 404);
    const recs = p.rooms.flatMap((room) =>
      room.recommendations.map((r) => ({
        id: r.id,
        room: room.name,
        category: r.category,
        title: r.title,
        rationale: r.rationale,
        effort: r.effort,
        needsProReview: r.needsProReview,
        priority: r.priority,
      })),
    );
    if (!recs.length) return bad(reply, 'Critique a room first', 409);
    const { roadmap, model, usage } = await buildRoadmap(recs, await userId());
    if (roadmap.notes.length) req.log.info({ projectId: p.id, notes: roadmap.notes }, 'roadmap adjusted');

    await prisma.$transaction(async (tx) => {
      await tx.roadmapItem.deleteMany({ where: { projectId: p.id } });
      const itemOf = new Map<string, string>();
      for (const it of roadmap.items) {
        const row = await tx.roadmapItem.create({
          data: {
            projectId: p.id,
            recommendationId: it.recId,
            phase: it.phase,
            order: it.order,
            scope: it.scope,
            why: it.why,
            path: it.path,
            permit: it.permit,
            effort: it.effort,
            riskNote: it.riskNote,
          },
        });
        itemOf.set(it.recId, row.id);
      }
      await tx.roadmapDependency.createMany({
        data: roadmap.edges.map((e) => ({
          dependentId: itemOf.get(e.dependent)!,
          prerequisiteId: itemOf.get(e.prerequisite)!,
          reason: e.reason,
        })),
      });
    });
    const costs = await priceProject(p.id);
    return { items: roadmap.items.length, edges: roadmap.edges.length, adjusted: roadmap.notes.length, ...costs, model, costUsd: usage.costUsd };
  });

  /** Reprices from the baseline and the flywheel. No model call. */
  app.post<{ Params: { id: string } }>('/projects/:id/costs', async (req, reply) => {
    const p = await ownedProject(req.params.id);
    if (!p) return bad(reply, 'not_found', 404);
    if (!p.roadmapItems.length) return bad(reply, 'Build the roadmap first', 409);
    return priceProject(p.id);
  });

  /** A real quote or invoice. Feeds the flywheel per unit. */
  app.post<{ Params: { id: string }; Body: { cents?: unknown; kind?: unknown } }>('/roadmap-items/:id/quote', async (req, reply) => {
    const item = await prisma.roadmapItem.findFirst({
      where: { id: req.params.id, project: { userId: await userId() } },
      include: { project: { select: { zip: true } }, recommendation: { include: { costEstimate: true } } },
    });
    if (!item) return bad(reply, 'not_found', 404);
    const cents = Math.round(Number(req.body?.cents));
    const kind = req.body?.kind === 'ACTUAL' ? 'ACTUAL' : 'QUOTE';
    if (!Number.isFinite(cents) || cents <= 0 || cents > 100_000_000) return bad(reply, 'cents must be a positive amount');
    const est = item.recommendation?.costEstimate;
    if (!est?.workType) return bad(reply, 'Price the roadmap first', 409);
    await prisma.$transaction([
      prisma.costDataPoint.create({
        data: {
          zip: item.project.zip,
          workType: est.workType,
          baselineCents: est.midCents,
          quotedCents: kind === 'QUOTE' ? cents : null,
          actualCents: kind === 'ACTUAL' ? cents : null,
          source: 'USER_QUOTE',
          quantity: est.quantity,
        },
      }),
      prisma.costEstimate.update({ where: { id: est.id }, data: { actualCents: cents } }),
    ]);
    return { ok: true };
  });
}
