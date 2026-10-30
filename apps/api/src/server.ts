import Fastify from 'fastify';
import cors from '@fastify/cors';
import { SpendCapExceeded } from '@foyer/ai';
import { health } from './routes/health';
import { costRoutes } from './routes/cost';

const app = Fastify({ logger: true });

await app.register(cors, { origin: process.env.WEB_ORIGIN ?? true });

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof SpendCapExceeded) {
    return reply.code(429).send({ error: 'spend_cap', scope: err.scope, message: err.message });
  }
  app.log.error(err);
  return reply.code(err.statusCode ?? 500).send({ error: 'internal' });
});

await app.register(health);
await app.register(costRoutes, { prefix: '/v1/cost' });

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? '0.0.0.0';
await app.listen({ port, host });
