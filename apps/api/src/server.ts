import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ModelError, publicModelMessage, SpendCapExceeded } from '@foyer/ai';
import { health } from './routes/health';
import { costRoutes } from './routes/cost';
import { accountRoutes } from './routes/accounts';
import { artifactRoutes } from './routes/artifacts';
import { projectRoutes } from './routes/projects';
import { renderRoutes } from './routes/renders';
import { chatRoutes } from './routes/chat';

const app = Fastify({ logger: true });

await app.register(cors, { origin: process.env.WEB_ORIGIN ?? true });

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof SpendCapExceeded) {
    return reply.code(429).send({ error: 'spend_cap', scope: err.scope, message: err.message });
  }
  if (err instanceof ModelError) {
    app.log.warn(err);
    return reply.code(err.status === 422 ? 422 : 502).send({ error: 'model', message: publicModelMessage(err.status) });
  }
  app.log.error(err);
  return reply.code(err.statusCode ?? 500).send({ error: 'internal' });
});

await app.register(health);
await app.register(costRoutes, { prefix: '/v1/cost' });
await app.register(projectRoutes, { prefix: '/v1' });
await app.register(artifactRoutes, { prefix: '/v1' });
await app.register(accountRoutes, { prefix: '/v1' });
await app.register(renderRoutes, { prefix: '/v1' });
await app.register(chatRoutes, { prefix: '/v1' });

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? '0.0.0.0';
await app.listen({ port, host });
