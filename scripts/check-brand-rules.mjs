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
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const EM_DASH = String.fromCharCode(0x2014);

const targets = [
  ...readdirSync('src/content/journal')
    .filter((name) => name.endsWith('.md'))
    .map((name) => join('src/content/journal', name)),
  ...readdirSync('src/data')
    .filter((name) => name.endsWith('.json'))
    .map((name) => join('src/data', name)),
];

const violations = [];
for (const file of targets) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes(EM_DASH)) violations.push(`${file}:${i + 1}`);
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
