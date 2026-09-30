// Generates the demo product illustrations (800x800 WebP) and the Metro-friendly asset map.
// Source of truth: src/features/demo/data/fixtures/catalog.json. Usage: npm run images:generate
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

const catalogPath = 'src/features/demo/data/fixtures/catalog.json';
const outDir = 'assets/products';
const mapPath = 'src/features/demo/data/fixtures/product-images.generated.ts';
const MAX_BYTES = 120 * 1024;
const SIZE = 800;

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const categoryById = new Map(catalog.categories.map((c) => [c.id, c.slug]));

const INK = '#2B2622';
const TERRACOTTA = '#BB512B';
const SAGE = '#6F8F72';

// Warm neutral backgrounds per category (ivory / sand / sage tints), one variant per image index.
const BACKGROUNDS = {
  coffee: ['#F3E9DC', '#E8DAC6', '#F7F0E6'],
  kitchen: ['#F6EFE4', '#E9E2D0', '#F2E6DA'],
  stationery: ['#EFEADF', '#E4E7DA', '#F5F0E6'],
  accessories: ['#F1E8DD', '#E6DDCD', '#ECE6D9'],
  home: ['#ECEADF', '#E2E6D8', '#F3ECE1'],
};
const ACCENTS = [TERRACOTTA, SAGE, INK];

// Each illustration is drawn in a 400x400 box, centered on the canvas at (400, 340).
const SHAPES = {
  coffee: (a, b) => `
    <path d="M-110 -140 L110 -140 L130 150 Q130 170 110 170 L-110 170 Q-130 170 -130 150 Z" fill="${a}"/>
    <rect x="-110" y="-175" width="220" height="40" rx="8" fill="${INK}" opacity="0.85"/>
    <ellipse cx="0" cy="10" rx="48" ry="72" fill="${b}" transform="rotate(20)"/>
    <path d="M-2 -55 Q24 10 -2 75" stroke="${a}" stroke-width="10" fill="none" stroke-linecap="round" transform="rotate(20)"/>`,
  kitchen: (a, b) => `
    <path d="M-130 -90 L130 -90 L110 140 Q108 165 82 165 L-82 165 Q-108 165 -110 140 Z" fill="${a}"/>
    <path d="M128 -40 Q215 -30 205 40 Q195 100 112 100" stroke="${a}" stroke-width="26" fill="none" stroke-linecap="round"/>
    <ellipse cx="0" cy="-90" rx="130" ry="26" fill="${b}"/>
    <ellipse cx="0" cy="-90" rx="108" ry="18" fill="${INK}" opacity="0.75"/>`,
  stationery: (a, b) => `
    <rect x="-120" y="-165" width="240" height="330" rx="14" fill="${a}"/>
    <rect x="-120" y="-165" width="34" height="330" rx="10" fill="${INK}" opacity="0.8"/>
    <rect x="-50" y="-110" width="130" height="16" rx="8" fill="${b}"/>
    <rect x="-50" y="-70" width="90" height="10" rx="5" fill="${b}" opacity="0.7"/>
    <rect x="95" y="-165" width="16" height="150" fill="${b}"/>`,
  accessories: (a, b) => `
    <path d="M-85 -60 Q-85 -170 0 -170 Q85 -170 85 -60" stroke="${INK}" stroke-width="18" fill="none" stroke-linecap="round"/>
    <rect x="-150" y="-70" width="300" height="240" rx="24" fill="${a}"/>
    <rect x="-150" y="-20" width="300" height="14" fill="${b}" opacity="0.8"/>
    <circle cx="0" cy="40" r="26" fill="${b}"/>`,
  home: (a, b) => `
    <rect x="-95" y="-20" width="190" height="190" rx="22" fill="${a}"/>
    <rect x="-95" y="-20" width="190" height="34" rx="14" fill="${INK}" opacity="0.15"/>
    <rect x="-4" y="-95" width="8" height="70" rx="4" fill="${INK}"/>
    <path d="M0 -205 Q38 -150 0 -102 Q-38 -150 0 -205 Z" fill="${b}"/>`,
};

function escapeXml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function wrap(name, max = 26) {
  const lines = [];
  let line = '';
  for (const word of name.split(' ')) {
    if ((line + ' ' + word).trim().length > max) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  lines.push(line);
  return lines;
}

function buildSvg(product, index) {
  const slug = categoryById.get(product.categoryId);
  const backgrounds = BACKGROUNDS[slug];
  const n = index % 3;
  // Variants: 0 = base, 1 = zoomed + alternate background/accents, 2 = tilted + third background.
  const accent = ACCENTS[(product.name.length + n) % ACCENTS.length];
  const second = ACCENTS[(product.name.length + n + 1) % ACCENTS.length];
  const scale = [1, 1.3, 0.85][n];
  const rotate = [0, -6, 12][n];
  const lines = wrap(product.name);
  const text = lines
    .map(
      (l, i) =>
        `<text x="400" y="${700 + i * 34}" text-anchor="middle" font-family="sans-serif" font-size="28" fill="${INK}" opacity="0.75">${escapeXml(l)}</text>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <rect width="${SIZE}" height="${SIZE}" fill="${backgrounds[n]}"/>
    <circle cx="400" cy="340" r="250" fill="#FFFFFF" opacity="0.35"/>
    <g transform="translate(400 340) rotate(${rotate}) scale(${scale})">${SHAPES[slug](accent, second)}</g>
    ${text}
  </svg>`;
}

mkdirSync(outDir, { recursive: true });

const files = [];
for (const product of catalog.products) {
  for (const [index, file] of product.imagePaths.entries()) {
    const svg = buildSvg(product, index);
    let quality = 80;
    let buffer = await sharp(Buffer.from(svg)).webp({ quality }).toBuffer();
    while (buffer.length > MAX_BYTES && quality > 20) {
      quality -= 10;
      buffer = await sharp(Buffer.from(svg)).webp({ quality }).toBuffer();
    }
    if (buffer.length > MAX_BYTES) throw new Error(`${file} is ${buffer.length} bytes (> 120 KB)`);
    writeFileSync(join(outDir, file), buffer);
    files.push(file);
  }
}

// Metro needs literal require() paths, hence the generated map.
const entries = files
  .sort()
  .map((f) => `  '${f}': require('../../../../../assets/products/${f}'),`)
  .join('\n');
writeFileSync(
  mapPath,
  `// GENERATED by scripts/generate-product-images.mjs. Do not edit.
/* eslint-disable @typescript-eslint/no-require-imports */
export const productImageModules: Record<string, number> = {
${entries}
};
`,
);
console.log(`Wrote ${files.length} images to ${outDir} and ${mapPath}`);
