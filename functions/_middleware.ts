/**
 * Cloudflare Pages middleware: in-place design switching.
 *
 * A visitor's chosen design lives in the `taranity-design` cookie. For the canonical
 * content paths below, when the cookie names a non-default (non-Vitrine) design we serve
 * THAT design's prebuilt HTML at the SAME canonical URL, so the address bar never changes.
 * Crawlers (no cookie) and the default get Vitrine, so there is one canonical per content.
 *
 * Routing notes:
 *  - This worker is scoped (public/_routes.json) to the exact canonical paths it handles,
 *    never "/*". A broad include makes the worker run on every asset, and a next()
 *    fallthrough only does exact-asset matches (404-ing the /atlas-style URLs and bypassing
 *    _redirects). The include list must stay in sync with isHandled() below.
 *  - We serve every handled path via env.ASSETS.fetch of the PRETTY path. Unlike a Function
 *    Response, env.ASSETS.fetch runs the _headers + redirect rules, so the strict CSP and
 *    security headers ride along; and the pretty path resolves directory index pages without
 *    emitting a 308 that would leak the variant URL into the address bar.
 */

// Non-Vitrine ready designs (Vitrine is the canonical default, served as the plain path).
// Phase TODO: derive from src/config/designs.ts so this can never drift from the registry.
const VARIANT_DESIGNS = new Set(['atlas', 'signal', 'storefront', 'practice', 'raw', 'ink']);
const COOKIE = 'taranity-design';

interface Env {
  ASSETS: { fetch: (input: Request | string | URL) => Promise<Response> };
}
interface MiddlewareContext {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}

// Canonical content paths we rewrite: home, the design-agnostic subpages, and the journal.
// Keep in sync with the include list in public/_routes.json. Trailing slashes are normalised
// so a bookmarked/typed "/privacy/" or "/journal/" is served per-design too, not just the
// no-trailing-slash form the site's own links use.
function isHandled(pathname: string): boolean {
  const p = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return p === '/' || p === '/privacy' || p === '/journal' || p.startsWith('/journal/');
}

// The pretty (directory) form Pages serves: a trailing slash for everything except the
// root. env.ASSETS.fetch wants the pretty path, not the underlying /index.html.
function pretty(pathname: string): string {
  if (pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname : pathname + '/';
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

// Serve a built asset by its pretty path; null if it isn't a clean 200 (missing build, or
// a redirect that would otherwise leak the internal URL).
async function asset(env: Env, origin: string, path: string): Promise<Response | null> {
  const res = await env.ASSETS.fetch(new URL(path, origin));
  return res.status === 200 ? res : null;
}

// This route serves different HTML per `taranity-design` cookie at the same URL, so any
// cache must key on that cookie. The Cache-Control split (private variant, revalidate-always
// default) already stops a shared cache from serving the wrong design; Vary: Cookie is the
// explicit belt-and-suspenders signal for any downstream/browser cache. Appends to an
// existing Vary rather than clobbering it.
function addVaryCookie(headers: Headers): void {
  const existing = headers.get('Vary');
  if (!existing) headers.set('Vary', 'Cookie');
  else if (!/(^|,)\s*cookie\s*(,|$)/i.test(existing)) headers.set('Vary', `${existing}, Cookie`);
}

export async function onRequest(context: MiddlewareContext): Promise<Response> {
  const { request, env, next } = context;

  // Only rewrite navigational GETs; HEAD and other methods fall through to native serving.
  if (request.method !== 'GET') return next();

  const url = new URL(request.url);
  if (!isHandled(url.pathname)) return next();

  const design = readCookie(request.headers.get('Cookie'), COOKIE);
  const canonical = pretty(url.pathname);

  // Non-default design: serve its variant of this path at the unchanged URL. Fall back to
  // the canonical page if the variant isn't built yet, so the visitor still gets content.
  if (design && VARIANT_DESIGNS.has(design)) {
    const variant = await asset(env, url.origin, `/${design}${canonical}`);
    if (variant) {
      const out = new Response(variant.body, variant);
      out.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
      addVaryCookie(out.headers);
      return out;
    }
  }

  // Default / Vitrine / invalid cookie / missing variant: serve the canonical asset by its
  // pretty path (not next(), whose exact-asset fallthrough can 404 a directory page).
  const canonicalAsset = await asset(env, url.origin, canonical);
  if (!canonicalAsset) return next();
  const out = new Response(canonicalAsset.body, canonicalAsset);
  addVaryCookie(out.headers);
  return out;
}
