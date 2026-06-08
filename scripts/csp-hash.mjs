// Scans every built HTML page and prints the union of CSP sha256 hashes for
// inline executable <script> blocks (JSON-LD is exempt from script-src).
// These feed the script-src in public/_headers. If a component's inline script
// changes, re-run this and update _headers. The e2e suite's CSP-violation check
// catches drift, so a stale hash fails loudly rather than silently.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
const hashes = new Map(); // hash -> sample
for (const file of walk('dist')) {
  const html = readFileSync(file, 'utf8');
  let m;
  while ((m = re.exec(html))) {
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(m[1])) continue;
    const content = m[2];
    if (!content.trim()) continue; // empty
    const hash = 'sha256-' + createHash('sha256').update(content, 'utf8').digest('base64');
    if (!hashes.has(hash)) hashes.set(hash, content.slice(0, 60));
  }
}

console.log(`Found ${hashes.size} unique inline script hash(es):\n`);
for (const [h, sample] of hashes) console.log(`  '${h}'   ${JSON.stringify(sample)}`);
console.log('\nscript-src token:\n  ' + [...hashes.keys()].map((h) => `'${h}'`).join(' '));
