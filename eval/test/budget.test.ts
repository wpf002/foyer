import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetLabel, titleCase } from '../../packages/ui/src/format';
import { QUESTIONS } from '../../packages/rubric/src/intake';

test('budgetLabel reads an upper-only band as Under', () => assert.equal(budgetLabel(null, 1_000_000), 'Under $10k'));
test('budgetLabel reads a lower-only band as open-ended', () => assert.equal(budgetLabel(5_000_000, null), '$50k+'));
test('budgetLabel reads a closed band as a range', () => assert.equal(budgetLabel(1_000_000, 2_500_000), '$10k–$25k'));
test('budgetLabel returns undefined with no budget', () => assert.equal(budgetLabel(null, null), undefined));

test('titleCase turns sentence-case tags and snake_case flags into labels', () => {
  assert.equal(titleCase('closed storage'), 'Closed Storage');
  assert.equal(titleCase('hoa_review'), 'Hoa Review');
  assert.equal(titleCase('place for the dog'), 'Place for the Dog');
});

test('Q12 tags say what the client chose, not an internal scale', () => {
  const q12 = QUESTIONS.find((q) => q.id === 'Q12')!;
  for (const answer of Object.values(q12.choices!)) for (const tag of answer.tags) assert.doesNotMatch(tag, /quiet/i);
});
