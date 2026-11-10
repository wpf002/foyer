import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetLabel } from '../../packages/ui/src/format';

test('budgetLabel reads an upper-only band as Under', () => assert.equal(budgetLabel(null, 1_000_000), 'Under $10k'));
test('budgetLabel reads a lower-only band as open-ended', () => assert.equal(budgetLabel(5_000_000, null), '$50k+'));
test('budgetLabel reads a closed band as a range', () => assert.equal(budgetLabel(1_000_000, 2_500_000), '$10k–$25k'));
test('budgetLabel returns undefined with no budget', () => assert.equal(budgetLabel(null, null), undefined));
