// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

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
        // Anchor to the START of the pathname so only the variant tree (/atlas, /atlas/...)
        // is dropped - not a canonical journal slug that merely contains a design name
        // (e.g. /journal/atlas-case-study). `page` is a full URL; test its pathname.
        !/^\/(atlas|signal|storefront|practice|raw)(\/|$)/.test(new URL(page).pathname),
      // Emit slash-free URLs (except root) so the sitemap matches each page's
      // <link rel=canonical> and the site's internal links (Astro's directory
      // format would otherwise add a trailing slash the canonicals don't have).
      serialize: (item) => {
        const u = new URL(item.url);
        if (u.pathname !== '/') u.pathname = u.pathname.replace(/\/$/, '');
        return { ...item, url: u.href };
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
  },
});
