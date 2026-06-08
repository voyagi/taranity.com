# PROJECT — taranity.com

A studio site that is itself proof of skill. Positions **Taranity** as a digital studio that
builds anything digital — AI systems, apps, websites, and the automation underneath them.
Voice is the studio's "we" (Taranity is a small, honest studio — no fabricated team).

## North-star

Convert a fast-skimming visitor (hiring manager or prospective client) into a **contact or
booking**, and be good enough that other developers pass it around.

## Who it's for

| Priority | Audience | What they need in the first 10 seconds |
|---|---|---|
| 1 | Hiring managers / technical recruiters | "What do they build, and is the craft real?" → instant clarity + one-click contact |
| 2 | Freelance / consulting clients | Proof of measurable outcomes + a frictionless way to book a call |
| 3 | Fellow developers | Peer-credible craft, awards-circuit polish |

## What it is

Multi-page Astro site that feels like a single-page app via the View Transitions API, but stays
fully SEO-friendly (server-rendered static HTML per route).

- `/` — kinetic hero, positioning, 3 featured projects, a live **Currently** widget, one CTA
- `/work` — horizontal-scroll pinned project gallery with snap points
- `/projects/[slug]` — case study: Problem → Solution → Result, with measurable numbers
- `/about` — background, skills, the automation origin story
- `/contact` — Web3Forms form (validation + success/error) + booking link
- `/404` — on-brand error state
- Cross-cutting: command palette (⌘/Ctrl+K), custom morphing cursor, cookieless analytics,
  full `prefers-reduced-motion` + touch/mobile fallbacks

## Design language (one line)

Dark **operator-console** glassmorphism with holographic violet→cyan edges, film-grain + scanline
texture, Space Grotesk display / Inter body / JetBrains Mono data — futuristic, technical,
confident, never "Hello, I'm…". Full spec in [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md).

## Stack (why in [docs/adr/0001-stack.md](./docs/adr/0001-stack.md))

Astro 6 (static) · Tailwind v4 · GSAP + ScrollTrigger + SplitText · Lenis · Cloudflare Pages ·
Plausible · Web3Forms · Cal.com/Calendly link.

## Success criteria (acceptance)

- Core Web Vitals green on a mid-range Android — LCP < 2.5s, CLS < 0.1, INP < 200ms
- Hero JS < ~36 KB gzip; full-site JS < ~150 KB
- Every project framed Problem→Solution→Result with ≥ 1 measurable number
- One obvious centered CTA per section; contact/booking ≤ 1 click from anywhere
- Lighthouse ≥ 90 on Performance / Accessibility / Best-Practices / SEO; WCAG 2.1 AA
- Awwwards-submittable; holds up beside Stas Bondar, Dennis Snellenberg, Cyd Stumpel, Corentin
  Bernadou
- A recruiter understands the offer in < 10 seconds

## Non-goals

No backend / DB / auth / CMS / login. The AI project-chatbot is a **phase-2 stretch**, not this
build. No real deploy, DNS, or account creation (human-only — see HUMAN-TODO.md).

## Status

This repo is in **BUILD pass 1 of 5** (build → verify → attack → refine → sign-off). See the
STATUS LEDGER in `C:\Users\Eagi\projects\_build-specs\BUILD-SPEC-taranity-com.md`.
