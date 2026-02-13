import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  initiateDeposit,
  processWebhookEvent,
  resetPaymentStore,
  verifyWebhookSignature,
  getDepositByCreatorId,
} from './payments.ts';

test.beforeEach(() => {
  resetPaymentStore();
});

test('deposit initiation is idempotent by provider + idempotency key', () => {
  const first = initiateDeposit({
    idempotencyKey: 'abc-123',
    creatorId: 'creator-1',
    provider: 'stripe',
    amount: 500,
    currency: 'usd',
  });

  const second = initiateDeposit({
    idempotencyKey: 'abc-123',
    creatorId: 'creator-1',
    provider: 'stripe',
    amount: 500,
    currency: 'usd',
  });

  assert.equal(first.payment_intent_id, second.payment_intent_id);
  assert.equal(first.status, 'deposit_pending');
  assert.equal(first.currency, 'USD');
});

test('webhook marks deposit paid only on settled/succeeded and blocks duplicates', () => {
  const deposit = initiateDeposit({
    idempotencyKey: 'abc-124',
    creatorId: 'creator-1',
    provider: 'stripe',
    amount: 500,
    currency: 'usd',
  });

  const pendingResult = processWebhookEvent({
    id: 'evt-pending',
    type: 'payment_intent.processing',
    data: {
      payment_intent_id: deposit.payment_intent_id,
    },
  });

  assert.deepEqual(pendingResult, { processed: false, reason: 'ignored' });
  assert.equal(getDepositByCreatorId('creator-1')?.status, 'deposit_pending');

  const succeededResult = processWebhookEvent({
    id: 'evt-success',
    type: 'payment_intent.succeeded',
    data: {
      payment_intent_id: deposit.payment_intent_id,
      amount: 500,
      currency: 'usd',
    },
  });

  assert.deepEqual(succeededResult, { processed: true });
  assert.equal(getDepositByCreatorId('creator-1')?.status, 'deposit_paid');

  const duplicateSucceeded = processWebhookEvent({
    id: 'evt-success',
    type: 'payment_intent.succeeded',
    data: {
      payment_intent_id: deposit.payment_intent_id,
    },
  });

  assert.deepEqual(duplicateSucceeded, { processed: false, reason: 'duplicate' });
});

test('webhook can set failed and refunded states', () => {
  const failedDeposit = initiateDeposit({
    idempotencyKey: 'abc-125',
    creatorId: 'creator-failed',
    provider: 'stripe',
    amount: 500,
    currency: 'usd',
  });

  processWebhookEvent({
    id: 'evt-fail',
    type: 'payment_intent.failed',
    data: {
      payment_intent_id: failedDeposit.payment_intent_id,
    },
  });

  assert.equal(getDepositByCreatorId('creator-failed')?.status, 'deposit_failed');

  const refundedDeposit = initiateDeposit({
    idempotencyKey: 'abc-126',
    creatorId: 'creator-refunded',
    provider: 'stripe',
    amount: 500,
    currency: 'usd',
  });

  processWebhookEvent({
    id: 'evt-refund',
    type: 'charge.refunded',
    data: {
      payment_intent_id: refundedDeposit.payment_intent_id,
    },
  });

  assert.equal(getDepositByCreatorId('creator-refunded')?.status, 'deposit_refunded');
});

test('webhook signature verification is strict and required', () => {
  const secret = 'super-secret';
  const payload = JSON.stringify({ hello: 'world' });
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  assert.equal(verifyWebhookSignature(payload, signature, secret), true);
  assert.equal(verifyWebhookSignature(payload, 'bad-signature', secret), false);
  assert.equal(verifyWebhookSignature(payload, null, secret), false);
});
