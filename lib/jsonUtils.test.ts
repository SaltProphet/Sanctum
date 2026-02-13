import assert from 'node:assert/strict';
import test from 'node:test';

import { parseJsonResponse, parseJsonRequest, isValidString } from './jsonUtils.ts';

test('parseJsonResponse returns parsed JSON for valid response', async () => {
  const response = new Response(JSON.stringify({ hello: 'world' }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await parseJsonResponse(response);

  assert.deepEqual(result, { hello: 'world' });
});

test('parseJsonResponse returns null for invalid JSON', async () => {
  const response = new Response('not valid json', {
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await parseJsonResponse(response);

  assert.equal(result, null);
});

test('parseJsonRequest returns parsed JSON for valid request', async () => {
  const request = new Request('http://example.com', {
    method: 'POST',
    body: JSON.stringify({ test: 'data' }),
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await parseJsonRequest(request);

  assert.deepEqual(result, { test: 'data' });
});

test('parseJsonRequest returns null for invalid JSON', async () => {
  const request = new Request('http://example.com', {
    method: 'POST',
    body: 'invalid json',
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await parseJsonRequest(request);

  assert.equal(result, null);
});

test('isValidString returns true for non-empty strings', () => {
  assert.equal(isValidString('hello'), true);
  assert.equal(isValidString('a'), true);
  assert.equal(isValidString('  spaces  '), true);
});

test('isValidString returns false for empty strings by default', () => {
  assert.equal(isValidString(''), false);
});

test('isValidString returns true for empty strings when allowed', () => {
  assert.equal(isValidString('', true), true);
});

test('isValidString returns false for non-string types', () => {
  assert.equal(isValidString(123), false);
  assert.equal(isValidString(null), false);
  assert.equal(isValidString(undefined), false);
  assert.equal(isValidString({}), false);
  assert.equal(isValidString([]), false);
  assert.equal(isValidString(true), false);
});
