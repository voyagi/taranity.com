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
  /** Display name. Inferred from domain/email — confirm in HUMAN-TODO. */
  person: 'Taran',
  role: 'Full-stack developer & automation architect',
  /** Used in <title> templates and OG. */
  shortTagline: 'I automate what slows you down',
  description:
    'Taran builds AI tooling and workflow automation that delete busywork — full-stack developer and automation architect based in the Netherlands.',
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
  /** Booking link; falls back to /contact. */
  bookingUrl: env.PUBLIC_BOOKING_URL || '/contact',
  /** GitHub username for the "Currently" widget (public events). */
  githubUser: env.PUBLIC_GITHUB_USERNAME || 'voyagi',
} as const;

export interface SocialLink {
  label: string;
  href: string;
  /** Short keyword set for the command palette. */
  keywords: string;
}

export const socials: SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com/voyagi', keywords: 'github code repos source voyagi' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/taranity', keywords: 'linkedin profile work cv resume' },
  { label: 'X / Twitter', href: 'https://x.com/taranity', keywords: 'twitter x social posts' },
];

/** Public-facing contact email (domain address, not a personal inbox). */
export const contactEmail = 'hello@taranity.com';

export interface NavItem {
  label: string;
  href: string;
  /** Two-digit telemetry index shown in the nav. */
  index: string;
}

export const nav: NavItem[] = [
  { label: 'Work', href: '/work', index: '01' },
  { label: 'About', href: '/about', index: '02' },
  { label: 'Contact', href: '/contact', index: '03' },
];

export const cta = {
  primaryLabel: 'Book a call',
  primaryHref: services.bookingUrl,
  secondaryLabel: 'Start a project',
  secondaryHref: '/contact',
} as const;
