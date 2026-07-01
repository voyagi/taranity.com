import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, afterAll } from 'vitest';
import { journalLastmod, newestLastmod } from '../../src/lib/journal-lastmod';

/**
 * The sitemap's <lastmod> source (astro.config.mjs serialize). The fixture
 * tests pin the behaviours the sitemap depends on (draft exclusion,
 * updatedDate precedence, nested slugs); the real-corpus test proves the
 * frontmatter of the actual articles stays parseable by the fs-based reader.
 */
const fixtureDir = mkdtempSync(join(tmpdir(), 'journal-lastmod-'));
writeFileSync(
  join(fixtureDir, 'published.md'),
  '---\ntitle: Published\npubDate: 2026-06-29\n---\nBody.\n',
);
writeFileSync(
  join(fixtureDir, 'updated.md'),
  '---\ntitle: Updated\npubDate: 2026-06-01\nupdatedDate: 2026-07-01\n---\nBody.\n',
);
writeFileSync(
  join(fixtureDir, 'a-draft.md'),
  '---\ntitle: Draft\npubDate: 2026-06-30\ndraft: true\n---\nBody.\n',
);
mkdirSync(join(fixtureDir, 'nested'));
writeFileSync(
  join(fixtureDir, 'nested', 'deep.md'),
  '---\ntitle: Deep\npubDate: 2026-06-15\n---\nBody.\n',
);
afterAll(() => rmSync(fixtureDir, { recursive: true, force: true }));

describe('journalLastmod (fixtures)', () => {
  const map = journalLastmod(fixtureDir);

  it('maps published articles, excludes drafts, and prefers updatedDate', () => {
    expect(map.get('published')).toBe('2026-06-29');
    expect(map.get('updated')).toBe('2026-07-01'); // updatedDate wins over pubDate
    expect(map.has('a-draft')).toBe(false); // draft: true never gets a lastmod
  });

  it('walks subdirectories and derives the nested slug like the collection does', () => {
    expect(map.get('nested/deep')).toBe('2026-06-15');
  });

  it('newestLastmod returns the max date and undefined for an empty map', () => {
    expect(newestLastmod(map)).toBe('2026-07-01');
    expect(newestLastmod(new Map())).toBeUndefined();
  });
});

describe('journalLastmod (real content dir)', () => {
  it('parses the actual corpus and includes the live article', () => {
    const real = journalLastmod();
    expect(real.size).toBeGreaterThanOrEqual(1);
    expect(real.get('website-speed-conversions')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
