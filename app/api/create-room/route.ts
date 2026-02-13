import {
  createPaymentProvider,
  createVerificationProvider,
  evaluateCreatorPreflight,
  type CreatorPreflightFailure,
} from '@/lib/creatorGate';
import { parseJsonRequest, parseJsonResponse } from '@/lib/jsonUtils';
import { appRoutes } from '@/lib/routes';
import { createUniqueRoomName } from '@/lib/roomName';

const DAILY_ROOMS_URL = 'https://api.daily.co/v1/rooms';
const ROOM_EXPIRATION_SECONDS = 1800;

type DailyRoomResponse = {
  name?: unknown;
};

type CreateRoomRequestBody = {
  creatorIdentityId?: unknown;
};

type PreflightErrorResponse = {
  error: {
    code: 'CREATOR_PREFLIGHT_FAILED';
    message: string;
    failures: CreatorPreflightFailure[];
  };
};

function getCreatorIdentityId(parsedBody: unknown): string {
  if (!parsedBody || typeof parsedBody !== 'object') {
    return 'mock-creator';
  }

  const { creatorIdentityId } = parsedBody as CreateRoomRequestBody;

  if (typeof creatorIdentityId !== 'string' || creatorIdentityId.trim().length === 0) {
    return 'mock-creator';
  }

  return creatorIdentityId.trim();
}

function buildPreflightErrorResponse(failures: CreatorPreflightFailure[]): PreflightErrorResponse {
  return {
    error: {
      code: 'CREATOR_PREFLIGHT_FAILED',
      message: 'Creator identity did not pass required preflight checks.',
      failures,
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  const parsedBody = await parseJsonRequest(request);
  const creatorIdentityId = getCreatorIdentityId(parsedBody);

  const preflightResult = await evaluateCreatorPreflight({
    creatorIdentityId,
    paymentProvider: createPaymentProvider(),
    verificationProvider: createVerificationProvider(),
  });

  if (!preflightResult.ok) {
    return Response.json(buildPreflightErrorResponse(preflightResult.failures), { status: 403 });
  }

  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'Server is missing DAILY_API_KEY configuration.' }, { status: 500 });
  }

  const payload = {
    name: createUniqueRoomName(),
    privacy: 'private' as const,
    properties: {
      exp: Math.floor(Date.now() / 1000) + ROOM_EXPIRATION_SECONDS,
      enable_chat: true,
      start_video_off: false,
    },
  };

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(DAILY_ROOMS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return Response.json({ error: 'Failed to reach Daily rooms API.' }, { status: 502 });
  }

  const upstreamBody = await parseJsonResponse(upstreamResponse);

  if (!upstreamResponse.ok) {
    const upstreamErrorMessage =
      upstreamBody &&
      typeof upstreamBody === 'object' &&
      'error' in upstreamBody &&
      typeof (upstreamBody as { error?: unknown }).error === 'string'
        ? (upstreamBody as { error: string }).error
        : 'Daily rooms API returned an error.';

    return Response.json(
      {
        error: upstreamErrorMessage,
        status: upstreamResponse.status,
      },
      { status: 502 },
    );
  }

  if (!upstreamBody || typeof upstreamBody !== 'object') {
    return Response.json({ error: 'Daily rooms API returned invalid JSON.' }, { status: 502 });
  }

  const { name } = upstreamBody as DailyRoomResponse;

  if (typeof name !== 'string') {
    return Response.json({ error: 'Daily rooms API response is missing room fields.' }, { status: 502 });
  }

  const roomPath = appRoutes.room(name);

  return Response.json({ roomName: name, url: roomPath, name });
}
