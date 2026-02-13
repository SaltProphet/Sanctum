import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateCreatorPreflight,
  type PaymentProvider,
  type VerificationProvider,
  type PreflightFailureCode,
} from './creatorGate.ts';

function createPaymentProvider(
  state: 'settled' | 'unsettled',
  failureCode: PreflightFailureCode | null = null,
): PaymentProvider {
  return {
    async getSettlementState() {
      return state;
    },
    async getFailureCode() {
      return failureCode;
    },
  };
}

function createVerificationProvider(state: 'verified' | 'unverified'): VerificationProvider {
  return {
    async getVerificationState() {
      return state;
    },
  };
}

test('preflight passes when creator is settled and verified', async () => {
  const result = await evaluateCreatorPreflight({
    creatorIdentityId: 'creator-123',
    paymentProvider: createPaymentProvider('settled'),
    verificationProvider: createVerificationProvider('verified'),
  });

  assert.deepEqual(result, {
    ok: true,
    failures: [],
  });
});

test('preflight blocks creator when payment settlement is incomplete', async () => {
  const result = await evaluateCreatorPreflight({
    creatorIdentityId: 'creator-123',
    paymentProvider: createPaymentProvider('unsettled'),
    verificationProvider: createVerificationProvider('verified'),
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, [
    {
      gate: 'payment',
      code: 'PAYMENT_UNSETTLED',
      message: 'Deposit is pending settlement. Wait for provider confirmation webhook.',
    },
  ]);
});

test('preflight returns retryable failure message for failed deposits', async () => {
  const result = await evaluateCreatorPreflight({
    creatorIdentityId: 'creator-123',
    paymentProvider: createPaymentProvider('unsettled', 'PAYMENT_FAILED_RETRYABLE'),
    verificationProvider: createVerificationProvider('verified'),
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.failures[0], {
    gate: 'payment',
    code: 'PAYMENT_FAILED_RETRYABLE',
    message: 'Deposit failed. Retry by initiating a new deposit.',
  });
});

test('preflight returns both failures when payment and verification fail', async () => {
  const result = await evaluateCreatorPreflight({
    creatorIdentityId: 'creator-123',
    paymentProvider: createPaymentProvider('unsettled'),
    verificationProvider: createVerificationProvider('unverified'),
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, [
    {
      gate: 'payment',
      code: 'PAYMENT_UNSETTLED',
      message: 'Deposit is pending settlement. Wait for provider confirmation webhook.',
    },
    {
      gate: 'verification',
      code: 'IDENTITY_UNVERIFIED',
      message: 'Creator identity verification is incomplete.',
    },
  ]);
});
