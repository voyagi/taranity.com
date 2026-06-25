/**
 * Site-wide configuration: identity, navigation, CTAs, and third-party services.
 *
 * Service config reads PUBLIC_* env at build time. The contact form renders the
 * public Turnstile widget by default; set PUBLIC_TURNSTILE_SITEKEY=off only for
 * intentional local/demo no-widget builds.
 */

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
  /** Used in <title> templates and OG. */
  shortTagline: 'If you can describe it, we build it',
  /**
   * Organization description for structured data (JSON-LD). Leads with the
   * outcome and lists intelligent systems last, with no em dash, to honour the
   * hard rules (3: AI never leads; 4: no em dashes in copy or structured data).
   */
  description:
    'Taranity is a digital studio that builds websites, apps, automation, and intelligent systems, from the impossible-looking to the production-ready. Based in the Netherlands.',
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

export const socials: SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com/voyagi' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/taranity' },
  { label: 'X / Twitter', href: 'https://x.com/taranity' },
];

/** Public-facing contact email (domain address, not a personal inbox). */
export const contactEmail = 'hello@taranity.com';

// No separate nav or call-to-action config: the site is a single-page
// experience per design (hard rules: written contact only, no booking;
// no project portfolio). Each design carries its own section anchors.
