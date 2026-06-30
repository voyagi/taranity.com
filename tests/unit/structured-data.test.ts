import { describe, it, expect } from 'vitest';
import { organizationLd, websiteLd, toGraph, orgId, websiteId } from '../../src/lib/structured-data';
import { site, socials, contactEmail } from '../../src/config/site';

/**
 * Regression guard for the JSON-LD: a later edit to the schema shapes (or a
 * refactor of the layout) would otherwise silently change what search and answer
 * engines read, with nothing to catch it. Pins the entity graph the live pages
 * emit. Answers the Operator's question: how would you know if a build broke it?
 *
 * Fixtures are driven from the real site config so the test can never assert
 * against a stale copy of the description, URL, or social list.
 */
const ORG_INPUT = {
  name: site.name,
  url: site.url,
  description: site.description,
  shortTagline: site.shortTagline,
  founder: site.founder,
  contactEmail,
  socials,
};

describe('organizationLd', () => {
  const org = organizationLd(ORG_INPUT);

  it('is an Organization with the stable shared @id', () => {
    expect(org['@type']).toBe('Organization');
    expect(org['@id']).toBe(orgId(site.url));
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

  it('maps the configured social profiles into sameAs', () => {
    expect(org.sameAs).toEqual(socials.map((s) => s.href));
  });
});

describe('websiteLd', () => {
  it('is a WebSite published by the Organization, linked by @id', () => {
    const web = websiteLd({ name: site.name, url: site.url });
    expect(web['@type']).toBe('WebSite');
    expect(web['@id']).toBe(websiteId(site.url));
    expect(web.publisher).toEqual({ '@id': orgId(site.url) });
  });
});

describe('toGraph', () => {
  it('wraps nodes in one @graph and strips per-node @context', () => {
    const graph = toGraph([
      { '@context': 'https://schema.org', '@type': 'Article', '@id': 'x' },
      organizationLd(ORG_INPUT),
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
      author: { '@id': orgId(site.url) },
      publisher: { '@id': orgId(site.url) },
    };
    const graph = toGraph([organizationLd(ORG_INPUT), websiteLd({ name: site.name, url: site.url }), article]);
    const ids = new Set((graph['@graph'] as Array<Record<string, unknown>>).map((n) => n['@id']));
    expect(ids.has(orgId(site.url))).toBe(true);
    expect(ids.has(websiteId(site.url))).toBe(true);
  });

  it('serializes to valid JSON (no circular references)', () => {
    const graph = toGraph([organizationLd(ORG_INPUT), websiteLd({ name: site.name, url: site.url })]);
    expect(() => JSON.stringify(graph)).not.toThrow();
  });
});
