import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = resolve(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await Promise.all([
  cp(resolve(root, 'index.html'), resolve(dist, 'index.html')),
  cp(resolve(root, 'styles.css'), resolve(dist, 'styles.css')),
  cp(resolve(root, 'src', 'game.js'), resolve(dist, 'game.js'))
]);

// Vercel production is intentionally solo for now. The local WebSocket server
// remains available through npm run dev until multiplayer is moved to a
// persistent realtime backend.
const gamePath = resolve(dist, 'game.js');
let game = await readFile(gamePath, 'utf8');
const multiplayerEntry = "function connectMultiplayer() {\n  if (!location.protocol.startsWith('http')) return;";

if (!game.includes(multiplayerEntry)) {
  throw new Error('Could not locate connectMultiplayer() while preparing the Vercel build.');
}

game = game.replace(
  multiplayerEntry,
  "function connectMultiplayer() {\n  log('Vercel: modo solo ativo. O multiplayer será conectado a um backend persistente.', 'info');\n  return;\n  if (!location.protocol.startsWith('http')) return;"
);
await writeFile(gamePath, game);

console.log('Roweb static Vercel build ready: dist/index.html, dist/styles.css, dist/game.js');
