import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site, journalDescription } from '../config/site';

/**
 * /rss.xml - RSS 2.0 feed of the published journal articles, newest first.
 * Feed readers, aggregators, and several AI crawlers consume it; the layout
 * head advertises it via <link rel="alternate">. Hand-rolled rather than a
 * dependency: the surface is one small, stable XML shape generated from the
 * same collection the pages render, and every text field is escaped below.
 */

const escapeXml = (value: string): string =>
  value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string);

export const GET: APIRoute = async () => {
  const base = site.url.replace(/\/$/, '');
  // Newest first (feed convention) by EFFECTIVE date - the same updatedDate ??
  // pubDate each item's <pubDate> carries - so a refreshed older article
  // surfaces at the top and lastBuildDate (posts[0]) can never trail an item.
  // Ties broken by the editorial order.
  const effective = (p: { data: { pubDate: Date; updatedDate?: Date } }) =>
    (p.data.updatedDate ?? p.data.pubDate).getTime();
  const posts = (await getCollection('journal', ({ data }) => !data.draft)).sort(
    (a, b) => effective(b) - effective(a) || a.data.order - b.data.order,
  );

  const items = posts.map((p) => {
    // The slug comes from the content filename (CMS contributors choose it), so
    // the URL is escaped like every other text field - nothing enters unescaped.
    const url = escapeXml(`${base}/journal/${p.id}`);
    return [
      '    <item>',
      `      <title>${escapeXml(p.data.title)}</title>`,
      `      <link>${url}</link>`,
      `      <guid isPermaLink="true">${url}</guid>`,
      `      <pubDate>${(p.data.updatedDate ?? p.data.pubDate).toUTCString()}</pubDate>`,
      `      <description>${escapeXml(p.data.description)}</description>`,
      `      <category>${escapeXml(p.data.kicker)}</category>`,
      '    </item>',
    ].join('\n');
  });

  // lastBuildDate from the newest article keeps the feed deterministic per build.
  const newest = posts[0] ? (posts[0].data.updatedDate ?? posts[0].data.pubDate).toUTCString() : undefined;

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(`${site.name} Journal`)}</title>`,
    `    <link>${base}/journal</link>`,
    `    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(journalDescription)}</description>`,
    '    <language>en</language>',
    ...(newest ? [`    <lastBuildDate>${newest}</lastBuildDate>`] : []),
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
