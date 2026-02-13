import type { NextRequest } from 'next/server';
import { parseJsonResponse, isValidString } from '@/lib/jsonUtils';
import { getTokenExpiration } from '@/lib/meetingToken';

const DAILY_MEETING_TOKENS_URL = 'https://api.daily.co/v1/meeting-tokens';
const DAILY_ROOMS_URL = 'https://api.daily.co/v1/rooms';
type JoinRole = 'viewer' | 'creator';

type TokenRequestBody = {
  roomName?: unknown;
  role?: unknown;
};

type DailyRoomDetailsResponse = {
  config?: {
    exp?: unknown;
  };
};

function parseBoolean(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function hasRequiredEntitlements(request: NextRequest): boolean {
  const hasPurchase =
    parseBoolean(request.headers.get('x-sanctum-purchase-verified') ?? undefined) ||
    parseBoolean(request.cookies.get('sanctum_purchase_verified')?.value);

  const hasVerification =
    parseBoolean(request.headers.get('x-sanctum-user-verified') ?? undefined) ||
    parseBoolean(request.cookies.get('sanctum_user_verified')?.value);

  return hasPurchase && hasVerification;
}

function getRole(input: unknown): JoinRole {
  return input === 'creator' ? 'creator' : 'viewer';
}

async function fetchRoomExpiration(roomName: string, apiKey: string): Promise<number | null> {
  let roomResponse: Response;

  try {
    roomResponse = await fetch(`${DAILY_ROOMS_URL}/${encodeURIComponent(roomName)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: 'no-store',
    });
  } catch {
    return null;
  }

  if (!roomResponse.ok) {
    return null;
  }

  const roomBody = (await parseJsonResponse(roomResponse)) as DailyRoomDetailsResponse | null;
  const roomExpiration = roomBody?.config?.exp;

  return typeof roomExpiration === 'number' ? roomExpiration : null;
}

export async function POST(request: NextRequest): Promise<Response> {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'Server is missing DAILY_API_KEY configuration.' }, { status: 500 });
  }

  if (!hasRequiredEntitlements(request)) {
    return Response.json({ error: 'Purchase and verification are required.' }, { status: 403 });
  }

  let body: TokenRequestBody;
  try {
    body = (await request.json()) as TokenRequestBody;
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!isValidString(body.roomName)) {
    return Response.json({ error: 'roomName is required.' }, { status: 400 });
  }

  const role = getRole(body.role);
  const roomExpiration = await fetchRoomExpiration(body.roomName, apiKey);

  if (!roomExpiration) {
    return Response.json({ error: 'Unable to validate room expiration.' }, { status: 404 });
  }

  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  const tokenExpiration = getTokenExpiration(nowEpochSeconds, roomExpiration);

  if (!tokenExpiration) {
    return Response.json({ error: 'Room has expired.' }, { status: 410 });
  }

  const tokenPayload = {
    properties: {
      room_name: body.roomName,
      is_owner: role === 'creator',
      enable_screenshare: role === 'creator',
      enable_recording: role === 'creator',
      start_video_off: role === 'viewer',
      start_audio_off: role === 'viewer',
      exp: tokenExpiration,
    },
  };

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(DAILY_MEETING_TOKENS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenPayload),
    });
  } catch {
    return Response.json({ error: 'Failed to reach Daily meeting token API.' }, { status: 502 });
  }

  const tokenBody = await parseJsonResponse(tokenResponse);

  if (!tokenResponse.ok) {
    const upstreamError =
      tokenBody &&
      typeof tokenBody === 'object' &&
      'error' in tokenBody &&
      typeof (tokenBody as { error?: unknown }).error === 'string'
        ? (tokenBody as { error: string }).error
        : 'Daily meeting token API returned an error.';

    return Response.json({ error: upstreamError }, { status: 502 });
  }

  const token =
    tokenBody && typeof tokenBody === 'object' && 'token' in tokenBody ? (tokenBody as { token?: unknown }).token : null;

  if (!isValidString(token)) {
    return Response.json({ error: 'Daily meeting token response is missing token.' }, { status: 502 });
  }

  return Response.json({ token, role, exp: tokenExpiration });
}
