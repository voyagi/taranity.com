import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../config/site';

/**
 * /llms-full.txt - the llmstxt.org "full" companion to /llms.txt: the complete
 * text of every published journal article in one plain-text fetch, so an AI
 * engine can ingest the journal without crawling page by page. Generated from
 * the same collection the pages render (raw markdown bodies plus the FAQ pairs,
 * which live in frontmatter and would otherwise be missing from the body).
 */
export const GET: APIRoute = async () => {
  const base = site.url.replace(/\/$/, '');
  const posts = (await getCollection('journal', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.order - b.data.order,
  );

  const sections = posts.map((p) => {
    const faqs =
      p.data.faqs.length > 0
        ? ['', '### Frequently asked questions', '', ...p.data.faqs.flatMap((f) => [`**${f.q}**`, '', f.a, ''])]
        : [];
    return [
      `## ${p.data.title}`,
      '',
      `Source: ${base}/journal/${p.id}`,
      `Published: ${p.data.pubDate.toISOString().slice(0, 10)}`,
      '',
      (p.body ?? '').trim(),
      ...faqs,
    ].join('\n');
  });

  const text = [
    `# ${site.name} Journal (full text)`,
    '',
    `> ${site.description}`,
    '',
    `Index: ${base}/llms.txt`,
    '',
    sections.join('\n\n---\n\n'),
    '',
  ].join('\n');

  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
