# Taranity.com Rework — Hardened Plan

Status: **planning approved-direction, build deferred** (user: "we can work on this later").
Compiled 2026-06-08 after adversarial review (steelman + peer-review). Every finding below
is folded into the plan. This doc is the source of truth — re-read it before building.

## Locked decisions (from the user)
1. **Honest solo studio.** Taranity presents as a small digital studio. Voice = "we" (the
   studio), founder story told truthfully, **no fabricated team/headcount**. Legal entity name =
   **Taranity**.
2. **Multi-design theme switcher.** Three designs, each in **light + dark**, visitor-switchable:
   - `aurora` — bright maximalist + lazy WebGL hero (**default**, default mode = light)
   - `console` — the existing Operator Console (default mode = dark)
   - `world` — full WebGL world (default mode = dark; opt-in / heaviest)
3. **Positioning:** lead with **"If you can describe it, we build it."** — a studio building AI
   tooling, apps, websites, and automation; no brief too hard. Keep proof-with-numbers.
4. **Deferred follow-ups:** real `// VERIFY` metrics and the OG image — user will provide later.

## North-star guardrail (do not lose this)
PROJECT.md's goal is unchanged: convert a fast-skimming hiring manager / client into a
**contact or booking in < 10 seconds**. Spectacle serves that goal; it never overrides it.

---

## CORE ARCHITECTURE (the decisions the reviews forced)

### A1 — One semantic DOM for all designs *(steelman ①, Critical)*
**All three designs share ONE semantic HTML tree.** A "design" = a token set + optional
*additive* decoration/canvas layers mounted on top. **No design may require different content
markup.** The WebGL `world` = the same content + a fullscreen `<canvas>` backdrop + remapped
motion, NOT a separate site. This preserves static SSR, SEO, one content source, and CWV.

### A2 — Semantic token tier *(peer-review Ⓕ, Important — the keystone)*
Introduce a semantic layer that every component references; themes remap only the semantics:
`--surface`, `--surface-raised`, `--text`, `--text-dim`, `--text-faint`, `--accent`,
`--accent-on` (text on accent), `--line`, `--focus`, `--selection`, `--scrollbar`.
- Components reference **only** semantics — never raw `--color-cyan` / `--color-void`.
- Refactor existing literal refs first (e.g. `index.astro` `.band-label { color: var(--color-cyan) }`,
  all `--color-cyan`/`--color-void` component refs).
- Raw palette tokens (`--color-cyan`, …) remain as *inputs* that themes map into semantics.

### A3 — AA contrast contract, enforced as built *(steelman ③ + peer-review Ⓑ, Important)*
Every theme defines its semantics so that **all** text/surface pairings meet WCAG 2.1 AA
(≥4.5:1 body, ≥3:1 large/UI). Validate **per design×mode as it is built**, not in a final audit.
The two danger combos — `console-light` and bright-neon `aurora-dark` — get checked first.
`color-scheme` and `<meta theme-color>` are part of each mode's contract (fixes native form
controls / scrollbars / browser chrome in light mode).

### A4 — Switch lifecycle: navigation, not in-place surgery *(steelman ② + peer-review Ⓐ, Critical)*
Default approach: **drive design/mode changes through an Astro View-Transition navigation**
(e.g. apply attribute → trigger a VT swap) so every design boots clean — no stale ScrollTrigger
pins, no double Lenis, no SplitText revert bugs. Feels instant, sidesteps in-place re-init.
- Persist on first paint via a **synchronous** `<head>` init script (pre-paint, no FOUC).
- Re-apply stored theme on **`astro:after-swap`** (View Transitions swap in static HTML that
  carries the *default* attribute — must re-apply or it flashes back).
- Extend teardown to **all** motion (ScrollTrigger **and Lenis** and WebGL contexts), not just
  WebGL. If a true in-place swap is ever needed, it must run the full kill→rebuild→`refresh()`.

### A5 — Storage safety + honesty *(peer-review Ⓓ, Important)*
`try/catch` every `localStorage` access with an in-memory fallback (private mode / lockdown
throws). Add a one-line **localStorage disclosure** to `/privacy` (the page currently advertises
cookieless — a stored theme preference must be disclosed to stay GDPR-honest).

### A6 — Completeness gate *(steelman ④, Important)*
The switcher lists **only fully-built, AA-passing** design×mode cells via a `ready` flag in
`themes.ts`. Partial work never appears as a selectable option (honors the [Known-Wrong Paths]
rule — never ship a path known to be broken).

### A7 — WebGL / dependency logistics *(steelman ⑤ + peer-review Ⓔ, Important)*
- Add Three.js **lazily** (dynamic import), only for the *active* WebGL design.
- Pin an **aged stable** `three` version — respect `min-release-age=3`, **never bypass**.
- Confirm `three` needs no `'unsafe-eval'` (GLSL compiles on the GPU, not JS eval) before wiring CSP.
- Regenerate CSP script hashes (`scripts/csp-hash.mjs` → `public/_headers`) **in the same commit**
  that adds the inline theme-init script, or e2e/CI goes red.
- Per-design JS budget: default `aurora` first paint stays CSS (WebGL enhances after load) to keep
  full-site initial JS within the ~150KB PROJECT.md budget; `world`'s heavier weight loads only
  when the visitor selects it.

### A8 — Legibility & fallback gate *(steelman ⑥, Important)*
Message hierarchy (**headline → proof → CTA**) always dominates effects. The reduced-motion /
mobile / corporate-laptop **fallback must convert on its own** and still look like a deliberate,
beautiful static composition — not a dead version of the animated one. The <10s-clarity test is
an acceptance gate for every design. "Studio" copy sets honest right-size expectations (boutique,
not big-agency).

---

## Requirements (EARS) — updated
- **R1** The site shall offer a visible switcher to pick any *ready* design and toggle light/dark.
- **R2** When a visitor picks a design/mode, it shall apply via a clean View-Transition swap and
  persist across visits and across in-app navigation.
- **R3** While a choice is stored, it shall apply before first paint (no flash) and re-apply on
  `astro:after-swap`.
- **R4** The default shall be `aurora` + `light`, bright, with scroll-reactive moving elements.
- **R5** The site shall ship 3 designs, each in light **and** dark, each meeting WCAG 2.1 AA.
- **R6** If the device is touch/mobile or prefers-reduced-motion, it shall serve a lightweight,
  still-beautiful fallback that converts standalone (no heavy WebGL, calmer motion).
- **R7** All copy + structured data shall present Taranity as a studio ("we"), no fabricated team;
  JSON-LD = Organization (+ founder Person).
- **R8** Positioning shall lead with "If you can describe it, we build it." across AI systems, apps,
  websites, and automation.
- **R9** No unverified-estimate metric shall be presented as hard fact.
- **R10** While any motion/WebGL is active, switching designs shall fully tear it down (ScrollTrigger
  + Lenis + GPU context) with no leaks.
- **R11** The **default** design shall keep CWV green (LCP<2.5s, CLS<0.1, INP<200ms) and Lighthouse ≥90.
- **R12** Every component shall reference semantic tokens only; no raw palette token in component CSS.
- **R13** Storage access shall be crash-safe (try/catch + in-memory fallback) and disclosed in /privacy.

## Build phases (each = its own green PR on a feature branch; never commit to main)
- **Phase A — Messaging + studio reframe** (content/SEO only, lowest risk, do first):
  `site.ts`, `about.ts`, `projects.ts`, page copy; "I/Taran"→"we"; Person→Organization JSON-LD;
  soften/flag `// VERIFY` metrics; `/privacy` controller = Taranity.
- **Phase B — Token refactor + theme foundation:** semantic token tier (A2), refactor components
  off literal tokens (A2), `themes.ts` registry with `ready` flags (A6), FOUC-free init +
  `astro:after-swap` re-apply (A4), `color-scheme`/`theme-color` per mode (A3), storage safety +
  privacy line (A5), CSP hash regen same-commit (A7), `ThemeSwitcher.astro` wired into nav + ⌘K,
  `console` design re-expressed via semantics (pixel-identical). Brand assets (favicon/icons/
  theme-color) refreshed; OG flagged (peer-review Ⓒ).
- **Phase C — Aurora design (new default):** bright light + neon dark token sets meeting AA;
  living aurora/gradient background, oversized kinetic type, scroll-reactive parallax (CSS+GSAP);
  reduced-motion static composition (A8).
- **Phase D — Aurora WebGL hero:** lazy `three` shader/3D hero reacting to mouse + scroll velocity;
  DPR-capped; mobile/reduced-motion → CSS fallback; clean teardown (A4/A7/R10).
- **Phase E — Full WebGL world** (stretch, heaviest, own pass): additive fullscreen canvas backdrop
  over the shared DOM (A1) + curated mobile 2D fallback; opt-in so it never touches default CWV.
- **Phase F — Polish + sign-off:** complete + AA-validate every design×mode, a11y (switcher
  keyboard/SR, focus, contrast per cell), CWV/Lighthouse on default, bounded e2e (one page per
  design×mode + switcher persistence + reduced-motion), final CSP, trivy, VERIFICATION update.

## Verification (maps to requirements)
- **V1 [R1,R2,R3]** dev-browser: switch every *ready* design/mode, reload + in-app nav → persists,
  no flash, `astro:after-swap` holds.
- **V2 [R4,R8]** default load = aurora light + new headline (snapshot).
- **V3 [R5,R6,R10]** every cell reachable + AA; mobile/reduced-motion fallback converts; no RAF/GPU
  leak after switching off WebGL.
- **V4 [R7,R9]** grep: no first-person/team claims; JSON-LD validates Organization; no `// VERIFY`
  shown as fact.
- **V5 [R11]** Lighthouse ≥90 + CWV green on default design specifically.
- **V6 [R12]** grep components for raw `--color-` refs → none outside the theme token maps.
- **V7 [R13]** storage disabled → no crash, in-memory fallback works; /privacy mentions localStorage.
- **V8** `npm run build`, `astro check`, `eslint`, `vitest`, `e2e` green; `trivy fs .` after adding three.

## Findings ledger (12 — all resolved above)
Steelman: ①→A1 · ②→A4 · ③→A3 · ④→A6 · ⑤→A7 · ⑥→A8.
Peer-review: Ⓐ→A4 · Ⓑ→A3 · Ⓒ→Phase B brand assets · Ⓓ→A5 · Ⓔ→A7 · Ⓕ→A2.
