// Vendors the pinned Sveltia CMS bundle into public/admin/ so the admin's MAIN script is
// served from our own origin (script-src 'self') without committing a ~1.9 MB minified
// third-party file to git. Runs automatically on `predev`/`prestart`/`prebuild`.
//
// The download is verified against a pinned SHA-256: any mismatch fails the build, so a
// tampered CDN response or an accidental version drift can never ship silently. Two
// mirrors (unpkg, jsdelivr) are tried so a single CDN outage can't block a deploy. To
// bump the version, change VERSION + EXPECTED_SHA256 together (get the hash from
// `Get-FileHash <file> -Algorithm SHA256` or `sha256sum`).
//
// Note: at runtime Sveltia additionally loads its pinned Prism highlighter + schema/
// version JSON from unpkg; that is allowed only by the scoped /admin CSP in public/_headers.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const VERSION = '0.169.1';
const DEST = 'public/admin/sveltia-cms.js';
const EXPECTED_SHA256 = '80ccbde95233ada871c67c0ade61483b7d957c20507f880348b158a47da38c36';
const MIRRORS = [
  `https://unpkg.com/@sveltia/cms@${VERSION}/dist/sveltia-cms.js`,
  `https://cdn.jsdelivr.net/npm/@sveltia/cms@${VERSION}/dist/sveltia-cms.js`,
];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

if (existsSync(DEST) && sha256(readFileSync(DEST)) === EXPECTED_SHA256) {
  console.log(`vendor-sveltia: ${DEST} present and verified (@${VERSION}).`);
} else {
  let buf = null;
  for (const url of MIRRORS) {
    const host = new URL(url).host;
    try {
      console.log(`vendor-sveltia: fetching @${VERSION} from ${host}...`);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`vendor-sveltia: HTTP ${res.status} from ${host}, trying next mirror.`);
        continue;
      }
      buf = Buffer.from(await res.arrayBuffer());
      break;
    } catch (e) {
      console.warn(`vendor-sveltia: ${host} failed (${e.message}), trying next mirror.`);
    }
  }
  if (!buf) {
    console.error('vendor-sveltia: all mirrors failed; cannot vendor the admin bundle.');
    process.exit(1);
  }
  const got = sha256(buf);
  if (got !== EXPECTED_SHA256) {
    console.error(
      'vendor-sveltia: SHA-256 mismatch, refusing to write.\n' +
        `  expected ${EXPECTED_SHA256}\n` +
        `  got      ${got}\n` +
        'Possible tampering or version drift; investigate before building.',
    );
    process.exit(1);
  }
  mkdirSync(dirname(DEST), { recursive: true });
  writeFileSync(DEST, buf);
  console.log(`vendor-sveltia: wrote ${DEST} (${buf.length} bytes, SHA-256 verified).`);
}
