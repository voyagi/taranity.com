# docs/

Project documentation index.

- [adr/0001-stack.md](./adr/0001-stack.md) - why Astro + Tailwind v4 + GSAP/Lenis/Three on
  Cloudflare Pages.

## Architecture at a glance

```text
src/
  pages/         index (Vitrine flagship) + the five gallery designs, privacy,
                 [design]/privacy, 404, og-preview
  components/    designs/<id>/ (one folder per design) + DesignSwitcher, PrivacyContent
  config/        site.ts (identity, services), designs.ts (the design registry)
  layouts/       SiteLayout.astro - head/SEO/JSON-LD/analytics + per-design shell
  lib/           <design>-motion.ts (GSAP + Lenis runtimes), atlas-gl.ts (Three.js)
  styles/        Tailwind v4 @theme tokens + base
functions/api/contact.ts  Pages Function: server-side Turnstile verify + Web3Forms submit
public/          fonts, og.png, _headers (CSP), robots.txt, favicons
```

Design decisions of note live in the ADR. Each design owns its animation runtime in
`src/lib/<design>-motion.ts`, each a reduced-motion / touch / View-Transition-safe
ScrollTrigger lifecycle.
