import test from 'node:test';
import assert from 'node:assert/strict';

import { getBrandingWatermark, resolveCreatorTier } from './watermark.ts';

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
