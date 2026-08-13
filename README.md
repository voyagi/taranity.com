# taranity.com

The site for **Taranity**, a digital studio. It is proof of skill in itself: the same studio and
the same content, rendered as **six genuinely different design languages** a visitor switches
between live, from an editorial flagship to a brutalist terminal. Every one stays static, fast,
and accessible, with motion that respects reduced-motion and a strict Content-Security-Policy.

> **Stack:** Astro 7 (static) · Tailwind v4 · GSAP + ScrollTrigger · Lenis · Three.js (the Atlas
> WebGL design) · Cloudflare Pages · Cloudflare Web Analytics · Web3Forms + Turnstile.
> Rationale: [docs/adr/0001-stack.md](docs/adr/0001-stack.md).

## Quick start

```sh
npm install        # install dependencies
npm run dev        # dev server at http://localhost:4321
npm run build      # static build to ./dist
npm run preview    # preview the production build locally
npm run check      # astro type/diagnostics check
```

The site runs in **demo mode with zero configuration**: the contact form simulates success and
analytics stays off until configured. To wire the real services, follow `.env.example`; the
contact form additionally needs its Turnstile keys set on the Cloudflare Pages deployment.

## Project structure

```text
src/
  pages/       index (Vitrine flagship) + atlas/signal/storefront/practice/raw,
               privacy, [design]/privacy, 404, og-preview
  components/
    designs/<id>/  one folder per design (Header, Hero, Crafts, Studio, Method,
                   Manifesto, Contact, Footer, Subpage)
    DesignSwitcher.astro, PrivacyContent.astro - shared across designs
  config/      site.ts (identity, services, socials), designs.ts (the design registry)
  layouts/     SiteLayout.astro - head, SEO, JSON-LD, analytics, per-design shell
  lib/         <design>-motion.ts (GSAP + Lenis), atlas-gl.ts (Three.js),
               design-theme.ts, scroll-reset.ts
  styles/      Tailwind v4 @theme tokens + base
functions/
  api/contact.ts - Pages Function: server-side Turnstile verify + Web3Forms submit
public/        fonts, og.png, _headers (CSP), robots.txt, favicons
```

## Documentation

- [docs/](docs/) - architecture decision records and notes

## Deploy

Static build → Cloudflare Pages (no adapter). Connect the repo in the Cloudflare dashboard with
build command `npm run build` and output `dist`, or one-off:
`npm run build && npx wrangler pages deploy dist --project-name taranity`.

## License

[MIT](LICENSE) for the source code. Written content and brand assets © 2026 Taran.
