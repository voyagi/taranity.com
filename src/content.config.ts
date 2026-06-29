import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The journal: long-form articles on the studio's craft (performance, commerce,
 * automation, intelligent systems, choosing a build partner). Written in the
 * studio "we" voice with no personal byline, and no em dashes, per the brand
 * rules in src/config/site.ts. Each entry's filename is its slug; it renders at
 * /journal/<slug>. FAQs live in frontmatter so the visible FAQ and the FAQPage
 * structured data share one source and can never drift.
 */
const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string(),
    /** Meta + social description. Aim for 150 to 160 characters. */
    description: z.string(),
    /** Standfirst under the title; falls back to description when absent. */
    lead: z.string().optional(),
    /** Eyebrow category label shown above the title. */
    kicker: z.string().default('Journal'),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /** Primary + secondary keywords. Kept for reference and internal linking,
     * not rendered as meta keywords (Google ignores those). */
    keywords: z.array(z.string()).default([]),
    /** FAQ pairs: rendered on the page AND emitted as FAQPage JSON-LD. */
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    /** Ascending listing order on the journal index. */
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

export const collections = { journal };
