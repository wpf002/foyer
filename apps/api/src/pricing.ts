import { prisma } from '@foyer/db';
import { price, scanOf, scopeOf } from '@foyer/cost';

/** Real quotes and invoices count toward the flywheel for two years. */
const WINDOW_MS = 2 * 365 * 24 * 3600 * 1000;

/** Per-unit local observations for a work type near a zip. */
export async function localPerUnit(zip: string, workType: string): Promise<number[]> {
  const rows = await prisma.costDataPoint.findMany({
    where: {
      zip: { startsWith: zip.slice(0, 3) },
      workType,
      quantity: { gt: 0 },
      OR: [{ quotedCents: { not: null } }, { actualCents: { not: null } }],
      observedAt: { gte: new Date(Date.now() - WINDOW_MS) },
    },
    select: { quotedCents: true, actualCents: true, quantity: true },
    take: 500,
    orderBy: { observedAt: 'desc' },
  });
  return rows.map((r) => (r.actualCents ?? r.quotedCents)! / r.quantity!);
}

/**
 * Prices every roadmap item on a project. Writes CostEstimate per
 * recommendation, copies the range onto the roadmap item, and writes a
 * baseline flywheel row the first time a recommendation is priced.
 */
export async function priceProject(projectId: string): Promise<{ priced: number; unpriced: number }> {
  const p = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      roadmapItems: {
        include: { recommendation: { include: { room: true, costEstimate: { select: { id: true, workType: true } } } } },
      },
    },
  });
  const cache = new Map<string, number[]>();
  const local = async (wt: string) => {
    if (!cache.has(wt)) cache.set(wt, await localPerUnit(p.zip, wt));
    return cache.get(wt)!;
  };

  let priced = 0;
  let unpriced = 0;
  for (const item of p.roadmapItems) {
    const rec = item.recommendation;
    const scope = rec && scopeOf({ title: rec.title, rationale: rec.rationale, category: rec.category, room: rec.room ? { ...rec.room, scan: scanOf(rec.room.scan) } : undefined });
    const r = scope && price(scope, p.zip, await local(scope.workType));
    if (!rec || !r) {
      unpriced++;
      await prisma.roadmapItem.update({ where: { id: item.id }, data: { lowCents: null, highCents: null } });
      continue;
    }
    priced++;
    const data = {
      lowCents: r.lowCents,
      midCents: r.midCents,
      highCents: r.highCents,
      zip: p.zip,
      source: r.source,
      regionFactor: r.regionFactor,
      workType: r.workType,
      quantity: r.quantity,
      basis: r.basis,
      localPoints: r.localPoints,
    } as const;
    const fresh = rec.costEstimate?.workType !== r.workType;
    await prisma.$transaction([
      prisma.costEstimate.upsert({ where: { recommendationId: rec.id }, update: data, create: { ...data, recommendationId: rec.id } }),
      prisma.roadmapItem.update({ where: { id: item.id }, data: { lowCents: r.lowCents, highCents: r.highCents } }),
      ...(fresh
        ? [
            prisma.costDataPoint.create({
              data: {
                zip: p.zip,
                workType: r.workType,
                baselineCents: r.midCents,
                source: 'BASELINE_STATIC',
                unit: r.line.unit,
                quantity: r.quantity,
              },
            }),
          ]
        : []),
    ]);
  }
  return { priced, unpriced };
}
