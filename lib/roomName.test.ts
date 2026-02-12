import test from 'node:test';
import assert from 'node:assert/strict';

import { createUniqueRoomName, isValidRoomName } from './roomName.ts';

test('accepts canonical UUID-based room names', () => {
  assert.equal(isValidRoomName('room-123e4567-e89b-42d3-a456-426614174000'), true);
});

test('rejects malformed room names', () => {
  assert.equal(isValidRoomName(''), false);
  assert.equal(isValidRoomName('room-12345'), false);
  assert.equal(isValidRoomName('room_123e4567-e89b-42d3-a456-426614174000'), false);
  assert.equal(isValidRoomName('room-123e4567e89b42d3a456426614174000'), false);
  assert.equal(isValidRoomName('room-123e4567-e89b-12d3-a456-426614174000'), false);
  assert.equal(isValidRoomName('room-123e4567-e89b-42d3-c456-426614174000'), false);
  assert.equal(isValidRoomName('ROOM-123e4567-e89b-42d3-a456-426614174000'), false);
});

test('creates valid canonical room names', () => {
  assert.equal(isValidRoomName(createUniqueRoomName()), true);
});
