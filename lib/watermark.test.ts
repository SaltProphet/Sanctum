import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWatermarkText,
  createWatermarkTiles,
  getClientIpHash,
  getWatermarkMetadata,
  resolveClientIpFromHeaders,
} from './watermark.ts';

test('resolveClientIpFromHeaders reads first valid forwarded IP', () => {
  const headers = new Headers({ 'x-forwarded-for': '198.51.100.25, 10.0.0.1' });
  assert.equal(resolveClientIpFromHeaders(headers), '198.51.100.25');
});

test('resolveClientIpFromHeaders ignores malformed inputs', () => {
  const headers = new Headers({ 'x-forwarded-for': 'unknown-ip-value' });
  assert.equal(resolveClientIpFromHeaders(headers), null);
});

test('buildWatermarkText includes masked identifiers', () => {
  const text = buildWatermarkText('abcd1234-1111-2222-3333-444455556666', 'f'.repeat(64));
  assert.match(text, /^DO NOT RECORD • SESSION abcd1234 • IPH f{12}$/);
});

test('createWatermarkTiles returns stable tile pattern for same seed', () => {
  const seed = 'room-x:session-y:hash-z';
  const first = createWatermarkTiles(seed);
  const second = createWatermarkTiles(seed);

  assert.equal(first.length, 18);
  assert.deepEqual(first, second);
});

test('watermark metadata is deterministic and does not include raw IP', () => {
  const ipHash = getClientIpHash('203.0.113.100');
  const metadata = getWatermarkMetadata('session-abc', ipHash, 'room-123');

  assert.equal(metadata.sessionId, 'session-abc');
  assert.equal(metadata.clientIpHash, ipHash);
  assert.equal(metadata.roomId, 'room-123');
  assert.equal(metadata.watermarkId.length, 64);
  assert.notEqual(metadata.watermarkId, '203.0.113.100');
});
