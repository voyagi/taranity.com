# Taranity Redesign Plan (multi-design showcase)

Handoff doc for continuing in a new session. Read this first.

## Where we are
The previous build (Aurora / Operator Console / World, Phases A to F, PRs #2 to #7) is merged to
main but the user REJECTED those designs as too similar (just different backgrounds). We are
rebuilding the front end from scratch as a showcase of several genuinely different designs.

- PHASE 1 (Vitrine) COMPLETE, PRs #8 to #18, all squash-merged to main (last: b1345d1).
  USER-ACCEPTED final state:
  - Foundation: SiteLayout.astro (head/meta/JSON-LD + ONE constant pre-paint inline script for
    every design: reads data-theme-light/dark attrs, sets data-mode, adds v-lenis pre-paint when
    the page passes `smooth` [data-smooth attr] so the scrollbar hides without reflow);
    src/styles/site.css shared reset; design-theme.ts syncs theme-color on toggle.
  - Vitrine at `/`: hero, manifesto + method (Listen/Distill/Craft/Stay), SIX craft plates
    (Websites, Commerce, Applications, Automation, Advisory, Intelligent systems LAST), studio,
    marquee, contact + footer. Plates = full-bleed cinema: layered gradient fields (--pa..--pe +
    conic), dense engraved SVG etchings per craft, cropped numerals, light sheen, grain, wipe
    reveals. Atmospheres: dark = stars (twinkle+drift); light = DAY (blue sky wash, white cloud
    banks, golden sun glow behind an engraved sun, gold shafts, birds), 7 .v-paper layers pinned
    by tests/unit/vitrine-css.test.ts (wiring + dark-token sync + containment invariant).
  - Subpages on the same system: /privacy + 404 via VitrinePage.astro (header subpage variant,
    shared VitrineFooter, NO motion runtime, NO reveal attrs). og-preview = Vitrine OG card;
    public/og.png regenerated from it (1200x630). public/_redirects 301s old routes to /.
  - Voice: worldwide, every client size/kind, no NL/Eindhoven in copy (JSON-LD address kept).
  - vitrine-motion.ts: Lenis 1.35 + GSAP; gated on [data-vitrine]; FULL teardown before VT swaps
    (Lenis destroyed, v-lenis class removed, lagSmoothing restored to 500/33); mask reveals own
    BOTH y and yPercent (GSAP cannot recover yPercent from a computed matrix) and use 120% to
    clear the descender padding on .v-mask; anchor glide moves focus.
  - e2e (scripts/e2e.devbrowser.js, 38/38): pages / + /privacy; audits under emulated reduced
    motion; motion-ON guards assert hero/statement reveal offsets and plate wipes (6 plates);
    form checks on the home form (#v-name etc.); BASE pinned to http://127.0.0.1:4321.
- PHASE 2 (Atlas) COMPLETE, merged to main (PR #20 build, PR #21 legibility): immersive dark
  3D journey at /atlas.
  - src/components/designs/atlas/: Atlas.astro shell ([data-atlas] root, 3-layer .a-field CSS
    starfield/nebula/graticule fallback, [data-a-gl] mount, .a-track instrument rail) + Header/
    Hero/Manifesto/Crafts (6 waypoint rows, wipe reveals)/Method (Survey/Chart/Build/Stay)/
    Studio/Contact (hardened Web3Forms clone, a-* ids)/Footer. Space Grotesk display,
    JetBrains Mono labels, ion-blue #7cc7ff on #05070d. Dark-only: color-scheme pinned dark,
    themeLight=themeDark; DesignSwitcher now takes a design prop and hides the mode toggle on
    single-mode designs.
  - src/lib/atlas-motion.ts: vitrine-motion teardown pattern copied exactly (Lenis 1.1,
    v-lenis class, lagSmoothing restore, astro:before-swap teardown); also owns the lazy GL
    boot: requestIdleCallback + dynamic import('./atlas-gl') with a generation guard, sets
    data-gl="on|off" on the root (deterministic e2e signal), destroys the scene on teardown
    and on mid-session reduced-motion flips.
  - src/lib/atlas-gl.ts: three.js lazy chunk (~492KB raw, idle-loaded after paint). Particle
    globe (fibonacci sphere, layered-sine continents, deterministic: no Math.random) + star
    shell + 3 graticule LineLoops; scroll-driven camera POSES (lerp+smoothstep), pointer
    parallax (fine pointers only), DPR cap 2 (1.5 narrow), visibilitychange pause,
    webglcontextlost -> clean fallback, full dispose + forceContextLoss on destroy.
    Point-size constant 13.0 and the POSES were tuned against real screenshots (140.0 made
    white-hot blobs that swallowed the hero type).
  - atlas ready=true in designs.ts; switcher list live at 2 designs. CSP: AtlasContact's
    inline form script added hash 'sha256-e/kTl7qvdni+...' to public/_headers (4 total).
  - Tests: tests/unit/atlas-css.test.ts (containment invariant, color-scheme dark pin,
    standalone v-lenis rules, CSS gate <-> motion pose sync incl. exact clip-path string,
    field layer count, registry wiring). e2e 63/63: /atlas page checks + axe, overflow at 4
    viewports (header wraps <=560px: 4 anchors overflowed 320px), switcher lists both designs,
    no mode toggle on /atlas, atlas form validation+success, motion-ON guards (switcher VT
    swap from /, hero mask offsets, contact statement after anchor glide, 6 card wipes,
    data-gl resolves on+canvas, zero console/page errors across the journey).
  - Legibility pass (PR #21): content sections are transparent over the globe, so small muted
    captions lost contrast over bright particles. Fixed in atlas.css with (1) a glyph-hugging
    text-shadow halo on all .atlas text (masked display lines get a tighter shadow so .a-mask
    overflow:hidden does not clip the glow) and (2) a feathered .a-section::before reading scrim
    (rgba(5,7,13,.58), z-index:-1 inside the section's z-1 context, pointer-events:none) that
    dims the field behind content; hero (.a-hero) is excluded and stays vivid. CSS-only, CSP
    hashes unchanged. The scrim alpha (0.58) is the single dial for globe dimness behind text.

- PHASE 3 (Signal) COMPLETE, merged to main (PR #22): clean, light, conversion-focused
  product design for SaaS/fintech/startups at /signal, light+dark (light default).
  - src/components/designs/signal/: Signal.astro shell ([data-signal] root, fixed CSS
    .s-field aurora/grid/sheen field, top .s-progress scroll bar) + Header (sticky, persistent
    "Start a project" CTA) / Hero (outcome-led headline "Ship the product. Move the metric.",
    dual CTA, an abstract decorative SVG "signal" panel — rising line over noise + bars, NOT a
    portfolio) / Manifesto ("Signal over noise") / Crafts (six offerings as a card grid,
    intelligent systems LAST) / Method (Define/Design/Build/Improve) / Studio / Contact
    (hardened Web3Forms clone, s-* ids) / Footer. Inter display+body, JetBrains Mono labels,
    indigo accent (#4f46e5 light / #818cf8 dark) on a cool canvas.
  - Dual-mode: tokens on .signal follow data-mode with a no-JS prefers-color-scheme dark
    fallback (Vitrine pattern, NOT Atlas's pinned-dark); toggle crossfades canvas + field.
    No three.js (clean+fast, Lenis+GSAP only) — distinct from Atlas's WebGL globe.
  - src/lib/signal-motion.ts: Atlas teardown contract copied minus the GL boot (Lenis 1.0,
    v-lenis, lagSmoothing restore, astro:before-swap teardown, anchor glide). Masked line
    reveals, hairline draws, left-to-right card wipes; s- data-attr vocabulary
    (data-s-fade/-hero-fade/-rule/-hero-rule/-lines/-card/-progress).
  - signal ready=true in designs.ts; switcher live at 3 designs. CSP: SignalContact's inline
    form script added hash 'sha256-11m7SNlo670...' to public/_headers (5 total).
  - Tests: tests/unit/signal-css.test.ts (containment invariant, dual-mode palette match,
    CSS<->motion gate sync incl. card clip string, field layer count, registry wiring). e2e
    87/87: /signal page audits + axe, overflow at 4 viewports, switcher lists all 3, mode
    toggle PRESENT (dual-mode), form validation+success, motion-ON guards (switcher swap
    atlas->signal, hero masks, contact statement after anchor glide, 6 card wipes, zero
    console errors). Light + dark verified by screenshot.

- PHASE 4 (Storefront) COMPLETE, merged to main: vivid, product-forward, tactile commerce
  design for e-commerce and DTC brands at /storefront, light-only.
  - src/components/designs/storefront/: Storefront.astro shell ([data-storefront] root, fixed
    CSS .f-field of warm gradient blobs + a halftone dot texture + sheen, top .f-progress scroll
    bar) + Header (DTC promo marquee bar + sticky nav, "Start a project" CTA with a bag mark) /
    Hero (outcome-led "Build a brand people buy into.", dual CTA, a tactile abstract "product
    card" panel that packages the studio, NOT a portfolio) / Manifesto ("Make it worth coming
    back for.") / Crafts (six offerings as a vivid "shelf" of product cards, Commerce first,
    intelligent systems LAST) / Method (Plan/Craft/Launch/Grow tinted step chips) / Studio /
    Contact (hardened Web3Forms clone, f-* ids) / Footer. Space Grotesk display, Inter body,
    JetBrains Mono price-tag labels, deep-coral CTAs over a warm cream canvas with
    coral/amber/mint/berry/blue/plum swatches.
  - Light-only: color-scheme pinned light (mirrors Atlas's pinned dark); themeLight = themeDark
    = #fff5ea so the browser chrome matches even on a dark system. No three.js (Lenis+GSAP only).
  - src/lib/storefront-motion.ts: signal-motion teardown contract copied exactly (Lenis 1.0,
    v-lenis, lagSmoothing restore, astro:before-swap teardown, anchor glide); f-* data-attr
    vocabulary (data-f-fade/-hero-fade/-rule/-hero-rule/-lines/-card/-progress). Masked line
    reveals, hairline draws, left-to-right card wipes.
  - storefront ready=true in designs.ts; switcher live at 4 designs. CSP: StorefrontContact's
    inline form script added hash 'sha256-PUQsfJGmJab6Vw3g7PVYTwCOIH0W2H/Jzox9T3SeQp8=' to
    public/_headers (6 total).
  - A11y note: vivid mid-tone fills cannot carry light/dark text at AA, so filled CTAs use a
    deep coral (--f-accent-strong #c8300d) with cream text, the step badges + "New in" sticker
    use tinted/amber chips with ink, and the promo bar uses ink over the coral-to-amber gradient.
  - Tests: tests/unit/storefront-css.test.ts (containment invariant, color-scheme light pin,
    CSS<->motion gate sync incl. card clip string, field layer count, registry wiring; light-only,
    no dual-mode block). e2e 110/110: /storefront audits + axe, overflow at 4 viewports, switcher
    lists all 4, NO mode toggle (light-only), form validation+success, motion-ON guards (switcher
    swap signal->storefront, hero masks, contact statement after anchor glide, 6 card wipes, zero
    console errors).

- NEXT: PHASE 5 (Practice). Warm, trust-first, credibility-led design for medical, dental, med
  spa, law, home services and trades. Route /practice, light-only (modes: ['light']). Reuse
  SiteLayout + the same motion teardown contract (gate on a [data-practice] root). Content =
  crafts + method (rule 7: NO portfolio), AI never leads, no em dashes, dead-simple written
  contact. Flip practice ready=true in designs.ts same PR. Add unit invariants + e2e blocks
  mirroring the prior designs (motion-on guards!). New inline scripts rotate CSP hashes
  (csp-hash.mjs + public/_headers same commit).

## Session gotchas (cost real time; read before working)
- scripts/serve-headers.mjs caches dist/_headers AT STARTUP: restart it after any rebuild that
  changes _headers, or e2e reports phantom CSP violations. Background servers get reaped: start
  via PowerShell Start-Process (detached) and verify with an HTTP HEAD before each e2e run.
- Astro INLINES small component scripts: editing them rotates CSP hashes (rebuild +
  scripts/csp-hash.mjs + public/_headers in the same commit).
- Review gate: after the reviewer passes, run review-mark set-result for EACH commit in its OWN
  Bash invocation right before the push (chained set-result && push does not stick).
- Verify reveal-gated UI with motion ON (assert computed offsets), never only under reduced
  motion: reduce disables the CSS hidden states and everything looks fine while broken.
- Production deploy is MANUAL (npm run deploy, human-gated): taranity.com still runs the OLD
  site until the user deploys.

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
- Each design = a self-contained single-page experience (hero, what/method, crafts, studio, contact
  as sections on one page; rule 7: never a work/portfolio section). Flagship (Vitrine) renders at `/`;
  others at `/atlas`, `/signal`, etc. Switcher links navigate between them and remember the choice.
- `src/lib/design-theme.ts` = system light/dark + stored override + after-swap re-apply + delegated
  controls. `src/components/DesignSwitcher.astro` = the fixed control (design list appears at 2+ ready).
- LEGACY CLEANUP DONE (design-everywhere PR, 2026-06-11): BaseLayout, Nav, Footer, Chrome,
  CommandPalette, ThemeSwitcher, Icon, old theme/motion/GL libs, global.css, config/themes.ts and
  config/about.ts are all DELETED. Every page (/, /privacy, /404, /og-preview) is on
  SiteLayout/Vitrine; subpages use `VitrinePage.astro` (header subpage variant + shared
  VitrineFooter, no motion runtime, no reveal attrs). Old routes redirect via public/_redirects
  (/about → /#studio, /contact → /#contact, /work and /projects/* → /). public/og.png is the
  Vitrine OG card (regen: screenshot /og-preview at 1200x630).
- Regen CSP hash (scripts/csp-hash.mjs to public/_headers) in the same commit as any inline-script
  change; RESTART scripts/serve-headers.mjs after _headers changes (it caches them at startup).
  three@0.184.0 already a dep (for Atlas).

## Process (worked well before)
Each design = its own reviewed PR. post-task-reviewer + CodeRabbit + GitGuardian; fix all findings;
the push gate keys on the commit short-hash (push to register, then
`node ~/.claude/hooks/review-mark.js set-result <hash> passed C H M`); auto-merge when CLEAN +
MERGEABLE + 0 unresolved threads; squash, delete branch, back to main. Verify: astro check + eslint +
vitest + build + dev-browser screenshot each design; trivy if deps change. Never commit to main.

## Local preview (the assistant's background servers get reaped; run it yourself)
`npm run preview -- --port 4340` then open http://localhost:4340. serve-headers.mjs honors a PORT env.

## To resume in a new session
Say: "Continue the Taranity redesign. Read REDESIGN-PLAN.md, we are on main, build Practice
(Phase 5) next." Then it has everything it needs.

Ready designs so far: Vitrine (`/`), Atlas (`/atlas`), Signal (`/signal`), Storefront (`/storefront`).
Build order remaining: Practice, then Raw.
