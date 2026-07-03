/**
 * Cloudflare Pages Function: the contact form's same-origin submit endpoint.
 *
 * The browser POSTs the form (as multipart FormData, including the Turnstile
 * `cf-turnstile-response` the widget injects). We verify the token server-side
 * and ONLY on success forward the message to Web3Forms using the access key held
 * as a Pages secret (`WEB3FORMS_ACCESS_KEY`). Because the Web3Forms credential
 * and the final submit both live on the server, a bot can no longer skip
 * verification by posting straight to Web3Forms with a key scraped from the page
 * - the Turnstile check is now actually enforced.
 *
 * Abuse volume is capped at the Cloudflare edge, not here: a WAF rate-limit rule
 * (Security > WAF > Rate limiting rules, taranity.com zone) blocks an IP that POSTs
 * /api/contact more than 5 times in 10 seconds, so a solver-bot cannot drain the
 * Web3Forms quota or flood the inbox even with valid tokens. It is dashboard-managed,
 * so there is deliberately no app-level rate limiting in this function.
 *
 * Fails CLOSED on every path (missing secret/key, bad request, unverified token,
 * upstream timeout or non-2xx). Plain types: this is type-checked by astro check
 * (tsconfig includes functions/), and we avoid a @cloudflare/workers-types dep.
 */
import { EMAIL_RE } from '../../src/lib/validation';

interface ContactEnv {
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_ALLOWED_HOSTNAMES?: string;
  WEB3FORMS_ACCESS_KEY?: string;
}

interface ContactContext {
  request: Request;
  env: ContactEnv;
}

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const WEB3FORMS = 'https://api.web3forms.com/submit';
const TURNSTILE_ACTION = 'turnstile-spin-v1';
const DEFAULT_TURNSTILE_HOSTNAMES = ['taranity.com', 'www.taranity.com'];
const DEFAULT_TURNSTILE_HOSTNAME_SUFFIXES = ['.taranity.pages.dev'];
const MAX_BODY_BYTES = 16_384;
const MAX_NAME_CHARS = 100;
const MAX_EMAIL_CHARS = 150;
const MAX_MESSAGE_CHARS = 3000;
const MAX_SUBJECT_CHARS = 120;
const MAX_TURNSTILE_TOKEN_CHARS = 2048;
// The subject is a fixed per-design label. Allowlist it so a crafted request
// can't inject arbitrary text into the notification email (from_name is always us).
const ALLOWED_SUBJECTS = new Set([
  'New enquiry via taranity.com (Vitrine)',
  'New enquiry via taranity.com (Atlas)',
  'New enquiry via taranity.com (Signal)',
  'New enquiry via taranity.com (Storefront)',
  'New enquiry via taranity.com (Practice)',
  'New enquiry via taranity.com (Raw)',
  'New enquiry via taranity.com (Sheet)',
  'New enquiry via taranity.com (Prism)',
  'New enquiry via taranity.com (Ink)',
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

function parseContentLength(request: Request): number | null | false {
  const raw = request.headers.get('content-length');
  if (raw === null) return null;
  if (!/^\d+$/.test(raw)) return false;
  const length = Number(raw);
  return Number.isSafeInteger(length) ? length : false;
}

function textField(form: FormData, name: string): string | null {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : null;
}

function rawTextField(form: FormData, name: string): string | null {
  const value = form.get(name);
  return typeof value === 'string' ? value : null;
}

async function readBoundedBody(request: Request): Promise<Uint8Array | 'too-large'> {
  const body = request.body;
  if (!body) return new Uint8Array();

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return 'too-large';
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function splitAllowedHostnames(env: ContactEnv): string[] {
  return env.TURNSTILE_ALLOWED_HOSTNAMES?.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean) ?? [];
}

function hostnameMatches(hostname: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1);
    return hostname.endsWith(suffix) && hostname.length > suffix.length;
  }
  return hostname === pattern;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

function allowedHostname(hostname: string, env: ContactEnv): boolean {
  const configured = splitAllowedHostnames(env);
  if (configured.length) return configured.some((pattern) => hostnameMatches(hostname, pattern));
  return DEFAULT_TURNSTILE_HOSTNAMES.includes(hostname) || DEFAULT_TURNSTILE_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

export async function onRequestPost(context: ContactContext): Promise<Response> {
  const { request, env } = context;

  const contentLength = parseContentLength(request);
  if (contentLength === false) return json({ success: false, error: 'invalid-request' }, 400);
  if (contentLength !== null && contentLength > MAX_BODY_BYTES) {
    return json({ success: false, error: 'request-too-large' }, 413);
  }

  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return json({ success: false, error: 'turnstile-not-configured' }, 500);

  const body = await readBoundedBody(request);
  if (body === 'too-large') return json({ success: false, error: 'request-too-large' }, 413);

  let form: FormData;
  try {
    const headers = new Headers(request.headers);
    headers.delete('content-length');
    form = await new Request(request.url, { method: request.method, headers, body: toArrayBuffer(body) }).formData();
  } catch {
    return json({ success: false, error: 'invalid-request' }, 400);
  }

  // Honeypot: a filled hidden field means a bot. Report success so it doesn't
  // retry or learn, but never actually send.
  if (form.get('botcheck')) return json({ success: true });

  const token = textField(form, 'cf-turnstile-response') ?? '';
  if (!token) return json({ success: false, error: 'missing-token' }, 400);
  if (token.length > MAX_TURNSTILE_TOKEN_CHARS) {
    return json({ success: false, error: 'invalid-fields' }, 400);
  }

  // Validate server-side; never trust the client to have done it.
  const name = textField(form, 'name') ?? '';
  const email = textField(form, 'email') ?? '';
  const message = textField(form, 'message') ?? '';
  const rawSubject = rawTextField(form, 'subject') ?? '';
  if (
    !name ||
    !EMAIL_RE.test(email) ||
    message.length < 10 ||
    name.length > MAX_NAME_CHARS ||
    email.length > MAX_EMAIL_CHARS ||
    message.length > MAX_MESSAGE_CHARS ||
    rawSubject.length > MAX_SUBJECT_CHARS
  ) {
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
    const vd = (await vr.json()) as { success?: boolean; action?: string; hostname?: string };
    const hostname = vd.hostname?.toLowerCase();
    if (vd.success !== true || vd.action !== TURNSTILE_ACTION || !hostname || !allowedHostname(hostname, env)) {
      return json({ success: false, error: 'verification-failed' }, 403);
    }
  } catch {
    return json({ success: false, error: 'verify-unreachable' }, 502);
  }

  // 2) Token is good → submit to Web3Forms with the server-held access key.
  // Server-only encrypted Pages secret; never expose it to the client.
  const accessKey = env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) return json({ success: false, error: 'web3forms-not-configured' }, 500);
  // Don't trust the client for subject/from_name - they'd otherwise let a crafted
  // request inject arbitrary text into our inbox. from_name is always us; subject
  // must match a known per-design label, else fall back to the generic one.
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
    // Web3Forms returns JSON for our application/json request; trust only that.
    // A non-JSON body (an HTML error or interstitial page) is an anomaly, so fail
    // closed rather than guessing from page text: substring matching cannot
    // reliably tell "submitted successfully" from "submitted unsuccessfully" or
    // "not successful", and a false "sent" is worse than a false "email us".
    let success = false;
    try {
      const parsed = (await sr.json()) as { success?: boolean };
      success = sr.ok && parsed.success === true;
    } catch {
      success = false;
    }
    return json({ success });
  } catch {
    return json({ success: false, error: 'submit-failed' }, 502);
  }
}
