import { broadcastRoomPanic } from '@/lib/panicEvents';
import { clearRoomEphemeralState, getRoomPanicSnapshot, markRoomPanicked } from '@/lib/panicState';

const DAILY_API_BASE_URL = 'https://api.daily.co/v1';
const PANIC_REDIRECT_URL = 'https://www.google.com';

type PanicRouteContext = {
  params: {
    roomId: string;
  };
};

type DailyErrorBody = {
  error?: unknown;
};

async function closeDailyRoom(roomId: string, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  let response: Response;

  try {
    response = await fetch(`${DAILY_API_BASE_URL}/rooms/${roomId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch {
    return { ok: false, error: 'Failed to reach Daily room deletion endpoint.' };
  }

  if (response.ok || response.status === 404) {
    return { ok: true };
  }

  let errorMessage = 'Daily room deletion failed.';

  try {
    const parsed = (await response.json()) as DailyErrorBody;
    if (typeof parsed.error === 'string' && parsed.error.length > 0) {
      errorMessage = parsed.error;
    }
  } catch {
    // keep default message when body is not JSON
  }

  return { ok: false, error: `${errorMessage} (status ${response.status})` };
}

export async function POST(_request: Request, context: PanicRouteContext): Promise<Response> {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'Server is missing DAILY_API_KEY configuration.' }, { status: 500 });
  }

  const roomId = context.params.roomId;
  const closeResult = await closeDailyRoom(roomId, apiKey);

  if (!closeResult.ok) {
    return Response.json({ error: closeResult.error }, { status: 502 });
  }

  clearRoomEphemeralState(roomId);
  const snapshot = markRoomPanicked(roomId);
  const event = broadcastRoomPanic(roomId, PANIC_REDIRECT_URL);
  const tokenInvalidation = getRoomPanicSnapshot(roomId);

  return Response.json({
    ok: true,
    roomId,
    panic: snapshot,
    tokenInvalidation,
    event,
  });
}
