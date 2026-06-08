// Rasterizes the brand favicon.svg into the PNG icon set (favicon-32, apple-touch
// 180, manifest 192/512), writes a full-bleed maskable icon, and re-compresses
// public/og.png. Run: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { readFileSync, renameSync } from 'node:fs';
import { stat } from 'node:fs/promises';

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

// Maskable icon: full-bleed dark background with the mark centered well inside the
// 80% safe zone, so Android circle/squircle masks never clip it.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="t" x1="160" y1="160" x2="352" y2="352" gradientUnits="userSpaceOnUse">
    <stop stop-color="#A78BFA"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs>
  <rect width="512" height="512" fill="#0A0A0C"/>
  <circle cx="256" cy="256" r="104" fill="url(#t)"/>
</svg>`;
await sharp(Buffer.from(maskable)).png({ compressionLevel: 9 }).toFile('public/icon-maskable-512.png');
console.log('wrote public/icon-maskable-512.png (maskable)');

// Re-encode the OG image smaller, then replace the original (sharp can't read+write
// the same path in one call).
const a = (await stat('public/og.png')).size;
await sharp('public/og.png').png({ quality: 80, compressionLevel: 9, palette: true }).toFile('public/og.tmp.png');
renameSync('public/og.tmp.png', 'public/og.png');
const b = (await stat('public/og.png')).size;
console.log(`og.png ${(a / 1024) | 0}KB -> ${(b / 1024) | 0}KB`);
