import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = resolve(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const files = [
  ['index.html', 'index.html'],
  ['styles.css', 'styles.css'],
  ['rpg.css', 'rpg.css'],
  ['src/game.js', 'game.js'],
  ['src/roweb2.js', 'roweb2.js'],
  ['src/roweb3.js', 'roweb3.js'],
  ['src/roweb3-ui-hotfix.js', 'roweb3-ui-hotfix.js'],
  ['src/roweb6-art.js', 'roweb6-art.js'],
  ['src/roweb7-art.js', 'roweb7-art.js'],
  ['src/roweb8-player-fix.js', 'roweb8-player-fix.js'],
  ['src/roweb6-gameplay.js', 'roweb6-gameplay.js'],
  ['src/roweb13-core.js', 'roweb13-core.js'],
  ['src/roweb13-rpg.js', 'roweb13-rpg.js'],
  ...Array.from({ length: 12 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return [`src/roweb12-atlas-part${n}.js`, `roweb12-atlas-part${n}.js`];
  }),
  ['src/roweb12-atlas-loader.js', 'roweb12-atlas-loader.js'],
  ['src/roweb12-character-sprites.js', 'roweb12-character-sprites.js']
];

await Promise.all(files.map(([source, target]) => cp(resolve(root, source), resolve(dist, target))));

console.log('Roweb static build ready: v13 runtime + loot/inventory/equipment + v12.3 character sprites.');
