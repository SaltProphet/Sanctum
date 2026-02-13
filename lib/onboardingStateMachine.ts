export type OnboardingStatus =
  | 'created'
  | 'email_verified'
  | 'deposit_paid'
  | 'veriff_started'
  | 'veriff_passed'
  | 'vault_archived'
  | 'active';

export type TransitionActor = 'system' | 'webhook' | 'user';

export type OnboardingTransition = {
  from: OnboardingStatus | null;
  to: OnboardingStatus;
  occurredAt: string;
  actor: TransitionActor;
  source: TransitionActor;
};

export type CreatorOnboardingRecord = {
  creatorId: string;
  status: OnboardingStatus;
  transitions: OnboardingTransition[];
};

const ALLOWED_TRANSITIONS: Record<OnboardingStatus, OnboardingStatus[]> = {
  created: ['email_verified'],
  email_verified: ['deposit_paid'],
  deposit_paid: ['veriff_started'],
  veriff_started: ['veriff_passed'],
  veriff_passed: ['vault_archived'],
  vault_archived: ['active'],
  active: [],
};

const onboardingStore = new Map<string, CreatorOnboardingRecord>();

export function getCreatorOnboardingRecord(creatorId: string): CreatorOnboardingRecord {
  const existing = onboardingStore.get(creatorId);

  if (existing) {
    return existing;
  }

  const createdRecord: CreatorOnboardingRecord = {
    creatorId,
    status: 'created',
    transitions: [
      {
        from: null,
        to: 'created',
        occurredAt: new Date().toISOString(),
        actor: 'system',
        source: 'system',
      },
    ],
  };

  onboardingStore.set(creatorId, createdRecord);
  return createdRecord;
}

export function canTransition(from: OnboardingStatus, to: OnboardingStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transitionCreatorOnboardingStatus(params: {
  creatorId: string;
  to: OnboardingStatus;
  actor: TransitionActor;
  source: TransitionActor;
}): CreatorOnboardingRecord {
  const record = getCreatorOnboardingRecord(params.creatorId);

  if (!canTransition(record.status, params.to)) {
    throw new Error(`Invalid onboarding transition: ${record.status} -> ${params.to}`);
  }

  const transition: OnboardingTransition = {
    from: record.status,
    to: params.to,
    occurredAt: new Date().toISOString(),
    actor: params.actor,
    source: params.source,
  };

  record.status = params.to;
  record.transitions.push(transition);

  onboardingStore.set(params.creatorId, record);
  return record;
}

export function assertCreatorIsActive(creatorId: string): void {
  const record = getCreatorOnboardingRecord(creatorId);

  if (record.status !== 'active') {
    throw new Error(`Creator ${creatorId} is not active (current status: ${record.status}).`);
  }
}

export function parseCreatorIdFromRequest(request: Request): string | null {
  const headerValue = request.headers.get('x-creator-id');

  if (headerValue && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  return null;
}

export function resetOnboardingStore(): void {
  onboardingStore.clear();
}
