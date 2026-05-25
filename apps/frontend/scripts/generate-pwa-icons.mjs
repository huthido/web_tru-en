import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const targets = [
  { src: 'icon-heart.svg', out: 'icon-192.png', size: 192 },
  { src: 'icon-heart.svg', out: 'icon-512.png', size: 512 },
  { src: 'icon-heart.svg', out: 'apple-touch-icon.png', size: 180 },
  { src: 'icon-heart-maskable.svg', out: 'icon-maskable-512.png', size: 512 },
  { src: 'icon-heart-maskable.svg', out: 'icon-maskable-192.png', size: 192 },
];

for (const t of targets) {
  const buf = await readFile(join(publicDir, t.src));
  const png = await sharp(buf).resize(t.size, t.size).png().toBuffer();
  await writeFile(join(publicDir, t.out), png);
  console.log(`✓ ${t.out} (${t.size}×${t.size})`);
}
