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
