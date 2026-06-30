import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Cloudflare Pages routing guard. The site ships Pages Functions: the contact
 * endpoint (functions/api/contact.ts), the in-place design-switch middleware
 * (functions/_middleware.ts, which serves the cookie-selected design's variant of a
 * canonical page at the unchanged URL), and the no-JS switch endpoint
 * (functions/switch.ts at /switch).
 *
 * The worker must stay NARROWLY scoped to the exact canonical content paths it handles
 * (home, /journal, /journal/*, /privacy), plus /switch and /api/*. It must NEVER use the
 * broad "/*": with "/*" the worker runs on every asset, and a next() fallthrough only does
 * exact-asset matches - so the no-trailing-slash theme URLs (/atlas, /signal, ...) and the
 * legacy _redirects (/about -> /) all 404. The middleware itself serves handled paths via
 * env.ASSETS.fetch of the pretty path (not next()), so directory pages resolve correctly;
 * the design routes and everything else stay on native Pages serving. This pins the
 * theme-404 regression shut so a config edit can't silently bring it back.
 */

const root = resolve(__dirname, '../..');
const routes = JSON.parse(readFileSync(resolve(root, 'public/_routes.json'), 'utf8'));

describe('cloudflare pages _routes.json', () => {
  it('scopes the worker to exact canonical paths (never the whole site)', () => {
    expect(routes.version).toBe(1);
    expect(routes.include).toEqual(['/', '/journal', '/journal/*', '/privacy', '/privacy/', '/switch', '/api/*']);
    // "/privacy/" is listed explicitly so the trailing-slash form is worker-scoped too.
    // "/journal/" is NOT listed: it's covered by the "/journal/*" splat, and Pages forbids a
    // splat overlapping a sibling rule, so it cannot be listed alongside. The middleware
    // normalises trailing slashes, so a bookmarked "/privacy/" or "/journal/" is served
    // per-design (not silently downgraded to Vitrine).
    for (const p of ['/journal', '/journal/*', '/privacy', '/privacy/']) {
      expect(routes.include).toContain(p);
    }
    // The critical invariant: never the broad "/*", which would 404 the
    // no-trailing-slash theme URLs and bypass _redirects (see file header).
    expect(routes.include).not.toContain('/*');
    // The no-trailing-slash design routes must NOT be worker-scoped: they have no exact
    // asset, so a worker next() would 404 them. They stay on native Pages serving.
    for (const r of ['/atlas', '/signal', '/storefront', '/practice', '/raw']) {
      expect(routes.include).not.toContain(r);
    }
  });

  it('only narrows the worker via include (no broad exclude tricks)', () => {
    expect(Array.isArray(routes.exclude)).toBe(true);
    expect(routes.exclude).toEqual([]);
  });

  it('matches the actual Function surface (contact endpoint + design-switch middleware)', () => {
    // The include list maps to the Functions that exist: /api/* -> contact,
    // and "/" is handled by the root _middleware.
    expect(existsSync(resolve(root, 'functions/api/contact.ts'))).toBe(true);
    expect(existsSync(resolve(root, 'functions/_middleware.ts'))).toBe(true);
    // The no-JS switch endpoint that "/switch" in the include list routes to.
    expect(existsSync(resolve(root, 'functions/switch.ts'))).toBe(true);
  });
});

describe('legacy redirects stay declared (served natively once the worker is scoped)', () => {
  const redirects = readFileSync(resolve(root, 'public/_redirects'), 'utf8');
  it('keeps the pre-redesign paths redirecting home', () => {
    for (const p of ['/about', '/contact', '/work', '/projects/*']) {
      expect(redirects, `${p} redirect missing`).toContain(p);
    }
  });
});
