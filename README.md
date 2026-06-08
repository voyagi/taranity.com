# taranity.com

Personal portfolio of **Taran** — full-stack developer & automation architect. The site is built
to be proof of skill, not just a list of work: dark operator-console glassmorphism, holographic
motion, a command palette, a live "Currently" widget, and cinematic page transitions — all while
staying static, fast, and accessible.

> **Stack:** Astro 6 (static) · Tailwind v4 · GSAP + ScrollTrigger + SplitText · Lenis ·
> Cloudflare Pages · Plausible · Web3Forms.
> Rationale: [docs/adr/0001-stack.md](docs/adr/0001-stack.md).

## Quick start

```sh
npm install        # install dependencies
npm run dev        # dev server at http://localhost:4321
npm run build      # static build to ./dist
npm run preview    # preview the production build locally
npm run check      # astro type/diagnostics check
```

The site runs in **demo mode with zero configuration** — the contact form, analytics, booking
link, and "Currently" widget all have safe fallbacks. To wire the real services, copy
`.env.example` to `.env` and fill in the `PUBLIC_*` values (see [HUMAN-TODO.md](HUMAN-TODO.md)).

## Project structure

```text
src/
  config/      site.ts, about.ts        — profile, socials, CTAs, story, skills
  content/     projects.ts              — full case-study data (Problem→Solution→Result)
  layouts/     BaseLayout.astro         — head, SEO, JSON-LD, analytics, global shell
  components/  Nav, Footer, Cursor, CommandPalette, Currently, ProjectCard, ...
  lib/         motion.ts, gh.ts         — animation runtime + Currently data source
  pages/       index, work, projects/[slug], about, contact, 404
  styles/      global.css               — Tailwind v4 @theme tokens + base
public/        og.png, robots.txt, favicons
```

## Documentation

- [PROJECT.md](PROJECT.md) — purpose, audience, success criteria
- [ROADMAP.md](ROADMAP.md) — phased build plan
- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) — the original design language
- [docs/](docs/) — ADRs and architecture notes
- [HUMAN-TODO.md](HUMAN-TODO.md) — accounts, keys, deploy (the only human steps)

## Deploy

Static build → Cloudflare Pages (no adapter). Connect the repo in the Cloudflare dashboard with
build command `npm run build` and output `dist`, or one-off:
`npm run build && npx wrangler pages deploy dist --project-name taranity`. Full steps in
[HUMAN-TODO.md](HUMAN-TODO.md).

## License

[MIT](LICENSE) for the source code. Written content and brand assets © 2026 Taran.
