// Post-deploy live smoke test for the Cloudflare Pages site. Run after a deploy goes
// live (`npm run verify:deploy`); production deploys happen on push/merge to main.
//
// It guards three things that have each regressed before:
//   1. Theme routes resolve (no-trailing-slash design URLs + home/privacy) - the worker
//      must stay scoped via public/_routes.json so native Pages serving handles them;
//      a too-broad worker scope 404s them.
//   2. Legacy paths still redirect home (public/_redirects).
//   3. The in-place design switch actually works: with a `taranity-design` cookie, the
//      canonical content paths must serve THAT design's variant at the same URL, and the
//      prebuilt variant assets must exist. This is the regression guard for the
//      2026-06-30 failure where the Pages project had no build command, so `astro build`
//      never ran, the variant subpages 404'd, and the switch silently fell back to vitrine.
//
// Override the host with VERIFY_BASE for previews.
const base = (process.env.VERIFY_BASE || 'https://taranity.com').replace(/\/$/, '');

// Exactly as the in-app switcher links them: no trailing slash.
const themeRoutes = ['/', '/atlas', '/signal', '/storefront', '/practice', '/raw', '/privacy'];
// Legacy paths that must redirect to the home experience (public/_redirects).
const legacyRedirects = ['/about', '/contact', '/work', '/projects/x'];
// In-place switch: [canonical path, cookie design] -> the served HTML must carry that design.
const switchChecks = [
  ['/', 'atlas'],
  ['/journal', 'atlas'],
  ['/journal/website-speed-conversions', 'atlas'],
  ['/privacy', 'signal'],
];
// Prebuilt variant assets that 404 if the build skipped the per-design subpages.
const variantAssets = ['/atlas/journal/', '/atlas/privacy/', '/signal/journal/', '/signal/privacy/'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = (path, cookie) =>
  fetch(base + path, {
    redirect: 'follow',
    headers: { 'cache-control': 'no-cache', ...(cookie ? { cookie } : {}) },
  });
const designOf = (html) => {
  const m = html.match(/<html[^>]*\sdata-design="([^"]+)"/i);
  return m ? m[1] : 'unknown';
};

async function checkOnce() {
  const failures = [];
  for (const p of themeRoutes) {
    try {
      const r = await get(p);
      const body = await r.text();
      if (r.status !== 200) failures.push(`theme ${p} -> HTTP ${r.status}`);
      else if (/route was not found/i.test(body)) failures.push(`theme ${p} -> served the custom 404 page`);
    } catch (e) {
      failures.push(`theme ${p} -> ${String(e).slice(0, 70)}`);
    }
  }
  for (const p of legacyRedirects) {
    try {
      // Don't follow: assert the redirect itself FIRES (3xx). A 404 means the
      // worker swallowed it; a 200 would mean the rule silently stopped applying.
      const r = await fetch(base + p, { redirect: 'manual', headers: { 'cache-control': 'no-cache' } });
      if (r.status < 300 || r.status >= 400) failures.push(`legacy ${p} -> HTTP ${r.status} (expected a 3xx redirect)`);
    } catch (e) {
      failures.push(`legacy ${p} -> ${String(e).slice(0, 70)}`);
    }
  }
  for (const [p, design] of switchChecks) {
    try {
      const r = await get(p, `taranity-design=${design}`);
      const body = await r.text();
      if (r.status !== 200) failures.push(`switch ${p} [${design}] -> HTTP ${r.status}`);
      else {
        const served = designOf(body);
        if (served !== design) failures.push(`switch ${p} [${design}] -> served "${served}" (cookie ignored: variant missing or middleware bypassed)`);
      }
    } catch (e) {
      failures.push(`switch ${p} [${design}] -> ${String(e).slice(0, 70)}`);
    }
  }
  for (const p of variantAssets) {
    try {
      const r = await get(p);
      if (r.status !== 200) failures.push(`variant asset ${p} -> HTTP ${r.status} (build may have skipped per-design subpages)`);
    } catch (e) {
      failures.push(`variant asset ${p} -> ${String(e).slice(0, 70)}`);
    }
  }
  return failures;
}

// ~60s budget: CF Pages edge propagation on a fresh deploy can lag on cold PoPs,
// and a false-fail here only blocks the deploy command (re-check with
// `npm run verify:deploy`), it never lets a genuinely broken deploy pass.
const MAX = 10;
for (let attempt = 1; attempt <= MAX; attempt++) {
  const failures = await checkOnce();
  if (failures.length === 0) {
    console.log(
      `verify-deploy: PASS - ${themeRoutes.length} theme routes, ${legacyRedirects.length} legacy redirects, ` +
        `${switchChecks.length} in-place switches, ${variantAssets.length} variant assets resolve on ${base}`
    );
    process.exit(0);
  }
  if (attempt < MAX) {
    console.log(`verify-deploy: attempt ${attempt}/${MAX} found ${failures.length} issue(s); waiting for propagation...`);
    await sleep(6000);
  } else {
    console.error(`\nverify-deploy: FAIL on ${base} after ${MAX} attempts:`);
    for (const f of failures) console.error('  - ' + f);
    console.error('\nLikely causes:');
    console.error('  - theme/legacy fail: the Pages Functions worker scope (public/_routes.json) regressed.');
    console.error('  - switch/variant fail: the build skipped per-design subpages (check the Pages project');
    console.error('    build command is set to "npm run build" so astro build actually runs).');
    process.exit(1);
  }
}
