import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { verifyWebhookSignature } from './webhookSignature.ts';

test('verifyWebhookSignature accepts valid signatures', () => {
  const rawBody = JSON.stringify({ hello: 'world' });
  const secret = 'test-secret';
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');

  assert.equal(verifyWebhookSignature(rawBody, signature, secret), true);
});

test('verifyWebhookSignature rejects invalid signatures', () => {
  const rawBody = JSON.stringify({ hello: 'world' });
  const secret = 'test-secret';

  assert.equal(verifyWebhookSignature(rawBody, 'bad-signature', secret), false);
  assert.equal(verifyWebhookSignature(rawBody, 'totally-wrong', secret), false);
});

test('verifyWebhookSignature rejects null signature', () => {
  const rawBody = JSON.stringify({ hello: 'world' });
  const secret = 'test-secret';

  assert.equal(verifyWebhookSignature(rawBody, null, secret), false);
});

test('verifyWebhookSignature rejects empty secret', () => {
  const rawBody = JSON.stringify({ hello: 'world' });
  const signature = createHmac('sha256', 'some-secret').update(rawBody).digest('hex');

  assert.equal(verifyWebhookSignature(rawBody, signature, ''), false);
});

test('verifyWebhookSignature is sensitive to signature changes', () => {
  const rawBody = JSON.stringify({ hello: 'world' });
  const secret = 'test-secret';
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');

  // Tamper with the signature
  const tamperedSignature = signature.slice(0, -1) + 'X';
  
  assert.equal(verifyWebhookSignature(rawBody, tamperedSignature, secret), false);
});

test('verifyWebhookSignature is sensitive to body changes', () => {
  const rawBody = JSON.stringify({ hello: 'world' });
  const tamperedBody = JSON.stringify({ hello: 'evil' });
  const secret = 'test-secret';
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');

  assert.equal(verifyWebhookSignature(tamperedBody, signature, secret), false);
});
