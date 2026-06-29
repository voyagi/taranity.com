# Brief: in-place design switching (no URL change)

This is the implementation brief for re-architecting the design switcher. A Claude session
opened in this repo should read it, **plan and get sign-off before implementing**, then
build it incrementally.

## What we want

A visitor can switch between the site's design languages **in place**: no URL change, and
they stay on the page they're on (including journal articles). Today, switching a design is
a navigation to that design's route (`/atlas`, etc.) and the journal article only exists in
the flagship (Vitrine) design, so switching from an article drops the visitor on the design's
home page. We want to fix both: stay on the same content, and never change the address.

## Study these first (current architecture)

- `src/config/designs.ts` - registry of 6 designs (vitrine, atlas, signal, storefront,
  practice, raw). Each is a FULL, structurally distinct experience (own layout, type,
  motion), rendered at its own route: vitrine at `/`, the others at `/<id>`.
- `src/components/designs/<id>/` - each design's components (e.g. AtlasHero uses a Three.js
  canvas). Designs ship their own motion runtimes (GSAP/Three/Lenis) via
  `src/lib/<id>-motion.ts` and `src/lib/atlas-gl.ts`.
- `src/layouts/SiteLayout.astro` - shared head/SEO/JSON-LD; sets `data-design` on `<html>`;
  renders `<DesignSwitcher>`; runs a no-flash pre-paint inline script (CSP-hashed) that
  resolves light/dark mode + design before first paint.
- `src/components/DesignSwitcher.astro` - the floating switcher. Pills are `<a>` links to
  each design's ROUTE (`hrefFor()`). It special-cases `/privacy` to stay on privacy, but
  every other page (incl. journal articles) falls back to the design's HOME route. That is
  the "jumps to home" bug.
- `src/lib/design-theme.ts` - client runtime: stores chosen design + mode in localStorage,
  toggles light/dark, re-applies after Astro View Transitions (`astro:after-swap`). Today,
  switching design is a NAVIGATION.
- `src/pages/[design]/privacy.astro` - privacy exists in ALL designs (design-agnostic
  content in `PrivacyContent.astro` wrapped by each design's subpage shell, styled via
  `.subpage-body` / Vitrine's `.v-page`). This is the existing pattern for "the same content
  in every design."
- Journal: `src/content/journal/*.md` + `src/pages/journal/{index,[slug]}.astro` - these
  render ONLY in Vitrine. There is no per-design journal yet.
- `astro.config.mjs` - `output: 'static'`, `@astrojs/sitemap`, prefetch. `public/_headers` -
  STRICT CSP (`script-src 'self'` + SHA-256 of each inline script; regenerate with
  `node scripts/csp-hash.mjs` if you add or modify any inline script).

## Hard requirements

1. Switching design must NOT change the URL.
2. The visitor stays on the same content, re-skinned in the chosen design.
3. Works on every page type: home, journal index, journal article, privacy, 404.
4. Persists site-wide (localStorage/cookie) and across navigations.
5. No flash of the wrong design on first paint (keep the existing pre-paint approach).
6. Light/dark toggle keeps working.
7. CSP stays strict: no `'unsafe-inline'` for scripts; hash any new inline script.
8. Accessibility preserved (switcher labels, `aria-current`, keyboard, focus).
9. SEO: ONE canonical URL per piece of content regardless of design. No duplicate-content
   across design variants. Update canonical + sitemap accordingly.
10. PERFORMANCE IS A HARD CONSTRAINT. This studio's whole pitch is speed (see
    `/journal/website-speed-conversions`). Do NOT ship all six designs' markup + motion
    runtimes (Three.js, GSAP) on every page. Per-page weight must stay close to a single
    design.

## Approaches to evaluate (recommend one after a spike; report the tradeoffs)

**A) Client-side render-all + toggle visibility**, (re)init the active design's motion on
switch. Simplest conceptually but likely blows requirement 10 (6x payload, Three.js
everywhere). Probably only viable if designs were lightweight, which they are not.

**B) Cookie + Cloudflare Pages edge rewrite (likely best).** Keep static per-design builds; a
Pages Function serves the cookie-selected design's prebuilt HTML at the canonical URL WITHOUT
changing it. Switch = set the design cookie + reload the same URL (no URL change), or for an
instant swap, fetch the current path's other-design HTML from an internal path and replace
the DOM + re-init motion. Keeps single-design payload. Cost: build each page in each design
(incl. journal x6 and privacy x6), the edge rewrite keyed on the cookie, and canonical /
sitemap discipline.

**C) Unify all designs onto one shared semantic DOM and make each design pure CSS** (+
progressive JS). Lightest payload and cleanest in-place switch, but requires rewriting all
six designs to share one structure, which may erase what makes each distinct. Likely too
costly.

Recommendation: spike B on the homepage first; prove no-URL-change + no-flash + acceptable
Lighthouse, then decide.

## Sub-task you WILL hit: the journal must exist in every design

The journal article renders only in Vitrine. For in-place switching to work on an article,
the article must render in every design's subpage shell, exactly how privacy already does.
Plan to render the journal collection content inside each design's subpage shell and style
the journal-specific elements per design (today they are Vitrine-only: `.v-journal*`,
`.v-page*`, the FAQ block, kicker, lead, listing). Keep the article body design-agnostic (one
source of truth).

## Process

1. Start in PLAN MODE. Produce a short plan: chosen approach + why, the perf + SEO tradeoffs,
   file-by-file work, and how you'll verify. Get sign-off BEFORE building.
2. Spike the chosen approach on ONE page; show it works (no URL change, no flash, Lighthouse
   numbers).
3. Implement incrementally with the repo's review/deploy gates; keep commits atomic.
4. Verify: no URL change on switch (every page type); stays on same content; no first-paint
   flash; light/dark still works; CSP intact (no console violations); Lighthouse perf NOT
   regressed vs today; canonical/sitemap correct; a11y (keyboard + screen reader) intact.

If approach B or C cannot meet requirement 10 without heavy cost, SAY SO and reconsider scope
(e.g. in-place skinning only for the light content sub-pages, and keep navigation for the
heavy showcase homepage). Flag every tradeoff against speed so it is a shared decision.

## Out of scope / keep working

- The journal content, drip schedule, AI-visibility (robots.txt + `/llms.txt`), and the
  `heroImage` field are already shipped. Do not regress them.
- Studio brand rules still apply to any user-facing copy: studio "we" voice, no personal
  byline, no em dashes.
