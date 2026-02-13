import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { resetWebhookState } from '../../../../lib/webhookProcessor.ts';

import { POST } from './route.ts';

const WEBHOOK_SECRET = 'veriff-test-secret';

function sign(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

function buildRequest(rawBody: string, signature: string, timestamp: string): Request {
  return new Request('http://localhost/api/webhooks/veriff', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-veriff-signature': signature,
      'x-veriff-timestamp': timestamp,
    },
    body: rawBody,
  });
}

test('returns 401 when signature is invalid', async () => {
  process.env.VERIFF_WEBHOOK_SECRET = WEBHOOK_SECRET;
  resetWebhookState();

  const timestamp = String(Date.now());
  const rawBody = JSON.stringify({
    eventId: 'evt-invalid-signature',
    creatorId: 'creator-1',
    status: 'verified',
    occurredAt: 100,
  });

  const response = await POST(buildRequest(rawBody, 'bad-signature', timestamp) as never);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Webhook verification failed.' });
});

test('returns 400 when payload is missing required fields', async () => {
  process.env.VERIFF_WEBHOOK_SECRET = WEBHOOK_SECRET;
  resetWebhookState();

  const timestamp = String(Date.now());
  const rawBody = JSON.stringify({
    eventId: 'evt-invalid-payload',
    status: 'verified',
    occurredAt: 200,
  });
  const signature = sign(WEBHOOK_SECRET, timestamp, rawBody);

  const response = await POST(buildRequest(rawBody, signature, timestamp) as never);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid webhook payload.' });
});

test('returns success and updates creator verification state', async () => {
  process.env.VERIFF_WEBHOOK_SECRET = WEBHOOK_SECRET;
  resetWebhookState();

  const timestamp = String(Date.now());
  const rawBody = JSON.stringify({
    eventId: 'evt-success',
    creatorId: 'creator-success',
    status: 'verified',
    occurredAt: 300,
  });
  const signature = sign(WEBHOOK_SECRET, timestamp, rawBody);

  const response = await POST(buildRequest(rawBody, signature, timestamp) as never);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    creatorState: {
      verificationState: 'verified',
      paymentState: 'unsettled',
      verificationUpdatedAt: 300,
      paymentUpdatedAt: 0,
    },
  });
});
