import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * SEO content lint for every journal article, drafts INCLUDED: a draft with a
 * weak description or missing FAQs would otherwise go live silently when the
 * drip schedule flips it. Bounds are set from the real corpus (titles 42-62
 * chars, descriptions 152-156) with headroom, so they flag genuine problems,
 * not style drift. Frontmatter is parsed textually because astro:content is
 * unavailable under vitest.
 */
const dir = resolve(__dirname, '../../src/content/journal');
const articles = readdirSync(dir)
  .filter((f) => f.endsWith('.md'))
  .map((file) => {
    const raw = readFileSync(join(dir, file), 'utf8');
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const field = (name: string) =>
      frontmatter
        .match(new RegExp(`^${name}:\\s*(.*)$`, 'm'))?.[1]
        ?.trim()
        .replace(/^["']|["']$/g, '') ?? '';
    const keywordBlock = frontmatter.match(/^keywords:\r?\n((?:[ \t]+-[ \t]+.*\r?\n?)+)/m)?.[1] ?? '';
    return {
      file,
      title: field('title'),
      description: field('description'),
      lead: field('lead'),
      kicker: field('kicker'),
      pubDate: field('pubDate'),
      faqCount: (frontmatter.match(/^[ \t]+- q:/gm) || []).length,
      keywordCount: (keywordBlock.match(/^[ \t]+-[ \t]+/gm) || []).length,
    };
  });

describe('journal content lint (SEO fields, drafts included)', () => {
  it('found the articles', () => {
    expect(articles.length).toBeGreaterThanOrEqual(5);
  });

  it.each(articles.map((a) => [a.file, a] as const))('%s carries publishable SEO fields', (_file, a) => {
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
  });
});
