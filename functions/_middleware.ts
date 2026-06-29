/**
 * Cloudflare Pages middleware: in-place design switching.
 *
 * PHASE 0 SPIKE: homepage ("/") only. A visitor's chosen design lives in the
 * `taranity-design` cookie. When it names a non-default (non-Vitrine) design, we serve
 * THAT design's prebuilt HTML at the SAME canonical URL, so the address bar never changes.
 * Crawlers (no cookie) and the default get Vitrine, so there is one canonical per content.
 *
 * Why ASSETS.fetch and not a hand-built Response: Cloudflare's `_headers` file does NOT
 * apply to responses a Function returns, but `env.ASSETS.fetch()` DOES run the header +
 * redirect rules, so the strict CSP and security headers from public/_headers ride along.
 * We request the PRETTY path (trailing slash) so ASSETS.fetch returns the page directly
 * rather than a 308 redirect that would leak the variant URL into the address bar.
 */

// Non-Vitrine ready designs (Vitrine is the canonical default, served untouched).
// Phase 1 TODO: derive from src/config/designs.ts so this can never drift from the registry.
const VARIANT_DESIGNS = new Set(['atlas', 'signal', 'storefront', 'practice', 'raw']);
const COOKIE = 'taranity-design';

interface Env {
  ASSETS: { fetch: (input: Request | string | URL) => Promise<Response> };
}
interface MiddlewareContext {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      // A malformed percent-sequence (e.g. "%ZZ") makes decodeURIComponent throw; the
      // cookie value is attacker-influenced, so treat a bad value as "no choice" rather
      // than letting a URIError 500 every request from a visitor holding that cookie.
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function onRequest(context: MiddlewareContext): Promise<Response> {
  const { request, env, next } = context;

  // Only safe, navigational requests get rewritten; everything else passes through.
  if (request.method !== 'GET' && request.method !== 'HEAD') return next();

  const url = new URL(request.url);
  // Spike: only the homepage. Every other path (incl. /api/*) is untouched, so the
  // contact function and all static routes behave exactly as before.
  if (url.pathname !== '/') return next();

  const design = readCookie(request.headers.get('Cookie'), COOKIE);
  if (!design || !VARIANT_DESIGNS.has(design)) return next();

  // Serve the chosen design's prebuilt home at the unchanged URL. Build the internal
  // path from the origin only (never the visitor's query string), so nothing from the
  // caller's URL can ride into asset routing.
  const variant = await env.ASSETS.fetch(new URL(`/${design}/`, url.origin));
  // If the variant isn't a clean 200 (missing build, or a redirect that would leak the
  // variant URL), fall back to the canonical page rather than serving something wrong.
  if (variant.status !== 200) return next();

  // A per-cookie response must never be reused for a different cookie. (Vary: Cookie is a
  // no-op on Cloudflare's cache; Function output isn't CDN-cached by default, so this is
  // belt-and-suspenders to keep any downstream cache from cross-serving variants.)
  const out = new Response(variant.body, variant);
  out.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
  return out;
}
