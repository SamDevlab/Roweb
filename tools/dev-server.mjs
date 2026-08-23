import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const port = Number(process.env.PORT || 4173);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const aliases = {
    '/game.js': '/src/game.js',
    '/roweb2.js': '/src/roweb2.js',
    '/roweb3.js': '/src/roweb3.js',
    '/roweb3-ui-hotfix.js': '/src/roweb3-ui-hotfix.js',
    '/roweb6-art.js': '/src/roweb6-art.js',
    '/roweb7-art.js': '/src/roweb7-art.js',
    '/roweb8-player-fix.js': '/src/roweb8-player-fix.js',
    '/roweb9-novice-data.js': '/src/roweb9-novice-data.js',
    '/roweb9-priest-data.js': '/src/roweb9-priest-data.js',
    '/roweb9-high-data.js': '/src/roweb9-high-data.js',
    '/roweb6-gameplay.js': '/src/roweb6-gameplay.js'
  };
  const requested = aliases[clean] || clean;
  const rel = normalize(requested).replace(/^([/\\])+/, '');
  const full = join(root, rel || 'index.html');
  return full.startsWith(root) ? full : null;
}

const server = createServer(async (req, res) => {
  try {
    let path = safePath(req.url || '/');
    if (!path) throw new Error('invalid path');

    try {
      const info = await stat(path);
      if (info.isDirectory()) path = join(path, 'index.html');
    } catch {
      path = join(root, 'index.html');
    }

    const body = await readFile(path);
    res.writeHead(200, {
      'Content-Type': mime[extname(path).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(body);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Roweb dev server error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Roweb local disponível em http://localhost:${port}`);
  console.log('Modo local atual: solo.');
});