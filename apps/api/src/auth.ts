import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { hash, verify } from '@node-rs/argon2';
import { z } from 'zod';
import { prisma } from '@foyer/db';

export const SESSION_COOKIE = 'foyer_session';
const SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;
const MIN_PASSWORD = 10;
const MAX_PASSWORD = 200;
const SIGN_IN_LIMIT_PER_MINUTE = 10;

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by the auth hook on every non-public route. */
    userId: string;
  }
}

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(MIN_PASSWORD).max(MAX_PASSWORD),
});

const signUpSchema = credentialsSchema.extend({
  name: z.string().trim().max(120).optional(),
});

/** Routes reachable without a session. Matched against the path after the /v1 prefix. */
const PUBLIC_PREFIXES = ['/auth/', '/shared/', '/cost/', '/questions'];

export const isPublicPath = (url: string): boolean => {
  const path = url.split('?')[0] ?? '';
  if (!path.startsWith('/v1/')) return true;
  const rest = path.slice('/v1'.length);
  // Entries ending in "/" cover a subtree; the rest match exactly.
  return PUBLIC_PREFIXES.some((p) => (p.endsWith('/') ? rest.startsWith(p) : rest === p));
};

/** Only the hash is stored, so a database leak doesn't hand out live sessions. */
export const tokenId = (token: string) => createHash('sha256').update(token).digest('hex');

const cookieOptions = () => ({
  path: '/',
  httpOnly: true,
  // Lax blocks the cookie on cross-site POSTs, which is the CSRF protection for the JSON and multipart routes.
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_DAYS * DAY_MS / 1000,
});

async function startSession(reply: FastifyReply, userId: string) {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  await prisma.session.create({
    data: { id: tokenId(token), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * DAY_MS) },
  });
  reply.setCookie(SESSION_COOKIE, token, cookieOptions());
}

async function sessionUser(req: FastifyRequest): Promise<string | null> {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { id: tokenId(token) } });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.userId;
}

const invalid = (reply: FastifyReply, issues: z.ZodError) =>
  reply.code(400).send({ error: 'invalid', message: issues.issues[0]?.message ?? 'Invalid input' });

const WRONG_CREDENTIALS = 'Email or password is wrong';

async function auth(app: FastifyInstance) {
  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  app.decorateRequest('userId', '');

  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'OPTIONS' || isPublicPath(req.url)) return;
    const uid = await sessionUser(req);
    if (!uid) return reply.code(401).send({ error: 'unauthorized', message: 'Sign in first' });
    req.userId = uid;
  });

  const limited = { config: { rateLimit: { max: SIGN_IN_LIMIT_PER_MINUTE, timeWindow: '1 minute' } } };

  app.post('/v1/auth/signup', limited, async (req, reply) => {
    const parsed = signUpSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const { email, password, name } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return reply.code(409).send({ error: 'exists', message: 'That email already has an account' });
    const user = await prisma.user.create({ data: { email, name: name || null, passwordHash: await hash(password) } });
    await startSession(reply, user.id);
    return reply.code(201).send({ id: user.id });
  });

  app.post('/v1/auth/signin', limited, async (req, reply) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(401).send({ error: 'wrong', message: WRONG_CREDENTIALS });
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await verify(user.passwordHash, password))) {
      return reply.code(401).send({ error: 'wrong', message: WRONG_CREDENTIALS });
    }
    await startSession(reply, user.id);
    return { id: user.id };
  });

  app.post('/v1/auth/signout', async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await prisma.session.deleteMany({ where: { id: tokenId(token) } });
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });
}

// fastify-plugin lifts the hook out of this plugin's scope so it guards routes registered beside it.
export const authPlugin = fp(auth, { name: 'foyer-auth' });
