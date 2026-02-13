export type BackendCreatorStatus =
  | 'account_created'
  | 'payment_pending'
  | 'payment_failed'
  | 'verification_required'
  | 'verification_failed'
  | 'review_in_progress'
  | 'review_passed'
  | 'manual_review_required'
  | 'active';

export type OnboardingStepId =
  | 'account'
  | 'payment'
  | 'verification'
  | 'review'
  | 'safe_room';

export type OnboardingStepState = 'complete' | 'current' | 'upcoming';

export type OnboardingAction = {
  id: 'retry_payment' | 'restart_verification' | 'contact_support';
  label: string;
};

export type OnboardingStatusView = {
  title: string;
  description: string;
  actions: OnboardingAction[];
  currentStep: OnboardingStepId;
};

export type OnboardingStep = {
  id: OnboardingStepId;
  label: string;
  state: OnboardingStepState;
};

const STEP_ORDER: OnboardingStepId[] = ['account', 'payment', 'verification', 'review', 'safe_room'];

export const ONBOARDING_STEP_LABELS: Record<OnboardingStepId, string> = {
  account: 'Account created',
  payment: '$1 verification payment',
  verification: 'ID + selfie verification',
  review: 'Review in progress / passed',
  safe_room: 'Safe Room activated',
};

const STATUS_VIEW: Record<BackendCreatorStatus, OnboardingStatusView> = {
  account_created: {
    title: 'Account created',
    description: 'Your account is ready. Complete your $1 verification payment to continue.',
    actions: [{ id: 'retry_payment', label: 'Pay $1 verification fee' }],
    currentStep: 'payment',
  },
  payment_pending: {
    title: 'Payment pending',
    description: 'Your payment is still processing. You can retry if this has taken too long.',
    actions: [{ id: 'retry_payment', label: 'Retry payment' }],
    currentStep: 'payment',
  },
  payment_failed: {
    title: 'Payment failed',
    description: 'We could not confirm the $1 verification payment.',
    actions: [{ id: 'retry_payment', label: 'Retry payment' }],
    currentStep: 'payment',
  },
  verification_required: {
    title: 'Verification required',
    description: 'Complete your ID + selfie check to move into review.',
    actions: [{ id: 'restart_verification', label: 'Start verification session' }],
    currentStep: 'verification',
  },
  verification_failed: {
    title: 'Verification incomplete',
    description: 'Your last identity session was not accepted. Restart and try again.',
    actions: [{ id: 'restart_verification', label: 'Restart verification session' }],
    currentStep: 'verification',
  },
  review_in_progress: {
    title: 'Review in progress',
    description: 'Our team is reviewing your submission. Most reviews complete quickly.',
    actions: [{ id: 'contact_support', label: 'Contact support for manual review' }],
    currentStep: 'review',
  },
  review_passed: {
    title: 'Review passed',
    description: 'Identity checks passed. We are activating your Safe Room now.',
    actions: [],
    currentStep: 'review',
  },
  manual_review_required: {
    title: 'Manual review required',
    description: 'We need a manual review before activation.',
    actions: [{ id: 'contact_support', label: 'Contact support with reference ID' }],
    currentStep: 'review',
  },
  active: {
    title: 'Safe Room activated',
    description: 'You are fully verified and can access all dashboard features.',
    actions: [],
    currentStep: 'safe_room',
  },
};

export function getOnboardingStatusView(status: BackendCreatorStatus): OnboardingStatusView {
  return STATUS_VIEW[status];
}

export function buildOnboardingSteps(status: BackendCreatorStatus): OnboardingStep[] {
  const { currentStep } = getOnboardingStatusView(status);
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return STEP_ORDER.map((stepId, index) => {
    const state: OnboardingStepState =
      index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';

    return {
      id: stepId,
      label: ONBOARDING_STEP_LABELS[stepId],
      state,
    };
  });
}

export function parseBackendCreatorStatus(input: string | null | undefined): BackendCreatorStatus {
  switch (input) {
    case 'account_created':
    case 'payment_pending':
    case 'payment_failed':
    case 'verification_required':
    case 'verification_failed':
    case 'review_in_progress':
    case 'review_passed':
    case 'manual_review_required':
    case 'active':
      return input;
    default:
      return 'account_created';
  }
}
