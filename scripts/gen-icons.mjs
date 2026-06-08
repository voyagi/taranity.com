// Rasterizes the brand favicon.svg into the PNG icon set (favicon-32, apple-touch
// 180, manifest 192/512) and re-compresses public/og.png. Run: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg');
const out = [
  ['public/favicon-32.png', 32],
  ['public/apple-touch-icon.png', 180],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
];
for (const [path, size] of out) {
  await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(path);
  console.log('wrote', path, size);
}

// Re-encode the OG image smaller (it's only fetched by social crawlers, but lean is lean).
await sharp('public/og.png').png({ quality: 80, compressionLevel: 9, palette: true }).toFile('public/og.opt.png');
const { size: a } = await import('node:fs').then((fs) => fs.promises.stat('public/og.png'));
const { size: b } = await import('node:fs').then((fs) => fs.promises.stat('public/og.opt.png'));
console.log(`og.png ${(a / 1024) | 0}KB -> og.opt ${(b / 1024) | 0}KB`);
