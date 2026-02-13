import assert from 'node:assert/strict';
import test from 'node:test';

import { getTokenExpiration } from '@/lib/meetingToken';

test('caps token expiration to max token ttl when room expires later', () => {
  const now = 1_700_000_000;
  const roomExpiration = now + 1_800;

  assert.equal(getTokenExpiration(now, roomExpiration), now + 900);
});

test('caps token expiration to room expiration when room expires sooner', () => {
  const now = 1_700_000_000;
  const roomExpiration = now + 120;

  assert.equal(getTokenExpiration(now, roomExpiration), now + 120);
});

test('returns null when room already expired', () => {
  const now = 1_700_000_000;

  assert.equal(getTokenExpiration(now, now), null);
  assert.equal(getTokenExpiration(now, now - 60), null);
});
