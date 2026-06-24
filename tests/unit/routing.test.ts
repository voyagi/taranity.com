import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Cloudflare Pages routing guard. The site ships a Pages Function
 * (functions/api/contact.ts). If the Functions worker is allowed to run on
 * every route ("include": ["/*"]), its static fallthrough only does exact-asset
 * matches - so the no-trailing-slash theme URLs the switcher links to (/atlas,
 * /signal, ...) and the legacy _redirects (/about -> /) all 404, while only
 * exact assets (/, /atlas/) resolve. public/_routes.json must scope the worker
 * to "/api/*" so everything else gets native Pages serving. This pins that shut
 * so the theme-404 regression cannot silently return via a config edit.
 */

const root = resolve(__dirname, '../..');
const routes = JSON.parse(readFileSync(resolve(root, 'public/_routes.json'), 'utf8'));

describe('cloudflare pages _routes.json', () => {
  it('scopes the Functions worker to /api/* only (never the whole site)', () => {
    expect(routes.version).toBe(1);
    expect(routes.include).toEqual(['/api/*']);
    expect(routes.include).not.toContain('/*');
  });

  it('only narrows the worker via include (no broad exclude tricks)', () => {
    expect(Array.isArray(routes.exclude)).toBe(true);
    expect(routes.exclude).toEqual([]);
  });

  it('matches the actual Function surface (only functions/api/* exists)', () => {
    // The /api/* scope is correct precisely because the only Function lives there.
    expect(existsSync(resolve(root, 'functions/api/contact.ts'))).toBe(true);
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
