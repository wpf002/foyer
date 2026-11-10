import type { FastifyInstance } from 'fastify';
import { prisma, Prisma } from '@foyer/db';
import {
  chatHistory,
  chatReply,
  CHAT_HISTORY_TURNS,
  CHAT_MESSAGE_MAX_CHARS,
  type BriefEntry,
  type ChatChange,
  type ChatContext,
  type ParsedAnswer,
} from '@foyer/rubric';
import { bad, toRoomInput, userId } from './projects';

const toDollars = (cents: number) => Math.round(cents / 100);

async function chatProject(id: string) {
  return prisma.project.findFirst({
    where: { id, userId: await userId() },
    include: {
      brief: { include: { answers: { orderBy: { questionId: 'asc' } } } },
      rooms: { orderBy: { createdAt: 'asc' } },
      recommendations: {
        orderBy: [{ roomId: 'asc' }, { priority: 'asc' }],
        include: { briefAnswer: { select: { questionId: true } }, costEstimate: { select: { lowCents: true, highCents: true } } },
      },
    },
  });
}

type ChatProject = NonNullable<Awaited<ReturnType<typeof chatProject>>>;

function contextOf(p: ChatProject): ChatContext {
  const brief: BriefEntry[] = (p.brief?.answers ?? []).map((a) => ({
    questionId: a.questionId,
    section: a.section,
    prompt: a.prompt,
    raw: a.raw,
    parsed: (a.parsed as unknown as ParsedAnswer | null) ?? { tags: [], flags: [] },
  }));
  return {
    brief,
    rooms: p.rooms.map((r) => {
      const read = (r.critique as { roomRead?: unknown } | null)?.roomRead;
      return { id: r.id, ...toRoomInput(r), roomRead: typeof read === 'string' ? read : undefined };
    }),
    recommendations: p.recommendations.map((x) => ({
      id: x.id,
      roomId: x.roomId,
      category: x.category,
      title: x.title,
      rationale: x.rationale,
      citation: x.briefAnswer.questionId,
      effort: x.effort,
      needsProReview: x.needsProReview,
      costUsd: x.costEstimate ? { low: toDollars(x.costEstimate.lowCents), high: toDollars(x.costEstimate.highCents) } : undefined,
    })),
  };
}

/** One write per change. Callers run these inside a transaction. */
function writesFor(p: ChatProject, changes: ChatChange[]): Prisma.PrismaPromise<unknown>[] {
  const answerId = new Map((p.brief?.answers ?? []).map((a) => [a.questionId, a.id]));
  const nextPriority = new Map<string, number>();
  for (const r of p.recommendations) {
    if (r.roomId) nextPriority.set(r.roomId, Math.max(nextPriority.get(r.roomId) ?? 0, r.priority + 1));
  }
  return changes.flatMap((c): Prisma.PrismaPromise<unknown>[] => {
    if (c.op === 'remove') return [prisma.recommendation.delete({ where: { id: c.recId } })];
    if (c.op === 'update') {
      const { title, rationale, effort, category } = c;
      return [prisma.recommendation.update({ where: { id: c.recId }, data: { title, rationale, effort, category } })];
    }
    const briefAnswerId = answerId.get(c.citation);
    if (!briefAnswerId) return [];
    const priority = nextPriority.get(c.roomId) ?? 0;
    nextPriority.set(c.roomId, priority + 1);
    return [
      prisma.recommendation.create({
        data: {
          projectId: p.id,
          roomId: c.roomId,
          briefAnswerId,
          category: c.category,
          title: c.title,
          rationale: c.rationale,
          effort: c.effort,
          priority,
          needsProReview: c.needsProReview,
        },
      }),
    ];
  });
}

export async function chatRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/projects/:id/chat', async (req, reply) => {
    const p = await prisma.project.findFirst({ where: { id: req.params.id, userId: await userId() }, select: { id: true } });
    if (!p) return bad(reply, 'not_found', 404);
    return prisma.chatMessage.findMany({
      where: { projectId: p.id },
      // USER sorts before ASSISTANT, which breaks same-transaction timestamp ties.
      orderBy: [{ createdAt: 'asc' }, { role: 'asc' }],
      select: { id: true, role: true, content: true, changes: true, createdAt: true },
    });
  });

  app.post<{ Params: { id: string }; Body: { message?: unknown } }>('/projects/:id/chat', async (req, reply) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) return bad(reply, 'Write a message first');
    if (message.length > CHAT_MESSAGE_MAX_CHARS) return bad(reply, `Keep it under ${CHAT_MESSAGE_MAX_CHARS} characters`);

    const p = await chatProject(req.params.id);
    if (!p) return bad(reply, 'not_found', 404);
    if (!p.brief?.completedAt) return bad(reply, 'Finish the brief first', 409);

    const prior = await prisma.chatMessage.findMany({
      where: { projectId: p.id },
      orderBy: [{ createdAt: 'desc' }, { role: 'desc' }],
      take: CHAT_HISTORY_TURNS,
      select: { role: true, content: true, createdAt: true },
    });
    const history = chatHistory(prior, message);

    const { reply: text, changes, usage } = await chatReply(contextOf(p), history, await userId());
    const writes = writesFor(p, changes);

    const [, saved] = await prisma.$transaction([
      prisma.chatMessage.create({ data: { projectId: p.id, role: 'USER', content: message } }),
      prisma.chatMessage.create({
        data: {
          projectId: p.id,
          role: 'ASSISTANT',
          content: text,
          changes: changes.length ? (changes as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
        select: { id: true, role: true, content: true, changes: true, createdAt: true },
      }),
      // The roadmap sequenced the old plan. Rebuild it after any edit.
      ...(writes.length ? [prisma.roadmapItem.deleteMany({ where: { projectId: p.id } })] : []),
      ...writes,
    ]);
    return { message: saved, applied: changes.length, costUsd: usage.costUsd };
  });
}
