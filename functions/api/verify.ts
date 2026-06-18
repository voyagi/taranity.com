/**
 * Cloudflare Pages Function: same-origin Cloudflare Turnstile verification.
 *
 * The browser POSTs the `cf-turnstile-response` token here; we verify it against
 * Cloudflare's siteverify endpoint using the secret key (TURNSTILE_SECRET_KEY,
 * set as a Pages secret — it never reaches the client) and return `{ success }`.
 * Each contact form gates its real Web3Forms submission on `success === true`.
 *
 * Verification MUST stay server-side: the secret never touches the browser, and
 * the token is single-use. We fail CLOSED on every error path (missing secret,
 * bad request, siteverify unreachable) so a fault can never wave traffic through.
 *
 * Plain types on purpose: this is type-checked by `astro check` (tsconfig
 * includes `functions/`), and we avoid a @cloudflare/workers-types dependency.
 */
interface VerifyEnv {
  TURNSTILE_SECRET_KEY?: string;
}

interface VerifyContext {
  request: Request;
  env: VerifyEnv;
}

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export async function onRequestPost(context: VerifyContext): Promise<Response> {
  const { request, env } = context;

  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return json({ success: false, error: 'turnstile-not-configured' }, 500);
  }

  let token = '';
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === 'string' ? body.token : '';
  } catch {
    return json({ success: false, error: 'invalid-request' }, 400);
  }
  if (!token) {
    return json({ success: false, error: 'missing-token' }, 400);
  }

  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.append('remoteip', ip);

  try {
    const res = await fetch(SITEVERIFY, { method: 'POST', body: form });
    const data = (await res.json()) as { success?: boolean };
    return json({ success: data.success === true });
  } catch {
    return json({ success: false, error: 'verify-unreachable' }, 502);
  }
}
