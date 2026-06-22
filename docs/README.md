# docs/

Project documentation index.

- [adr/0001-stack.md](./adr/0001-stack.md) - why Astro + Tailwind v4 + GSAP/Lenis/Three on
  Cloudflare Pages.

## Architecture at a glance

```
src/
  config/        site + about content (profile, socials, CTAs, story, skills)
  content/       projects.ts - full case-study data
  layouts/       BaseLayout.astro - head/SEO/JSON-LD/analytics + global shell
  components/    Nav, Footer, Cursor, CommandPalette, Currently, ProjectCard, MetricTile, ...
  lib/           motion.ts (Lenis+GSAP runtime), gh.ts (Currently data), util helpers
  pages/         index, work, projects/[slug], about, contact, 404
  styles/        global.css - Tailwind v4 @theme tokens + base + utilities
public/          fonts are bundled via @fontsource; static assets, og.png, robots.txt
```

Design decisions of note live in the ADR. The animation runtime is centralized
in `src/lib/motion.ts` so every page shares one reduced-motion / touch / View-Transition-safe
ScrollTrigger lifecycle.
