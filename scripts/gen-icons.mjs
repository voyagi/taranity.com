// Rasterizes the brand masters into the PNG icon set and re-compresses public/og.png.
// Run: node scripts/gen-icons.mjs
//
// Two masters, on purpose. Below about 48 px the mark is a separate drawing
// (public/favicon.svg: heavier strokes, no full stop, letters filling the tile)
// because a shrunk copy of the large mark turned into a smudge at 16 px. The
// larger icons come from the full tile (src/assets/brand/ta-tile.svg), and the
// maskable icon from its own master that keeps the letters inside the centre
// circle Android may crop to.
import sharp from 'sharp';
import { readFileSync, renameSync } from 'node:fs';
import { stat } from 'node:fs/promises';

const small = readFileSync('public/favicon.svg');
const tile = readFileSync('src/assets/brand/ta-tile.svg');
const maskable = readFileSync('src/assets/brand/icon-maskable.svg');

const out = [
  ['public/favicon-32.png', 32, small],
  ['public/apple-touch-icon.png', 180, tile],
  ['public/icon-192.png', 192, tile],
  ['public/icon-512.png', 512, tile],
  ['public/icon-maskable-512.png', 512, maskable],
];
for (const [path, size, svg] of out) {
  await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(path);
  console.log('wrote', path, size);
}

// Re-encode the OG image smaller, then replace the original (sharp can't read+write
// the same path in one call).
const a = (await stat('public/og.png')).size;
await sharp('public/og.png').png({ quality: 80, compressionLevel: 9, palette: true }).toFile('public/og.tmp.png');
renameSync('public/og.tmp.png', 'public/og.png');
const b = (await stat('public/og.png')).size;
console.log(`og.png ${(a / 1024) | 0}KB -> ${(b / 1024) | 0}KB`);
