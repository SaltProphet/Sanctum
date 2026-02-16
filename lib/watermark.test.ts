import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBrandingWatermark,
  resolveCreatorTier,
  buildWatermarkText,
  createWatermarkTiles,
  getClientIpHash,
  getWatermarkMetadata,
  resolveClientIpFromHeaders,
} from './watermark.ts';

test('resolveCreatorTier defaults to burner', () => {
  assert.equal(resolveCreatorTier(null), 'burner');
  assert.equal(resolveCreatorTier('unknown'), 'burner');
});

test('resolveCreatorTier maps tier values', () => {
  assert.equal(resolveCreatorTier('2'), 'professional');
  assert.equal(resolveCreatorTier('professional'), 'professional');
  assert.equal(resolveCreatorTier('3'), 'empire');
  assert.equal(resolveCreatorTier('empire'), 'empire');
});

test('burner tier returns Sanctum watermark', () => {
  assert.deepEqual(getBrandingWatermark({ tierParam: '1', customLogoUrlParam: null }), {
    kind: 'sanctum',
    src: '/SanctumLogo.png',
    alt: 'Powered by Sanctum watermark',
  });
});

test('professional tier removes branding watermark', () => {
  assert.deepEqual(getBrandingWatermark({ tierParam: '2', customLogoUrlParam: null }), {
    kind: 'none',
  });
});

test('empire tier prefers provided logo URL and falls back', () => {
  assert.deepEqual(getBrandingWatermark({ tierParam: '3', customLogoUrlParam: '/logos/jessica-logo.png' }), {
    kind: 'custom',
    src: '/logos/jessica-logo.png',
    alt: 'Creator branding watermark',
  });

  assert.deepEqual(getBrandingWatermark({ tierParam: '3', customLogoUrlParam: null }), {
    kind: 'custom',
    src: '/UserUpload.png',
    alt: 'Creator branding watermark',
  });
});

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
  assert.match(text, /^DO NOT RECORD • SESSION abcd1234 • IP_HASH f{12}$/);
});

test('createWatermarkTiles returns stable tile pattern for same seed', () => {
  const seed = 'room-x:session-y:hash-z';
  const first = createWatermarkTiles(seed);
  const second = createWatermarkTiles(seed);

  assert.equal(first.length, 18);
  assert.deepEqual(first, second);
});

test('watermark metadata is deterministic and matches expected shape', () => {
  const ipHash = getClientIpHash('203.0.113.100');
  const first = getWatermarkMetadata('session-abc', ipHash, 'room-123');
  const second = getWatermarkMetadata('session-abc', ipHash, 'room-123');

  assert.deepEqual(Object.keys(first).sort(), ['clientIpHash', 'roomId', 'sessionId', 'watermarkId']);
  assert.deepEqual(first, second);
  assert.equal(first.sessionId, 'session-abc');
  assert.equal(first.clientIpHash, ipHash);
  assert.equal(first.roomId, 'room-123');
  assert.equal(first.watermarkId.length, 64);
  assert.notEqual(first.watermarkId, '203.0.113.100');
});

test('hash caching returns consistent results', () => {
  // Generate hash for same input multiple times
  const ip1 = '192.0.2.1';
  const hash1 = getClientIpHash(ip1);
  const hash2 = getClientIpHash(ip1);
  const hash3 = getClientIpHash(ip1);
  
  // All should be identical (and use cached value)
  assert.equal(hash1, hash2);
  assert.equal(hash2, hash3);
  assert.equal(hash1.length, 64);
});

test('hash produces different outputs for different inputs', () => {
  const hash1 = getClientIpHash('192.0.2.1');
  const hash2 = getClientIpHash('192.0.2.2');
  const hash3 = getClientIpHash('192.0.2.3');
  
  // All should be different
  assert.notEqual(hash1, hash2);
  assert.notEqual(hash2, hash3);
  assert.notEqual(hash1, hash3);
});
