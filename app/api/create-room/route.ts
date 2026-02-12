import {
  createPaymentProvider,
  createVerificationProvider,
  evaluateCreatorPreflight,
  type CreatorPreflightFailure,
} from '@/lib/creatorGate';
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

async function tryParseJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function tryParseRequestJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

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
  const parsedBody = await tryParseRequestJson(request);
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
    privacy: 'public' as const,
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

  const upstreamBody = await tryParseJson(upstreamResponse);

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

  const roomPath = `/room/${name}`;

  return Response.json({ roomName: name, url: roomPath, name });
}
