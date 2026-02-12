import { createUniqueRoomName } from '@/lib/roomName';
import { getPassDurationSeconds, isPassType, type PassType } from '@/lib/passType';

const DAILY_ROOMS_URL = 'https://api.daily.co/v1/rooms';

type DailyRoomResponse = {
  url?: unknown;
  name?: unknown;
};

type CreateRoomRequestBody = {
  passType?: unknown;
};

async function tryParseJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getRequestedPassType(body: CreateRoomRequestBody): PassType | null {
  if (!isPassType(body.passType)) {
    return null;
  }

  return body.passType;
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'Server is missing DAILY_API_KEY configuration.' }, { status: 500 });
  }

  const body = (await tryParseJson(request)) as CreateRoomRequestBody | null;
  const passType = body ? getRequestedPassType(body) : null;

  if (!passType) {
    return Response.json({ error: 'Invalid passType. Expected "quickie" or "marathon".' }, { status: 400 });
  }

  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  const expirationSeconds = getPassDurationSeconds(passType);
  const expiresAtEpochSeconds = nowEpochSeconds + expirationSeconds;

  const payload = {
    name: createUniqueRoomName(),
    privacy: 'public' as const,
    properties: {
      exp: expiresAtEpochSeconds,
      enable_chat: true,
      start_video_off: false,
      pass_type: passType,
      pass_duration_seconds: expirationSeconds,
      pass_expires_at: expiresAtEpochSeconds,
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

  const { url, name } = upstreamBody as DailyRoomResponse;

  if (typeof url !== 'string' || typeof name !== 'string') {
    return Response.json({ error: 'Daily rooms API response is missing room fields.' }, { status: 502 });
  }

  return Response.json({ roomName: name, url, name, passType, expiresAtEpochSeconds });
}
