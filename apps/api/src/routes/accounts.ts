import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma, type Prisma, type UserKind } from '@foyer/db';
import { ARTIFACT_TYPES, SLUG, typeOfSlug, type ArtifactDoc } from '@foyer/artifacts';
import { renderPdf } from '@foyer/artifacts/pdf';
import { ownedProject, userId } from './projects';

const KINDS: UserKind[] = ['HOMEOWNER', 'DESIGNER', 'CONTRACTOR', 'STAGER', 'AGENT'];
const bad = (reply: FastifyReply, error: string, status = 400) => reply.code(status).send({ error });
const webUrl = () => process.env.WEB_URL || 'http://localhost:3000';

/** Trimmed string, null for blank, undefined for absent. */
const text = (v: unknown, max = 120): string | null | undefined =>
  v === undefined ? undefined : typeof v === 'string' ? v.trim().slice(0, max) || null : null;

const profile = (u: { id: string; email: string; name: string | null; kind: UserKind; zip: string | null; studio: string | null; license: string | null }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  kind: u.kind,
  zip: u.zip,
  studio: u.studio,
  license: u.license,
  pro: u.kind !== 'HOMEOWNER',
});

/** The line a handoff document carries as its preparer. Null for homeowners. */
const preparer = (u: { name: string | null; kind: UserKind; studio: string | null; license: string | null }) =>
  u.kind === 'HOMEOWNER' ? null : { name: u.name, studio: u.studio, license: u.license, kind: u.kind };

async function latestDocs(projectId: string) {
  const rows = await prisma.artifact.findMany({ where: { projectId }, orderBy: { version: 'desc' } });
  return ARTIFACT_TYPES.map((t) => rows.find((r) => r.type === t)).filter((r) => !!r);
}

async function liveShare(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  return prisma.shareLink.findFirst({
    where: { token, revokedAt: null },
    include: { project: { include: { user: true } } },
  });
}

export async function accountRoutes(app: FastifyInstance) {
  app.get('/me', async () => profile(await prisma.user.findUniqueOrThrow({ where: { id: await userId() } })));

  app.patch<{ Body: Record<string, unknown> }>('/me', async (req, reply) => {
    const b = req.body ?? {};
    const kind = b.kind === undefined ? undefined : KINDS.find((k) => k === b.kind);
    if (b.kind !== undefined && !kind) return bad(reply, 'unknown account kind');
    const zip = text(b.zip, 5);
    if (zip && !/^\d{5}$/.test(zip)) return bad(reply, 'zip must be 5 digits');
    const u = await prisma.user.update({
      where: { id: await userId() },
      data: { name: text(b.name), kind, zip, studio: text(b.studio), license: text(b.license, 60) },
    });
    return profile(u);
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>('/projects/:id', async (req, reply) => {
    const p = await ownedProject(req.params.id);
    if (!p) return bad(reply, 'not_found', 404);
    const name = text(req.body?.name);
    if (name === null) return bad(reply, 'name is required');
    await prisma.project.update({ where: { id: p.id }, data: { name, clientName: text(req.body?.clientName) } });
    return { ok: true };
  });

  /* ---------------------------- Share links ---------------------------- */

  app.get<{ Params: { id: string } }>('/projects/:id/shares', async (req, reply) => {
    const p = await ownedProject(req.params.id);
    if (!p) return bad(reply, 'not_found', 404);
    return prisma.shareLink.findMany({
      where: { projectId: p.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, token: true, label: true, views: true, lastViewedAt: true, createdAt: true },
    });
  });

  app.post<{ Params: { id: string }; Body: { label?: unknown } }>('/projects/:id/shares', async (req, reply) => {
    const p = await ownedProject(req.params.id);
    if (!p) return bad(reply, 'not_found', 404);
    if (!(await prisma.artifact.count({ where: { projectId: p.id } }))) return bad(reply, 'Generate the handoff first', 409);
    const link = await prisma.shareLink.create({
      data: { projectId: p.id, token: randomBytes(18).toString('base64url'), label: text(req.body?.label, 60) },
    });
    return reply.code(201).send({ id: link.id, token: link.token });
  });

  app.post<{ Params: { id: string } }>('/shares/:id/revoke', async (req, reply) => {
    const owned = await prisma.shareLink.findFirst({ where: { id: req.params.id, project: { userId: await userId() } } });
    if (!owned) return bad(reply, 'not_found', 404);
    await prisma.shareLink.update({ where: { id: owned.id }, data: { revokedAt: new Date() } });
    return { ok: true };
  });

  /* ------------------------ Public, by token only ------------------------ */

  app.get<{ Params: { token: string } }>('/shared/:token', async (req, reply) => {
    const link = await liveShare(req.params.token);
    if (!link) return bad(reply, 'not_found', 404);
    await prisma.shareLink.update({ where: { id: link.id }, data: { views: { increment: 1 }, lastViewedAt: new Date() } });
    const docs = await latestDocs(link.projectId);
    return {
      project: { name: link.project.name, zip: link.project.zip, clientName: link.project.clientName },
      preparedBy: preparer(link.project.user),
      artifacts: docs.map((r) => {
        const d = r.content as unknown as ArtifactDoc;
        return { slug: SLUG[d.type], type: d.type, title: d.title, version: r.version, sections: d.sections.length };
      }),
    };
  });

  app.get<{ Params: { token: string; slug: string } }>('/shared/:token/:slug', async (req, reply) => {
    const type = typeOfSlug(req.params.slug);
    const link = type && (await liveShare(req.params.token));
    if (!type || !link) return bad(reply, 'not_found', 404);
    const row = await prisma.artifact.findFirst({ where: { projectId: link.projectId, type }, orderBy: { version: 'desc' } });
    if (!row) return bad(reply, 'not_found', 404);
    return { version: row.version, doc: row.content as Prisma.JsonValue, preparedBy: preparer(link.project.user) };
  });

  app.get<{ Params: { token: string; slug: string } }>('/shared/:token/:slug/pdf', async (req, reply) => {
    const { token, slug } = req.params;
    if (!typeOfSlug(slug) || !(await liveShare(token))) return bad(reply, 'not_found', 404);
    const pdf = await renderPdf(`${webUrl()}/share/${token}/${slug}?print=1`);
    return reply
      .type('application/pdf')
      .header('content-disposition', `attachment; filename="${slug}.pdf"`)
      .send(Buffer.from(pdf));
  });
}
