import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Cloudflare Pages routing guard. The site ships Pages Functions: the contact
 * endpoint (functions/api/contact.ts) and the in-place design-switch middleware
 * (functions/_middleware.ts), which rewrites the homepage to the cookie-selected
 * design at the unchanged URL.
 *
 * The worker must stay NARROWLY scoped. If it runs on every route
 * ("include": ["/*"]), its static fallthrough only does exact-asset matches - so
 * the no-trailing-slash theme URLs the switcher links to (/atlas, /signal, ...)
 * and the legacy _redirects (/about -> /) all 404, while only exact assets
 * (/, /atlas/) resolve. So public/_routes.json includes only the exact paths the
 * worker needs ("/" for the design switch, "/api/*" for contact); everything else
 * gets native Pages serving. "/" is safe because it resolves to an exact asset
 * (index.html). This pins that shut so the theme-404 regression cannot silently
 * return via a config edit, and in particular forbids the "/*" broad include.
 */

const root = resolve(__dirname, '../..');
const routes = JSON.parse(readFileSync(resolve(root, 'public/_routes.json'), 'utf8'));

describe('cloudflare pages _routes.json', () => {
  it('scopes the Functions worker to exact paths only (/ + /api/*, never the whole site)', () => {
    expect(routes.version).toBe(1);
    expect(routes.include).toEqual(['/', '/api/*']);
    // The critical invariant: never the broad "/*", which would 404 the
    // no-trailing-slash theme URLs and bypass _redirects (see file header).
    expect(routes.include).not.toContain('/*');
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
