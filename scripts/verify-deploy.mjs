// Post-deploy live smoke test for the Cloudflare Pages site. Run after a deploy goes
// live (`npm run verify:deploy`); production deploys happen on push/merge to main.
//
// It guards four things that have each regressed before (or would fail silently):
//   1. Theme routes resolve (no-trailing-slash design URLs + home/privacy) - the worker
//      must stay scoped via public/_routes.json so native Pages serving handles them;
//      a too-broad worker scope 404s them.
//   2. Legacy paths still redirect home (public/_redirects).
//   3. The in-place design switch actually works for EVERY design: with a
//      `taranity-design` cookie, the canonical content paths must serve that design's
//      variant at the same URL. This is the regression guard for the 2026-06-30 failure
//      where the Pages project had no build command, so `astro build` never ran, the
//      per-design subpages 404'd, and the switch silently fell back to vitrine.
//   4. The Cloudflare Web Analytics beacon is in the served home HTML. A build that
//      drops it (env regression, accidental PUBLIC_CF_BEACON_TOKEN=off, layout revert)
//      is invisible in the browser - the site works, the stats just quietly flatline.
//
// The article slug is discovered from the live journal index, not hardcoded, so renaming
// or replacing a post does not make this check fail or test a stale path.
//
// Override the host with VERIFY_BASE for previews.
const base = (process.env.VERIFY_BASE || 'https://taranity.com').replace(/\/$/, '');

// Every non-default (non-Vitrine) READY design. The switch must serve each one's variant
// in place. Kept in sync with src/config/designs.ts by tests/unit/design-registry-wiring
// (this script cannot import the TS registry directly).
const DESIGNS = ['atlas', 'signal', 'storefront', 'practice', 'raw'];
// Exactly as the in-app switcher links them: no trailing slash. Covers each design's home.
const themeRoutes = ['/', ...DESIGNS.map((d) => `/${d}`), '/privacy'];
// Legacy paths that must redirect to the home experience (public/_redirects).
const legacyRedirects = ['/about', '/contact', '/work', '/projects/x'];

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

// Discover a real article slug from the live journal index so the article-route check
// follows the actual content instead of a hardcoded slug that drifts. Null if none found.
async function discoverArticleSlug() {
  try {
    const html = await (await get('/journal')).text();
    const m = html.match(/\/journal\/([a-z0-9][a-z0-9-]+)/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// Build the switch checks: every design on the two subpage routes (journal index +
// privacy), plus the article route proven once (its [slug] getStaticPaths expands over the
// same design list, so one design proves the per-design expansion built).
function buildSwitchChecks(articleSlug) {
  const checks = [];
  for (const d of DESIGNS) {
    checks.push(['/journal', d]);
    checks.push(['/privacy', d]);
  }
  if (articleSlug) checks.push([`/journal/${articleSlug}`, 'atlas']);
  return checks;
}

async function checkOnce(switchChecks) {
  const failures = [];
  for (const p of themeRoutes) {
    try {
      const r = await get(p);
      const body = await r.text();
      if (r.status !== 200) failures.push(`theme ${p} -> HTTP ${r.status}`);
      else if (/route was not found/i.test(body)) failures.push(`theme ${p} -> served the custom 404 page`);
      else if (p === '/' && !body.includes('static.cloudflareinsights.com/beacon.min.js'))
        failures.push('analytics / -> Web Analytics beacon missing from the served HTML');
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
      else if (/route was not found/i.test(body)) failures.push(`switch ${p} [${design}] -> served the custom 404 page`);
      else {
        const served = designOf(body);
        if (served !== design) failures.push(`switch ${p} [${design}] -> served "${served}" (cookie ignored: variant missing or middleware bypassed)`);
      }
    } catch (e) {
      failures.push(`switch ${p} [${design}] -> ${String(e).slice(0, 70)}`);
    }
  }
  return failures;
}

// ~60s budget: CF Pages edge propagation on a fresh deploy can lag on cold PoPs,
// and a false-fail here only blocks the deploy command (re-check with
// `npm run verify:deploy`), it never lets a genuinely broken deploy pass.
const MAX = 10;
let noArticleNoted = false;
for (let attempt = 1; attempt <= MAX; attempt++) {
  // Rediscover the slug every attempt: a transient stale/empty /journal on the first
  // try must not skip the article-route check for the whole retry budget.
  const articleSlug = await discoverArticleSlug();
  if (!articleSlug && !noArticleNoted) {
    console.log('verify-deploy: note - no journal article found on the live index; skipping the article-route switch check.');
    noArticleNoted = true;
  }
  const switchChecks = buildSwitchChecks(articleSlug);
  const failures = await checkOnce(switchChecks);
  if (failures.length === 0) {
    console.log(
      `verify-deploy: PASS - ${themeRoutes.length} theme routes, ${legacyRedirects.length} legacy redirects, ` +
        `${switchChecks.length} in-place switches (${DESIGNS.length} designs) resolve on ${base}`
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
    console.error('  - switch fail: the build skipped per-design subpages (check the Pages project');
    console.error('    build command is set to "npm run build" so astro build actually runs).');
    console.error('  - analytics fail: the beacon dropped out of the build (PUBLIC_CF_BEACON_TOKEN=off');
    console.error('    set in the Pages env, or the SiteLayout wiring changed). If the beacon was');
    console.error('    disabled ON PURPOSE, update this check AND the privacy page Analytics');
    console.error('    disclosure (src/components/PrivacyContent.astro) in the same change.');
    process.exit(1);
  }
}
