import type { ArtifactInput } from '@foyer/artifacts';
import { brief, project, recommendations, roadmap, rooms } from './mock';

/** Which recommendation each sample roadmap item came from. */
const REC_OF: Record<string, string> = {
  p1: 'c2', p2: 'c8', p3: 'c6', p4: 'c1', p5: 'c5', p6: 'c6', p7: 'c3', p8: 'c4', p9: 'c7',
};

const ISSUED = '2026-10-27T12:00:00.000Z';

/** The sample project in the shape the API hands the builder. */
export const sampleInput = (): ArtifactInput => ({
  project: {
    name: project.name,
    zip: project.zip,
    city: project.city,
    budgetLowCents: project.budgetLowCents,
    budgetHighCents: project.budgetHighCents,
  },
  answers: brief.map((a) => ({ questionId: a.questionId, section: a.section, prompt: a.prompt, raw: a.raw })),
  rooms: rooms.map((r) => ({ id: r.id, name: r.name, fixed: r.fixed })),
  recs: recommendations.map((r) => ({
    id: r.id,
    roomId: r.roomId,
    title: r.title,
    category: r.category,
    citation: brief.find((a) => a.id === r.briefAnswerId)?.questionId ?? r.briefAnswerId,
    preserve: r.preserve ?? null,
    needsProReview: !!r.needsProReview,
  })),
  items: roadmap.map((i) => ({
    id: i.id,
    recommendationId: REC_OF[i.id] ?? null,
    phase: i.phase,
    order: i.order,
    scope: i.scope,
    why: i.why,
    path: i.path,
    permit: i.permit,
    lowCents: i.lowCents,
    highCents: i.highCents,
    riskNote: i.riskNote ?? null,
    dependsOn: i.dependsOn ? [i.dependsOn] : [],
  })),
  issuedAt: ISSUED,
});
