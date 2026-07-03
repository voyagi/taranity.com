// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { designs } from './src/config/designs';
import { journalLastmod, newestLastmod } from './src/lib/journal-lastmod';

// The per-design variant trees (/<id>, /<id>/journal, /<id>/privacy, ...) are noindex
// alternate renderings the edge serves at the canonical URL, so they must never enter
// the sitemap. Derive the id list from the design registry (not a hardcoded regex),
// anchored to the START of the pathname so only the variant tree is dropped and a
// canonical journal slug that merely contains a design name (e.g. /journal/atlas-
// case-study) is kept. Adding a design now updates this automatically, so a new
// design's noindex tree can't silently leak into the sitemap.
const VARIANT_TREE = new RegExp(
  `^/(${designs
    .filter((d) => d.route !== '/')
    .map((d) => d.id)
    .join('|')})(/|$)`,
);

// Published-article dates for sitemap <lastmod> (see serialize below).
const JOURNAL_LASTMOD = journalLastmod();

// https://astro.build/config
export default defineConfig({
  site: 'https://taranity.com',
  output: 'static',
  integrations: [
    sitemap({
      // Drop the OG preview and the ENTIRE per-design variant tree
      // (/<design>, /<design>/journal, /<design>/privacy, ...). Those are noindex
      // alternate renderings the edge serves at the canonical URL; only the clean
      // canonical URLs (Vitrine at "/", "/journal", "/journal/<slug>", "/privacy")
      // belong in the sitemap, so there is one canonical URL per piece of content.
      filter: (page) =>
        !page.includes('/og-preview') &&
        // `page` is a full URL; test its pathname against the derived variant tree.
        !VARIANT_TREE.test(new URL(page).pathname),
      // Emit slash-free URLs (except root) so the sitemap matches each page's
      // <link rel=canonical> and the site's internal links (Astro's directory
      // format would otherwise add a trailing slash the canonicals don't have).
      // Journal URLs also get an accurate <lastmod> from the article's
      // updatedDate/pubDate (the /journal listing gets the newest of them);
      // other pages get none, because a made-up lastmod is worse than none.
      serialize: (item) => {
        const u = new URL(item.url);
        if (u.pathname !== '/') u.pathname = u.pathname.replace(/\/$/, '');
        // (.+) not ([^/]+): a nested content file yields a multi-segment slug.
        const slug = u.pathname.match(/^\/journal\/(.+)$/)?.[1];
        const lastmod =
          (slug && JOURNAL_LASTMOD.get(slug)) ||
          (u.pathname === '/journal' ? newestLastmod(JOURNAL_LASTMOD) : undefined);
        return { ...item, url: u.href, ...(lastmod ? { lastmod } : {}) };
      },
    }),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  // CSP + security headers are delivered as real response headers via public/_headers
  // (Cloudflare Pages). A header CSP keeps script-src strict (no 'unsafe-inline' - the
  // only inline script is hashed) while allowing style-src 'unsafe-inline', which GSAP
  // requires for its JS-applied styles. Astro's meta CSP can't do this: it always seeds
  // an empty-string style hash that neutralizes 'unsafe-inline'.
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          // Force Sheet's filter island into its own named chunk so it is always
          // emitted as an external /_astro/*.js file, never inlined into the page
          // HTML. A tiny standalone island (no large shared vendor import, unlike
          // the GSAP/Lenis motion modules) would otherwise be inlined as a
          // <script type="module"> - which the strict header CSP (public/_headers,
          // hashed inline scripts, no 'unsafe-inline') would block, silently
          // killing the filter. Externalising it keeps script-src 'self' happy and
          // adds ZERO new inline-script hashes.
          manualChunks(id) {
            if (id.includes('/lib/sheet-filter')) return 'sheet-filter';
            // Same CSP reasoning for Prism's shader island: a standalone module
            // with no shared vendor import would otherwise be inlined and blocked.
            if (id.includes('/lib/prism-field')) return 'prism-field';
            // Same CSP reasoning for Ink's hero island (word rotation + blob menu):
            // a standalone module would otherwise be inlined and CSP-blocked.
            if (id.includes('/lib/ink-hero')) return 'ink-hero';
            return undefined;
          },
        },
      },
    },
  },
});
