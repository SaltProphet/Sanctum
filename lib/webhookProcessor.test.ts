import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { applyWebhookEvent, getCreatorState, resetWebhookState, verifyWebhookRequest } from './webhookProcessor.ts';

function sign(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

test('valid signature accepted', () => {
  resetWebhookState();

  const secret = 'test-secret';
  const now = 1_700_000_000_000;
  const timestamp = String(now);
  const rawBody = JSON.stringify({ eventId: 'evt-1', creatorId: 'creator-1' });
  const signature = sign(secret, timestamp, rawBody);

  const result = verifyWebhookRequest({
    provider: 'veriff',
    rawBody,
    signature,
    timestamp,
    eventId: 'evt-1',
    sharedSecret: secret,
    now,
  });

  assert.equal(result.ok, true);
});

test('invalid signature rejected', () => {
  resetWebhookState();

  const now = 1_700_000_000_000;
  const rawBody = JSON.stringify({ eventId: 'evt-1', creatorId: 'creator-1' });

  const result = verifyWebhookRequest({
    provider: 'payments',
    rawBody,
    signature: 'deadbeef',
    timestamp: String(now),
    eventId: 'evt-1',
    sharedSecret: 'payments-secret',
    now,
  });

  assert.deepEqual(result, {
    ok: false,
    reason: 'invalid-signature',
  });
});

test('duplicate event rejected', () => {
  resetWebhookState();

  const secret = 'test-secret';
  const now = 1_700_000_000_000;
  const timestamp = String(now);
  const rawBody = JSON.stringify({ eventId: 'evt-2', creatorId: 'creator-2' });
  const signature = sign(secret, timestamp, rawBody);

  const first = verifyWebhookRequest({
    provider: 'veriff',
    rawBody,
    signature,
    timestamp,
    eventId: 'evt-2',
    sharedSecret: secret,
    now,
  });

  const duplicate = verifyWebhookRequest({
    provider: 'veriff',
    rawBody,
    signature,
    timestamp,
    eventId: 'evt-2',
    sharedSecret: secret,
    now,
  });

  assert.equal(first.ok, true);
  assert.deepEqual(duplicate, {
    ok: false,
    reason: 'duplicate-event',
  });
});

test('out-of-order events do not corrupt state machine', () => {
  resetWebhookState();

  applyWebhookEvent({
    creatorId: 'creator-3',
    provider: 'payments',
    state: 'settled',
    occurredAt: 200,
  });

  applyWebhookEvent({
    creatorId: 'creator-3',
    provider: 'payments',
    state: 'unsettled',
    occurredAt: 150,
  });

  applyWebhookEvent({
    creatorId: 'creator-3',
    provider: 'veriff',
    state: 'verified',
    occurredAt: 300,
  });

  applyWebhookEvent({
    creatorId: 'creator-3',
    provider: 'veriff',
    state: 'unverified',
    occurredAt: 100,
  });

  assert.deepEqual(getCreatorState('creator-3'), {
    paymentState: 'settled',
    verificationState: 'verified',
    paymentUpdatedAt: 200,
    verificationUpdatedAt: 300,
  });
});

test('creator state map stays bounded under high load', () => {
  resetWebhookState();
  
  // Add more than MAX_CREATOR_STATE_SIZE (5000) entries
  // This simulates high webhook volume
  for (let i = 0; i < 5100; i++) {
    applyWebhookEvent({
      creatorId: `creator-${i}`,
      provider: 'veriff',
      state: 'verified',
      occurredAt: Date.now(),
    });
  }
  
  // Verify early creators were evicted and state is bounded
  const state1 = getCreatorState('creator-0');
  const state50 = getCreatorState('creator-50');
  const state5099 = getCreatorState('creator-5099');
  
  // Early creators should be evicted (default state returned)
  assert.equal(state1.verificationState, 'unverified');
  assert.equal(state50.verificationState, 'unverified');
  
  // Recent creators should still exist
  assert.equal(state5099.verificationState, 'verified');
});
