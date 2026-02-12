type PanicEvent = {
  type: 'panic-shutdown';
  roomId: string;
  redirectUrl: string;
  issuedAt: number;
};

type Listener = (event: PanicEvent) => void;

const roomListeners = new Map<string, Set<Listener>>();

export function subscribeToRoomPanic(roomId: string, listener: Listener): () => void {
  const listeners = roomListeners.get(roomId) ?? new Set<Listener>();
  listeners.add(listener);
  roomListeners.set(roomId, listeners);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      roomListeners.delete(roomId);
    }
  };
}

export function broadcastRoomPanic(roomId: string, redirectUrl: string): PanicEvent {
  const event: PanicEvent = {
    type: 'panic-shutdown',
    roomId,
    redirectUrl,
    issuedAt: Date.now(),
  };

  roomListeners.get(roomId)?.forEach((listener) => listener(event));

  return event;
}
