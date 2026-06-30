/**
 * JSON-LD structured data, built as plain objects and assembled into ONE
 * connected schema.org @graph. A single graph (rather than several separate
 * <script> blocks) means search and answer engines resolve the @id links
 * between the Organization, the WebSite, and any page nodes (Article,
 * BreadcrumbList, FAQPage) within one document, instead of relying on each
 * engine to merge same-@id nodes across blocks. Kept here as pure functions so
 * the shapes can be unit-tested; the page frontmatter only wires them together.
 */
import type { SocialLink } from '../config/site';

/** A schema.org node: an object with an @type and arbitrary properties. */
export type LdNode = Record<string, unknown>;

/** Stable @id for the one Organization entity every page shares. */
export const orgId = (siteUrl: string): string => new URL('/#organization', siteUrl).href;
/** Stable @id for the WebSite entity. */
export const websiteId = (siteUrl: string): string => new URL('/#website', siteUrl).href;

export interface OrganizationInput {
  name: string;
  url: string;
  description: string;
  shortTagline: string;
  founder: string;
  contactEmail: string;
  socials: readonly SocialLink[];
}

/** The studio as an Organization entity (no @context: it lives inside a graph). */
export function organizationLd(input: OrganizationInput): LdNode {
  return {
    '@type': 'Organization',
    '@id': orgId(input.url),
    name: input.name,
    url: input.url,
    email: input.contactEmail,
    description: input.description,
    slogan: input.shortTagline,
    logo: new URL('/apple-touch-icon.png', input.url).href,
    founder: { '@type': 'Person', name: input.founder },
    address: { '@type': 'PostalAddress', addressLocality: 'Eindhoven', addressCountry: 'NL' },
    knowsAbout: [
      'Web design',
      'Web development',
      'App development',
      'Workflow automation',
      'AI systems',
      'Full-stack development',
      'TypeScript',
    ],
    // Where the studio takes on work. Matches the visible copy ("clients of every
    // size and kind, anywhere in the world"); areaServed accepts a plain string
    // for the global reach and precise schema.org types for the named regions.
    areaServed: [
      'Worldwide',
      { '@type': 'Continent', name: 'Europe' },
      { '@type': 'Country', name: 'Netherlands' },
    ],
    // Services in the brand's own order (intelligent systems last, no AI-first
    // framing). They appear in the visible page copy, so they satisfy Google's
    // "only mark up what is on the page" rule. `makesOffer` with bare Service
    // objects and no price is the truthful shape: there is no public pricing, so
    // a priced Offer would be inaccurate.
    makesOffer: [
      'Web design and development',
      'Ecommerce and online stores',
      'App development',
      'Workflow automation',
      'Intelligent systems',
    ].map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
    sameAs: input.socials.map((s) => s.href),
  };
}

/** The site as a named WebSite entity, published by the Organization (by @id). */
export function websiteLd(input: { name: string; url: string }): LdNode {
  return {
    '@type': 'WebSite',
    '@id': websiteId(input.url),
    name: input.name,
    url: input.url,
    inLanguage: 'en',
    publisher: { '@id': orgId(input.url) },
  };
}

/**
 * Wrap nodes into one connected schema.org graph. Any per-node `@context` is
 * dropped (the graph carries the single top-level context), so page nodes built
 * elsewhere as standalone blocks slot in cleanly.
 */
export function toGraph(nodes: LdNode[]): LdNode {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.map((node) => {
      const copy = { ...node };
      delete copy['@context'];
      return copy;
    }),
  };
}
