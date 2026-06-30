import { describe, it, expect } from 'vitest';
import { organizationLd, websiteLd, toGraph, orgId, websiteId } from '../../src/lib/structured-data';

/**
 * Regression guard for the JSON-LD: a later edit to the schema shapes (or a
 * refactor of the layout) would otherwise silently change what search and answer
 * engines read, with nothing to catch it. Pins the entity graph the live pages
 * emit. Answers the Operator's question: how would you know if a build broke it?
 */
const SITE = {
  name: 'Taranity',
  url: 'https://taranity.com',
  description: 'Taranity builds websites, apps, automation, and intelligent systems.',
  shortTagline: 'If you can describe it, we build it',
  founder: 'Taran',
  contactEmail: 'hello@taranity.com',
  socials: [
    { label: 'GitHub', href: 'https://github.com/voyagi' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/taranity' },
  ],
};

describe('organizationLd', () => {
  const org = organizationLd(SITE);

  it('is an Organization with the stable shared @id', () => {
    expect(org['@type']).toBe('Organization');
    expect(org['@id']).toBe('https://taranity.com/#organization');
  });

  it('lists services as price-free Service offers, intelligent systems last', () => {
    const offers = org.makesOffer as Array<{ '@type': string; itemOffered: { '@type': string; name: string } }>;
    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) {
      expect(offer['@type']).toBe('Offer');
      expect(offer.itemOffered['@type']).toBe('Service');
      expect(offer).not.toHaveProperty('price'); // no public pricing -> no priced Offer
    }
    const names = offers.map((o) => o.itemOffered.name);
    expect(names[names.length - 1]).toBe('Intelligent systems'); // AI never leads
  });

  it('serves Europe as a Continent and the Netherlands as a Country', () => {
    const area = org.areaServed as unknown[];
    expect(area).toContainEqual({ '@type': 'Continent', name: 'Europe' });
    expect(area).toContainEqual({ '@type': 'Country', name: 'Netherlands' });
  });

  it('only lists owned profiles in sameAs (no dead X/Twitter link)', () => {
    const sameAs = org.sameAs as string[];
    expect(sameAs).toEqual(['https://github.com/voyagi', 'https://www.linkedin.com/in/taranity']);
    expect(sameAs.some((u) => /x\.com|twitter\.com/.test(u))).toBe(false);
  });
});

describe('websiteLd', () => {
  it('is a WebSite published by the Organization, linked by @id', () => {
    const web = websiteLd(SITE);
    expect(web['@type']).toBe('WebSite');
    expect(web['@id']).toBe('https://taranity.com/#website');
    expect(web.publisher).toEqual({ '@id': 'https://taranity.com/#organization' });
  });
});

describe('toGraph', () => {
  it('wraps nodes in one @graph and strips per-node @context', () => {
    const graph = toGraph([
      { '@context': 'https://schema.org', '@type': 'Article', '@id': 'x' },
      organizationLd(SITE),
    ]);
    expect(graph['@context']).toBe('https://schema.org');
    const nodes = graph['@graph'] as Array<Record<string, unknown>>;
    expect(nodes).toHaveLength(2);
    for (const node of nodes) {
      expect(node).not.toHaveProperty('@context'); // single top-level context only
      expect(node['@type']).toBeTruthy();
    }
  });

  it('keeps the graph connected: an Article@id reference resolves to a node in the same graph', () => {
    // Mirrors the journal page: the Article references the org by @id, and the
    // org node is present in the same graph, so the reference is resolvable.
    const article = {
      '@type': 'Article',
      '@id': 'https://taranity.com/journal/x',
      author: { '@id': orgId(SITE.url) },
      publisher: { '@id': orgId(SITE.url) },
    };
    const graph = toGraph([organizationLd(SITE), websiteLd(SITE), article]);
    const ids = new Set((graph['@graph'] as Array<Record<string, unknown>>).map((n) => n['@id']));
    expect(ids.has(orgId(SITE.url))).toBe(true);
    expect(ids.has(websiteId(SITE.url))).toBe(true);
  });

  it('serializes to valid JSON (no circular references)', () => {
    const graph = toGraph([organizationLd(SITE), websiteLd(SITE)]);
    expect(() => JSON.stringify(graph)).not.toThrow();
  });
});
