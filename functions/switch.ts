/**
 * GET /switch?to=<design>&next=<path> - the no-JS design switch.
 *
 * Sets the `taranity-design` cookie and 302-redirects back to a SAME-ORIGIN path, so a
 * visitor without JavaScript still switches design and lands on the same canonical URL
 * (the switcher pills point here as their href). With JS, design-theme.ts intercepts the
 * click and sets the cookie + reloads client-side, never hitting this endpoint.
 *
 * `next` is resolved against our own origin and only its path+query is used, so a crafted
 * value (`//evil.com`, `https://evil`) can never turn this into an open redirect.
 */
const READY = new Set(['vitrine', 'atlas', 'signal', 'storefront', 'practice', 'raw', 'ink']);
const COOKIE = 'taranity-design';

interface SwitchContext {
  request: Request;
}

function safeDest(nextParam: string, origin: string): string {
  try {
    const u = new URL(nextParam, origin);
    if (u.origin === origin) return u.pathname + u.search;
  } catch {
    /* malformed: fall through to home */
  }
  return '/';
}

export function onRequestGet(context: SwitchContext): Response {
  const url = new URL(context.request.url);
  const to = url.searchParams.get('to') || '';
  const dest = safeDest(url.searchParams.get('next') || '/', url.origin);

  const headers = new Headers({ Location: dest, 'Cache-Control': 'private, no-store' });
  // Only set the cookie for a known design; an unknown value just redirects (no-op).
  if (READY.has(to)) {
    const secure = url.protocol === 'https:' ? '; Secure' : '';
    headers.append('Set-Cookie', `${COOKIE}=${encodeURIComponent(to)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`);
  }
  return new Response(null, { status: 302, headers });
}
