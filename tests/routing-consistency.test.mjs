import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const roomNameRoutePath = 'app/room/[roomName]/page.tsx';
const roomIdRoutePath = 'app/room/[roomId]/page.tsx';
const dashboardPath = 'app/dashboard/page.tsx';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('canonical room route uses [roomName] only', () => {
  assert.equal(existsSync(new URL(`../${roomNameRoutePath}`, import.meta.url)), true);
  assert.equal(existsSync(new URL(`../${roomIdRoutePath}`, import.meta.url)), false);
});

test('dashboard links to /room/<name> path', () => {
  const dashboardSource = read(dashboardPath);
  assert.match(dashboardSource, /\/room\/\$\{encodeURIComponent\(roomName\)\}/);
});

test('room page references params.roomName', () => {
  const roomSource = read(roomNameRoutePath);
  assert.match(roomSource, /params\.roomName/);
  assert.doesNotMatch(roomSource, /params\.roomId/);
});
