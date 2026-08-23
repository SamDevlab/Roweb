import { cp, mkdir, rm } from 'node:fs/promises';
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
  cp(resolve(root, 'src', 'roweb2.js'), resolve(dist, 'roweb2.js')),
  cp(resolve(root, 'src', 'roweb3.js'), resolve(dist, 'roweb3.js')),
  cp(resolve(root, 'src', 'roweb3-ui-hotfix.js'), resolve(dist, 'roweb3-ui-hotfix.js')),
  cp(resolve(root, 'src', 'roweb6-art.js'), resolve(dist, 'roweb6-art.js')),
  cp(resolve(root, 'src', 'roweb7-art.js'), resolve(dist, 'roweb7-art.js')),
  cp(resolve(root, 'src', 'roweb8-player-fix.js'), resolve(dist, 'roweb8-player-fix.js')),
  cp(resolve(root, 'src', 'roweb6-gameplay.js'), resolve(dist, 'roweb6-gameplay.js'))
]);

console.log('Roweb static build ready: v8 player fix + v7 map art + v6 Sanctuary/audio/attributes.');