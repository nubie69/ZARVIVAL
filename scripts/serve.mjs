import './build.mjs';
import { fileURLToPath } from 'node:url';
import { createGameServer, listenLocal } from './server.mjs';

const preferredPort = Number(process.env.PORT || 3000);
if (!Number.isInteger(preferredPort) || preferredPort < 1 || preferredPort > 65535) {
  console.error('PORT must be a whole number between 1 and 65535.');
  process.exitCode = 1;
} else {
  try {
    const server = createGameServer(fileURLToPath(new URL('../dist/', import.meta.url)));
    const port = await listenLocal(server, preferredPort, !process.env.PORT);
    if (port !== preferredPort) console.log(`Port ${preferredPort} is busy; using ${port} instead.`);
    console.log(`ZARVIVAL: http://127.0.0.1:${port}`);
    console.log('Open this address in your browser. Press Ctrl+C here to stop the game server.');
  } catch (error) {
    console.error(`Could not start ZARVIVAL: ${error.message}`);
    process.exitCode = 1;
  }
}
