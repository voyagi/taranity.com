import { describe, it, expect } from 'vitest';
import { onRequest } from '../../functions/_middleware';

/**
 * The design-switch middleware serves different HTML per `taranity-design`
 * cookie at the same URL. These lock the two invariants that keep that safe:
 * every response carries Vary: Cookie (so no cache serves the wrong design), and
 * only a known design id is ever used to build the variant path (no traversal).
 */
type Ctx = Parameters<typeof onRequest>[0];

const makeEnv = (bodies: Record<string, string>) => ({
  ASSETS: {
    fetch: (input: Request | string | URL) => {
      const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const body = bodies[new URL(href).pathname];
      return Promise.resolve(
        body !== undefined
          ? new Response(body, { status: 200, headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } })
          : new Response('nf', { status: 404 }),
      );
    },
  },
});

const makeCtx = (path: string, cookie: string | null, env: unknown): Ctx =>
  ({
    request: new Request('https://taranity.com' + path, cookie ? { headers: { Cookie: cookie } } : undefined),
    env,
    next: () => Promise.resolve(new Response('next', { status: 200 })),
  }) as unknown as Ctx;

describe('design-switch middleware', () => {
  it('serves the canonical page and marks it Vary: Cookie (no cookie)', async () => {
    const res = await onRequest(makeCtx('/', null, makeEnv({ '/': 'vitrine-home' })));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('vitrine-home');
    expect(res.headers.get('Vary')).toMatch(/cookie/i);
    // the default branch wraps the asset in a new Response: its headers survive.
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
  });

  it('serves the cookie-selected variant as private + Vary: Cookie', async () => {
    const env = makeEnv({ '/': 'vitrine-home', '/atlas/': 'atlas-home' });
    const res = await onRequest(makeCtx('/', 'taranity-design=atlas', env));
    expect(await res.text()).toBe('atlas-home');
    expect(res.headers.get('Cache-Control')).toMatch(/private/);
    expect(res.headers.get('Vary')).toMatch(/cookie/i);
  });

  it('falls back to the canonical page when the variant is not built', async () => {
    const env = makeEnv({ '/': 'vitrine-home' }); // no /atlas/ built
    const res = await onRequest(makeCtx('/', 'taranity-design=atlas', env));
    expect(await res.text()).toBe('vitrine-home');
    expect(res.headers.get('Vary')).toMatch(/cookie/i);
  });

  it('ignores an unknown/crafted design cookie and serves canonical (no path traversal)', async () => {
    const env = makeEnv({ '/': 'vitrine-home' });
    const res = await onRequest(makeCtx('/', 'taranity-design=..%2Fetc', env));
    expect(await res.text()).toBe('vitrine-home');
  });

  it('passes a non-handled path straight through to next()', async () => {
    const res = await onRequest(makeCtx('/api/contact', null, makeEnv({})));
    expect(await res.text()).toBe('next');
  });
});
