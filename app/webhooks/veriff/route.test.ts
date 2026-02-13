import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { resetWebhookState } from '../../../lib/webhookProcessor.ts';

import { POST } from './route.ts';

function sign(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

test('compatibility alias proxies to canonical implementation', async () => {
  process.env.VERIFF_WEBHOOK_SECRET = 'veriff-test-secret';
  resetWebhookState();

  const timestamp = String(Date.now());
  const rawBody = JSON.stringify({
    eventId: 'evt-compat',
    creatorId: 'creator-compat',
    status: 'verified',
    occurredAt: 500,
  });

  const response = await POST(
    new Request('http://localhost/webhooks/veriff', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-veriff-signature': sign('veriff-test-secret', timestamp, rawBody),
        'x-veriff-timestamp': timestamp,
      },
      body: rawBody,
    }),
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json() as { ok: boolean }).ok, true);
});
