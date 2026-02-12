import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('canonical room route uses [roomName] only', () => {
  const roomNamePath = path.join(repoRoot, 'app/room/[roomName]/page.tsx');
  const roomIdPath = path.join(repoRoot, 'app/room/[roomId]/page.tsx');

  assert.equal(fs.existsSync(roomNamePath), true, 'Expected app/room/[roomName]/page.tsx to exist');
  assert.equal(fs.existsSync(roomIdPath), false, 'app/room/[roomId]/page.tsx must not exist');
});

test('create-room API returns both name and roomName for compatibility', () => {
  const source = read('app/api/create-room/route.ts');

  // Ensure the Response.json payload includes a `name` property (order/formatting agnostic)
  assert.match(
    source,
    /Response\.json\(\{\s*[^}]*\bname\b[^}]*\}/s,
    'Expected API response payload to include name',
  );

  // Ensure the payload also exposes `roomName` as an alias of `name` for compatibility
  assert.match(
    source,
    /roomName:\s*name/,
    'Expected API response payload to include roomName: name for compatibility',
  );
});

test('dashboard accepts both roomName and name and encodes URL segment', () => {
  const source = read('app/dashboard/page.tsx');

  assert.match(source, /data\.roomName\s*\?\?\s*data\.name/, 'Expected roomName fallback to data.name');
  assert.match(source, /encodeURIComponent\(roomName\)/, 'Expected generated room URL to encode roomName');
});
