import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearRoomEphemeralState,
  getRoomChatState,
  getRoomPanicSnapshot,
  markRoomPanicked,
  resetRoomPanicState,
  seedRoomChatState,
} from './panicState.ts';

test('markRoomPanicked flips panic and increments token version', () => {
  const roomId = 'room-test-panic';
  resetRoomPanicState(roomId);

  const first = markRoomPanicked(roomId);
  const second = markRoomPanicked(roomId);

  assert.equal(first.panic, true);
  assert.equal(first.tokenVersion, 1);
  assert.equal(second.tokenVersion, 2);
  assert.equal(getRoomPanicSnapshot(roomId).tokenVersion, 2);

  resetRoomPanicState(roomId);
});

test('clearRoomEphemeralState removes in-memory chat state for room', () => {
  const roomId = 'room-test-chat';

  seedRoomChatState(roomId, { text: 'hello' }, 'chat:1');
  seedRoomChatState(roomId, { text: 'world' }, 'chat:2');

  const before = getRoomChatState(roomId);
  assert.equal(before.messages.length, 2);
  assert.deepEqual(before.ephemeralKeys.sort(), ['chat:1', 'chat:2']);

  clearRoomEphemeralState(roomId);

  const after = getRoomChatState(roomId);
  assert.equal(after.messages.length, 0);
  assert.equal(after.ephemeralKeys.length, 0);
});
