import { test } from 'node:test';
import assert from 'node:assert/strict';
import { credentialsSchema, isPublicPath, tokenId } from '../src/auth';

test('private routes need a session', () => {
  for (const url of ['/v1/projects', '/v1/projects/abc', '/v1/me', '/v1/photos/x/file', '/v1/renders/x/file']) {
    assert.equal(isPublicPath(url), false, url);
  }
});

test('auth, share, cost and question routes are public', () => {
  for (const url of ['/v1/auth/signin', '/v1/shared/tok', '/v1/shared/tok/brief/pdf', '/v1/cost/index?zip3=750', '/v1/questions', '/health']) {
    assert.equal(isPublicPath(url), true, url);
  }
});

test('a public prefix does not open a lookalike path', () => {
  assert.equal(isPublicPath('/v1/sharedx'), false);
  assert.equal(isPublicPath('/v1/questionsx'), false);
});

test('email is normalized and short passwords are refused', () => {
  const ok = credentialsSchema.safeParse({ email: '  Will@Example.COM ', password: 'long enough pw' });
  assert.equal(ok.success && ok.data.email, 'will@example.com');
  assert.equal(credentialsSchema.safeParse({ email: 'a@b.co', password: 'short' }).success, false);
  assert.equal(credentialsSchema.safeParse({ email: 'not-an-email', password: 'long enough pw' }).success, false);
});

test('the stored session id is a hash, not the token', () => {
  const id = tokenId('abc');
  assert.notEqual(id, 'abc');
  assert.equal(id, tokenId('abc'));
  assert.equal(id.length, 64);
});
