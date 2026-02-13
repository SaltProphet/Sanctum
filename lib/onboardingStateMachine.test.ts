import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCreatorOnboardingRecord,
  resetOnboardingStore,
  transitionCreatorOnboardingStatus,
} from './onboardingStateMachine.ts';

test.beforeEach(() => {
  resetOnboardingStore();
});

test('records valid transitions with audit metadata', () => {
  const creatorId = 'creator-a';

  transitionCreatorOnboardingStatus({ creatorId, to: 'email_verified', actor: 'user', source: 'user' });
  transitionCreatorOnboardingStatus({ creatorId, to: 'deposit_paid', actor: 'user', source: 'user' });

  const record = getCreatorOnboardingRecord(creatorId);

  assert.equal(record.status, 'deposit_paid');
  assert.equal(record.transitions.length, 3);
  assert.equal(record.transitions[0].to, 'created');
  assert.equal(record.transitions[1].actor, 'user');
  assert.equal(record.transitions[1].source, 'user');
  assert.equal(typeof record.transitions[1].occurredAt, 'string');
});

test('rejects invalid transitions', () => {
  assert.throws(
    () => {
      transitionCreatorOnboardingStatus({ creatorId: 'creator-b', to: 'active', actor: 'system', source: 'system' });
    },
    {
      message: 'Invalid onboarding transition: created -> active',
    },
  );
});
