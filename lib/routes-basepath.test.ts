/**
 * Tests for lib/routes.ts with NEXT_PUBLIC_BASE_PATH set.
 * Run with: NEXT_PUBLIC_BASE_PATH=/base node --test --experimental-strip-types lib/routes-basepath.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { appRoutes, toAbsoluteAppUrl, withBasePath } from './routes.ts';

test('appRoutes include NEXT_PUBLIC_BASE_PATH exactly once', () => {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH;
  
  if (!basePath) {
    // Skip if no basePath is set
    console.log('Skipping test - no basePath set. Run with NEXT_PUBLIC_BASE_PATH=/base');
    return;
  }

  assert.equal(appRoutes.home(), basePath);
  assert.equal(appRoutes.feed(), `${basePath}/feed`);
  assert.equal(appRoutes.room('abc123'), `${basePath}/room/abc123`);
  assert.equal(appRoutes.profile(), `${basePath}/profile`);
  assert.equal(appRoutes.settings(), `${basePath}/settings`);
  assert.equal(appRoutes.creator('myslug'), `${basePath}/c/myslug`);
});

test('toAbsoluteAppUrl respects NEXT_PUBLIC_BASE_PATH without double-prefixing', () => {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH;
  
  if (!basePath) {
    console.log('Skipping test - no basePath set. Run with NEXT_PUBLIC_BASE_PATH=/base');
    return;
  }

  // Input without basePath should get it added
  assert.equal(
    toAbsoluteAppUrl('/room/test', 'https://sanctum.app'),
    `https://sanctum.app${basePath}/room/test`,
  );

  // Already has basePath - should be idempotent
  assert.equal(
    toAbsoluteAppUrl(`${basePath}/room/test`, 'https://sanctum.app'),
    `https://sanctum.app${basePath}/room/test`,
  );

  // Absolute URL should pass through unchanged
  assert.equal(
    toAbsoluteAppUrl('https://example.com/a', 'https://sanctum.app'),
    'https://example.com/a',
  );
});

test('withBasePath is idempotent', () => {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH;
  
  if (!basePath) {
    console.log('Skipping test - no basePath set. Run with NEXT_PUBLIC_BASE_PATH=/base');
    return;
  }

  // First application
  const once = withBasePath('/room/test');
  assert.equal(once, `${basePath}/room/test`);

  // Second application should return the same result (idempotent)
  const twice = withBasePath(once);
  assert.equal(twice, `${basePath}/room/test`);
  
  // Third application should still be the same
  const thrice = withBasePath(twice);
  assert.equal(thrice, `${basePath}/room/test`);
});
