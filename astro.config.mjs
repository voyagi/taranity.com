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
      // Drop the OG preview and the noindex per-design privacy variants
      // (/<design>/privacy); Vitrine's canonical /privacy stays in the sitemap.
      filter: (page) =>
        !page.includes('/og-preview') &&
        !/\/(atlas|signal|storefront|practice|raw)\/privacy\/?$/.test(page),
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
