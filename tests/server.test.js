import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createGameServer, listenLocal } from '../scripts/server.mjs';

test('local game server chooses a free port when another server is running', async () => {
  const occupied = createServer();
  const server = createGameServer(fileURLToPath(new URL('../web/', import.meta.url)));
  try {
    const busyPort = await listenLocal(occupied, 0, false);
    const port = await listenLocal(server, busyPort);
    assert.ok(port > busyPort);
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /ZARVIVAL/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const module = await fetch(`http://127.0.0.1:${port}/game.js`);
    assert.match(module.headers.get('content-type'), /text\/javascript/);
    assert.equal((await fetch(`http://127.0.0.1:${port}/missing`)).status, 404);
  } finally {
    occupied.closeAllConnections();server.closeAllConnections();
    await Promise.all([occupied,server].map(s=>new Promise(resolve=>s.close(resolve))));
  }
});

test('an explicitly configured busy port reports a helpful error', async () => {
  const occupied=createServer(),server=createServer();
  try {
    const port=await listenLocal(occupied,0,false);
    await assert.rejects(listenLocal(server,port,false),/Port \d+ is busy/);
  } finally {
    await new Promise(resolve=>occupied.close(resolve));
  }
});
