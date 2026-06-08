# HUMAN-TODO — taranity.com

Only the things a human must do. The site **runs, builds, and is fully reviewable today** with
zero secrets (demo mode). Each item below swaps a demo fallback for the real thing — the build
does not block on any of them.

## 1. Accounts & keys (free tiers)

- [ ] **Web3Forms access key** — create one (no account needed) at https://web3forms.com →
      enter your email → copy the access key. Put it in `.env` as `PUBLIC_WEB3FORMS_KEY`.
      Until then the contact form runs in demo mode (validates + shows a success state but does
      not send). The key is a *public* value (hidden form field), not a secret.
- [ ] **Plausible** — add the `taranity.com` site at https://plausible.io (or self-host).
      Set `PUBLIC_PLAUSIBLE_DOMAIN=taranity.com`. Until set, no analytics script is injected.
- [ ] **Cal.com or Calendly** — create an event type, copy your booking URL, set
      `PUBLIC_BOOKING_URL`. Until then the "Book a call" buttons point to `/contact`.

## 2. Identity / content to confirm (I inferred these — sanity-check)

- [ ] **Display name** — I used **"Taran"** (from your email `atfyigtaran@…` + the `taranity.com`
      domain) with **"Taranity"** as the brand. Replace in `src/config/site.ts` if wrong.
- [ ] **Bio / origin story** — `src/config/about.ts` contains a real, specific story I wrote from
      context (NL-based, Fontys, automation path). Confirm the facts or send me your real version.
- [ ] **Project metrics** — every case study has a measurable number. The genuinely-known ones
      (e.g. Claude Code Ecosystem: 50+ hooks / 30+ skills) are real; others are **grounded
      estimates** marked `// VERIFY` in `src/content/projects.ts`. Replace with your real figures.
- [ ] **Social URLs** — GitHub is set to `voyagi`; confirm and add real LinkedIn / X / email in
      `src/config/site.ts` (placeholders are clearly marked).
- [ ] **Resume/CV PDF** (optional) — drop a `public/taran-cv.pdf` to light up the "Download CV"
      action in the command palette (hidden until the file exists).

## 3. Open Graph image

- [ ] A generated OG image is committed at `public/og.png` (1200×630, on-brand). If you want a
      photo or a different layout, replace that file (keep the dimensions).

## 4. Deploy (Cloudflare Pages — I cannot do this on your account)

1. [ ] Push is already on `github.com/voyagi/taranity.com`.
2. [ ] Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick
       `voyagi/taranity.com`.
3. [ ] Build command: `npm run build` · Output dir: `dist` · Framework preset: **Astro**.
4. [ ] Add the `PUBLIC_*` env vars from section 1 in the Pages project settings.
5. [ ] **Custom domain** → add `taranity.com`; move DNS to Cloudflare (free) — SSL is automatic.
6. [ ] After first deploy, run Lighthouse / PageSpeed on the live URL and check field CWV.

(Alternatively, one-off deploy from your machine: `npm run build` then
`npx wrangler pages deploy dist --project-name taranity`.)

## 5. Legal

- [ ] If you collect contact-form data, the privacy note at `/contact` is a sensible default —
      review it for your jurisdiction (EU/GDPR). No cookies are set; Plausible is cookieless.

## 6. Known contradiction (resolved, FYI)

- Your brand brief makes **glassmorphism** the core aesthetic, while my global design rules ban
  generic glassmorphism. I followed **your** brief and built glassmorphism as a deliberate,
  layered, original system (depth + grain + holographic edges + real hierarchy), not the lazy
  frosted-card cliché. Nothing for you to do — just so you know it was a conscious choice.
