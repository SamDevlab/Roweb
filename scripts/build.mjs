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
  cp(resolve(root, 'src', 'game.js'), resolve(dist, 'game.js')),
  cp(resolve(root, 'src', 'roweb2.js'), resolve(dist, 'roweb2.js'))
]);

// Vercel production remains solo until multiplayer moves to a persistent
// realtime backend. Local development can still attempt WebSocket discovery.
const gamePath = resolve(dist, 'roweb2.js');
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

console.log('Roweb static build ready: index, styles, roweb2 sprite engine and legacy game fallback.');
