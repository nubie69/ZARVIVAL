import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav' };

export function createGameServer(directory) {
  const root = path.resolve(directory);
  return createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const target = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const data = await readFile(target);
      res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(data);
    } catch { res.writeHead(404).end('Not found'); }
  });
}

export async function listenLocal(server, preferredPort = 3000, allowFallback = true) {
  const lastPort = allowFallback ? Math.min(preferredPort + 20, 65535) : preferredPort;
  for (let port = preferredPort; port <= lastPort; port++) {
    try {
      await new Promise((resolve, reject) => {
        const onError = error => { server.removeListener('listening', onListening); reject(error); };
        const onListening = () => { server.removeListener('error', onError); resolve(); };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, '127.0.0.1');
      });
      return server.address().port;
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
      if (port === lastPort) throw new Error(allowFallback
        ? `Ports ${preferredPort}–${lastPort} are busy. Close an unused server or set PORT to another port.`
        : `Port ${port} is busy. Close the server using it or choose a different PORT.`);
    }
  }
}
