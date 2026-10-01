// Renders the editable SVG masters in assets/source/ to the PNGs used by app.json.
// Run with `npm run icons:generate`.
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'assets', 'source');
const outDir = path.join(root, 'assets', 'images');

const targets = [
  { source: 'icon.svg', out: 'icon.png', size: 1024 },
  { source: 'adaptive-foreground.svg', out: 'adaptive-icon.png', size: 1024 },
  { source: 'monochrome.svg', out: 'monochrome-icon.png', size: 1024 },
  { source: 'splash-icon.svg', out: 'splash-icon.png', size: 400 },
  { source: 'splash-icon-dark.svg', out: 'splash-icon-dark.png', size: 400 },
];

await mkdir(outDir, { recursive: true });
for (const { source, out, size } of targets) {
  const svg = await readFile(path.join(sourceDir, source));
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, out));
  console.log(`${source} -> assets/images/${out} (${size}px)`);
}
