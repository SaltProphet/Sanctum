import test from 'node:test';
import assert from 'node:assert/strict';

import { getPassDurationSeconds, isPassType } from './passType.ts';

test('isPassType validates supported pass types', () => {
  assert.equal(isPassType('quickie'), true);
  assert.equal(isPassType('marathon'), true);
  assert.equal(isPassType('invalid'), false);
  assert.equal(isPassType(null), false);
});

test('getPassDurationSeconds maps pass types to expected durations', () => {
  assert.equal(getPassDurationSeconds('quickie'), 3 * 60 * 60);
  assert.equal(getPassDurationSeconds('marathon'), 24 * 60 * 60);
});
