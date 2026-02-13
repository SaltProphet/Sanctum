import test from 'node:test';
import assert from 'node:assert/strict';

import { appRoutes, toAbsoluteAppUrl, withBasePath } from './routes.ts';

test('builds canonical route paths', () => {
  assert.equal(appRoutes.home(), '/');
  assert.equal(appRoutes.feed(), '/feed');
  assert.equal(appRoutes.room('abc123'), '/room/abc123');
  assert.equal(appRoutes.profile(), '/profile');
  assert.equal(appRoutes.settings(), '/settings');
});

test('withBasePath normalizes path-like input', () => {
  assert.equal(withBasePath('/dashboard'), '/dashboard');
  assert.equal(withBasePath('dashboard'), '/dashboard');
});

test('toAbsoluteAppUrl returns absolute app url', () => {
  assert.equal(toAbsoluteAppUrl('/room/test', 'https://sanctum.app'), 'https://sanctum.app/room/test');
  assert.equal(toAbsoluteAppUrl('https://example.com/a', 'https://sanctum.app'), 'https://example.com/a');
});

test('withBasePath is idempotent without basePath', () => {
  // Without basePath set, multiple applications should be consistent
  const path = '/room/test';
  const once = withBasePath(path);
  const twice = withBasePath(once);
  assert.equal(once, twice);
});

test('toAbsoluteAppUrl with basePath-prefixed input', () => {
  // When withBasePath is idempotent, toAbsoluteAppUrl should handle already-prefixed paths correctly
  // This tests that even if the path already has basePath, it won't double-prefix
  const basePrefixedPath = withBasePath('/room/test');
  const url1 = toAbsoluteAppUrl('/room/test', 'https://sanctum.app');
  const url2 = toAbsoluteAppUrl(basePrefixedPath, 'https://sanctum.app');
  
  // Both should produce the same URL since withBasePath is idempotent
  assert.equal(url1, url2);
});
