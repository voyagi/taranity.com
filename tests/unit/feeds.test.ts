import { describe, it, expect, vi } from 'vitest';

/**
 * Unit coverage for the three distribution endpoints (rss.xml, llms.txt,
 * llms-full.txt) with a mocked content collection: XML escaping (including a
 * slug containing "&", which a CMS contributor can produce via the filename),
 * draft exclusion, and the llms.txt -> llms-full.txt pointer. The dist build
 * is also inspected in CI via the real corpus; these pin the logic itself.
 */
const FIXTURES = vi.hoisted(() => [
  {
    id: 'speed&craft',
    body: 'Body text mentioning Deloitte and load time.',
    data: {
      title: 'Speed & "Craft" <fast>',
      description: 'Ampersands & angle brackets < > must never corrupt the feed.',
      kicker: 'Performance & More',
      pubDate: new Date('2026-06-29T00:00:00Z'),
      updatedDate: undefined,
      order: 1,
      draft: false,
      faqs: [{ q: 'Is it fast?', a: 'Yes, measurably.' }],
    },
  },
  {
    id: 'unpublished-draft',
    body: 'Secret draft body.',
    data: {
      title: 'Draft Title',
      description: 'Draft description that must never appear in any feed output.',
      kicker: 'Draft',
      pubDate: new Date('2026-06-30T00:00:00Z'),
      updatedDate: undefined,
      order: 2,
      draft: true,
      faqs: [],
    },
  },
  {
    // Older article refreshed AFTER the newer one published: its effective date
    // (updatedDate) must lead the feed and drive lastBuildDate.
    id: 'refreshed-classic',
    body: 'Evergreen body, revised.',
    data: {
      title: 'Refreshed Classic',
      description: 'An older article whose update must surface it at the top of the feed.',
      kicker: 'Evergreen',
      pubDate: new Date('2026-06-20T00:00:00Z'),
      updatedDate: new Date('2026-07-01T00:00:00Z'),
      order: 3,
      draft: false,
      faqs: [],
    },
  },
]);

vi.mock('astro:content', () => ({
  getCollection: async (_name: string, filter?: (entry: { data: Record<string, unknown> }) => boolean) =>
    filter ? FIXTURES.filter((e) => filter(e)) : FIXTURES,
}));

import { GET as rssGet } from '../../src/pages/rss.xml';
import { GET as llmsGet } from '../../src/pages/llms.txt';
import { GET as llmsFullGet } from '../../src/pages/llms-full.txt';

// The endpoints ignore their APIContext argument.
const call = async (route: { (ctx: never): Response | Promise<Response> }) =>
  (await route({} as never)).text();

describe('rss.xml', () => {
  it('escapes every text field including the slug-derived URL, and excludes drafts', async () => {
    const xml = await call(rssGet);
    expect(xml).toContain('<title>Speed &amp; &quot;Craft&quot; &lt;fast&gt;</title>');
    expect(xml).toContain('<link>https://taranity.com/journal/speed&amp;craft</link>');
    expect(xml).toContain('<guid isPermaLink="true">https://taranity.com/journal/speed&amp;craft</guid>');
    expect(xml).toContain('<category>Performance &amp; More</category>');
    expect(xml).not.toContain('Draft Title');
    // No raw ampersand or stray angle bracket survives outside entities.
    expect(/&(?!(amp|lt|gt|apos|quot);)/.test(xml)).toBe(false);
  });

  it('is a valid RSS 2.0 shape with a self link and RFC-1123 dates', async () => {
    const xml = await call(rssGet);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
    expect(xml).toContain('rel="self" type="application/rss+xml"');
    expect(xml).toContain('<pubDate>Mon, 29 Jun 2026 00:00:00 GMT</pubDate>');
    expect((xml.match(/<item>/g) || []).length).toBe(2);
  });

  it('orders by effective date: a refreshed older article leads and drives lastBuildDate', async () => {
    const xml = await call(rssGet);
    // refreshed-classic: pubDate Jun 20 but updatedDate Jul 1 -> first item.
    const refreshed = xml.indexOf('<link>https://taranity.com/journal/refreshed-classic</link>');
    const newerByPub = xml.indexOf('<link>https://taranity.com/journal/speed&amp;craft</link>');
    expect(refreshed).toBeGreaterThan(-1);
    expect(refreshed).toBeLessThan(newerByPub);
    // Its item date is the updatedDate, and lastBuildDate matches it.
    expect(xml).toContain('<pubDate>Wed, 01 Jul 2026 00:00:00 GMT</pubDate>');
    expect(xml).toContain('<lastBuildDate>Wed, 01 Jul 2026 00:00:00 GMT</lastBuildDate>');
  });
});

describe('llms.txt', () => {
  it('lists published articles only and points at the full-text companion', async () => {
    const text = await call(llmsGet);
    expect(text).toContain('https://taranity.com/llms-full.txt');
    expect(text).toContain('/journal/speed&craft');
    expect(text).not.toContain('unpublished-draft');
  });
});

describe('llms-full.txt', () => {
  it('carries the full body and FAQs of published articles, never drafts', async () => {
    const text = await call(llmsFullGet);
    expect(text).toContain('## Speed & "Craft" <fast>'); // plain text: no escaping wanted
    expect(text).toContain('Source: https://taranity.com/journal/speed&craft');
    expect(text).toContain('Body text mentioning Deloitte');
    expect(text).toContain('### Frequently asked questions');
    expect(text).toContain('**Is it fast?**');
    expect(text).not.toContain('Secret draft body');
    expect(text).not.toContain('Draft Title');
  });
});
