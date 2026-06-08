# DESIGN-SYSTEM — taranity.com

The original design language. Locks brand, color, type, space, surface, motion, components, and
copy voice **before** building, so every page is one coherent thing rather than a stack of
templates. Upstream research: [DESIGN-BRIEF.md](./DESIGN-BRIEF.md).

---

## 0. The concept — "Operator Console"

Taran builds automation and AI tooling: systems that run themselves and report back. So the
portfolio is presented as **the operator console of the person who builds operator consoles.**
Not a brochure about him — a live interface *he* would ship.

That single idea drives every decision and is what keeps the site off the generic-AI-portfolio
treadmill:

- A persistent **HUD frame** (thin glowing corner brackets + a fixed status rail) wraps the
  viewport, like a heads-up display. It is the signature you recognize in a screenshot.
- **Telemetry typography** — monospace micro-labels (section index `02 / WORK`, coordinates,
  status `● ONLINE`, build hash) decorate the layout the way a real console annotates a screen.
- The **Currently widget** (live commit + current project + local time) is treated as the
  console's primary readout, not a footer gimmick — it *proves* the "systems that report back"
  thesis on the home page.
- Motion reads as **boot / initialize / scrub**, never "fade up because the template did."

If a section could be dropped onto any other portfolio unchanged, it's wrong — it must look like
part of *this console*.

---

## 1. Wordmark

- `taranity` set in **Space Grotesk**, weight 700, tight tracking (`-0.03em`), lowercase.
- The dot of the domain is rendered as a small **cyan status node** (`●`) that softly pulses
  (motion-gated): `taranity` + glowing dot. The pulse = "system online."
- In the nav it's prefixed by a monospace `~/` to read like a shell prompt: `~/ taranity ●`.
- Never stretched, rotated, or gradient-filled. The glow lives on the dot only.

---

## 2. Color system

Near-black foundation, two-stop holographic accent, disciplined text ramp. Pure `#000` is never
used (it kills depth and crushes the grain).

### Tokens (CSS custom properties, see `src/styles/global.css`)

| Token | Value | Role |
|---|---|---|
| `--color-bg-void` | `#070709` | Page base (deepest) |
| `--color-bg-primary` | `#0A0A0C` | Default surface bg |
| `--color-bg-elevated` | `#0F172A` | Raised sections / deep-space gradient stop |
| `--color-bg-glass` | `rgba(255,255,255,0.045)` | Glass panel fill |
| `--color-glass-border` | `rgba(255,255,255,0.10)` | Glass hairline |
| `--color-glass-border-strong` | `rgba(255,255,255,0.18)` | Hover / focus hairline |
| `--color-accent-cyan` | `#22D3EE` | Primary accent (links, focus, primary action) |
| `--color-accent-cyan-bright` | `#67E8F9` | Hover / glow peak |
| `--color-accent-violet` | `#8B5CF6` | Secondary accent |
| `--color-accent-violet-bright`| `#A78BFA` | Hover / glow peak |
| `--grad-holo` | `linear-gradient(135deg,#A78BFA,#22D3EE)` | The holographic edge/text gradient |
| `--color-text-primary` | `#F4F6FB` | Headlines & primary copy (≈ white, never grey) |
| `--color-text-secondary` | `#9AA7BD` | Body secondary |
| `--color-ink-faint` | `#7C8597` | Telemetry labels, captions (~5:1, AA) |
| `--color-text-on-accent` | `#04121A` | Text on cyan fills |
| `--color-success` | `#34D399` | Form success, "online" node |
| `--color-danger` | `#FB7185` | Form errors |

### Accent discipline (this is what separates it from "purple SaaS gradient")

- The violet→cyan gradient appears **only** on: the wordmark dot glow, one or two hero accent
  words, active HUD brackets, and metric numbers. Never on full-bleed backgrounds, never behind
  centered hero text. Backgrounds are near-black with *light* (glow), not color washes.
- Cyan is the single interactive color — every link, focus ring, and primary button is cyan, so
  "what's clickable" is learnable in one glance.
- Violet is structural/decorative (edges, secondary data viz), never the primary CTA.

### Contrast (WCAG 2.1 AA verified targets)

- `text-primary #F4F6FB` on `bg-primary #0A0A0C` → ~17:1 (AAA).
- `text-secondary #9AA7BD` on `bg-primary` → ~7.5:1 (AAA for normal text).
- `ink-faint #7C8597` (telemetry labels, captions) → ~5:1, passes AA even at the small mono
  label size.
- `accent-cyan #22D3EE` on `bg-primary` → ~9:1; cyan link text passes AA comfortably.
- Buttons use `text-on-accent #04121A` on cyan → ~9:1.

---

## 3. Typography

Three families, three jobs. The contrast between a humanist sans body and a monospace "system"
voice is a core part of the operator-console identity.

| Family | Role | Notes |
|---|---|---|
| **Space Grotesk** (variable) | Display / headlines | Tight tracking, large sizes, occasional gradient accent word |
| **Inter** (variable) | Body / UI | Optical sizing on, `font-feature-settings: 'cv11','ss01'` for cleaner digits |
| **JetBrains Mono** | Telemetry / code / data | All micro-labels, metrics units, nav indices, command palette, code blocks |

### Fluid type scale (`clamp`, see tokens `--fs-*`)

| Step | Min → Max | Use |
|---|---|---|
| `display` | 2.75rem → 7.5rem | Hero headline |
| `h1` | 2.25rem → 4rem | Page titles |
| `h2` | 1.75rem → 2.75rem | Section titles |
| `h3` | 1.25rem → 1.6rem | Card / sub heads |
| `body-lg` | 1.05rem → 1.25rem | Lead paragraphs |
| `body` | 1rem → 1.0625rem | Default copy |
| `label` | 0.75rem → 0.8125rem | Mono telemetry (uppercase, `letter-spacing: 0.18em`) |

Rules: line-height 1.05–1.1 on display, 1.6 on body. Max measure 68ch. Headlines may use
`text-wrap: balance`; paragraphs `text-wrap: pretty`. Hyphenation off.

---

## 4. Space, grid, breakpoints

- **8px base rhythm.** Spacing tokens step `4,8,12,16,24,32,48,64,96,128`.
- Section vertical rhythm: `--space-section: clamp(5rem, 12vh, 9rem)`.
- Content column max `1240px`; reading column max `68ch`; full-bleed sections allowed for the
  gallery and hero backdrop.
- A faint **dot/grid underlay** (8px grid, ~3% opacity) is visible at section edges — it reads as
  graph paper / a console substrate and reinforces the HUD concept without shouting.
- Breakpoints (Tailwind defaults): `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Layout is
  mobile-first; the horizontal gallery and custom cursor are **desktop + pointer:fine only**.
- **No horizontal overflow ever** except the intentional pinned gallery track.

---

## 5. Surfaces & depth

Four-layer depth model so glass reads as *engineered*, not slapped on:

1. **Void** — page background `--color-bg-void`, with a single large radial violet→cyan glow
   (very low opacity) anchored off-canvas top-right.
2. **Grain + scanline overlay** — fixed, `pointer-events:none`, `mix-blend-mode: overlay`, ~4%
   grain (SVG `feTurbulence` data-URI) + 2px scanline gradient at ~2.5% opacity. Adds analog
   texture; disabled under reduced-motion is unnecessary (it's static) but reduced on mobile.
3. **Glass panels** — `background: --color-bg-glass; backdrop-filter: blur(14px) saturate(140%)`,
   1px `--color-glass-border` top-lit hairline, 16–24px radius. On hover: border →
   `-strong`, plus a holographic edge (conic/`--grad-holo`) fades in at 1px.
4. **Glow** — interactive elements get `--shadow-glow-cyan` on focus/hover only; never ambient
   (ambient glow everywhere = the cliché we're avoiding).

`backdrop-filter` fallback: where unsupported, glass degrades to a solid `#0E1118` panel (still
readable — honors the global "never transparent-unreadable" rule).

---

## 6. Iconography

- **Custom 1.5px line icons**, geometric, drawn as inline SVG (a small set: arrow, command,
  external, mail, calendar, github, x/twitter, linkedin, terminal, snap-dots, close, search).
- 24px grid, `currentColor`, round caps. They inherit text color and the cyan accent on hover.
- **No emoji as UI.** No icon fonts. Decorative "nodes" (status dots, snap points) are CSS, not
  glyphs.

---

## 7. Motion language

Principle: **motion is diegetic** — it should feel like a system initializing and responding, and
must never cost layout or jank. Only `transform` + `opacity` animate.

### Signature moves

- **Boot reveal** — on first load, the HUD brackets draw in and a one-line mono status types
  (`initializing console…` → `● online`) for ~600ms, then content reveals. Skipped instantly
  under reduced-motion and on repeat visits within a session.
- **SplitText hero** — headline reveals per-character with a small `y`+`rotateX` and cyan→white
  color settle; one word carries the holographic gradient.
- **Scrubbed horizontal gallery** — `/work` pins and scrolls cards horizontally with snap points,
  GSAP ScrollTrigger synced to Lenis.
- **Shared-element transition** — a project card's title + frame morph into the case-study header
  via the View Transitions API (`transition:name` per slug).
- **Magnetic cursor** — custom cursor lerps toward interactive elements and morphs to a labeled
  ring (`VIEW`, `OPEN`, `⌘K`) on hover targets.
- **Scroll reveals** — `ScrollTrigger.batch` staggered fades for cards/sections, compositor-only.

### Discipline

- `gsap.matchMedia()` gates: full desktop set / reduced mobile set / near-zero for
  `prefers-reduced-motion`.
- Lenis ↔ GSAP ticker sync; ScrollTrigger killed + recreated on `astro:page-load` so View
  Transitions don't leak triggers.
- Durations 0.3–0.8s, eases `power2/3.out` and `expo.out`; nothing loops ambiently except the
  ~2s wordmark-dot pulse (motion-gated).
- Reduced-motion: no transforms, no scrub, no cursor, no boot; content is simply present.

---

## 8. Components (specs)

- **HUD frame** — fixed corner brackets (cyan, 1px, ~28px arms) + a top-right status rail showing
  `● online · {local time}`. Subtle; sits above content, `pointer-events:none` except the rail.
- **Nav** — sticky glass bar: `~/ taranity ●` left; `work · about · contact` center-right with
  mono `0x` indices; right: `⌘K` chip + cyan "Book a call" button. Active route underlined with a
  holographic 1px rule. Mobile: full-screen glass sheet, staggered link reveal.
- **Button (primary)** — solid cyan, `text-on-accent`, 12px radius, mono uppercase label with a
  trailing arrow that nudges on hover; focus ring offset cyan.
- **Button (ghost)** — transparent, glass hairline border → holographic on hover.
- **Project card** — glass panel, top: mono index + tags; mid: title (Space Grotesk) + one-line
  outcome; bottom: primary metric (gradient number) + `OPEN →`. Hover: lift 4px, holographic
  edge, cursor → `OPEN`.
- **Metric tile** — big gradient number (JetBrains Mono), mono unit + label below. Count-up on
  reveal (motion-gated).
- **Currently widget** — glass console block: line 1 `● status / local time` (live);
  line 2 `now building → {current project}`; line 3 `last push → {repo} · {relative time}`
  (GitHub public events, demo fallback). Mono throughout, cyan live values.
- **Command palette** — centered glass modal, mono input with `>` prompt, grouped results
  (Navigate / Projects / Actions / Social), arrow-key nav, `↵` hint, fuzzy match, focus-trapped,
  `Esc` closes, opens on `⌘/Ctrl+K` or the nav chip.
- **Form field** — label (mono uppercase) + glass input, cyan focus ring, inline error in
  `--color-danger` with `aria-describedby`; success → console-style confirmation panel.
- **Footer** — mono sitemap, socials, `built with astro · gsap · lenis` credit line, a final
  repeat of the single CTA, and a tiny build stamp.

---

## 9. Copy voice

Confident, technical, specific, a little dry-witted. Talks about **outcomes and systems**, never
"passionate about clean code." No "Hello, I'm…". Active voice, concrete numbers, short lines.

Real strings used on the site (not placeholders):

- Hero: **"I automate what slows you down."** / sub: *"Full-stack developer & automation
  architect. I build the AI tooling and workflows that delete your busywork — then prove it with
  numbers."*
- Positioning: *"I turn manual, repetitive, error-prone work into systems that run themselves —
  and report back when they're done."*
- CTA (everywhere, one per section): **"Book a call"** / **"Start a project →"**
- Currently: `now building →` · `last push →` · `● online`
- 404: **"404 — route not found."** / *"That path isn't on the map. The console's still online."*
  + `cd ~ →` back-home action.
- Empty/offline (Currently): *"telemetry offline — here's what I shipped recently instead."*

---

## 10. Accessibility commitments

- WCAG 2.1 AA contrast (see §2); visible cyan focus ring on **every** interactive element;
  logical tab order; skip-to-content link.
- All motion behind `prefers-reduced-motion`; the site is fully usable and attractive with zero
  animation.
- Command palette and mobile menu are focus-trapped, `Esc`-closable, ARIA-labeled.
- Custom cursor never replaces the real cursor on touch or for keyboard users; pointer events and
  hit targets are unchanged (≥ 44px touch targets).
- Semantic landmarks (`header/nav/main/article/section/footer`), one `h1` per page, alt text on
  all meaningful imagery, form labels + error association.

---

## 11. Anti-template checklist (banned → what we did instead)

| Banned | Our move |
|---|---|
| Generic gradient hero + centered text | Left-aligned kinetic SplitText hero inside the HUD frame, with a live telemetry rail and a console backdrop — asymmetric, annotated |
| Default Inter/Roboto, no hierarchy | 3-family system with a distinct mono "system voice"; 7-step fluid scale |
| Purple/blue SaaS gradient washes | Near-black + *light*; the gradient is rationed to dots/edges/numbers only |
| Lazy glassmorphism | 4-layer depth model: void glow + grain/scanline + engineered glass (top-lit hairline, holographic hover edge, solid fallback) |
| Emoji as icons | Custom 1.5px line-icon set, inline SVG |
| Stock-photo soup | No photos of strangers; visuals are generated console/data motifs + real project framing |
| Cookie-cutter card grid | Horizontal pinned scrubbed gallery with snap + shared-element morph to case study |
| Lorem / AI-tell copy | Real, specific, outcome-led copy with measurable numbers (§9) |

> Self-critique gate before each page ships: *"Could this screen be lifted onto another portfolio
> unchanged?"* If yes — add the console identity (HUD, telemetry labels, the rationed accent) until
> the answer is no.
