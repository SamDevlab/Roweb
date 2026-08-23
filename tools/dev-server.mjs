import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = Number(process.env.PORT || 4173);
const players = new Map();

// Keep the browser path identical to production while preserving src/game.js
// as the development source of truth.
app.get('/game.js', (_req, res) => res.type('application/javascript').sendFile(join(root, 'src', 'game.js')));
app.use(express.static(root, { extensions: ['html'] }));
app.get('/health', (_req, res) => res.json({ ok: true, players: players.size }));
app.use((_req, res) => res.sendFile(join(root, 'index.html')));

function safePlayer(input = {}) {
  const n = Number;
  return {
    x: Math.max(50, Math.min(2550, n(input.x) || 1300)),
    y: Math.max(50, Math.min(1650, n(input.y) || 850)),
    dir: ['up', 'down', 'left', 'right'].includes(input.dir) ? input.dir : 'down',
    level: Math.max(1, Math.min(99, n(input.level) || 1)),
    job: ['Noviço', 'Sacerdote', 'Sumo Sacerdote'].includes(input.job) ? input.job : 'Noviço',
    name: String(input.name || 'Aventureiro').replace(/[^\p{L}\p{N}_ -]/gu, '').slice(0, 18) || 'Aventureiro'
  };
}

function broadcast(payload, except = null) {
  const encoded = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client !== except && client.readyState === 1) client.send(encoded);
  }
}

wss.on('connection', ws => {
  const id = randomUUID().slice(0, 8);
  const initial = safePlayer({ name: `Noviço-${id.slice(0, 4)}` });
  players.set(id, initial);
  ws.send(JSON.stringify({ type: 'welcome', id, players: Object.fromEntries(players) }));
  broadcast({ type: 'join', id, player: initial }, ws);

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type !== 'state') return;
      const next = safePlayer(msg.player);
      players.set(id, next);
      broadcast({ type: 'state', id, player: next }, ws);
    } catch {
      // Pacotes inválidos são ignorados; o jogo continua jogável offline.
    }
  });

  ws.on('close', () => {
    players.delete(id);
    broadcast({ type: 'leave', id });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Roweb local disponível em http://localhost:${PORT}`);
});
