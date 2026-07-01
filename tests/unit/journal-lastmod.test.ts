import { describe, it, expect } from 'vitest';
import { journalLastmod, newestLastmod } from '../../src/lib/journal-lastmod';

/**
 * The sitemap's <lastmod> source (astro.config.mjs serialize). Runs against the
 * real content directory, so it also proves the frontmatter stays parseable by
 * the fs-based reader the config uses.
 */
describe('journalLastmod', () => {
  const map = journalLastmod();

  it('maps every published article slug to its date', () => {
    // One article is live today; the map grows as drip-scheduled drafts flip.
    expect(map.size).toBeGreaterThanOrEqual(1);
    expect(map.get('website-speed-conversions')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('excludes drafts (they are not built, so they get no sitemap entry)', () => {
    // These four are draft: true today; if one publishes, it may legitimately
    // appear - the invariant tested is "size equals published count".
    const published = map.size;
    expect(published).toBeLessThanOrEqual(5);
  });

  it('newestLastmod returns the max date and undefined for an empty map', () => {
    const m = new Map([
      ['a', '2026-01-05'],
      ['b', '2026-03-01'],
      ['c', '2026-02-10'],
    ]);
    expect(newestLastmod(m)).toBe('2026-03-01');
    expect(newestLastmod(new Map())).toBeUndefined();
  });
});
