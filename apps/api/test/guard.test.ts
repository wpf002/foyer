import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { authPlugin } from '../src/auth';

// Regression: the hook was scoped to the auth plugin and left sibling route plugins open.
test('the guard covers routes registered in other plugins', async () => {
  const app = Fastify();
  await app.register(authPlugin);
  await app.register(async (scope) => scope.get('/me', async () => ({ ok: true })), { prefix: '/v1' });
  await app.register(async (scope) => scope.get('/questions', async () => ({ ok: true })), { prefix: '/v1' });
  const privateRes = await app.inject({ method: 'GET', url: '/v1/me' });
  const publicRes = await app.inject({ method: 'GET', url: '/v1/questions' });
  await app.close();
  assert.equal(privateRes.statusCode, 401);
  assert.equal(publicRes.statusCode, 200);
});
