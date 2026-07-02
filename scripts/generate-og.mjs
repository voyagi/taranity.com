// Generate per-article Open Graph images: serve the built site, screenshot each
// /og-preview/journal/<slug> card at 1200×630 with dev-browser (headless), and
// copy the PNGs to public/journal/<slug>.png (which each article's `heroImage`
// frontmatter points at). Drafts included, so images exist before publish.
//
// Usage: npm run build && node scripts/generate-og.mjs
// Requires the dev-browser CLI (installed globally; see the dev-browser skill).
import { readdirSync, existsSync, copyFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = Number(process.env.PORT) || 4331;
const CONTENT_DIR = 'src/content/journal';
const OUT_DIR = 'public/journal';

if (!existsSync('dist/og-preview/journal')) {
  console.error('dist/og-preview/journal not found - run `npm run build` first.');
  process.exit(1);
}

const slugs = readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''));
if (slugs.length === 0) {
  console.error('no journal articles found under ' + CONTENT_DIR);
  process.exit(1);
}

// dev-browser scripts run in QuickJS (no fs/env), so inline the slug list and
// port into a generated script file. Screenshots land in ~/.dev-browser/tmp.
const script = `
const SLUGS = ${JSON.stringify(slugs)};
const page = await browser.getPage("taranity-og");
await page.setViewportSize({ width: 1200, height: 630 });
for (const slug of SLUGS) {
  await page.goto("http://127.0.0.1:${PORT}/og-preview/journal/" + slug + "/");
  await page.waitForSelector(".og");
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.locator(".og").screenshot();
  await saveScreenshot(buf, "og-journal-" + slug + ".png");
  console.log("shot " + slug);
}
`;
const scriptPath = join(tmpdir(), 'taranity-og.devbrowser.js');
writeFileSync(scriptPath, script);

const server = spawn(process.execPath, ['scripts/serve-headers.mjs'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});

try {
  // Give the server a moment, then drive the browser. dev-browser is a .cmd
  // shim on Windows, hence shell: true.
  const run = spawnSync('dev-browser', ['--headless', '--timeout', '120', 'run', scriptPath], {
    shell: process.platform === 'win32',
    stdio: 'inherit',
    timeout: 180_000,
  });
  if (run.status !== 0) {
    console.error('dev-browser run failed (exit ' + run.status + ')');
    process.exit(run.status ?? 1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  let copied = 0;
  for (const slug of slugs) {
    const src = join(homedir(), '.dev-browser', 'tmp', `og-journal-${slug}.png`);
    if (!existsSync(src)) {
      console.error('MISSING screenshot for ' + slug + ' (' + src + ')');
      continue;
    }
    copyFileSync(src, join(OUT_DIR, `${slug}.png`));
    rmSync(src, { force: true });
    copied++;
  }
  console.log(`generate-og: ${copied}/${slugs.length} images written to ${OUT_DIR}/`);
  process.exit(copied === slugs.length ? 0 : 1);
} finally {
  server.kill();
}
