import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { isVeriffSuccessPayload, verifyVeriffWebhookSignature } from './veriffWebhook.ts';

test('recognizes success payload', () => {
  assert.equal(isVeriffSuccessPayload({ verification: { status: 'approved' } }), true);
  assert.equal(isVeriffSuccessPayload({ verification: { status: 'declined' } }), false);
});

test('validates webhook signature', () => {
  const rawBody = JSON.stringify({ creatorId: 'creator-1', verification: { status: 'approved' } });
  const secret = 'test-secret';
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');

  assert.equal(verifyVeriffWebhookSignature(rawBody, signature, secret), true);
  assert.equal(verifyVeriffWebhookSignature(rawBody, 'bad-signature', secret), false);
});
