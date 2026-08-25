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
  ['src/roweb12-character-sprites.js', 'roweb12-character-sprites.js'],
  ['src/v14/poring-data.js', 'v14/poring-data.js'],
  ['src/v14/bat-data.js', 'v14/bat-data.js'],
  ['src/v14/eye-data.js', 'v14/eye-data.js'],
  ['src/v14/imp-data.js', 'v14/imp-data.js'],
  ['src/v14/world-data.js', 'v14/world-data.js'],
  ['src/roweb14-graphics.js', 'roweb14-graphics.js'],
  ['src/roweb15-graphics.js', 'roweb15-graphics.js'],
  ['src/roweb16-graphics.js', 'roweb16-graphics.js'],
  ['src/roweb17-terrain.js', 'roweb17-terrain.js'],
  ['src/roweb18-graphics.js', 'roweb18-graphics.js'],
  ['assets/v18/mobs.webp', 'assets/v18/mobs.webp'],
  ['assets/v18/world.webp', 'assets/v18/world.webp']
];

await mkdir(resolve(dist, 'v14'), { recursive: true });
await mkdir(resolve(dist, 'assets/v18'), { recursive: true });
await Promise.all(files.map(([source, target]) => cp(resolve(root, source), resolve(dist, target))));

console.log('Roweb static build ready: v18 cohesive graphics + v17 semantic terrain + v13 RPG loop + untouched Aster v12.3.');
