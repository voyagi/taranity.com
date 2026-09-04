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
import { join, dirname } from 'node:path';

const PORT = Number(process.env.PORT) || 4331;
const CONTENT_DIR = 'src/content/journal';
const OUT_DIR = 'public/journal';

if (!existsSync('dist/og-preview/journal')) {
  console.error('dist/og-preview/journal not found - run `npm run build` first.');
  process.exit(1);
}

// Recursive, matching the collection's `**/*.md` glob (and journalLastmod /
// the content-lint walker): a nested article's slug is its relative path.
const walkSlugs = (current, prefix = '') =>
  readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return walkSlugs(join(current, entry.name), `${prefix}${entry.name}/`);
    return entry.name.endsWith('.md') ? [`${prefix}${entry.name.replace(/\.md$/, '')}`] : [];
  });
const slugs = walkSlugs(CONTENT_DIR);
if (slugs.length === 0) {
  console.error('no journal articles found under ' + CONTENT_DIR);
  process.exit(1);
}

// Slashes cannot appear in the dev-browser tmp filename; map nested slugs to a
// flat name here and back when copying.
const flat = (slug) => 'og-journal-' + slug.split('/').join('__') + '.png';

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
  await saveScreenshot(buf, "og-journal-" + slug.split("/").join("__") + ".png");
  console.log("shot " + slug);
}
`;
const scriptPath = join(tmpdir(), 'taranity-og.devbrowser.js');
writeFileSync(scriptPath, script);

// Wait until the served site actually answers (an orphaned or slow server
// otherwise turns into a misleading dev-browser navigation failure).
async function waitForServer(url, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return;
    } catch {
      /* not listening yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`server did not answer at ${url} within ${timeoutMs}ms (is port ${PORT} free?)`);
}

const server = spawn(process.execPath, ['scripts/serve-headers.mjs'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});

// No process.exit() inside the try: it would skip the finally and orphan the
// server on port ${PORT}, silently breaking the NEXT run. Set exitCode instead.
let exitCode = 1;
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`);

  // dev-browser is a .cmd shim on Windows, and Node refuses to spawn one without a
  // shell, so shell: true stays. The whole command goes in as ONE string rather than
  // a command plus an args array: that form is deprecated with a shell (DEP0190, the
  // args are concatenated unescaped) and printed a warning on every run.
  //
  // Note for whoever runs this by hand: stdio is inherited, so send the output to a
  // terminal or a pipe. Redirecting it to a file on Windows hands the file handle down
  // to the browser process and the run appears to hang long after the images are written.
  const run = spawnSync(`dev-browser --headless --timeout 120 run "${scriptPath}"`, {
    shell: true,
    stdio: 'inherit',
    timeout: 180_000,
  });
  if (run.error) {
    console.error('dev-browser failed to start: ' + run.error.message);
  } else if (run.status !== 0) {
    console.error(`dev-browser run failed (exit ${run.status}${run.signal ? `, signal ${run.signal}` : ''})`);
  } else {
    let copied = 0;
    for (const slug of slugs) {
      const src = join(homedir(), '.dev-browser', 'tmp', flat(slug));
      if (!existsSync(src)) {
        console.error('MISSING screenshot for ' + slug + ' (' + src + ')');
        continue;
      }
      const dest = join(OUT_DIR, ...slug.split('/')) + '.png';
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      rmSync(src, { force: true });
      copied++;
    }
    console.log(`generate-og: ${copied}/${slugs.length} images written to ${OUT_DIR}/`);
    exitCode = copied === slugs.length ? 0 : 1;
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
} finally {
  server.kill();
}
process.exitCode = exitCode;
