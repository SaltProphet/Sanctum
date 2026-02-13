import test from 'node:test';
import assert from 'node:assert/strict';

import { parseRequestBodyAsJson, parseResponseBodyAsJson } from './jsonUtils.ts';

test('parseResponseBodyAsJson returns parsed JSON for valid response', async () => {
  const response = new Response(JSON.stringify({ success: true, value: 42 }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await parseResponseBodyAsJson(response);
  assert.deepEqual(result, { success: true, value: 42 });
});

test('parseResponseBodyAsJson returns null for invalid JSON', async () => {
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

  const result = await parseResponseBodyAsJson(response);
  assert.equal(result, null);
});

test('parseRequestBodyAsJson returns parsed JSON for valid request', async () => {
  const request = new Request('https://example.com', {
    method: 'POST',
    body: JSON.stringify({ action: 'create', id: 123 }),
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await parseRequestBodyAsJson(request);
  assert.deepEqual(result, { action: 'create', id: 123 });
});

test('parseRequestBodyAsJson returns null for invalid JSON', async () => {
  const request = new Request('https://example.com', {
    method: 'POST',
    body: 'invalid json content',
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await parseRequestBodyAsJson(request);
  assert.equal(result, null);
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
