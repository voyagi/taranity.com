/**
 * Build-time brand-rule check for CMS-editable content.
 *
 * The admin at /admin enforces the no-em-dash rule at save time via field
 * `pattern` rules, but two surfaces cannot carry a pattern in Sveltia 0.169.1:
 * the journal's markdown body, and (as defence in depth) whole data files. A
 * CMS save commits straight to main and Cloudflare Pages only runs the build,
 * so this prebuild check is the deploy gate for those surfaces. Runs alongside
 * the import-time guards in src/config/vitrine.ts.
 *
 * The character is built from its code point so this file never contains one.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const EM_DASH = String.fromCharCode(0x2014);
// Anchor to the repo root (this script's parent dir) so the gate scans the
// right tree no matter which directory it is invoked from.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * A deploy gate must never mistake "could not look" for "found nothing": a
 * missing directory fails the build with a readable message instead of an
 * ENOENT stack (or, worse, a silent pass).
 */
function listFiles(dir, extension) {
  const abs = join(repoRoot, dir);
  if (!existsSync(abs)) {
    console.error(
      `check-brand-rules: expected content directory is missing: ${dir}\n` +
        `  If the content structure changed, update scripts/check-brand-rules.mjs ` +
        `so the brand-rule deploy gate keeps scanning the right place.`,
    );
    process.exit(1);
  }
  return readdirSync(abs, { recursive: true })
    .map(String)
    .filter((name) => name.endsWith(extension))
    .map((name) => join(abs, name));
}

const targets = [...listFiles('src/content/journal', '.md'), ...listFiles('src/data', '.json')];

const violations = [];
for (const file of targets) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes(EM_DASH)) violations.push(`${relative(repoRoot, file)}:${i + 1}`);
  });
}

if (violations.length > 0) {
  console.error(
    `check-brand-rules: em dash found (brand rule: no em dashes; use a comma, colon, or full stop):\n` +
      violations.map((v) => `  ${v}`).join('\n'),
  );
  process.exit(1);
}
console.log(`check-brand-rules: ${targets.length} content files clean`);
