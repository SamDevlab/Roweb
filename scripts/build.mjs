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
  ['src/game.js', 'game.js'],
  ['src/roweb2.js', 'roweb2.js'],
  ['src/roweb3.js', 'roweb3.js'],
  ['src/roweb3-ui-hotfix.js', 'roweb3-ui-hotfix.js'],
  ['src/roweb6-art.js', 'roweb6-art.js'],
  ['src/roweb7-art.js', 'roweb7-art.js'],
  ['src/roweb8-player-fix.js', 'roweb8-player-fix.js'],
  ['src/roweb6-gameplay.js', 'roweb6-gameplay.js'],
  ...Array.from({ length: 12 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return [`src/roweb12-atlas-part${n}.js`, `roweb12-atlas-part${n}.js`];
  }),
  ['src/roweb12-atlas-loader.js', 'roweb12-atlas-loader.js'],
  ['src/roweb12-character-sprites.js', 'roweb12-character-sprites.js']
];

await Promise.all(files.map(([source, target]) => cp(resolve(root, source), resolve(dist, target))));

console.log('Roweb static build ready: v12 full Aster spritesheet + gameplay/world layers.');
