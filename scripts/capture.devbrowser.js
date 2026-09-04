// dev-browser capture script (QuickJS sandbox - no Node APIs).
// Captures full-page desktop + mobile screenshots of every page into
// ~/.dev-browser/tmp, plus the 1200x630 OG image. Run:
//   dev-browser --headless run scripts/capture.devbrowser.js
// Then copy the PNGs from ~/.dev-browser/tmp into design/ and public/og.png.

// dev-browser-nav-guard: dynamic-ok every target is BASE (a literal loopback URL)
// joined with a route from the literal list below, so nothing here is read from a page.

// IPv4-explicit for the same reason as e2e: a stray `astro preview` binds ::1.
const BASE = 'http://127.0.0.1:4321';
const routes = [
  ['home', '/'],
  ['privacy', '/privacy'],
  ['notfound', '/this-route-does-not-exist'],
];
const viewports = [
  ['desktop', 1440, 900],
  ['tablet', 820, 1180],
  ['mobile', 390, 844],
];

// Wait for `load`, not `networkidle`: the design's own runtime keeps the network
// busy enough that idle never fires here and every capture timed out at 30s. The
// font-ready check and the settle below are what actually make the shot stable.
const settle = (ms) => new Promise((r) => setTimeout(r, ms));
const page = await browser.getPage('taranity-shot');
const saved = [];

// Reduced motion → all scroll-reveal content is visible for full-page capture.
await page.emulateMedia({ reducedMotion: 'reduce' });

for (const [vpName, w, h] of viewports) {
  await page.setViewportSize({ width: w, height: h });
  for (const [name, route] of routes) {
    await page.goto(BASE + route, { waitUntil: 'load' });
    await page.evaluate(() => (document.fonts ? document.fonts.ready : true));
    // Walk the page down and back before the shot. Sections reveal on scroll
    // (IntersectionObserver), and a full-page screenshot does not scroll, so
    // without this pass everything below the hero captures blank.
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.8);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 200));
    });
    await settle(700);
    const buf = await page.screenshot({ fullPage: true });
    const p = await saveScreenshot(buf, `${name}-${vpName}.png`);
    saved.push(p);
    console.log(`captured ${name}-${vpName}`);
  }
}

// OG image (animation on; fixed 1200x630 clip).
await page.emulateMedia({ reducedMotion: 'no-preference' });
await page.setViewportSize({ width: 1200, height: 630 });
await page.goto(BASE + '/og-preview', { waitUntil: 'load' });
await page.evaluate(() => (document.fonts ? document.fonts.ready : true));
await settle(500);
const ogBuf = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
saved.push(await saveScreenshot(ogBuf, 'og.png'));
console.log('captured og');

console.log(JSON.stringify({ saved }, null, 2));
