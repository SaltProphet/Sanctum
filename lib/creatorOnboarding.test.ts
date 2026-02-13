import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOnboardingSteps,
  getOnboardingStatusView,
  parseBackendCreatorStatus,
} from './creatorOnboarding.ts';

test('maps payment_failed to retry payment CTA', () => {
  const view = getOnboardingStatusView('payment_failed');

  assert.equal(view.currentStep, 'payment');
  assert.deepEqual(view.actions, [{ id: 'retry_payment', label: 'Retry payment' }]);
});

test('maps verification_failed to restart verification CTA', () => {
  const view = getOnboardingStatusView('verification_failed');

  assert.equal(view.currentStep, 'verification');
  assert.deepEqual(view.actions, [{ id: 'restart_verification', label: 'Restart verification session' }]);
});

test('maps manual review state to contact support CTA', () => {
  const view = getOnboardingStatusView('manual_review_required');

  assert.deepEqual(view.actions, [{ id: 'contact_support', label: 'Contact support with reference ID' }]);
});

test('marks every step complete when active', () => {
  const steps = buildOnboardingSteps('active');

  assert.equal(steps.at(-1)?.state, 'current');
  assert.equal(steps.filter((step) => step.state === 'upcoming').length, 0);
});

test('falls back to account_created for unknown statuses', () => {
  assert.equal(parseBackendCreatorStatus('nonsense'), 'account_created');
});
