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
  cp(resolve(root, 'src', 'roweb4-addon.js'), resolve(dist, 'roweb4-addon.js')),
  cp(resolve(root, 'src', 'roweb5-sprites.js'), resolve(dist, 'roweb5-sprites.js'))
]);

console.log('Roweb static build ready: v5 sprite pack + v4 Sanctuary/audio/attributes + visual v3 engine.');