import { subscribeToRoomPanic } from '@/lib/panicEvents';
import { getRoomPanicSnapshot } from '@/lib/panicState';

export const runtime = 'nodejs';

type PanicStreamContext = {
  params: {
    roomId: string;
  };
};

export async function GET(_request: Request, context: PanicStreamContext): Promise<Response> {
  const roomId = context.params.roomId;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const writeEvent = (name: string, payload: unknown) => {
        controller.enqueue(encoder.encode(`event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      writeEvent('ready', { roomId });

      const snapshot = getRoomPanicSnapshot(roomId);
      if (snapshot.panic) {
        writeEvent('panic-shutdown', {
          roomId,
          redirectUrl: 'https://www.google.com',
          tokenVersion: snapshot.tokenVersion,
        });
      }

      const unsubscribe = subscribeToRoomPanic(roomId, (event) => {
        writeEvent(event.type, {
          roomId: event.roomId,
          redirectUrl: event.redirectUrl,
          issuedAt: event.issuedAt,
        });
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 15000);

      return () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
