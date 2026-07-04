# ADR 0001 - Technology stack

- **Status:** Accepted
- **Date:** 2026-06-08
- **Context:** BUILD pass 1 of 5 for taranity.com, a portfolio whose #1 requirement is design +
  motion ceiling (Awwwards-grade) with green Core Web Vitals on a mid-range Android.

## Decision

Build a **static Astro 6** site styled with **Tailwind v4**, animated with **GSAP +
ScrollTrigger + SplitText** synced to **Lenis** smooth scroll. Deploy to **Cloudflare Pages** (serve `dist/`, no
adapter). Cookieless analytics (**Plausible**; amended 2026-07 to **Cloudflare Web
Analytics**, see the Analytics row), **Web3Forms** for the contact form (amended 2026-07:
submitted through a Pages Function that holds the key server-side, see the Contact row), and
no booking link (amended 2026-07: the Cal.com/Calendly link was dropped - written contact
only, see the Booking row).

The user named this stack explicitly; research confirmed it is the right one rather than just
accepting it.

## Why each choice

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Astro 6 (static)** | Ships ~0 JS by default → maximum budget for animation JS. Islands let us hydrate only the cursor/command-palette/hero. Native `ClientRouter` View Transitions give SPA-feel page morphs while staying multi-page + SEO-friendly. The reference Awwwards portfolios (Stas Bondar, Joffrey Spitzer) use exactly Astro + GSAP + Lenis. |
| Styling | **Tailwind v4** | `@theme` design tokens, fast iteration, tiny shipped CSS. v4's CSS-first config keeps the token system in one file. |
| Animation | **GSAP + ScrollTrigger + SplitText** | 100% free incl. premium plugins since Webflow's 2025 acquisition (verified June 2026). Only GSAP can do pinned, scrubbed, snapped horizontal galleries reliably across browsers. SplitText (now smaller + a11y-aware) drives the kinetic hero. |
| Smooth scroll | **Lenis** | 2-3 KB, the de-facto standard (Darkroom Engineering), works with CSS `position: sticky` and GSAP pinning. Synced to GSAP's ticker so ScrollTrigger stays frame-accurate. |
| 3D | **Three.js (WebGL), Atlas design only** | The brief listed Three.js as *optional* 3D. Most designs get their depth purely in CSS (radial glows + grain/scanline + engineered glass) to keep the JS budget lean and CWV green; the **Atlas** design ships a real Three.js WebGL scene, gated so it falls back cleanly where WebGL is unavailable. |
| Hosting | **Cloudflare Pages** | Free unlimited bandwidth, global sub-50ms edge, first-class static Astro support. Static needs **no adapter** - Astro 6 prerenders straight to `dist/` (the v6 Cloudflare-adapter+static deploy bug is avoided by staying adapter-free). |
| Analytics | **Cloudflare Web Analytics** (amended 2026-07; originally Plausible, whose cloud tier is paid-only) | ~1 KB, free, cookieless, no consent banner needed (GDPR-friendly for an EU audience). |
| Contact | **Web3Forms via a Pages Function** (amended 2026-07; originally a **public** access key in a hidden field, until a security review moved it server-side) | No account; the `/api/contact` Pages Function verifies the Turnstile token, then POSTs to `api.web3forms.com/submit` with a server-held `WEB3FORMS_ACCESS_KEY` secret. 250 free submissions/month. The site stays static apart from this one function. |
| Booking | **Dropped** (amended 2026-07; originally a Cal.com/Calendly link) | Hard rule since the redesign: written contact only, no booking (`src/config/site.ts`). |

## Alternatives considered

- **Next.js / SvelteKit / Nuxt** - rejected: an 85-120 KB React/SSR runtime competes with the
  animation budget, and React's reconciliation fights GSAP's direct DOM writes (dropped frames).
  No app-like state here justifies a framework runtime.
- **Framer Motion / native CSS scroll-driven animations only** - CSS scroll-timelines are used
  where they're free (compositor-thread parallax/reveals), but a pinned + scrubbed + snapped
  horizontal gallery needs GSAP ScrollTrigger.
- **Cloudflare adapter (SSR)** - rejected: nothing needs server rendering; static is faster,
  cheaper, and dodges the known v6 adapter+static deploy bug.
- **Formspree** - viable equal alternative to Web3Forms; Web3Forms chosen for its no-account
  flow (originally a public key, moved server-side 2026-07, see the Contact row). Swappable
  via one Pages secret.
- **Google Analytics** - rejected: cookies + consent banner + weight, against the brief.

## Consequences

- Analytics and the Turnstile widget are configured via `PUBLIC_*` env vars with safe
  fallbacks, so the site builds and is reviewable with **zero secrets in the repo**; real
  contact sends additionally need two server-side Pages secrets (`TURNSTILE_SECRET_KEY`,
  `WEB3FORMS_ACCESS_KEY`) read at runtime by the contact function (amended 2026-07).
- Animation code must be defensively gated (reduced-motion, touch, View-Transition teardown) and
  must only animate `transform`/`opacity` to protect INP/CLS on mobile.
- Deploy is a human step (account + domain + DNS).
