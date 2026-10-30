import type { FastifyInstance } from 'fastify';

export async function health(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true, service: 'foyer-api' }));
}
