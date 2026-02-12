const DAILY_ROOMS_URL = 'https://api.daily.co/v1/rooms';
const ROOM_EXPIRATION_SECONDS = 1800;

type DailyRoomResponse = {
  url?: unknown;
  name?: unknown;
};

function createUniqueRoomName(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `room-${crypto.randomUUID()}`;
  }

  return `room-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function tryParseJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function POST(): Promise<Response> {
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

  const { url, name } = upstreamBody as DailyRoomResponse;

  if (typeof url !== 'string' || typeof name !== 'string') {
    return Response.json({ error: 'Daily rooms API response is missing room fields.' }, { status: 502 });
  }

  return Response.json({ roomName: name, url, name });
}
