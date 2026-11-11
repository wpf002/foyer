import { prisma } from '@foyer/db';
import { buildRoadmap } from '@foyer/rubric';
import { sumPlan, type PlanTotal } from '@foyer/cost';
import { priceProject } from './pricing';

export type { PlanTotal };

export interface RebuiltRoadmap {
  items: number;
  edges: number;
  notes: string[];
  plan: PlanTotal;
  model: string;
  costUsd: number;
}

/** Sum of priced roadmap items. */
export async function planTotal(projectId: string): Promise<PlanTotal> {
  const items = await prisma.roadmapItem.findMany({ where: { projectId }, select: { lowCents: true, highCents: true } });
  return sumPlan(items);
}

/**
 * Sequences every recommendation on the project, replaces the previous
 * roadmap, and prices it. Returns null when there is nothing to sequence.
 */
export async function rebuildRoadmap(projectId: string, userId: string): Promise<RebuiltRoadmap | null> {
  const rooms = await prisma.room.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    include: { recommendations: { orderBy: { priority: 'asc' } } },
  });
  const recs = rooms.flatMap((room) =>
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
  if (!recs.length) return null;
  const { roadmap, model, usage } = await buildRoadmap(recs, userId);

  await prisma.$transaction(async (tx) => {
    await tx.roadmapItem.deleteMany({ where: { projectId } });
    const itemOf = new Map<string, string>();
    for (const it of roadmap.items) {
      const row = await tx.roadmapItem.create({
        data: {
          projectId,
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
  await priceProject(projectId);
  return {
    items: roadmap.items.length,
    edges: roadmap.edges.length,
    notes: roadmap.notes,
    plan: await planTotal(projectId),
    model,
    costUsd: usage.costUsd,
  };
}
