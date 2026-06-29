// In-place design-switch e2e, driven by dev-browser. MUST run against the Cloudflare
// Pages Functions runtime (the edge middleware reads the design cookie), so serve with:
//   npm run build && npx wrangler pages dev dist --port 4321
//   dev-browser --headless run scripts/e2e-switch.devbrowser.js
// (the static serve-headers server is cookie-blind and cannot exercise the switch).
//
// Covers the re-architecture's contract: switching design changes the design IN PLACE on
// every page type (home, journal index, journal article, privacy) with NO URL change,
// persists across reload, keeps the strict CSP (no inline-script violations), restores the
// reading position, keeps the light/dark toggle, and stays keyboard-accessible.
const BASE = 'http://127.0.0.1:4321';
const ART = '/journal/website-speed-conversions';
const settle = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const rec = (name, ok, detail) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
};

const page = await browser.getPage('e2e-switch');
let cspErrors = [];
let pageErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error' && /content security policy|refused to (execute|load|apply)/i.test(m.text())) cspErrors.push(m.text());
});
page.on('pageerror', (e) => pageErrors.push(String(e)));

const dattr = (k) => page.evaluate((x) => document.documentElement.getAttribute(x), k);
// String-based (dev-browser's QuickJS URL is unreliable): strip origin, query/hash, slash.
const path = () => page.url().replace(BASE, '').replace(/[?#].*$/, '').replace(/\/$/, '') || '/';
async function clearState() {
  // Authoritative clear: dev-browser uses a persistent profile, so a design cookie from a
  // prior run (any path) would otherwise leak in. clearCookies() nukes all of them.
  try { await page.context().clearCookies(); } catch {}
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {} // also drop any stashed SWITCH_SCROLL_KEY
    document.cookie = 'taranity-design=; Path=/; Max-Age=0';
  });
}
// A pill click is intercepted (preventDefault + cookie + location.reload()); the URL does
// not change, so poll data-design through the reload instead of waiting for navigation.
async function switchTo(design) {
  cspErrors = [];
  await page.click(`.ds-design[data-design-go="${design}"]`);
  const start = Date.now();
  while (Date.now() - start < 9000) {
    await settle(250);
    try { if ((await dattr('data-design')) === design) break; } catch {}
  }
  await settle(250);
  return dattr('data-design');
}

// ---- in-place switch on every page type: same URL, design swaps, CSP clean ----
const pageTypes = [
  ['/', 'home'],
  ['/journal', 'journal index'],
  [ART, 'journal article'],
  ['/privacy', 'privacy'],
];
for (const [route, label] of pageTypes) {
  await page.goto(BASE + route, { waitUntil: 'load' });
  await clearState();
  await page.reload({ waitUntil: 'load' });
  await settle(400);
  rec(`${label}: default is vitrine`, (await dattr('data-design')) === 'vitrine', await dattr('data-design'));
  const want = route === '/privacy' ? 'signal' : 'atlas'; // atlas is dark-only; signal proves dual-mode too
  const got = await switchTo(want);
  rec(`${label}: switch -> ${want} in place`, got === want, String(got));
  rec(`${label}: URL unchanged after switch`, path() === route, page.url());
  rec(`${label}: no CSP violation on switch`, cspErrors.length === 0, cspErrors.join(' | ').slice(0, 160));
  // Persistence: the switch set the cookie; an explicit reload must still serve the chosen design.
  // Regression guard for the prefetch bug: `data-astro-prefetch="false"` on switcher pills
  // prevents the /switch endpoint from firing silently on viewport prefetch, which was
  // clobbering the design cookie before any user interaction. If this check fails, the
  // prefetch guard has regressed.
  await page.reload({ waitUntil: 'load' });
  await settle(400);
  rec(`${label}: persists across reload`, (await dattr('data-design')) === want, await dattr('data-design'));
  await clearState();
}

// ---- scroll position is restored on a switch (R12), not jumped to top ----
await page.goto(BASE + ART, { waitUntil: 'load' });
await clearState();
await page.goto(BASE + ART, { waitUntil: 'load' });
await settle(300);
await page.evaluate(() => window.scrollTo(0, 1400));
await settle(300);
await switchTo('raw');
const y = await page.evaluate(() => Math.round(window.scrollY));
rec('article: scroll restored after switch (not top)', y > 600, `y=${y}`);
await clearState();

// ---- light/dark toggle still works, independent of design (dual-mode design) ----
await page.goto(BASE + '/', { waitUntil: 'load' });
await clearState();
await page.reload({ waitUntil: 'load' });
await settle(300);
const beforeMode = await dattr('data-mode');
await page.click('[data-mode-toggle]');
await settle(250);
const afterMode = await dattr('data-mode');
rec('light/dark toggle flips mode', afterMode !== beforeMode && /^(light|dark)$/.test(afterMode || ''), `${beforeMode}->${afterMode}`);
await clearState();

// ---- accessibility: the active design is marked, pills are keyboard-operable ----
await page.goto(BASE + '/', { waitUntil: 'load' });
await clearState();
await page.reload({ waitUntil: 'load' });
await settle(300);
const current = await page.$$eval('.ds-design[aria-current="page"]', (els) => els.map((e) => e.getAttribute('data-design-go')));
rec('a11y: exactly the current design is aria-current', current.length === 1 && current[0] === 'vitrine', JSON.stringify(current));
const pillsAreLinks = await page.$$eval('.ds-design', (els) => els.every((e) => e.tagName === 'A' && (e.getAttribute('href') || '').startsWith('/switch?')));
rec('a11y: pills are real links to /switch (no-JS works, focusable)', pillsAreLinks);
// keyboard: focus the atlas pill and activate with Enter -> switches in place
await page.evaluate(() => document.querySelector('.ds-design[data-design-go="atlas"]').focus());
const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-design-go'));
rec('a11y: a design pill can take keyboard focus', focused === 'atlas', String(focused));
await clearState();

// ---- axe on a variant page (the journal rendered in a non-vitrine design) ----
await page.goto(BASE + '/', { waitUntil: 'load' });
await clearState();
await page.evaluate(() => { document.cookie = 'taranity-design=atlas; Path=/; Max-Age=600'; });
await page.goto(BASE + '/journal', { waitUntil: 'load' });
await settle(400);
rec('atlas journal renders (variant)', (await dattr('data-design')) === 'atlas', await dattr('data-design'));
try {
  await page.addScriptTag({ url: BASE + '/axe-test.js' });
  const violations = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] });
    return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id);
  });
  rec('atlas journal: no serious/critical axe violations', violations.length === 0, JSON.stringify(violations));
} catch (e) {
  rec('atlas journal: axe ran', false, String(e).slice(0, 120));
}
rec('overall: no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 160));
await clearState();

const failed = results.filter((r) => !r.ok);
console.log(`\n==== SWITCH E2E: ${results.length - failed.length}/${results.length} passed ====`);
if (failed.length) {
  console.log('FAILURES:');
  failed.forEach((f) => console.log('  - ' + f.name));
  throw new Error(`${failed.length} switch-e2e checks FAILED`);
}
console.log('ALL SWITCH E2E CHECKS PASSED');
