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
  cp(resolve(root, 'src'), resolve(dist, 'src'), { recursive: true })
]);

// The current multiplayer server uses a persistent in-memory WebSocket process.
// Vercel production is intentionally built as a stable solo client until the
// shared world is migrated to an authoritative realtime backend.
const gamePath = resolve(dist, 'src', 'game.js');
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

console.log('Roweb static Vercel build ready in dist/');
