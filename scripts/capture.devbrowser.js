// dev-browser capture script (QuickJS sandbox — no Node APIs).
// Captures full-page desktop + mobile screenshots of every page into
// ~/.dev-browser/tmp, plus the 1200x630 OG image. Run:
//   dev-browser --headless run scripts/capture.devbrowser.js
// Then copy the PNGs from ~/.dev-browser/tmp into design/ and public/og.png.

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

const settle = (ms) => new Promise((r) => setTimeout(r, ms));
const page = await browser.getPage('taranity-shot');
const saved = [];

// Reduced motion → all scroll-reveal content is visible for full-page capture.
await page.emulateMedia({ reducedMotion: 'reduce' });

for (const [vpName, w, h] of viewports) {
  await page.setViewportSize({ width: w, height: h });
  for (const [name, route] of routes) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.evaluate(() => (document.fonts ? document.fonts.ready : true));
    await settle(500);
    const buf = await page.screenshot({ fullPage: true });
    const p = await saveScreenshot(buf, `${name}-${vpName}.png`);
    saved.push(p);
    console.log(`captured ${name}-${vpName}`);
  }
}

// OG image (animation on; fixed 1200x630 clip).
await page.emulateMedia({ reducedMotion: 'no-preference' });
await page.setViewportSize({ width: 1200, height: 630 });
await page.goto(BASE + '/og-preview', { waitUntil: 'networkidle' });
await page.evaluate(() => (document.fonts ? document.fonts.ready : true));
await settle(500);
const ogBuf = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
saved.push(await saveScreenshot(ogBuf, 'og.png'));
console.log('captured og');

console.log(JSON.stringify({ saved }, null, 2));
