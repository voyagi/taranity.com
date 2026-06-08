# ROADMAP — taranity.com

Phased build. Each phase is a coherent, committable slice. The per-phase loop
(spec → design → build → prove → harden) is applied in spirit; artifacts are produced even where
the full GSD agent swarm is skipped (see assumption A8 in the BUILD-SPEC).

Legend: ✅ done this pass · 🔜 later pass · 👤 human-only

---

## Phase 0 — Foundations & design language ✅
- Verify stack facts; ADR 0001.
- DESIGN-SYSTEM.md: brand, color system, type scale, spacing rhythm, motion language, component
  specs, copy voice.
- Install GSAP / ScrollTrigger / SplitText, Lenis, Three.js.
- Full token system in CSS (background depth, glass, holographic edges, glow, grain, scanline,
  fluid type scale, spacing rhythm, focus ring).
- Motion runtime: Lenis ↔ GSAP ticker sync, central `motion.ts` with reduced-motion + touch
  gating, ScrollTrigger lifecycle on View-Transition navigations.

## Phase 1 — Site shell ✅
- BaseLayout: complete SEO (title/desc/canonical/OG/Twitter), JSON-LD Person, Plausible,
  font preloading, theme-color, skip-link.
- Global nav (sticky, glass, active state, mobile menu) + footer.
- Custom morphing cursor (desktop, pointer:fine only; hidden under reduced-motion).
- Command palette (⌘/Ctrl+K) — fuzzy nav + actions, full keyboard a11y.
- Custom 404.

## Phase 2 — Content model ✅
- `site.ts` (profile, socials, nav, CTAs, env-driven config).
- `projects.ts` upgraded to full case studies: Problem → Solution → Result, metrics, stack,
  role, timeline, links, accent.
- About story + skills + timeline data.

## Phase 3 — Home ✅
- Kinetic SplitText hero + holographic backdrop + scanline/grain.
- Positioning statement, featured-3 projects, **Currently** widget (GitHub activity + local time
  + current project, demo fallback), single centered CTA. Scroll-reveal choreography.

## Phase 4 — Work gallery ✅
- `/work` horizontal-scroll pinned gallery with snap points (desktop); vertical stacked-card
  fallback (mobile / reduced-motion). Card → case-study View Transition (shared element).

## Phase 5 — Case studies ✅
- `/projects/[slug]` full Problem→Solution→Result with measurable outcomes, stack/role/timeline,
  metric tiles, prev/next, shared-element transition back to gallery.

## Phase 6 — About + Contact ✅
- `/about` origin story, skills matrix, timeline, languages, values.
- `/contact` Web3Forms form (client validation + honeypot + success/error states) + booking CTA.

## Phase 7 — SEO / perf / a11y / deploy-readiness ✅
- `@astrojs/sitemap`, robots.txt, OG image, JSON-LD per page type.
- Responsive sweep (mobile/tablet/desktop, no horizontal scroll), WCAG 2.1 AA, perf budget.
- Cloudflare Pages config + exact deploy steps (HUMAN-TODO for the actual deploy).
- Build + screenshot every page (desktop + mobile) into `design/`.

## Later passes (not this build)
- 🔜 Phase 2 stretch: AI project chatbot ("ask my portfolio").
- 🔜 Optional Three.js hero scene (WebGL/WebGPU) beyond the lightweight canvas backdrop.
- 🔜 Lighthouse-on-real-device + field CWV after deploy.
- 🔜 Real project metrics swapped in for grounded estimates (👤 user supplies numbers).

## Human-only
- 👤 Web3Forms access key, Plausible account, Cal.com/Calendly link, domain + Cloudflare deploy,
  real social URLs, confirm bio/name/metrics. See HUMAN-TODO.md.
