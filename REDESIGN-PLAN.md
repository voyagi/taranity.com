# Taranity Redesign Plan (multi-design showcase)

Handoff doc for continuing in a new session. Read this first.

## Where we are
The previous build (Aurora / Operator Console / World, Phases A to F, PRs #2 to #7) is merged to
main but the user REJECTED those designs as too similar (just different backgrounds). We are
rebuilding the front end from scratch as a showcase of several genuinely different designs.

- Branch: `feat/multi-design-showcase` (off main), PR'd as the Vitrine PR.
- DONE Phase 1 (Vitrine): SiteLayout.astro (head/meta + constant pre-paint theme script reading
  data-theme-light/dark attrs, one CSP hash for all designs), src/styles/site.css (shared reset),
  Fraunces variable font self-hosted, src/components/designs/vitrine/* (hero, manifesto,
  work plates, studio, contact + footer), src/lib/vitrine-motion.ts (Lenis + GSAP, gated on
  [data-vitrine], full teardown before VT swaps), `/` renders Vitrine, registry ready=true.
  Old-design links to `/` carry data-astro-reload (old motion.ts never destroys its Lenis).
  e2e suite retargeted (legacy theme/palette checks on /work, Vitrine checks on /), 71/71 green.
- NEXT Phase 2 (Atlas): immersive dark 3D journey at /atlas under
  src/components/designs/atlas/, three@0.184.0 already a dep, lazy-load the GL after first paint,
  reuse SiteLayout (pass design="atlas", themeLight/themeDark). Flip atlas ready=true in
  designs.ts in the same PR; the switcher list appears automatically at 2+ ready designs.

## Hard rules (apply to EVERY design and to replies to the user)
1. No booking or calls anywhere. Written contact only (form + email).
2. No "Currently" / current-projects widget.
3. "AI" never leads or is the first thing read. Lead with the outcome; AI is one capability, lower down.
4. No em dashes ("—") in site copy OR in replies to the user. Use periods, commas, colons, parentheses.
5. Light or dark follows the system setting by default (prefers-color-scheme) plus a manual toggle.
   Already implemented in src/lib/design-theme.ts.
6. Wild but fast: server-rendered content paints first, WebGL loads lazily after, one shared renderer,
   capped DPR, instancing, strong mobile and reduced-motion fallbacks. (Aristide ships these effects in
   about 67KB of JS, that is the bar.)
7. NO PROJECT PORTFOLIO anywhere on the site (user decision 2026-06-11): never present
   projects or case studies. "Work" sections are replaced by offerings (crafts) and method
   content. The legacy /work and /projects pages, projects.ts, ProjectCard, MetricTile,
   Currently, and gh.ts were deleted in the no-projects PR; do not reintroduce them.

## Reference DNA (the user's picks: Igloo, Samsy, Aristide Benoist, Unseen Studio, Lando Norris,
## Hubtown, augen.pro)
Dark, elegant, premium, immersive, cinematic, WebGL with taste, signature transitions, lean and fast.
The design lives in the structure and interaction, not the backdrop.

## The 6 designs (each a different domain AND a different design language). Build in this order.
1. Vitrine. Luxury, fashion, jewelry, boutique hotels, architecture. Editorial, oversized type,
   full-bleed imagery, slow cinematic scroll. dark + light. BUILD FIRST: it stands up the foundation.
2. Atlas. Agencies, tech, web3, launches. Immersive dark 3D journey (Three.js, lazy). User's favorite.
3. Signal. SaaS, fintech, startups. Clean, light, structured, conversion, clear next step. Most sellable.
4. Storefront. E-commerce and DTC, beauty, food, fashion retail. Vivid, product forward, tactile.
5. Practice. Medical, dental, med spa, law, home services and trades (highest-paying niches). Warm,
   trust, credibility first, dead-simple written contact.
6. Raw. Art, music, fashion forward, design studios, dev tools. Brutalist, monospace, raw grids, glitch.

## Architecture
- `src/config/designs.ts` registry (id, name, audience, route, modes, ready flag). Only `ready`
  designs appear in the switcher. Flip ready to true as each ships, one per PR.
- Each design = a self-contained single-page experience (hero, what, work, about, contact as sections
  on one page; these styles are usually one scroll). Flagship (Vitrine) renders at `/`; others at
  `/atlas`, `/signal`, etc. Switcher links navigate between them and remember the choice.
- `src/lib/design-theme.ts` = system light/dark + stored override + after-swap re-apply + delegated
  controls. `src/components/DesignSwitcher.astro` = the fixed control (design list appears at 2+ ready).
- TODO next (Phase 1): a new `SiteLayout.astro` (head/meta from src/config/site.ts, pre-paint inline
  theme-init that reads prefers-color-scheme + stored mode, imports DesignSwitcher, calls
  initDesignTheme), build the Vitrine components under `src/components/designs/vitrine/`, point
  `src/pages/index.astro` at it, apply the content rules. Leave the old BaseLayout + old pages in place
  for now; remove them in a later cleanup once designs replace them. Regen CSP hash (scripts/csp-hash.mjs
  to public/_headers) in the same commit as any new inline script. three@0.184.0 already a dep (for Atlas).

## Process (worked well before)
Each design = its own reviewed PR. post-task-reviewer + CodeRabbit + GitGuardian; fix all findings;
the push gate keys on the commit short-hash (push to register, then
`node ~/.claude/hooks/review-mark.js set-result <hash> passed C H M`); auto-merge when CLEAN +
MERGEABLE + 0 unresolved threads; squash, delete branch, back to main. Verify: astro check + eslint +
vitest + build + dev-browser screenshot each design; trivy if deps change. Never commit to main.

## Local preview (the assistant's background servers get reaped; run it yourself)
`npm run preview -- --port 4340` then open http://localhost:4340. serve-headers.mjs honors a PORT env.

## To resume in a new session
Say: "Continue the Taranity redesign. Read REDESIGN-PLAN.md, we are on branch feat/multi-design-showcase,
build Vitrine (Phase 1) next." Then it has everything it needs.
