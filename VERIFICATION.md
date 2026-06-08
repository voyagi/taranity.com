# VERIFICATION — taranity.com (PROVE pass, 2 of 5)

Independent verification that the site actually works, with pasted evidence. Date: 2026-06-08.
Branch: `feat/portfolio-build-pass-1`. Verified against the **production build** served by
`astro preview` on `http://localhost:4321`.

## Summary

| Check | Tool | Result |
|---|---|---|
| Build | `astro build` | ✅ PASS — 14 routes + sitemap |
| Typecheck | `astro check` | ✅ PASS — 0 errors / 0 warnings / 0 hints |
| Lint | `eslint .` | ✅ PASS — 0 problems |
| Unit tests | `vitest run` | ✅ PASS — 23/23 |
| Coverage | `vitest --coverage` | ✅ PASS — logic layer 100% lines (scope note below) |
| E2E + a11y | dev-browser + axe-core | ✅ PASS — 49/49 checks |
| Lighthouse | `lighthouse` (mobile) | ✅ PASS — every page ≥ 90 on all 4 categories |
| Responsive | dev-browser viewports | ✅ PASS — no horizontal overflow at 390 / 820 / 1440 |
| Console errors | dev-browser | ✅ PASS — no first-party errors (see GitHub note) |
| Links / images | dev-browser | ✅ PASS — 12/12 internal links < 400; all images load |
| Forms | dev-browser | ✅ PASS — validation + success state |
| 404 | dev-browser | ✅ PASS — HTTP 404 + custom page |

**Net: every required check is green.** Two fixes were made during this pass (a focus-scoped
Escape bug in the command palette; five minor a11y refinements) and re-verified. One residual is
an environment artifact, not a defect (GitHub public-API rate-limit — see below).

> **Note on Playwright:** this environment blocks raw Playwright by policy
> (`permissions.deny: Bash/PowerShell(*playwright*)` + a `block-playwright` hook). The e2e suite
> therefore runs through **dev-browser** — the sanctioned CLI, which exposes the same Playwright
> `Page` API under a Rust/QuickJS harness — with **axe-core** injected via CDN for the a11y scan.
> Script: [scripts/e2e.devbrowser.js](scripts/e2e.devbrowser.js).

---

## 1. Build

```text
$ npm run build
14 page(s) built in 3.13s
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
Complete!
=== BUILD EXIT: 0 ===
```

Routes built: `/`, `/work`, `/about`, `/contact`, `/404`, `/og-preview`, and
`/projects/{claude-code-ecosystem,cortex,callcatch,dev-browser,mcp-server,n8n-automation,ai-chatbot,fontys-schedule}`.

## 2. Typecheck

```text
$ npm run check   # astro check
Result (28 files):
- 0 errors
- 0 warnings
- 0 hints
=== CHECK EXIT: 0 ===
```

## 3. Lint

```text
$ npm run lint    # eslint .
(no output — 0 problems)
=== LINT EXIT: 0 ===
```

ESLint flat config: `@eslint/js` + `typescript-eslint` + `eslint-plugin-astro`. Fixed during this
pass: a triple-slash-reference rule scoped off for `*.d.ts`, a ternary-as-statement, and an unused
catch binding.

## 4. Unit tests + coverage

```text
$ npm run coverage   # vitest run --coverage
 Test Files  3 passed (3)
      Tests  23 passed (23)

 % Coverage report from v8
--------------|---------|----------|---------|---------|
File          | % Stmts | % Branch | % Funcs | % Lines |
--------------|---------|----------|---------|---------|
All files     |   97.67 |    82.14 |     100 |     100 |
 lib/gh.ts    |   95.65 |    72.22 |     100 |     100 |
--------------|---------|----------|---------|---------|
=== EXIT: 0 ===
```

**Coverage scope (honest):** unit coverage targets the **logic + data layer** that can run in
Node — `gh.ts` (the GitHub "Currently" parser, incl. mocked-fetch success/4xx/empty/offline
branches), plus data-integrity and config-sanity assertions over `content/projects.ts`,
`config/site.ts`, and `config/about.ts`. The browser-runtime modules (`motion.ts`, `cursor.ts`,
`commandPalette.ts`) require a DOM and are exercised by the **e2e suite** below, not unit tests —
so they are intentionally excluded from the unit-coverage denominator rather than padding it.

Test files: [tests/unit/gh.test.ts](tests/unit/gh.test.ts),
[tests/unit/projects.test.ts](tests/unit/projects.test.ts),
[tests/unit/config.test.ts](tests/unit/config.test.ts).

## 5. E2E + accessibility (dev-browser + axe-core)

49 checks across the 5 key pages + 404 + interactions + 3 breakpoints. Full pasted run:

```text
$ npm run e2e
PASS  home: HTTP 200  -- status=200
PASS  home: exactly one non-empty h1  -- ["I automate what slows you down."]
PASS  home: has <title>  -- Taranity — I automate what slows you down
PASS  home: no first-party console/page errors  -- clean (benign 3rd-party: [{api.github.com ... 403}])
PASS  home: all <img> load
PASS  home: axe no serious/critical  -- []
PASS  work: HTTP 200 ... exactly one non-empty h1 ... title ... no errors ... images ... axe []
PASS  about: HTTP 200 ... h1 ... title ... no errors ... images ... axe []
PASS  contact: HTTP 200 ... h1 ... title ... no errors ... images ... axe []
PASS  case-study: HTTP 200 ... h1 ["Cortex"] ... title ... no errors ... images ... axe []
PASS  internal links resolve (<400)  -- [] of 12
PASS  404: returns HTTP 404  -- status=404
PASS  404: shows custom "route not found" copy
PASS  command palette: opens on Ctrl+K  -- data-open=true
PASS  command palette: closes on Escape  -- data-open=false
PASS  contact: empty submit shows inline errors  -- ["Tell me your name.","I need an email to reply.","A sentence or two, please (10+ chars)."]
PASS  contact: valid submit shows success panel (demo mode)
PASS  mobile  / /work /about /contact: no horizontal overflow   (scrollW == innerW == 390)
PASS  tablet  / /work /about /contact: no horizontal overflow   (scrollW == innerW == 820)
PASS  desktop / /work /about /contact: no horizontal overflow   (scrollW == innerW == 1440)

==== SUMMARY: 49/49 checks passed ====
ALL E2E CHECKS PASSED
=== E2E EXIT: 0 ===
```

**axe-core (WCAG 2.0/2.1 A + AA):** zero serious/critical violations on all five pages.

Visual evidence (rendered, motion on) in [design/verify/](design/verify/):
`e2e-palette-open.png`, `e2e-contact-success.png`, `e2e-work-desktop-motion.png`,
`e2e-home-mobile-motion.png`. Full-page desktop+mobile shots of every page are in
[design/](design/).

## 6. Lighthouse (mobile emulation, vs production build)

Target: ≥ 90 on Performance / Accessibility / Best-Practices / SEO.

```text
$ npx lighthouse <url> --only-categories=performance,accessibility,best-practices,seo (mobile, headless)

Page     Perf   A11y   Best-Practices   SEO
----     ----   ----   --------------   ---
home      91    100         96          100
work      94    100        100          100
about     93    100        100          100
contact   93    100        100          100
cortex    94    100        100          100
```

✅ All pages clear 90+ on every category. Accessibility is 100 everywhere after this pass's fixes.

## Fixes made this pass

1. **Command palette did not close on Escape** (real bug). The Escape handler was bound to the
   palette element, so it only fired when focus was inside it. Moved to a document-level handler
   so Escape always closes regardless of focus. ([src/lib/commandPalette.ts](src/lib/commandPalette.ts))
2. **A11y: heading order** — `/work` and `/about` jumped `h1 → h3`. Added visually-hidden section
   `h2`s (`.sr-only`). (work.astro, about.astro, global.css)
3. **A11y: label-in-name** — the `⌘K` chip's `aria-label` now includes the visible "⌘K"; removed
   the project-card `aria-label` so its rich visible text becomes the accessible name.
   (Nav.astro, ProjectCard.astro)
4. **Lint** — triple-slash-reference rule off for `*.d.ts`; ternary-as-statement → if/else; unused
   catch binding removed.

## Known residuals (not defects)

- **Home Best-Practices = 96** and the only "console error" anywhere: GitHub's unauthenticated
  public-events API returned **HTTP 403** to the "Currently" widget. This is **rate-limiting of
  this automation IP** (the endpoint was hit many times across build/verify passes); GitHub allows
  60 unauthenticated req/hr/IP. The widget **handles it gracefully** — it falls back to the curated
  "recently shipped" line, no UI breakage — and a fresh visitor on their own IP normally gets a
  200/304. The browser auto-logs any 4xx response at the network layer, which JS cannot suppress;
  the e2e gate correctly scopes this to a benign third-party failure. Not a site defect.
- **Performance 91–94** (mobile): comfortably above target. Headroom remains (eager GSAP bundle,
  font swap) and is logged for the refine pass; not required for this pass.

## Environment / human blockers

None blocked verification. Real-device field Core Web Vitals and a Lighthouse run against the live
HTTPS deployment require the human deploy (Cloudflare Pages) — see HUMAN-TODO.md. Everything above
was verified locally against the real production build with zero secrets.
