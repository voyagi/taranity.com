/**
 * Cloudflare Pages Function: the contact form's same-origin submit endpoint.
 *
 * The browser POSTs the form (as multipart FormData, including the Turnstile
 * `cf-turnstile-response` the widget injects). We verify the token server-side
 * and ONLY on success forward the message to Web3Forms using the access key held
 * as a Pages secret (`PUBLIC_WEB3FORMS_KEY`). Because the Web3Forms credential
 * and the final submit both live on the server, a bot can no longer skip
 * verification by posting straight to Web3Forms with a key scraped from the page
 * — the Turnstile check is now actually enforced.
 *
 * Fails CLOSED on every path (missing secret/key, bad request, unverified token,
 * upstream timeout or non-2xx). Plain types: this is type-checked by astro check
 * (tsconfig includes functions/), and we avoid a @cloudflare/workers-types dep.
 */
interface ContactEnv {
  TURNSTILE_SECRET_KEY?: string;
  PUBLIC_WEB3FORMS_KEY?: string;
}

interface ContactContext {
  request: Request;
  env: ContactEnv;
}

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const WEB3FORMS = 'https://api.web3forms.com/submit';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The subject is a fixed per-design label. Allowlist it so a crafted request
// can't inject arbitrary text into the notification email (from_name is always us).
const ALLOWED_SUBJECTS = new Set([
  'New enquiry via taranity.com (Vitrine)',
  'New enquiry via taranity.com (Atlas)',
  'New enquiry via taranity.com (Signal)',
  'New enquiry via taranity.com (Storefront)',
  'New enquiry via taranity.com (Practice)',
  'New enquiry via taranity.com (Raw)',
]);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

// Bound every upstream call so a stalled provider can't tie up the request.
async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequestPost(context: ContactContext): Promise<Response> {
  const { request, env } = context;

  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return json({ success: false, error: 'turnstile-not-configured' }, 500);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, error: 'invalid-request' }, 400);
  }

  // Honeypot: a filled hidden field means a bot. Report success so it doesn't
  // retry or learn, but never actually send.
  if (form.get('botcheck')) return json({ success: true });

  const token = String(form.get('cf-turnstile-response') ?? '');
  if (!token) return json({ success: false, error: 'missing-token' }, 400);

  // Validate server-side; never trust the client to have done it.
  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const message = String(form.get('message') ?? '').trim();
  if (!name || !EMAIL_RE.test(email) || message.length < 10) {
    return json({ success: false, error: 'invalid-fields' }, 400);
  }

  // 1) Verify the Turnstile token (timeout + status-checked → fail closed).
  const verifyForm = new FormData();
  verifyForm.append('secret', secret);
  verifyForm.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) verifyForm.append('remoteip', ip);
  try {
    const vr = await fetchWithTimeout(SITEVERIFY, { method: 'POST', body: verifyForm }, 5000);
    if (!vr.ok) return json({ success: false, error: 'verify-unreachable' }, 502);
    const vd = (await vr.json()) as { success?: boolean };
    if (vd.success !== true) return json({ success: false, error: 'verification-failed' }, 403);
  } catch {
    return json({ success: false, error: 'verify-unreachable' }, 502);
  }

  // 2) Token is good → submit to Web3Forms with the server-held access key.
  const accessKey = env.PUBLIC_WEB3FORMS_KEY;
  if (!accessKey) return json({ success: false, error: 'web3forms-not-configured' }, 500);
  // Don't trust the client for subject/from_name — they'd otherwise let a crafted
  // request inject arbitrary text into our inbox. from_name is always us; subject
  // must match a known per-design label, else fall back to the generic one.
  const rawSubject = String(form.get('subject') ?? '');
  // Post JSON: Web3Forms returns a JSON result for an application/json request.
  // A multipart post gets an HTML success page instead, which we'd misread as a
  // failure ("Could not send" even though the email was actually delivered).
  const payload = {
    access_key: accessKey,
    name,
    email,
    message,
    subject: ALLOWED_SUBJECTS.has(rawSubject) ? rawSubject : 'New enquiry via taranity.com',
    from_name: 'taranity.com',
  };
  try {
    const sr = await fetchWithTimeout(
      WEB3FORMS,
      { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) },
      12000,
    );
    // Trust parsed JSON when present; fall back to the 2xx status + a success
    // marker if a non-JSON (HTML) body is ever returned, so success isn't lost.
    const body = await sr.text();
    let success = sr.ok;
    try {
      success = sr.ok && (JSON.parse(body) as { success?: boolean }).success === true;
    } catch {
      success = sr.ok && /success/i.test(body);
    }
    return json({ success });
  } catch {
    return json({ success: false, error: 'submit-failed' }, 502);
  }
}
