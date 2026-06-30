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
   social window. This is implemented now: article 1 is live and articles 2 to 5 are
   `draft: true`. See the release schedule below.

## Release schedule (live state)

Articles are dripped roughly every two weeks. Only `draft: false` entries build, list on the
index, and enter the sitemap, so drafted ones are invisible to Google until flipped.

| Order | Slug | Status | Target publish |
|---|---|---|---|
| 1 | `website-speed-conversions` | **live** | 2026-06-29 |
| 2 | `ecommerce-conversion-fixes` | draft | ~2026-07-13 |
| 3 | `what-to-automate-first` | draft | ~2026-07-27 |
| 4 | `ai-implementation-guardrails` | draft | ~2026-08-10 |
| 5 | `studio-vs-agency-vs-freelancer` (pillar) | draft | ~2026-08-24 |

To avoid 404s while siblings are drafted, two forward cross-links were softened: article 1
to article 2, and article 3 to article 4. Restore them when the target goes live (optional;
the index and the pillar already interlink the cluster). Publishing in order keeps every
remaining cross-link pointing at an already-live article.

### Flip one live

1. In the article's frontmatter, delete `draft: true` (or set `draft: false`).
2. Set `pubDate` to the real date so the "Published" line and the Article schema are accurate.
3. If its sibling target is now live, restore the cross-link (article 1 to ecommerce once
   article 2 ships; article 3 to AI once article 4 ships).
4. `npm run check && npm run build`, then commit, push, merge, and deploy.
5. Post the native LinkedIn summary and syndicate with a canonical tag back to the article.

## Automated reminder (so the drip does not depend on memory)

A fortnightly reminder runs outside this repo, in the general-claude workspace
(`scripts/taranity-journal-reminder.ps1`, a Windows Task Scheduler task named "Taranity Journal
Reminder", first fire 2026-07-13, every 14 days). Each run probes production to find the next
`draft: true` article that is not yet live, then sends a Telegram message with a ready prompt to
publish it. Once all five are live it switches to a "write a new one" prompt. It reads slugs from
`src/content/journal/`, so renaming or reordering an article here is picked up automatically with
no edit to the reminder.

The reminder is watched by the general-claude live-health monitor, which raises an alert if it
silently stops firing (a stale heartbeat). To stop the drip permanently, disable that scheduled
task: the monitor reads the task state and treats a deliberate disable as an intentional pause,
so it does not false-alarm.

## Adding a new article

1. Drop a `.md` file in `src/content/journal/`. The filename is the slug.
2. Fill the frontmatter (copy an existing file). Keep `description` 150-160 chars, write 3-5
   `faqs`, set a unique `order`.
3. Body starts at the intro paragraph (no `# H1`; the title comes from frontmatter). Use
   `##` for sections. No em dashes. Internal-link to `/#crafts`, `/#contact`, and a sibling.
4. **Optional social image:** drop a 1200x630 image at `public/journal/<slug>.png` and set
   `heroImage: /journal/<slug>.png` in the frontmatter. It becomes the article's og:image and
   the image Medium/LinkedIn pull. Without it the page falls back to the brand `/og.png`.
5. `npm run check && npm run build` to validate, then deploy.

## Not done by tooling

The articles cannot be auto-posted to LinkedIn/Medium (those need a human login and are
public actions). Syndication and native social posts are manual.
