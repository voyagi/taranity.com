// End-to-end + a11y suite, driven by dev-browser (Playwright Page API under a
// Rust/QuickJS harness — this environment blocks raw Playwright by policy).
//
// Run the built site first:  npm run build && npm run preview   (serves :4321)
// Then:                      npm run e2e
//
// Covers: page status, single non-empty <h1>, <title>, console/page errors,
// image loading, internal-link resolution, axe-core WCAG2A/AA per page,
// contact form validation + success (demo mode, both designs), custom 404,
// no horizontal overflow at mobile/tablet/desktop, theme persistence, the
// Vitrine motion reveals (hero masks, statements, plate wipes), and the
// Atlas journey (switcher swap, hero masks, waypoint wipes, lazy WebGL).

// IPv4-explicit on purpose: serve-headers.mjs binds 127.0.0.1, while a stray
// `astro preview` (no _headers applied) binds ::1 — and `localhost` resolves
// to ::1 first, silently swapping the server under the suite.
const BASE = 'http://127.0.0.1:4321';
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
// site defect. plausible.io = analytics, only loaded when configured.
const isBenign = (u) => /plausible\.io/.test(u);

// Deterministic checks: entrance animations caught mid-fade make axe's
// contrast checks flaky, and reduced motion also exposes the reveal-gated
// text to the audit (better coverage). Motion is re-enabled for the evidence
// screenshots at the end.
try {
  await page.emulateMedia({ reducedMotion: 'reduce' });
} catch {
  /* harness without emulateMedia: checks still run, just with motion on */
}

const pages200 = [
  ['/', 'home'],
  ['/privacy', 'privacy'],
  ['/atlas', 'atlas'],
  ['/signal', 'signal'],
  ['/storefront', 'storefront'],
  ['/practice', 'practice'],
  ['/raw', 'raw'],
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
  await settle(700); // let deferred scripts and first-frame motion settle
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
rec('404: shows custom not-found copy', /route was not found/i.test(body404));

// ---- contact form (on the home experience): validation + success (demo mode) ----
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + '/', { waitUntil: 'load' });
await settle(400);
await page.click('.v-submit'); // Playwright scrolls it into view
await settle(300);
const emptyErrs = await page.$$eval('[data-v-err]', (es) => es.map((e) => e.textContent.trim()).filter(Boolean));
rec('contact: empty submit shows inline errors', emptyErrs.length >= 2, JSON.stringify(emptyErrs));

await page.fill('#v-name', 'Jane Tester');
await page.fill('#v-email', 'jane@example.com');
await page.fill('#v-message', 'I would like to automate my client onboarding flow. Can we talk?');
await page.click('.v-submit');
await settle(1300); // demo-mode success has a ~700ms simulated delay
const successVisible = await page.evaluate(() => {
  const el = document.querySelector('[data-v-form-success]');
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
  for (const route of ['/', '/privacy', '/atlas', '/signal', '/storefront', '/practice', '/raw']) {
    await page.goto(BASE + route, { waitUntil: 'load' });
    await settle(250);
    const o = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
    }));
    rec(`${name} ${route}: no horizontal overflow`, o.sw <= o.iw + 2, `scrollW=${o.sw} innerW=${o.iw}`);
  }
}

// ---- Vitrine (showcase home): design attr, system-default mode, toggle, persistence ----
// Reset the error trackers so this block is isolated from the prior navigations.
consoleErrors = [];
pageErrors = [];
failedResponses = [];
failedRequests = [];
await page.setViewportSize({ width: 1440, height: 900 });
const dattr = (k) => page.evaluate((x) => document.documentElement.getAttribute(x), k);
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
await page.reload({ waitUntil: 'load' });
await settle(400);
rec('vitrine: home renders design=vitrine', (await dattr('data-design')) === 'vitrine', await dattr('data-design'));
const modeBefore = await dattr('data-mode');
rec('vitrine: mode resolved from system', modeBefore === 'light' || modeBefore === 'dark', String(modeBefore));
await page.click('[data-mode-toggle]');
await settle(250);
const modeAfter = await dattr('data-mode');
rec(
  'vitrine: toggle flips mode',
  (modeAfter === 'light' || modeAfter === 'dark') && modeAfter !== modeBefore,
  `${modeBefore} -> ${modeAfter}`,
);
await page.reload({ waitUntil: 'load' });
await settle(250);
rec('vitrine: mode persists across reload', (await dattr('data-mode')) === modeAfter, await dattr('data-mode'));

// The mode survives a View-Transition navigation to a subpage, which renders
// the same design system (privacy is on the Vitrine shell).
await page.click('.v-footer a[href="/privacy"]');
for (let i = 0; i < 25 && !/\/privacy/.test(page.url()); i++) await settle(200); // await the VT swap
await settle(300);
rec(
  'vitrine: mode and design persist onto the privacy subpage',
  (await dattr('data-mode')) === modeAfter && (await dattr('data-design')) === 'vitrine' && /\/privacy/.test(page.url()),
  `${await dattr('data-mode')} / ${await dattr('data-design')} @ ${page.url()}`,
);
await page.evaluate(() => { try { localStorage.clear(); } catch {} });

// ---- Discoverability cues: label, active-state pill, one-time invite ----
// Switching designs is the whole point of the showcase, so a first-time visitor
// must see it is offered. Start from cleared storage so the first-visit path is
// exercised deterministically regardless of the harness profile.
await page.goto(BASE + '/', { waitUntil: 'load' });
await settle(400);
const inviteShown = await page.evaluate(() => {
  const n = document.querySelector('[data-design-nudge]');
  return n ? !n.hidden : false;
});
rec('switcher: first-visit invite appears on a fresh visit', inviteShown);
const inviteText = await page.evaluate(() => {
  const el = document.querySelector('[data-design-nudge] .ds-nudge-text');
  return el ? el.textContent.trim() : '';
});
rec(
  'switcher: invite copy is count-driven and em-dash-free',
  /Same site, 6 designs\. Take your pick\./.test(inviteText) && !inviteText.includes('—'),
  inviteText,
);
const hasLabel = (await page.$('.ds-label')) !== null;
rec('switcher: carries a "Designs" label', hasLabel);
const activeHrefs = await page.$$eval('.ds-design[aria-current="page"]', (as) => as.map((a) => a.getAttribute('href')));
rec(
  'switcher: exactly the current design is marked active',
  activeHrefs.length === 1 && activeHrefs[0] === '/',
  JSON.stringify(activeHrefs),
);
// evidence: invite + label + active pill, all visible together
const switcherPath = await saveScreenshot(await page.screenshot(), 'e2e-switcher-invite.png');
// dismissing hides it, and the choice persists across a reload (shown once)
await page.click('[data-nudge-dismiss]');
await settle(150);
const afterDismiss = await page.evaluate(() => {
  const n = document.querySelector('[data-design-nudge]');
  return n ? n.hidden : true;
});
rec('switcher: dismiss hides the invite', afterDismiss);
await page.goto(BASE + '/', { waitUntil: 'load' });
await settle(300);
const afterReload = await page.evaluate(() => {
  const n = document.querySelector('[data-design-nudge]');
  return n ? n.hidden : true;
});
rec('switcher: invite stays gone after being seen (persisted)', afterReload);
// the active pill tracks the route, not just the home page
await page.goto(BASE + '/atlas', { waitUntil: 'load' });
await settle(300);
const atlasActive = await page.$$eval('.ds-design[aria-current="page"]', (as) => as.map((a) => a.getAttribute('href')));
rec(
  'switcher: active pill follows the route (atlas)',
  atlasActive.length === 1 && atlasActive[0] === '/atlas',
  JSON.stringify(atlasActive),
);

// ---- Atlas (second design): registry exposure, dark-only controls, form ----
// Still under reduced motion: these are content checks, the journey motion
// has its own block below.
await page.goto(BASE + '/atlas', { waitUntil: 'load' });
await settle(400);
rec('atlas: renders design=atlas', (await dattr('data-design')) === 'atlas', await dattr('data-design'));
const switcherLinks = await page.$$eval('.ds-design', (as) => as.map((a) => a.getAttribute('href')));
rec(
  'atlas: switcher lists the ready designs',
  ['/', '/atlas', '/signal', '/storefront', '/practice', '/raw'].every((h) => switcherLinks.includes(h)),
  JSON.stringify(switcherLinks),
);
const atlasToggle = await page.$('[data-mode-toggle]');
rec('atlas: dark-only design offers no mode toggle', atlasToggle === null);
await page.goto(BASE + '/', { waitUntil: 'load' });
const homeToggle = await page.$('[data-mode-toggle]');
rec('vitrine: dual-mode design keeps the mode toggle', homeToggle !== null);

// Atlas contact form: same hardened flow as the home form, Atlas selectors.
await page.goto(BASE + '/atlas', { waitUntil: 'load' });
await settle(400);
await page.click('.a-submit');
await settle(300);
const aEmptyErrs = await page.$$eval('[data-a-err]', (es) => es.map((e) => e.textContent.trim()).filter(Boolean));
rec('atlas contact: empty submit shows inline errors', aEmptyErrs.length >= 2, JSON.stringify(aEmptyErrs));
await page.fill('#a-name', 'Jane Tester');
await page.fill('#a-email', 'jane@example.com');
await page.fill('#a-message', 'We are launching a product this autumn and need the works.');
await page.click('.a-submit');
await settle(1300); // demo-mode success has a ~700ms simulated delay
const aSuccessVisible = await page.evaluate(() => {
  const el = document.querySelector('[data-a-form-success]');
  return el ? !el.hidden : false;
});
rec('atlas contact: valid submit shows success panel (demo mode)', aSuccessVisible);

// ---- Signal (third design): registry exposure, dual-mode controls, form ----
// Still under reduced motion: these are content checks; the reveal motion has
// its own block below.
await page.goto(BASE + '/signal', { waitUntil: 'load' });
await settle(400);
rec('signal: renders design=signal', (await dattr('data-design')) === 'signal', await dattr('data-design'));
const sSwitcherLinks = await page.$$eval('.ds-design', (as) => as.map((a) => a.getAttribute('href')));
rec(
  'signal: switcher lists all six ready designs',
  ['/', '/atlas', '/signal', '/storefront', '/practice', '/raw'].every((h) => sSwitcherLinks.includes(h)),
  JSON.stringify(sSwitcherLinks),
);
const signalToggle = await page.$('[data-mode-toggle]');
rec('signal: dual-mode design offers the mode toggle', signalToggle !== null);
const sModeResolved = await dattr('data-mode');
rec('signal: mode resolved (light default unless system dark)', sModeResolved === 'light' || sModeResolved === 'dark', String(sModeResolved));

// Signal contact form: same hardened flow as the other designs, Signal selectors.
await page.click('.s-submit');
await settle(300);
const sEmptyErrs = await page.$$eval('[data-s-err]', (es) => es.map((e) => e.textContent.trim()).filter(Boolean));
rec('signal contact: empty submit shows inline errors', sEmptyErrs.length >= 2, JSON.stringify(sEmptyErrs));
await page.fill('#s-name', 'Jane Tester');
await page.fill('#s-email', 'jane@example.com');
await page.fill('#s-message', 'We are launching a fintech dashboard and need it shipped well.');
await page.click('.s-submit');
await settle(1300); // demo-mode success has a ~700ms simulated delay
const sSuccessVisible = await page.evaluate(() => {
  const el = document.querySelector('[data-s-form-success]');
  return el ? !el.hidden : false;
});
rec('signal contact: valid submit shows success panel (demo mode)', sSuccessVisible);

// ---- Storefront (fourth design): registry exposure, light-only controls, form ----
// Still under reduced motion: these are content checks; the reveal motion has
// its own block below.
await page.goto(BASE + '/storefront', { waitUntil: 'load' });
await settle(400);
rec('storefront: renders design=storefront', (await dattr('data-design')) === 'storefront', await dattr('data-design'));
const fSwitcherLinks = await page.$$eval('.ds-design', (as) => as.map((a) => a.getAttribute('href')));
rec(
  'storefront: switcher lists all six ready designs',
  ['/', '/atlas', '/signal', '/storefront', '/practice', '/raw'].every((h) => fSwitcherLinks.includes(h)),
  JSON.stringify(fSwitcherLinks),
);
const storefrontToggle = await page.$('[data-mode-toggle]');
rec('storefront: light-only design offers no mode toggle', storefrontToggle === null);

// Storefront contact form: same hardened flow as the other designs, Storefront selectors.
await page.click('.f-submit');
await settle(300);
const fEmptyErrs = await page.$$eval('[data-f-err]', (es) => es.map((e) => e.textContent.trim()).filter(Boolean));
rec('storefront contact: empty submit shows inline errors', fEmptyErrs.length >= 2, JSON.stringify(fEmptyErrs));
await page.fill('#f-name', 'Jane Tester');
await page.fill('#f-email', 'jane@example.com');
await page.fill('#f-message', 'We are launching a beauty brand store and want it to convert.');
await page.click('.f-submit');
await settle(1300); // demo-mode success has a ~700ms simulated delay
const fSuccessVisible = await page.evaluate(() => {
  const el = document.querySelector('[data-f-form-success]');
  return el ? !el.hidden : false;
});
rec('storefront contact: valid submit shows success panel (demo mode)', fSuccessVisible);

// ---- Practice (fifth design): registry exposure, light-only controls, form ----
// Still under reduced motion: these are content checks; the reveal motion has
// its own block below.
await page.goto(BASE + '/practice', { waitUntil: 'load' });
await settle(400);
rec('practice: renders design=practice', (await dattr('data-design')) === 'practice', await dattr('data-design'));
const pSwitcherLinks = await page.$$eval('.ds-design', (as) => as.map((a) => a.getAttribute('href')));
rec(
  'practice: switcher lists all six ready designs',
  ['/', '/atlas', '/signal', '/storefront', '/practice', '/raw'].every((h) => pSwitcherLinks.includes(h)),
  JSON.stringify(pSwitcherLinks),
);
const practiceToggle = await page.$('[data-mode-toggle]');
rec('practice: light-only design offers no mode toggle', practiceToggle === null);

// Practice contact form: same hardened flow as the other designs, Practice selectors.
await page.click('.p-submit');
await settle(300);
const pEmptyErrs = await page.$$eval('[data-p-err]', (es) => es.map((e) => e.textContent.trim()).filter(Boolean));
rec('practice contact: empty submit shows inline errors', pEmptyErrs.length >= 2, JSON.stringify(pEmptyErrs));
await page.fill('#p-name', 'Jane Tester');
await page.fill('#p-email', 'jane@example.com');
await page.fill('#p-message', 'We run a dental practice and need a website that wins new patients.');
await page.click('.p-submit');
await settle(1300); // demo-mode success has a ~700ms simulated delay
const pSuccessVisible = await page.evaluate(() => {
  const el = document.querySelector('[data-p-form-success]');
  return el ? !el.hidden : false;
});
rec('practice contact: valid submit shows success panel (demo mode)', pSuccessVisible);

// ---- Raw (sixth design): registry exposure, dual-mode controls, form ----
// Still under reduced motion: these are content checks; the reveal motion has
// its own block below.
await page.goto(BASE + '/raw', { waitUntil: 'load' });
await settle(400);
rec('raw: renders design=raw', (await dattr('data-design')) === 'raw', await dattr('data-design'));
const rSwitcherLinks = await page.$$eval('.ds-design', (as) => as.map((a) => a.getAttribute('href')));
rec(
  'raw: switcher lists all six ready designs',
  ['/', '/atlas', '/signal', '/storefront', '/practice', '/raw'].every((h) => rSwitcherLinks.includes(h)),
  JSON.stringify(rSwitcherLinks),
);
const rawToggle = await page.$('[data-mode-toggle]');
rec('raw: dual-mode design offers the mode toggle', rawToggle !== null);
const rModeResolved = await dattr('data-mode');
rec('raw: mode resolved (light or dark)', rModeResolved === 'light' || rModeResolved === 'dark', String(rModeResolved));

// Raw contact form: same hardened flow as the other designs, Raw selectors.
await page.click('.r-submit');
await settle(300);
const rEmptyErrs = await page.$$eval('[data-r-err]', (es) => es.map((e) => e.textContent.trim()).filter(Boolean));
rec('raw contact: empty submit shows inline errors', rEmptyErrs.length >= 2, JSON.stringify(rEmptyErrs));
await page.fill('#r-name', 'Jane Tester');
await page.fill('#r-email', 'jane@example.com');
await page.fill('#r-message', 'We run a record label and need a site that looks like nothing else.');
await page.click('.r-submit');
await settle(1300); // demo-mode success has a ~700ms simulated delay
const rSuccessVisible = await page.evaluate(() => {
  const el = document.querySelector('[data-r-form-success]');
  return el ? !el.hidden : false;
});
rec('raw contact: valid submit shows success panel (demo mode)', rSuccessVisible);

// evidence: the privacy subpage (desktop, motion on) + a mobile home
try {
  await page.emulateMedia({ reducedMotion: null });
} catch {
  /* see above */
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + '/privacy', { waitUntil: 'load' });
await settle(600);
const workPath = await saveScreenshot(await page.screenshot(), 'e2e-privacy-desktop.png');
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/', { waitUntil: 'load' });
await settle(400);
const mobilePath = await saveScreenshot(await page.screenshot(), 'e2e-home-mobile-motion.png');

// ---- motion ON: reveal-gated content actually becomes visible ----
// (The audits above run under reduced motion, where nothing is ever hidden;
// this guards the real reveal path. A mask line that stays translated by its
// own height reads as a blank page to visitors.)
// Force no-preference explicitly: the earlier reset restores the HOST default,
// and a host with OS-level reduced motion would pass these checks trivially
// without ever exercising the reveal path.
try {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
} catch {
  /* harness without emulateMedia: best effort, matches the rest of the suite */
}
const maskOffsets = (sel) =>
  page.evaluate(
    (s) =>
      [...document.querySelectorAll(s)].map((el) =>
        Math.round(el.getBoundingClientRect().top - el.parentElement.getBoundingClientRect().top)),
    sel,
  );
const revealed = (offs) => offs.length > 0 && offs.every((o) => Math.abs(o) < 8);
// Poll instead of a flat sleep: the reveal sits behind animation time plus
// (for scrolled sections) ScrollTrigger firing, both of which stretch under load.
const awaitReveal = async (sel, deadlineMs) => {
  const start = Date.now();
  let offs = await maskOffsets(sel);
  while (!revealed(offs) && Date.now() - start < deadlineMs) {
    await settle(250);
    offs = await maskOffsets(sel);
  }
  return offs;
};

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + '/', { waitUntil: 'load' });
const heroCount = await page.evaluate(() => document.querySelectorAll('.v-hero .v-mask-inner').length);
rec('vitrine motion: hero has its two masked lines', heroCount === 2, 'count=' + heroCount);
const heroOffsets = await awaitReveal('.v-hero .v-mask-inner', 6000); // entrance is ~2.2s
rec('vitrine motion: hero title lines rise fully into view', revealed(heroOffsets), 'offsets=' + JSON.stringify(heroOffsets));

// The contact statement reveals after the in-page anchor glide (goes through
// the design's own Lenis scroll, like a real visitor). The glide passes every
// craft plate, so their wipe reveals must have fired by the time we arrive.
await page.click('.v-nav a[href="#contact"]');
const stmtCount = await page.evaluate(() => document.querySelectorAll('.v-contact [data-v-lines] .v-mask-inner').length);
rec('vitrine motion: contact statement has its two masked lines', stmtCount === 2, 'count=' + stmtCount);
const stmtOffsets = await awaitReveal('.v-contact [data-v-lines] .v-mask-inner', 8000); // 1.6s glide + 1.05s reveal
rec('vitrine motion: contact statement lines rise fully into view', revealed(stmtOffsets), 'offsets=' + JSON.stringify(stmtOffsets));
const readPlateClips = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-v-plate-art]')].map((el) => getComputedStyle(el).clipPath),
  );
const platesOpen = (clips) => clips.length === 6 && clips.every((c) => !c.includes('100%'));
let plateClips = await readPlateClips();
for (const start = Date.now(); !platesOpen(plateClips) && Date.now() - start < 4000; ) {
  await settle(250);
  plateClips = await readPlateClips();
}
rec('vitrine motion: craft plates wiped fully open', platesOpen(plateClips), JSON.stringify(plateClips));

// ---- Atlas motion ON: switcher swap, reveals, waypoint wipes, lazy WebGL ----
// Arrive the way a visitor does: through the floating switcher and a
// View-Transition swap. This exercises the vitrine→atlas teardown path for
// real (Lenis handover, no double-driven scroll).
consoleErrors = [];
pageErrors = [];
failedResponses = [];
failedRequests = [];
await page.click('.ds-design[href="/atlas"]');
for (let i = 0; i < 25 && !/\/atlas/.test(page.url()); i++) await settle(200); // await the VT swap
await settle(300);
rec(
  'atlas motion: switcher swap lands on design=atlas',
  (await dattr('data-design')) === 'atlas' && /\/atlas/.test(page.url()),
  `${await dattr('data-design')} @ ${page.url()}`,
);

const aHeroCount = await page.evaluate(() => document.querySelectorAll('.a-hero .a-mask-inner').length);
rec('atlas motion: hero has its two masked lines', aHeroCount === 2, 'count=' + aHeroCount);
const aHeroOffsets = await awaitReveal('.a-hero .a-mask-inner', 6000); // entrance is ~2.2s
rec('atlas motion: hero title lines rise fully into view', revealed(aHeroOffsets), 'offsets=' + JSON.stringify(aHeroOffsets));

// The WebGL journey is lazy (idle callback + dynamic three.js chunk) and
// must resolve deterministically: data-gl='on' with a live canvas, or a
// clean 'off' fallback. Anything else means the boot path wedged. A null
// state also FAILS by design: it means motion never ran (e.g. a harness
// without emulateMedia on a reduced-motion host), and an environment that
// cannot exercise the motion path must fail loudly, not skip silently.
let glState = null;
for (const start = Date.now(); Date.now() - start < 12000; ) {
  glState = await page.evaluate(() => document.querySelector('[data-atlas]')?.getAttribute('data-gl') ?? null);
  if (glState === 'on' || glState === 'off') break;
  await settle(300);
}
const glCanvas = await page.evaluate(() => Boolean(document.querySelector('[data-a-gl] canvas')));
rec(
  'atlas motion: WebGL journey resolves (on with canvas, or clean fallback)',
  glState === 'on' ? glCanvas : glState === 'off' && !glCanvas,
  `data-gl=${glState} canvas=${glCanvas}`,
);

// The contact statement reveals after the in-page anchor glide (through the
// design's own Lenis). The glide passes every waypoint row, so their wipe
// reveals must have fired by the time we arrive.
await page.click('.a-nav a[href="#contact"]');
const aStmtCount = await page.evaluate(() => document.querySelectorAll('.a-contact [data-a-lines] .a-mask-inner').length);
rec('atlas motion: contact statement has its two masked lines', aStmtCount === 2, 'count=' + aStmtCount);
const aStmtOffsets = await awaitReveal('.a-contact [data-a-lines] .a-mask-inner', 8000); // 1.6s glide + 1.05s reveal
rec('atlas motion: contact statement lines rise fully into view', revealed(aStmtOffsets), 'offsets=' + JSON.stringify(aStmtOffsets));

const readCardClips = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-a-card]')].map((el) => getComputedStyle(el).clipPath),
  );
const cardsOpen = (clips) => clips.length === 6 && clips.every((c) => !c.includes('100%'));
let cardClips = await readCardClips();
for (const start = Date.now(); !cardsOpen(cardClips) && Date.now() - start < 4000; ) {
  await settle(250);
  cardClips = await readCardClips();
}
rec('atlas motion: waypoint rows wiped fully open', cardsOpen(cardClips), JSON.stringify(cardClips));

// The whole journey (swap, reveals, GL boot) must stay error-free.
const atlasFirstParty = [
  ...failedResponses.filter((f) => !isBenign(f.url)),
  ...failedRequests.filter((u) => !isBenign(u)).map((u) => ({ url: u, status: 'failed' })),
];
// Same benign-noise filter as the page-level checks: the browser's generic
// "Failed to load resource" line is ignored when no first-party request failed.
const atlasRealConsole = consoleErrors.filter(
  (t) => !(/Failed to load resource/i.test(t) && atlasFirstParty.length === 0),
);
rec(
  'atlas motion: no first-party console/page errors across the journey',
  atlasRealConsole.length === 0 && pageErrors.length === 0 && atlasFirstParty.length === 0,
  [...atlasRealConsole, ...pageErrors].join(' | ').slice(0, 240) || 'clean',
);

// evidence: the atlas opening (desktop, motion on; fresh load rather than a
// scroll-to-top so the capture never races Lenis's animated scroll state)
await page.goto(BASE + '/atlas', { waitUntil: 'load' });
for (const start = Date.now(); Date.now() - start < 8000; ) {
  const s = await page.evaluate(() => document.querySelector('[data-atlas]')?.getAttribute('data-gl') ?? null);
  if (s === 'on' || s === 'off') break;
  await settle(300);
}
await settle(1200); // canvas fade-in + hero settle
const atlasPath = await saveScreenshot(await page.screenshot(), 'e2e-atlas-desktop.png');

// ---- Signal motion ON: switcher swap, reveals, card wipes (no WebGL) ----
// Arrive the way a visitor does: through the floating switcher and a
// View-Transition swap from Atlas. This exercises the atlas→signal teardown
// for real (Atlas's Lenis + WebGL torn down, Signal's Lenis set up, no double
// scroll driver).
consoleErrors = [];
pageErrors = [];
failedResponses = [];
failedRequests = [];
await page.setViewportSize({ width: 1440, height: 900 });
await page.click('.ds-design[href="/signal"]');
for (let i = 0; i < 25 && !/\/signal/.test(page.url()); i++) await settle(200); // await the VT swap
await settle(300);
rec(
  'signal motion: switcher swap lands on design=signal',
  (await dattr('data-design')) === 'signal' && /\/signal/.test(page.url()),
  `${await dattr('data-design')} @ ${page.url()}`,
);

const sHeroCount = await page.evaluate(() => document.querySelectorAll('.s-hero .s-mask-inner').length);
rec('signal motion: hero has its two masked lines', sHeroCount === 2, 'count=' + sHeroCount);
const sHeroOffsets = await awaitReveal('.s-hero .s-mask-inner', 6000); // entrance is ~1.6s
rec('signal motion: hero title lines rise fully into view', revealed(sHeroOffsets), 'offsets=' + JSON.stringify(sHeroOffsets));

// The contact statement reveals after the in-page anchor glide (through the
// design's own Lenis). The glide passes every offering card, so their wipe
// reveals must have fired by the time we arrive.
await page.click('.s-nav a[href="#contact"]');
const sStmtCount = await page.evaluate(() => document.querySelectorAll('.s-contact [data-s-lines] .s-mask-inner').length);
rec('signal motion: contact statement has its two masked lines', sStmtCount === 2, 'count=' + sStmtCount);
const sStmtOffsets = await awaitReveal('.s-contact [data-s-lines] .s-mask-inner', 8000); // 1.4s glide + 0.95s reveal
rec('signal motion: contact statement lines rise fully into view', revealed(sStmtOffsets), 'offsets=' + JSON.stringify(sStmtOffsets));

const readSignalCardClips = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-s-card]')].map((el) => getComputedStyle(el).clipPath),
  );
const sCardsOpen = (clips) => clips.length === 6 && clips.every((c) => !c.includes('100%'));
let sCardClips = await readSignalCardClips();
for (const start = Date.now(); !sCardsOpen(sCardClips) && Date.now() - start < 4000; ) {
  await settle(250);
  sCardClips = await readSignalCardClips();
}
rec('signal motion: offering cards wiped fully open', sCardsOpen(sCardClips), JSON.stringify(sCardClips));

// The whole journey (swap, reveals) must stay error-free.
const signalFirstParty = [
  ...failedResponses.filter((f) => !isBenign(f.url)),
  ...failedRequests.filter((u) => !isBenign(u)).map((u) => ({ url: u, status: 'failed' })),
];
const signalRealConsole = consoleErrors.filter(
  (t) => !(/Failed to load resource/i.test(t) && signalFirstParty.length === 0),
);
rec(
  'signal motion: no first-party console/page errors across the journey',
  signalRealConsole.length === 0 && pageErrors.length === 0 && signalFirstParty.length === 0,
  [...signalRealConsole, ...pageErrors].join(' | ').slice(0, 240) || 'clean',
);

// evidence: the signal opening (desktop, motion on)
await page.goto(BASE + '/signal', { waitUntil: 'load' });
await settle(1200); // hero entrance + chart draw settle
const signalPath = await saveScreenshot(await page.screenshot(), 'e2e-signal-desktop.png');

// ---- Storefront motion ON: switcher swap, reveals, card wipes (no WebGL) ----
// Arrive the way a visitor does: through the floating switcher and a
// View-Transition swap from Signal. This exercises the signal→storefront
// teardown for real (Signal's Lenis torn down, Storefront's Lenis set up, no
// double scroll driver).
consoleErrors = [];
pageErrors = [];
failedResponses = [];
failedRequests = [];
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + '/signal', { waitUntil: 'load' });
await settle(400);
await page.click('.ds-design[href="/storefront"]');
for (let i = 0; i < 25 && !/\/storefront/.test(page.url()); i++) await settle(200); // await the VT swap
await settle(300);
rec(
  'storefront motion: switcher swap lands on design=storefront',
  (await dattr('data-design')) === 'storefront' && /\/storefront/.test(page.url()),
  `${await dattr('data-design')} @ ${page.url()}`,
);

const fHeroCount = await page.evaluate(() => document.querySelectorAll('.f-hero .f-mask-inner').length);
rec('storefront motion: hero has its two masked lines', fHeroCount === 2, 'count=' + fHeroCount);
const fHeroOffsets = await awaitReveal('.f-hero .f-mask-inner', 6000); // entrance is ~1.6s
rec('storefront motion: hero title lines rise fully into view', revealed(fHeroOffsets), 'offsets=' + JSON.stringify(fHeroOffsets));

// The contact statement reveals after the in-page anchor glide (through the
// design's own Lenis). The glide passes every product card, so their wipe
// reveals must have fired by the time we arrive.
await page.click('.f-nav a[href="#contact"]');
const fStmtCount = await page.evaluate(() => document.querySelectorAll('.f-contact [data-f-lines] .f-mask-inner').length);
rec('storefront motion: contact statement has its two masked lines', fStmtCount === 2, 'count=' + fStmtCount);
const fStmtOffsets = await awaitReveal('.f-contact [data-f-lines] .f-mask-inner', 8000); // 1.4s glide + 0.95s reveal
rec('storefront motion: contact statement lines rise fully into view', revealed(fStmtOffsets), 'offsets=' + JSON.stringify(fStmtOffsets));

const readStorefrontCardClips = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-f-card]')].map((el) => getComputedStyle(el).clipPath),
  );
const fCardsOpen = (clips) => clips.length === 6 && clips.every((c) => !c.includes('100%'));
let fCardClips = await readStorefrontCardClips();
for (const start = Date.now(); !fCardsOpen(fCardClips) && Date.now() - start < 4000; ) {
  await settle(250);
  fCardClips = await readStorefrontCardClips();
}
rec('storefront motion: product cards wiped fully open', fCardsOpen(fCardClips), JSON.stringify(fCardClips));

// The whole journey (swap, reveals) must stay error-free.
const storefrontFirstParty = [
  ...failedResponses.filter((f) => !isBenign(f.url)),
  ...failedRequests.filter((u) => !isBenign(u)).map((u) => ({ url: u, status: 'failed' })),
];
const storefrontRealConsole = consoleErrors.filter(
  (t) => !(/Failed to load resource/i.test(t) && storefrontFirstParty.length === 0),
);
rec(
  'storefront motion: no first-party console/page errors across the journey',
  storefrontRealConsole.length === 0 && pageErrors.length === 0 && storefrontFirstParty.length === 0,
  [...storefrontRealConsole, ...pageErrors].join(' | ').slice(0, 240) || 'clean',
);

// evidence: the storefront opening (desktop, motion on)
await page.goto(BASE + '/storefront', { waitUntil: 'load' });
await settle(1200); // hero entrance settle
const storefrontPath = await saveScreenshot(await page.screenshot(), 'e2e-storefront-desktop.png');

// ---- Practice motion ON: switcher swap, reveals, card wipes (no WebGL) ----
// Arrive the way a visitor does: through the floating switcher and a
// View-Transition swap from Storefront. This exercises the storefront→practice
// teardown for real (Storefront's Lenis torn down, Practice's Lenis set up, no
// double scroll driver).
consoleErrors = [];
pageErrors = [];
failedResponses = [];
failedRequests = [];
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + '/storefront', { waitUntil: 'load' });
await settle(400);
await page.click('.ds-design[href="/practice"]');
for (let i = 0; i < 25 && !/\/practice/.test(page.url()); i++) await settle(200); // await the VT swap
await settle(300);
rec(
  'practice motion: switcher swap lands on design=practice',
  (await dattr('data-design')) === 'practice' && /\/practice/.test(page.url()),
  `${await dattr('data-design')} @ ${page.url()}`,
);

const pHeroCount = await page.evaluate(() => document.querySelectorAll('.p-hero .p-mask-inner').length);
rec('practice motion: hero has its two masked lines', pHeroCount === 2, 'count=' + pHeroCount);
const pHeroOffsets = await awaitReveal('.p-hero .p-mask-inner', 6000); // entrance is ~1.6s
rec('practice motion: hero title lines rise fully into view', revealed(pHeroOffsets), 'offsets=' + JSON.stringify(pHeroOffsets));

// The contact statement reveals after the in-page anchor glide (through the
// design's own Lenis). The glide passes every service card, so their wipe
// reveals must have fired by the time we arrive.
await page.click('.p-nav a[href="#contact"]');
const pStmtCount = await page.evaluate(() => document.querySelectorAll('.p-contact [data-p-lines] .p-mask-inner').length);
rec('practice motion: contact statement has its two masked lines', pStmtCount === 2, 'count=' + pStmtCount);
const pStmtOffsets = await awaitReveal('.p-contact [data-p-lines] .p-mask-inner', 8000); // 1.4s glide + 0.95s reveal
rec('practice motion: contact statement lines rise fully into view', revealed(pStmtOffsets), 'offsets=' + JSON.stringify(pStmtOffsets));

const readPracticeCardClips = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-p-card]')].map((el) => getComputedStyle(el).clipPath),
  );
const pCardsOpen = (clips) => clips.length === 6 && clips.every((c) => !c.includes('100%'));
let pCardClips = await readPracticeCardClips();
for (const start = Date.now(); !pCardsOpen(pCardClips) && Date.now() - start < 4000; ) {
  await settle(250);
  pCardClips = await readPracticeCardClips();
}
rec('practice motion: service cards wiped fully open', pCardsOpen(pCardClips), JSON.stringify(pCardClips));

// The whole journey (swap, reveals) must stay error-free.
const practiceFirstParty = [
  ...failedResponses.filter((f) => !isBenign(f.url)),
  ...failedRequests.filter((u) => !isBenign(u)).map((u) => ({ url: u, status: 'failed' })),
];
const practiceRealConsole = consoleErrors.filter(
  (t) => !(/Failed to load resource/i.test(t) && practiceFirstParty.length === 0),
);
rec(
  'practice motion: no first-party console/page errors across the journey',
  practiceRealConsole.length === 0 && pageErrors.length === 0 && practiceFirstParty.length === 0,
  [...practiceRealConsole, ...pageErrors].join(' | ').slice(0, 240) || 'clean',
);

// evidence: the practice opening (desktop, motion on)
await page.goto(BASE + '/practice', { waitUntil: 'load' });
await settle(1200); // hero entrance settle
const practicePath = await saveScreenshot(await page.screenshot(), 'e2e-practice-desktop.png');

// ---- Raw motion ON: switcher swap, reveals, card wipes (no WebGL) ----
// Arrive the way a visitor does: through the floating switcher and a
// View-Transition swap from Practice. This exercises the practice→raw teardown
// for real (Practice's Lenis torn down, Raw's Lenis set up, no double scroll
// driver).
consoleErrors = [];
pageErrors = [];
failedResponses = [];
failedRequests = [];
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + '/practice', { waitUntil: 'load' });
await settle(400);
await page.click('.ds-design[href="/raw"]');
for (let i = 0; i < 25 && !/\/raw/.test(page.url()); i++) await settle(200); // await the VT swap
await settle(300);
rec(
  'raw motion: switcher swap lands on design=raw',
  (await dattr('data-design')) === 'raw' && /\/raw/.test(page.url()),
  `${await dattr('data-design')} @ ${page.url()}`,
);

const rHeroCount = await page.evaluate(() => document.querySelectorAll('.r-hero .r-mask-inner').length);
rec('raw motion: hero has its two masked lines', rHeroCount === 2, 'count=' + rHeroCount);
const rHeroOffsets = await awaitReveal('.r-hero .r-mask-inner', 6000); // entrance is ~1.6s
rec('raw motion: hero title lines rise fully into view', revealed(rHeroOffsets), 'offsets=' + JSON.stringify(rHeroOffsets));

// The contact statement reveals after the in-page anchor glide (through the
// design's own Lenis). The glide passes every craft card, so their wipe reveals
// must have fired by the time we arrive.
await page.click('.r-nav a[href="#contact"]');
const rStmtCount = await page.evaluate(() => document.querySelectorAll('.r-contact [data-r-lines] .r-mask-inner').length);
rec('raw motion: contact statement has its two masked lines', rStmtCount === 2, 'count=' + rStmtCount);
const rStmtOffsets = await awaitReveal('.r-contact [data-r-lines] .r-mask-inner', 8000); // 1.3s glide + 0.9s reveal
rec('raw motion: contact statement lines rise fully into view', revealed(rStmtOffsets), 'offsets=' + JSON.stringify(rStmtOffsets));

const readRawCardClips = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-r-card]')].map((el) => getComputedStyle(el).clipPath),
  );
const rCardsOpen = (clips) => clips.length === 6 && clips.every((c) => !c.includes('100%'));
let rCardClips = await readRawCardClips();
for (const start = Date.now(); !rCardsOpen(rCardClips) && Date.now() - start < 4000; ) {
  await settle(250);
  rCardClips = await readRawCardClips();
}
rec('raw motion: cards wiped fully open', rCardsOpen(rCardClips), JSON.stringify(rCardClips));

// The whole journey (swap, reveals) must stay error-free.
const rawFirstParty = [
  ...failedResponses.filter((f) => !isBenign(f.url)),
  ...failedRequests.filter((u) => !isBenign(u)).map((u) => ({ url: u, status: 'failed' })),
];
const rawRealConsole = consoleErrors.filter(
  (t) => !(/Failed to load resource/i.test(t) && rawFirstParty.length === 0),
);
rec(
  'raw motion: no first-party console/page errors across the journey',
  rawRealConsole.length === 0 && pageErrors.length === 0 && rawFirstParty.length === 0,
  [...rawRealConsole, ...pageErrors].join(' | ').slice(0, 240) || 'clean',
);

// evidence: the raw opening (desktop, motion on)
await page.goto(BASE + '/raw', { waitUntil: 'load' });
await settle(1200); // hero entrance settle
const rawPath = await saveScreenshot(await page.screenshot(), 'e2e-raw-desktop.png');

const failed = results.filter((r) => !r.ok);
console.log(`\n==== SUMMARY: ${results.length - failed.length}/${results.length} checks passed ====`);
console.log(JSON.stringify({ screenshots: [switcherPath, contactPath, workPath, mobilePath, atlasPath, signalPath, storefrontPath, practicePath, rawPath] }));
if (failed.length) {
  console.log('FAILURES:');
  failed.forEach((f) => console.log('  - ' + f.name + ' :: ' + f.detail));
  throw new Error(`${failed.length} e2e checks FAILED`);
}
console.log('ALL E2E CHECKS PASSED');
