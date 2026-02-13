import {
  getCreatorOnboardingRecord,
  parseCreatorIdFromRequest,
  transitionCreatorOnboardingStatus,
} from '@/lib/onboardingStateMachine';

type VeriffSessionRequest = {
  creatorId?: unknown;
};

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

async function parseRequestBody(request: Request): Promise<VeriffSessionRequest | null> {
  try {
    return (await request.json()) as VeriffSessionRequest;
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

  if (record.status !== 'deposit_paid') {
    return Response.json(
      {
        error: `Veriff session can only be created after deposit is paid (current status: ${record.status}).`,
      },
      { status: 403 },
    );
  }

  transitionCreatorOnboardingStatus({
    creatorId,
    to: 'veriff_started',
    actor: 'user',
    source: 'user',
  });

  const sessionId = randomId('veriff');

  return Response.json({
    sessionId,
    url: `https://stationapi.veriff.com/v1/sessions/${sessionId}`,
    onboarding: getCreatorOnboardingRecord(creatorId),
  });
}
