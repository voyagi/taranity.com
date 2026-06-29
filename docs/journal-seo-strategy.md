# Journal: content + SEO strategy

The `/journal` section is the site's organic-search surface. It is a small Astro content
collection rendered in the flagship Vitrine language. This doc covers how it is wired, the
five launch articles, the publishing plan, and how to add the next one.

## Brand rules the content follows

These come straight from `src/config/site.ts` and are non-negotiable for journal copy:

- **Studio "we" voice. No personal byline.** The founder's name is never published. Author
  in structured data is the `Organization` (Taranity), not a `Person`.
- **No em dashes** anywhere in copy or structured data. Use a comma, a colon, parentheses,
  a spaced hyphen, or split the sentence.
- **AI never leads** the studio's framing. The AI article is fine; just don't position
  Taranity as "an AI company".

## How it is wired

- `src/content.config.ts` defines the `journal` collection (glob loader over
  `src/content/journal/*.md`). Frontmatter: `title`, `description` (meta, 150-160 chars),
  `lead` (standfirst), `kicker` (category eyebrow), `pubDate`, optional `updatedDate`,
  `keywords[]`, `faqs[]` (`{q,a}`), `order` (listing sort), `draft`.
- `src/pages/journal/index.astro` lists entries (sorted by `order`).
- `src/pages/journal/[slug].astro` renders an article. SEO (title/description/canonical/OG)
  is handled by `SiteLayout`; this route passes `Article` + `BreadcrumbList` + `FAQPage`
  JSON-LD via the layout's `jsonLd` prop. The visible FAQ and the `FAQPage` schema both read
  the same `faqs` frontmatter, so they cannot drift.
- `src/styles/journal.css` (`.v-journal`, layered on `.v-page`) adds ordered-list, FAQ, and
  listing styles without touching the shared privacy/404 styles.
- `VitrineFooter.astro` links to `/journal` (home -> journal internal link).
- The sitemap (`@astrojs/sitemap`) picks up every journal page automatically.

## The five launch articles

Each maps to a service and a real search intent. The "who builds your software" piece is the
pillar; the other four are supporting pages that link up to it.

| Slug | Primary keyword | Service | Funnel |
|---|---|---|---|
| `website-speed-conversions` | website speed and conversion rate | Websites | Top |
| `ecommerce-conversion-fixes` | ecommerce conversion rate optimisation | Commerce | Mid |
| `what-to-automate-first` | business process automation for small business | Automation | Mid |
| `ai-implementation-guardrails` | how to implement AI in your business | Intelligent systems | Top/Mid |
| `studio-vs-agency-vs-freelancer` | boutique studio vs agency vs freelancer | The Studio / Advisory | Bottom (pillar) |

Internal links use the real single-page anchors: `/#crafts`, `/#studio`, `/#contact`. The
pillar links out to all four supporting pages; each supporting page links to the pillar's
themes and one sibling.

## Publishing plan and honest ranking expectations

A new section on an established-but-small domain does not rank overnight. Google rewards
topical authority (a cluster, not one post), citations, and time. Realistic timeline: **3-6
months** for the easier keywords to move into striking range, longer for competitive ones.

1. **On-domain first (done).** Everything lives at `taranity.com/journal/<slug>` so the SEO
   equity builds this domain.
2. **Syndicate second.** Repost to LinkedIn Articles / Medium / dev.to with
   `rel="canonical"` pointing back to the taranity.com URL, to get reach without
   duplicate-content dilution.
3. **Distribute as a studio.** A short native LinkedIn post per article drives the first
   readers and links while Google indexes.
4. **Cadence.** One per 1-2 weeks rather than all at once, so each gets its own indexing and
   social window. To stage, set `draft: true` on the not-yet-published entries and flip them
   live on schedule.

## Adding a new article

1. Drop a `.md` file in `src/content/journal/`. The filename is the slug.
2. Fill the frontmatter (copy an existing file). Keep `description` 150-160 chars, write 3-5
   `faqs`, set a unique `order`.
3. Body starts at the intro paragraph (no `# H1`; the title comes from frontmatter). Use
   `##` for sections. No em dashes. Internal-link to `/#crafts`, `/#contact`, and a sibling.
4. `npm run check && npm run build` to validate, then deploy.

## Not done by tooling

The articles cannot be auto-posted to LinkedIn/Medium (those need a human login and are
public actions). Syndication and native social posts are manual.
