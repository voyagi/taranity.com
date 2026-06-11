/**
 * Site-wide configuration: identity, navigation, CTAs, and third-party services.
 *
 * Service config reads PUBLIC_* env at build time with safe demo fallbacks, so
 * the site is fully functional and reviewable with zero secrets. Swap real
 * values in `.env` (see .env.example / HUMAN-TODO.md).
 */

const env = import.meta.env;

export const site = {
  name: 'Taranity',
  /**
   * Founder's name. Used only for the Organization's `founder` in structured
   * data — never as a public byline. Taranity is presented as a studio ("we").
   */
  founder: 'Taran',
  /** One-line studio descriptor (footer tagline + Organization description). */
  role: 'A digital studio that builds AI systems, apps, and websites',
  /** Used in <title> templates and OG. */
  shortTagline: 'If you can describe it, we build it',
  description:
    'Taranity is a digital studio that builds AI systems, apps, and websites — from the impossible-looking to the production-ready. Based in the Netherlands.',
  location: 'Eindhoven, Netherlands',
  timezone: 'Europe/Amsterdam',
  url: env.PUBLIC_SITE_URL || 'https://taranity.com',
  locale: 'en',
} as const;

export const services = {
  /** Web3Forms public access key (hidden form field, not a secret). */
  web3formsKey: env.PUBLIC_WEB3FORMS_KEY || '',
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
