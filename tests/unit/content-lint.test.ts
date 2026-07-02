import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * SEO content lint for every journal article, drafts INCLUDED: a draft with a
 * weak description or missing FAQs would otherwise go live silently when the
 * drip schedule flips it. Bounds are set from the real corpus (titles 42-62
 * chars, descriptions 152-156) with headroom, so they flag genuine problems,
 * not style drift. Frontmatter is parsed textually because astro:content is
 * unavailable under vitest. Walks subdirectories to mirror the collection's
 * recursive `**\/*.md` glob, so a nested article cannot escape the lint.
 */
const dir = resolve(__dirname, '../../src/content/journal');

const collectMd = (current: string, prefix = ''): string[] =>
  readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return collectMd(join(current, entry.name), `${prefix}${entry.name}/`);
    return entry.name.endsWith('.md') ? [`${prefix}${entry.name}`] : [];
  });

const articles = collectMd(dir).map((relative) => {
  const raw = readFileSync(join(dir, relative), 'utf8');
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const field = (name: string) =>
    frontmatter
      .match(new RegExp(`^${name}:\\s*(.*)$`, 'm'))?.[1]
      ?.trim()
      .replace(/^["']|["']$/g, '') ?? '';
  const keywordBlock = frontmatter.match(/^keywords:\r?\n((?:[ \t]+-[ \t]+.*\r?\n?)+)/m)?.[1] ?? '';
  return {
    relative,
    slug: relative.replace(/\.md$/, ''),
    title: field('title'),
    description: field('description'),
    lead: field('lead'),
    kicker: field('kicker'),
    pubDate: field('pubDate'),
    heroImage: field('heroImage'),
    faqCount: (frontmatter.match(/^[ \t]+- q:/gm) || []).length,
    keywordCount: (keywordBlock.match(/^[ \t]+-[ \t]+/gm) || []).length,
  };
});

// Each path segment must already BE a canonical slug: lowercase alphanumerics
// and hyphens. Astro's loader slugifies ids derived from filenames, and the
// sitemap <lastmod> reader and RSS URLs assume filename === slug; a filename
// like "My Post.md" would silently break that mapping, so it fails loudly here.
const CANONICAL_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

describe('journal content lint (SEO fields, drafts included)', () => {
  it('found the articles', () => {
    expect(articles.length).toBeGreaterThanOrEqual(5);
  });

  it.each(articles.map((a) => [a.relative, a] as const))('%s carries publishable SEO fields', (_file, a) => {
    // Filename must equal its URL slug (see CANONICAL_SLUG above).
    expect(a.slug).toMatch(CANONICAL_SLUG);
    // Title: present, and short enough not to truncate badly in a SERP.
    expect(a.title.length).toBeGreaterThan(0);
    expect(a.title.length).toBeLessThanOrEqual(70);
    // Meta description: the schema asks for ~150-160; enforce 140-165.
    expect(a.description.length).toBeGreaterThanOrEqual(140);
    expect(a.description.length).toBeLessThanOrEqual(165);
    // Standfirst and section label drive the page header and articleSection.
    expect(a.lead.length).toBeGreaterThan(0);
    expect(a.kicker.length).toBeGreaterThan(0);
    expect(a.pubDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
    // FAQs feed the visible FAQ + FAQPage JSON-LD; keywords feed Article LD.
    expect(a.faqCount).toBeGreaterThanOrEqual(3);
    expect(a.keywordCount).toBeGreaterThanOrEqual(3);
    // Every article ships its own OG card, and the PNG must actually exist
    // (regenerate with `node scripts/generate-og.mjs` after adding an article).
    expect(a.heroImage).toBe(`/journal/${a.slug}.png`);
    expect(existsSync(resolve(__dirname, '../../public', a.heroImage.slice(1)))).toBe(true);
  });
});
