import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateCreatorPreflight,
  type PaymentProvider,
  type VerificationProvider,
} from './creatorGate.ts';

function createPaymentProvider(state: 'settled' | 'unsettled'): PaymentProvider {
  return {
    async getSettlementState() {
      return state;
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
      message: 'Payment settlement is not complete for this creator identity.',
    },
  ]);
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
      message: 'Payment settlement is not complete for this creator identity.',
    },
    {
      gate: 'verification',
      code: 'IDENTITY_UNVERIFIED',
      message: 'Creator identity verification is incomplete.',
    },
  ]);
});
