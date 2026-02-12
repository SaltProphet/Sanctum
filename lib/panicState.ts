const roomPanicState = new Map<string, { panic: boolean; tokenVersion: number; reason: string; updatedAt: number }>();
const roomChatState = new Map<string, { messages: unknown[]; ephemeralKeys: Set<string> }>();

export const CLIENT_EPHEMERAL_KEY_PREFIXES = ['chat:', 'daily-chat:', 'room-chat:'] as const;

export type PanicSnapshot = {
  panic: boolean;
  tokenVersion: number;
  reason: string;
  updatedAt: number;
};

function now(): number {
  return Date.now();
}

export function getRoomPanicSnapshot(roomId: string): PanicSnapshot {
  return (
    roomPanicState.get(roomId) ?? {
      panic: false,
      tokenVersion: 0,
      reason: '',
      updatedAt: 0,
    }
  );
}

export function markRoomPanicked(roomId: string, reason = 'panic-shutdown'): PanicSnapshot {
  const previous = roomPanicState.get(roomId);
  const snapshot: PanicSnapshot = {
    panic: true,
    tokenVersion: (previous?.tokenVersion ?? 0) + 1,
    reason,
    updatedAt: now(),
  };

  roomPanicState.set(roomId, snapshot);
  return snapshot;
}

export function resetRoomPanicState(roomId: string): void {
  roomPanicState.delete(roomId);
}

export function seedRoomChatState(roomId: string, message: unknown, ephemeralKey: string): void {
  const existing = roomChatState.get(roomId) ?? { messages: [], ephemeralKeys: new Set<string>() };
  existing.messages.push(message);
  existing.ephemeralKeys.add(ephemeralKey);
  roomChatState.set(roomId, existing);
}

export function getRoomChatState(roomId: string): { messages: unknown[]; ephemeralKeys: string[] } {
  const existing = roomChatState.get(roomId);

  if (!existing) {
    return { messages: [], ephemeralKeys: [] };
  }

  return {
    messages: [...existing.messages],
    ephemeralKeys: [...existing.ephemeralKeys],
  };
}

export function clearRoomEphemeralState(roomId: string): void {
  roomChatState.delete(roomId);
}

export function clearClientEphemeralStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keysToRemove: string[] = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) {
        continue;
      }

      if (CLIENT_EPHEMERAL_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  }
}
