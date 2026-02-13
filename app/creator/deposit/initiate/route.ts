import {
  getCreatorOnboardingRecord,
  parseCreatorIdFromRequest,
  transitionCreatorOnboardingStatus,
} from '@/lib/onboardingStateMachine';

type DepositInitiateRequest = {
  creatorId?: unknown;
};

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

async function parseRequestBody(request: Request): Promise<DepositInitiateRequest | null> {
  try {
    return (await request.json()) as DepositInitiateRequest;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = await parseRequestBody(request);
  const creatorIdFromBody = typeof body?.creatorId === 'string' ? body.creatorId : null;
  const creatorId = parseCreatorIdFromRequest(request) ?? creatorIdFromBody;

  if (!creatorId) {
    return Response.json({ error: 'creatorId is required.' }, { status: 400 });
  }

  const record = getCreatorOnboardingRecord(creatorId);

  try {
    if (record.status === 'created') {
      transitionCreatorOnboardingStatus({
        creatorId,
        to: 'email_verified',
        actor: 'user',
        source: 'user',
      });
    }

    transitionCreatorOnboardingStatus({
      creatorId,
      to: 'deposit_paid',
      actor: 'user',
      source: 'user',
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update onboarding state.',
      },
      { status: 409 },
    );
  }

  return Response.json({
    paymentIntent: {
      id: randomId('pi'),
      amount: 100,
      currency: 'usd',
      status: 'succeeded',
    },
    onboarding: getCreatorOnboardingRecord(creatorId),
  });
}
