// End-to-end + a11y suite, driven by dev-browser (Playwright Page API under a
// Rust/QuickJS harness — this environment blocks raw Playwright by policy).
//
// Run the built site first:  npm run build && npm run preview   (serves :4321)
// Then:                      npm run e2e
//
// Covers: page status, single non-empty <h1>, <title>, console/page errors,
// image loading, internal-link resolution, axe-core WCAG2A/AA per page,
// command palette (Ctrl+K / Esc), contact form validation + success (demo mode),
// custom 404, and no horizontal overflow at mobile/tablet/desktop.

const BASE = 'http://localhost:4321';
// axe-core served from the site's own origin (copied into dist by prep-e2e.mjs)
// so the production CSP can stay strict (no CDN in script-src).
const AXE = BASE + '/axe-test.js';

const results = [];
function rec(name, ok, detail) {
  results.push({ name, ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

const settle = (ms) => new Promise((r) => setTimeout(r, ms));

const page = await browser.getPage('e2e');

let consoleErrors = [];
let pageErrors = [];
let failedResponses = []; // HTTP responses with status >= 400
let failedRequests = []; // network-level failures (no response: DNS, refused, blocked)
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('response', (r) => {
  // Only real failures — 304 (Not Modified) and other 3xx are normal.
  if (r.status() >= 400) failedResponses.push({ url: r.url(), status: r.status() });
});
page.on('requestfailed', (req) => failedRequests.push(req.url()));

// Endpoints called best-effort and handled gracefully; a failure here is not a
// site defect. api.github.com = Currently widget (60/hr unauth rate limit);
// plausible.io = analytics, only loaded when configured; cdn.jsdelivr = axe (test-only).
const isBenign = (u) => /api\.github\.com|plausible\.io/.test(u);

const pages200 = [
  ['/', 'home'],
  ['/work', 'work'],
  ['/about', 'about'],
  ['/contact', 'contact'],
  ['/projects/cortex', 'case-study'],
];

async function runAxe(label) {
  try {
    await page.addScriptTag({ url: AXE });
    const violations = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
    });
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    rec(`${label}: axe no serious/critical`, serious.length === 0, JSON.stringify(serious));
    if (violations.length) console.log(`     (${label} axe minor: ${JSON.stringify(violations)})`);
  } catch (e) {
    rec(`${label}: axe ran`, false, 'axe injection failed: ' + String(e).slice(0, 120));
  }
}

// ---- 200-pages: status, h1, title, console, images, axe ----
for (const [route, label] of pages200) {
  consoleErrors = [];
  pageErrors = [];
  failedResponses = [];
  failedRequests = [];
  const resp = await page.goto(BASE + route, { waitUntil: 'load' });
  await settle(700); // let the Currently widget's GitHub fetch settle
  rec(`${label}: HTTP 200`, resp && resp.status() === 200, 'status=' + (resp ? resp.status() : 'none'));

  const h1 = await page.$$eval('h1', (els) => els.map((e) => e.textContent.trim()).filter(Boolean));
  rec(`${label}: exactly one non-empty h1`, h1.length === 1, JSON.stringify(h1));

  const title = await page.title();
  rec(`${label}: has <title>`, title.length > 0 && /taranity/i.test(title), title);

  const firstPartyFailures = [
    ...failedResponses.filter((f) => !isBenign(f.url)),
    ...failedRequests.filter((u) => !isBenign(u)).map((u) => ({ url: u, status: 'failed' })),
  ];
  // Ignore the browser's generic "Failed to load resource" line when the only
  // failed responses are benign third-party calls we handle.
  const realConsole = consoleErrors.filter(
    (t) => !(/Failed to load resource/i.test(t) && firstPartyFailures.length === 0),
  );
  const benignNote = failedResponses.length
    ? ` (benign 3rd-party: ${JSON.stringify(failedResponses)})`
    : '';
  rec(
    `${label}: no first-party console/page errors`,
    realConsole.length === 0 && pageErrors.length === 0 && firstPartyFailures.length === 0,
    ([...realConsole, ...pageErrors].join(' | ').slice(0, 240) || 'clean') + benignNote,
  );

  const badImgs = await page.$$eval('img', (imgs) =>
    imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
  );
  rec(`${label}: all <img> load`, badImgs.length === 0, badImgs.join(', '));

  // CSP delivered as a response header; strict (no unsafe-inline in script-src).
  const csp = (resp && resp.headers()['content-security-policy']) || '';
  const scriptSrc = (csp.match(/script-src[^;]*/) || [''])[0];
  rec(
    `${label}: strict CSP header (script-src, no unsafe-inline)`,
    csp.includes('script-src') &&
      !/unsafe-inline/.test(scriptSrc) &&
      csp.includes("object-src 'none'") &&
      csp.includes("frame-ancestors 'none'"),
    scriptSrc.slice(0, 70),
  );

  await runAxe(label);
}

// ---- internal link resolution (collected from home, checked in-browser) ----
await page.goto(BASE + '/', { waitUntil: 'load' });
const internal = await page.$$eval('a[href]', (as) =>
  Array.from(new Set(as.map((a) => a.getAttribute('href'))))
    .filter((h) => h && h.startsWith('/') && !h.startsWith('//')),
);
const linkResults = await page.evaluate(async (hrefs) => {
  const out = [];
  for (const h of hrefs) {
    try {
      const r = await fetch(h, { method: 'GET' });
      out.push({ h, s: r.status });
    } catch {
      out.push({ h, s: 0 });
    }
  }
  return out;
}, internal);
const brokenLinks = linkResults.filter((r) => r.s >= 400 || r.s === 0);
rec('internal links resolve (<400)', brokenLinks.length === 0, JSON.stringify(brokenLinks) + ' of ' + internal.length);

// Security response headers
const secResp = await page.goto(BASE + '/', { waitUntil: 'load' });
const H = (secResp && secResp.headers()) || {};
rec(
  'security headers (XFO/nosniff/Referrer/Permissions/COOP)',
  H['x-frame-options'] === 'DENY' &&
    H['x-content-type-options'] === 'nosniff' &&
    /strict-origin/.test(H['referrer-policy'] || '') &&
    !!H['permissions-policy'] &&
    /same-origin/.test(H['cross-origin-opener-policy'] || ''),
  JSON.stringify({ xfo: H['x-frame-options'], nosniff: H['x-content-type-options'], hsts: !!H['strict-transport-security'] }),
);

// ---- custom 404 ----
consoleErrors = [];
pageErrors = [];
const r404 = await page.goto(BASE + '/this-route-does-not-exist-xyz', { waitUntil: 'load' });
await settle(300);
rec('404: returns HTTP 404', r404 && r404.status() === 404, 'status=' + (r404 ? r404.status() : 'none'));
const body404 = await page.evaluate(() => document.body.innerText);
rec('404: shows custom "route not found" copy', /route not found/i.test(body404));

// ---- command palette ----
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + '/', { waitUntil: 'load' });
await settle(400);
await page.keyboard.press('Control+k');
await settle(350);
const openState = await page.evaluate(() => document.querySelector('[data-palette]')?.getAttribute('data-open'));
rec('command palette: opens on Ctrl+K', openState === 'true', 'data-open=' + openState);
const palettePath = await saveScreenshot(await page.screenshot(), 'e2e-palette-open.png');
await page.keyboard.press('Escape');
await settle(350);
const closeState = await page.evaluate(() => document.querySelector('[data-palette]')?.getAttribute('data-open'));
rec('command palette: closes on Escape', closeState === 'false', 'data-open=' + closeState);

// ---- contact form: validation + success (demo mode) ----
await page.goto(BASE + '/contact', { waitUntil: 'load' });
await settle(400);
await page.click('.contact-submit');
await settle(300);
const emptyErrs = await page.$$eval('.field-err', (es) => es.map((e) => e.textContent.trim()).filter(Boolean));
rec('contact: empty submit shows inline errors', emptyErrs.length >= 2, JSON.stringify(emptyErrs));

await page.fill('#name', 'Jane Tester');
await page.fill('#email', 'jane@example.com');
await page.fill('#message', 'I would like to automate my client onboarding flow. Can we talk?');
await page.click('.contact-submit');
await settle(1300); // demo-mode success has a ~700ms simulated delay
const successVisible = await page.evaluate(() => {
  const el = document.querySelector('[data-form-success]');
  return el ? !el.hidden : false;
});
rec('contact: valid submit shows success panel (demo mode)', successVisible);
const contactPath = await saveScreenshot(await page.screenshot(), 'e2e-contact-success.png');

// ---- responsive: no horizontal overflow ----
const viewports = [
  [320, 700, 'small'],
  [390, 844, 'mobile'],
  [820, 1180, 'tablet'],
  [1440, 900, 'desktop'],
];
for (const [w, h, name] of viewports) {
  await page.setViewportSize({ width: w, height: h });
  for (const route of ['/', '/work', '/about', '/contact']) {
    await page.goto(BASE + route, { waitUntil: 'load' });
    await settle(250);
    const o = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
    }));
    rec(`${name} ${route}: no horizontal overflow`, o.sw <= o.iw + 2, `scrollW=${o.sw} innerW=${o.iw}`);
  }
}

// evidence: work gallery (desktop, motion on) + a mobile home
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + '/work', { waitUntil: 'load' });
await settle(600);
const workPath = await saveScreenshot(await page.screenshot(), 'e2e-work-desktop-motion.png');
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/', { waitUntil: 'load' });
await settle(400);
const mobilePath = await saveScreenshot(await page.screenshot(), 'e2e-home-mobile-motion.png');

const failed = results.filter((r) => !r.ok);
console.log(`\n==== SUMMARY: ${results.length - failed.length}/${results.length} checks passed ====`);
console.log(JSON.stringify({ screenshots: [palettePath, contactPath, workPath, mobilePath] }));
if (failed.length) {
  console.log('FAILURES:');
  failed.forEach((f) => console.log('  - ' + f.name + ' :: ' + f.detail));
  throw new Error(`${failed.length} e2e checks FAILED`);
}
console.log('ALL E2E CHECKS PASSED');
