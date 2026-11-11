import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAT_REPLY_SCHEMA, chatHistory, projectStateBlock, sanitizeChanges } from '../../packages/rubric/src/chat';
import { buildBody } from '../../packages/ai/src/model';

const scope = {
  roomIds: new Set(['room1']),
  recIds: new Set(['rec1', 'rec2']),
  questionIds: new Set(['Q03', 'Q07']),
};

const add = {
  op: 'add',
  roomId: 'room1',
  category: 'atmospheric',
  title: 'Add A Floor Lamp',
  rationale: 'Second light source by the reading chair, per Q07.',
  citation: 'q07',
  effort: 'weekend',
};

test('sanitizeChanges keeps a valid add and normalizes case', () => {
  assert.deepEqual(sanitizeChanges([add], scope), [
    { ...add, category: 'ATMOSPHERIC', citation: 'Q07', effort: 'WEEKEND', needsProReview: false },
  ]);
});

test('sanitizeChanges drops an add with an unknown room or citation', () => {
  assert.deepEqual(sanitizeChanges([{ ...add, roomId: 'nope' }, { ...add, citation: 'Q99' }, { ...add, citation: undefined }], scope), []);
});

test('sanitizeChanges drops edits to unknown recommendations', () => {
  assert.deepEqual(sanitizeChanges([{ op: 'remove', recId: 'other' }, { op: 'update', recId: 'other', title: 'X' }], scope), []);
});

test('sanitizeChanges drops an update with nothing to change', () => {
  assert.deepEqual(sanitizeChanges([{ op: 'update', recId: 'rec1', effort: 'someday' }], scope), []);
});

test('sanitizeChanges applies one edit per recommendation', () => {
  assert.deepEqual(
    sanitizeChanges([{ op: 'remove', recId: 'rec1' }, { op: 'update', recId: 'rec1', title: 'Keep It' }], scope),
    [{ op: 'remove', recId: 'rec1' }],
  );
});

test('sanitizeChanges ignores non-array input', () => {
  assert.deepEqual(sanitizeChanges({ op: 'remove', recId: 'rec1' }, scope), []);
});

test('projectStateBlock lists recommendation ids under their room', () => {
  const block = projectStateBlock({
    rooms: [{ id: 'room1', name: 'Office', type: 'office', fixed: [], movable: [], description: '' }],
    recommendations: [
      { id: 'rec1', roomId: 'room1', category: 'COSMETIC', title: 'Swap Bulbs', rationale: 'Warmer.', citation: 'Q07', effort: 'WEEKEND', needsProReview: false, costUsd: { low: 20, high: 60 } },
    ],
  });
  assert.match(block, /Room room1: Office/);
  assert.match(block, /\[rec1\] COSMETIC · Swap Bulbs \(cites Q07, WEEKEND, \$20-\$60\)/);
});

test('chatHistory keeps a question before its same-timestamp reply', () => {
  const t = new Date('2026-11-10T22:37:31.440Z');
  // Newest-first, as the API reads them; the reply is listed before its question.
  const turns = chatHistory(
    [
      { role: 'ASSISTANT', content: 'Done, removed it.', createdAt: t },
      { role: 'USER', content: 'Drop the floor jack.', createdAt: t },
    ],
    'How high should the chandelier hang?',
  );
  assert.deepEqual(
    turns.map((x) => [x.role, x.content]),
    [
      ['user', 'Drop the floor jack.'],
      ['assistant', 'Done, removed it.'],
      ['user', 'How high should the chandelier hang?'],
    ],
  );
});

test('chatHistory drops a leading assistant turn left by the window', () => {
  const at = (s: number) => new Date(2026, 10, 10, 0, 0, s);
  const stored = Array.from({ length: 20 }, (_, i) => ({
    role: i % 2 ? ('ASSISTANT' as const) : ('USER' as const),
    content: `m${i}`,
    createdAt: at(Math.floor(i / 2)),
  }));
  const turns = chatHistory(stored, 'next');
  assert.equal(turns[0]?.role, 'user');
  assert.equal(turns.at(-1)?.content, 'next');
  assert.ok(turns.length <= 20);
});

test('chat requests send the reply schema so prose-only replies cannot happen', () => {
  const body = buildBody({
    task: 'design_chat',
    userId: 'u',
    system: [{ text: 's' }],
    messages: [{ role: 'user', content: 'hi' }],
    effort: 'medium',
    schema: CHAT_REPLY_SCHEMA,
  });
  assert.deepEqual(body.output_config, {
    effort: 'medium',
    format: { type: 'json_schema', schema: CHAT_REPLY_SCHEMA },
  });
});
