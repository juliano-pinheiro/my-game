import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(root);
const assets = [
  'index.html',
  'audio.js',
  'config.js',
  'state.js',
  'input.js',
  'shop.js',
  'physics.js',
  'score.js',
  'style.css',
  'game.js',
  'sw.js',
  'manifest.json'
];
const destinations = [
  join(projectRoot, 'docs'),
  join(projectRoot, 'android', 'app', 'src', 'main', 'assets')
];

for (const destination of destinations) {
  await mkdir(destination, { recursive: true });
  for (const asset of assets) {
    await cp(join(projectRoot, asset), join(destination, asset));
  }
}
