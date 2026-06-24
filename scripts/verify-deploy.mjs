// Post-deploy live smoke test. The site is a Cloudflare Pages deploy with a
// Pages Function (functions/api/contact.ts). Without public/_routes.json the
// Functions worker runs on every route ("include": ["/*"]) and its static
// fallthrough only does exact-asset matches - so the no-trailing-slash theme
// URLs the switcher links to (/atlas, /signal, ...) and the legacy _redirects
// (/about -> /) all 404, while only exact assets (/, /atlas/) resolve.
//
// public/_routes.json scopes the worker to "/api/*" so everything else gets
// native Pages serving (directory resolution + _redirects). This guard verifies
// that on the LIVE deploy and FAILS the deploy if a route regresses, so the
// theme-404 bug can never silently ship again. Runs as the last step of
// `npm run deploy`. Override the host with VERIFY_BASE for previews.
const base = (process.env.VERIFY_BASE || 'https://taranity.com').replace(/\/$/, '');

// Exactly as the in-app switcher links them: no trailing slash.
const themeRoutes = ['/', '/atlas', '/signal', '/storefront', '/practice', '/raw', '/privacy'];
// Legacy paths that must redirect to the home experience (public/_redirects).
const legacyRedirects = ['/about', '/contact', '/work', '/projects/x'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = (path) => fetch(base + path, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } });

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
  return failures;
}

// ~60s budget: CF Pages edge propagation on a fresh deploy can lag on cold PoPs,
// and a false-fail here only blocks the deploy command (re-check with
// `npm run verify:deploy`), it never lets a genuinely broken deploy pass.
const MAX = 10;
for (let attempt = 1; attempt <= MAX; attempt++) {
  const failures = await checkOnce();
  if (failures.length === 0) {
    console.log(`verify-deploy: PASS - ${themeRoutes.length} theme routes + ${legacyRedirects.length} legacy redirects resolve on ${base}`);
    process.exit(0);
  }
  if (attempt < MAX) {
    console.log(`verify-deploy: attempt ${attempt}/${MAX} found ${failures.length} issue(s); waiting for propagation...`);
    await sleep(6000);
  } else {
    console.error(`\nverify-deploy: FAIL on ${base} after ${MAX} attempts:`);
    for (const f of failures) console.error('  - ' + f);
    console.error('\nLikely cause: the Pages Functions worker is intercepting static routes.');
    console.error('Confirm public/_routes.json scopes "include" to ["/api/*"] and redeploy.');
    process.exit(1);
  }
}
