import type { FastifyInstance } from 'fastify';
import { prisma, type Prisma } from '@foyer/db';
import {
  ARTIFACT_TYPES,
  buildArtifact,
  SLUG,
  typeOfSlug,
  type ArtifactDoc,
  type ArtifactInput,
} from '@foyer/artifacts';
import { renderPdf } from '@foyer/artifacts/pdf';
import { ownedProject, strList } from './projects';
import { SESSION_COOKIE } from '../auth';

type Owned = NonNullable<Awaited<ReturnType<typeof ownedProject>>>;

const SAMPLE_ID = 'prescott';
const webUrl = () => process.env.WEB_URL || 'http://localhost:3000';

export function artifactInput(p: Owned): ArtifactInput {
  return {
    project: { name: p.name, zip: p.zip, budgetLowCents: p.budgetLowCents, budgetHighCents: p.budgetHighCents },
    answers: (p.brief?.answers ?? []).map((a) => ({ questionId: a.questionId, section: a.section, prompt: a.prompt, raw: a.raw })),
    rooms: p.rooms.map((r) => ({ id: r.id, name: r.name, fixed: strList(r.fixedElements) })),
    recs: p.rooms.flatMap((r) =>
      r.recommendations.map((rec) => ({
        id: rec.id,
        roomId: rec.roomId,
        title: rec.title,
        category: rec.category,
        citation: rec.briefAnswer.questionId,
        preserve: rec.preserve,
        needsProReview: rec.needsProReview,
      })),
    ),
    items: p.roadmapItems.map((i) => ({
      id: i.id,
      recommendationId: i.recommendationId,
      phase: i.phase,
      order: i.order,
      scope: i.scope,
      why: i.why,
      path: i.path,
      permit: i.permit,
      lowCents: i.lowCents,
      highCents: i.highCents,
      riskNote: i.riskNote,
      dependsOn: i.dependsOn.map((d) => ({ id: d.prerequisiteId, reason: d.reason })),
    })),
    issuedAt: new Date().toISOString(),
  };
}

/** Same sections as the stored version means no new version. */
const sameBody = (a: ArtifactDoc, b: unknown) =>
  JSON.stringify(a.sections) === JSON.stringify((b as ArtifactDoc | null)?.sections ?? null);

async function latest(projectId: string) {
  const rows = await prisma.artifact.findMany({ where: { projectId }, orderBy: { version: 'desc' } });
  return ARTIFACT_TYPES.map((t) => rows.find((r) => r.type === t)).filter((r) => !!r);
}

const summary = (r: { id: string; type: string; version: number; generatedAt: Date; content: Prisma.JsonValue }) => {
  const doc = r.content as unknown as ArtifactDoc;
  return {
    id: r.id,
    type: r.type,
    slug: SLUG[doc.type],
    title: doc.title,
    version: r.version,
    generatedAt: r.generatedAt,
    sections: doc.sections.length,
  };
};

export async function artifactRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/projects/:id/artifacts', async (req, reply) => {
    const p = await ownedProject(req.params.id, req.userId);
    if (!p) return reply.code(404).send({ error: 'Not found' });
    return (await latest(p.id)).map(summary);
  });

  app.post<{ Params: { id: string } }>('/projects/:id/artifacts', async (req, reply) => {
    const p = await ownedProject(req.params.id, req.userId);
    if (!p) return reply.code(404).send({ error: 'Not found' });
    if (!p.roadmapItems.length) return reply.code(409).send({ error: 'Build the roadmap first' });

    const input = artifactInput(p);
    const prior = new Map((await latest(p.id)).map((r) => [r.type, r]));
    let written = 0;
    for (const type of ARTIFACT_TYPES) {
      const doc = buildArtifact(type, input);
      const last = prior.get(type);
      if (last && sameBody(doc, last.content)) continue;
      await prisma.artifact.create({
        data: { projectId: p.id, type, version: (last?.version ?? 0) + 1, content: doc as unknown as Prisma.InputJsonValue },
      });
      written++;
    }
    return { written, artifacts: (await latest(p.id)).map(summary) };
  });

  app.get<{ Params: { id: string; slug: string } }>('/projects/:id/artifacts/:slug', async (req, reply) => {
    const type = typeOfSlug(req.params.slug);
    const p = type && (await ownedProject(req.params.id, req.userId));
    if (!type || !p) return reply.code(404).send({ error: 'Not found' });
    const row = await prisma.artifact.findFirst({ where: { projectId: p.id, type }, orderBy: { version: 'desc' } });
    if (!row) return reply.code(404).send({ error: 'Not generated' });
    return { ...summary(row), doc: row.content };
  });

  app.get<{ Params: { id: string; slug: string } }>('/projects/:id/artifacts/:slug/pdf', async (req, reply) => {
    const { id, slug } = req.params;
    if (!typeOfSlug(slug)) return reply.code(404).send({ error: 'Not found' });
    if (id !== SAMPLE_ID && !(await ownedProject(id, req.userId))) return reply.code(404).send({ error: 'Not found' });
    // The print page loads the project through the API, so it needs this request's session.
    const session = req.cookies[SESSION_COOKIE];
    const pdf = await renderPdf(
      `${webUrl()}/projects/${encodeURIComponent(id)}/artifacts/${slug}?print=1`,
      session ? [{ name: SESSION_COOKIE, value: session }] : [],
    );
    return reply
      .type('application/pdf')
      .header('content-disposition', `attachment; filename="${slug}.pdf"`)
      .send(Buffer.from(pdf));
  });
}
