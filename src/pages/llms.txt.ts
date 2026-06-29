import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../config/site';

/**
 * /llms.txt - a curated, plain-text index for AI models and answer engines
 * (the llmstxt.org convention). Generated from the live content collection, so
 * it lists only published (non-draft) journal articles and stays correct as the
 * drip schedule flips each one live. Served as text/plain at the site root.
 */
export const GET: APIRoute = async () => {
  const base = site.url.replace(/\/$/, '');
  const posts = (await getCollection('journal', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.order - b.data.order,
  );

  const lines: string[] = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    'Taranity is a small senior studio: the people who design your site also build it.',
    'We work with companies across Europe on websites, commerce, apps, automation, and',
    'intelligent systems, and we measure the work in outcomes rather than output.',
    '',
    '## Journal',
    '',
    'Plain, opinionated articles on building software that lasts.',
    '',
    ...posts.map((p) => `- [${p.data.title}](${base}/journal/${p.id}): ${p.data.description}`),
    '',
    '## Pages',
    '',
    `- [Taranity](${base}/): The studio, what we make, and how we work.`,
    `- [Journal](${base}/journal): All published articles.`,
    `- [Privacy](${base}/privacy): What we collect and your rights, in plain language.`,
    '',
    '## Contact',
    '',
    'Written contact only, no booking links. Reach the studio at hello@taranity.com.',
    '',
  ];

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
