import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../config/site';

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
  // Newest first (feed convention), pubDate ties broken by the editorial order.
  const posts = (await getCollection('journal', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime() || a.data.order - b.data.order,
  );

  const items = posts.map((p) => {
    const url = `${base}/journal/${p.id}`;
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
    '    <description>Long-form notes from the Taranity studio on web performance, ecommerce conversion, business automation, and building intelligent systems that last.</description>',
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
