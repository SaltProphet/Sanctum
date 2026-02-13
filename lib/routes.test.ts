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
