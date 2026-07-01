/**
 * Site-wide configuration: identity, navigation, CTAs, and third-party services.
 *
 * Editable copy (tagline, description, contact email, socials) lives in
 * src/data/site.json so it can be changed through the content admin at /admin.
 * This module reads that file and keeps the exact same exports the rest of the
 * app already uses. Service config still reads PUBLIC_* env at build time. The
 * contact form renders the public Turnstile widget by default; set
 * PUBLIC_TURNSTILE_SITEKEY=off only for intentional local/demo no-widget builds.
 */
import siteData from '../data/site.json';

const env = import.meta.env;
const PROD_TURNSTILE_SITEKEY = '0x4AAAAAADnP2Jb2wFHK9aNW';
const turnstileOverride = env.PUBLIC_TURNSTILE_SITEKEY?.trim();

export const site = {
  name: 'Taranity',
  /**
   * Founder's name. Used only for the Organization's `founder` in structured
   * data, never as a public byline. Taranity is presented as a studio ("we").
   */
  founder: 'Taran',
  /** Used in <title> templates and OG. Edit via /admin (src/data/site.json). */
  shortTagline: siteData.tagline,
  /**
   * Organization description for structured data (JSON-LD). Leads with the
   * outcome and lists intelligent systems last, with no em dash, to honour the
   * hard rules (3: AI never leads; 4: no em dashes in copy or structured data).
   * Edit via /admin (src/data/site.json).
   */
  description: siteData.description,
  url: env.PUBLIC_SITE_URL || 'https://taranity.com',
} as const;

export const services = {
  /**
   * Cloudflare Turnstile site key (public; renders the bot-check widget).
   * A public fallback keeps direct Pages uploads from accidentally shipping a
   * no-widget form when local env is empty. Set PUBLIC_TURNSTILE_SITEKEY=off
   * for local/demo builds that intentionally omit Turnstile.
   */
  turnstileSitekey: turnstileOverride === 'off' ? '' : turnstileOverride || PROD_TURNSTILE_SITEKEY,
  /** Plausible domain; empty → no analytics script injected. */
  plausibleDomain: env.PUBLIC_PLAUSIBLE_DOMAIN || '',
} as const;

export interface SocialLink {
  label: string;
  href: string;
}

// Only profiles the studio actually owns belong here: this list feeds the
// Organization `sameAs` (a trust/identity signal) and the footer links, and a
// dead or unowned URL is a negative signal. Edit via /admin (src/data/site.json).
export const socials: SocialLink[] = siteData.socials;

/** Public-facing contact email (domain address, not a personal inbox). */
export const contactEmail = siteData.contactEmail;

// No separate nav or call-to-action config: the site is a single-page
// experience per design (hard rules: written contact only, no booking;
// no project portfolio). Each design carries its own section anchors.
