import { copyFile, mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');
const dist = path.join(root, 'dist');

const files = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
  'favicon.ico',
  'favicon-32.png',
  'og.png',
];

await mkdir(docs, { recursive: true });
for (const name of await readdir(docs)) {
  if (/^workbox-.*\.js$/.test(name)) await unlink(path.join(docs, name));
}
for (const file of files) {
  await copyFile(path.join(dist, file), path.join(docs, file));
}
for (const name of await readdir(dist)) {
  if (/^workbox-.*\.js$/.test(name)) await copyFile(path.join(dist, name), path.join(docs, name));
}
await writeFile(path.join(docs, '.nojekyll'), '');
