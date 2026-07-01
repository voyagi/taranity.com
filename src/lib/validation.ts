/**
 * Shared input validation used by BOTH the contact form (client,
 * src/lib/contact-form.ts) and the contact endpoint (server,
 * functions/api/contact.ts), so the two can never drift.
 *
 * Deliberately permissive: this is a UX / data-quality gate, not a security
 * control. The server re-validates every field and the Turnstile check is the
 * real bot gate, so the regex only needs to catch obvious typos, not enforce
 * RFC 5322.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
