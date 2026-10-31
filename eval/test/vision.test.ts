import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTransport, type ModelResponse, type Tier } from '@foyer/ai';
import { analyzePhotos, MAX_PHOTOS, mergeRead, sanitizeRead, type RoomInput } from '@foyer/rubric';

const usage = { inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0, costUsd: 0 };
const reply = (text: string): ModelResponse => ({ model: 'm', text, usage });
const photo = { mime: 'image/jpeg' as const, data: 'AAAA' };

test('sanitizeRead rewrites load-bearing verdicts', () => {
  const r = sanitizeRead({
    description: 'The left wall is load-bearing. The arch probably non-load bearing.',
    fixed: ['kitchen wall, appears load bearing'],
    movable: ['sofa'],
  });
  assert.doesNotMatch(r.description, /load[- ]bearing/i);
  assert.equal(r.fixed[0], 'kitchen wall, load path unconfirmed');
  assert.deepEqual(r.movable, ['sofa']);
});

test('mergeRead keeps typed values and dedupes lists', () => {
  const room: RoomInput = { name: 'Den', type: 'LIVING', description: '', fixed: ['Oak Floor'], movable: [] };
  const merged = mergeRead(room, { description: 'Low light.', fixed: ['oak floor', 'brick fireplace'], movable: ['rug'] });
  assert.equal(merged.description, 'Low light.');
  assert.deepEqual(merged.fixed, ['Oak Floor', 'brick fireplace']);
  assert.deepEqual(merged.movable, ['rug']);
  assert.equal(mergeRead({ ...room, description: 'Typed.' }, { description: 'Seen.', fixed: [], movable: [] }).description, 'Typed.');
});

test('analyzePhotos sends capped images on the vision tier and sanitizes', async () => {
  let seen: { body: Record<string, unknown>; tier: Tier } | undefined;
  setTransport(async (body, tier) => {
    seen = { body, tier };
    return reply(JSON.stringify({ description: 'Wall is load-bearing.', fixed: [], movable: [] }));
  });
  try {
    const res = await analyzePhotos(Array(MAX_PHOTOS + 2).fill(photo), { name: 'Den', type: 'LIVING' }, 'u');
    assert.equal(seen?.tier, 'vision');
    const content = (seen?.body.messages as { content: { type: string }[] }[])[0]!.content;
    assert.equal(content.filter((b) => b.type === 'image').length, MAX_PHOTOS);
    assert.doesNotMatch(res.read.description, /load-bearing/);
  } finally {
    setTransport(undefined);
  }
});

test('analyzePhotos rejects a malformed read', async () => {
  setTransport(async () => reply('{"description": 3}'));
  try {
    await assert.rejects(analyzePhotos([photo], { name: 'Den', type: 'LIVING' }, 'u'), /shape check/);
  } finally {
    setTransport(undefined);
  }
});
