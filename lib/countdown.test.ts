import test from 'node:test';
import assert from 'node:assert/strict';
import { getNightPassRemaining } from './countdown.ts';

test('shows full 4-hour timer when just created', () => {
  const now = Date.parse('2026-01-01T00:00:00.000Z');
  assert.equal(getNightPassRemaining('2026-01-01T00:00:00.000Z', now), '04:00:00');
});

test('clamps at zero when expired', () => {
  const now = Date.parse('2026-01-01T05:30:00.000Z');
  assert.equal(getNightPassRemaining('2026-01-01T00:00:00.000Z', now), '00:00:00');
});
