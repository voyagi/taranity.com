# HUMAN-TODO — taranity.com

Only the things a human must do. The site **runs, builds, and is fully reviewable today** with
zero secrets (demo mode). Each item below swaps a demo fallback for the real thing — the build
does not block on any of them.

## 1. Accounts & keys (free tiers)

- [ ] **Web3Forms access key** — create one (no account needed) at https://web3forms.com →
      enter your email → copy the access key. Set it as `PUBLIC_WEB3FORMS_KEY`, a **Pages secret**
      (Production): the form now submits server-side through `functions/api/contact.ts`, so the key
      stays off the client. **(Already set.)** With no Turnstile sitekey configured (e.g. local dev)
      the form simulates sending instead.
- [ ] **Cloudflare Turnstile (bot protection)** — a widget is wired into all six contact forms and
      verified and delivered server-side by the `functions/api/contact.ts` Pages Function. Two values activate it:
      (1) `PUBLIC_TURNSTILE_SITEKEY` — the **public** site key, needed at *build* time (it is passed
      on the deploy command, or add it to `.env`); (2) `TURNSTILE_SECRET_KEY` — the **secret** key,
      set as an encrypted Secret on the Pages project (Workers & Pages → taranity → Settings →
      Variables and Secrets → Production). Without the site key the widget does not render (demo mode);
      the form keeps working. The secret never goes in the repo or the client bundle.
- [ ] **Plausible** — add the `taranity.com` site at https://plausible.io (or self-host).
      Set `PUBLIC_PLAUSIBLE_DOMAIN=taranity.com`. Until set, no analytics script is injected.
- [ ] **Cal.com or Calendly** — create an event type, copy your booking URL, set
      `PUBLIC_BOOKING_URL`. Until then the "Book a call" buttons point to `/contact`.

## 2. Identity / content to confirm (I inferred these — sanity-check)

- [ ] **Identity (confirmed)** — the site is now an honest **studio** ("we" voice), brand and
      legal entity = **Taranity**, founder = **Taran** (used only in the Organization `founder`
      structured data, not as a public byline). Adjust in `src/config/site.ts` if any of this is off.
- [ ] **Bio / origin story** — `src/config/about.ts` tells the studio's origin in the "we" voice
      (NL-based, Fontys, automation → full digital stack). Confirm the facts or send your version.
- [ ] **Project metrics** — every case study has a measurable number. The genuinely-known ones
      (e.g. Claude Code Ecosystem: 50+ hooks / 30+ skills) are real; the **unverified estimates**
      are marked `// VERIFY` in `src/content/projects.ts` and the percentage tiles now show a `~`
      (e.g. `~95%`, `~70%`) so they don't read as hard fact. **Replace with your real figures and
      drop the `~`** once you have them.
- [ ] **Social URLs** — GitHub is set to `voyagi`; confirm and add real LinkedIn / X / email in
      `src/config/site.ts` (placeholders are clearly marked).
- [ ] **Resume/CV PDF** (optional) — drop a `public/taran-cv.pdf` to light up the "Download CV"
      action in the command palette (hidden until the file exists).

## 3. Open Graph image

- [ ] **`public/og.png` is now stale** — its source (`src/pages/og-preview.astro`) was updated to
      the new studio copy ("If you can describe it, we build it."), but the committed PNG still shows
      the old portfolio copy. Regenerate it: `npm run dev`, open `/og-preview`, screenshot at
      1200×630 → overwrite `public/og.png` (keep the dimensions). Or swap in a custom image.

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

- [ ] There is now an honest **`/privacy`** page disclosing every data flow (Web3Forms for the
      contact form, cookieless Plausible, Cloudflare hosting). The GitHub "Currently" data is now
      fetched at build time, so no visitor request hits GitHub. It's accurate and a strong starting
      point — have it reviewed for your jurisdiction before launch and confirm controller details.
      No cookies are set.
- [ ] **Processor agreements / data residency (GDPR).** Confirm DPAs and EU data handling with the
      third parties the site uses: Web3Forms (form delivery), Plausible (prefer the EU-hosted/
      self-host option), and Cloudflare (hosting/edge logs). These are account/legal-level, not code.

## 5b. Security (post-attack-pass — optional edge tweaks)

- [ ] Security headers + a strict CSP ship via `public/_headers` (Cloudflare Pages applies them
      automatically). Nothing required, but in the Cloudflare dashboard you can additionally enable
      **HSTS preload** and submit the domain at hstspreload.org once you're confident on HTTPS-only.
- [ ] If you change any inline/component script, regenerate the CSP script hashes with
      `node scripts/csp-hash.mjs` and paste them into `public/_headers` (the e2e suite fails loudly
      if they drift, so you won't ship a broken CSP by accident).

## 6. Known contradiction (resolved, FYI)

- Your brand brief makes **glassmorphism** the core aesthetic, while my global design rules ban
  generic glassmorphism. I followed **your** brief and built glassmorphism as a deliberate,
  layered, original system (depth + grain + holographic edges + real hierarchy), not the lazy
  frosted-card cliché. Nothing for you to do — just so you know it was a conscious choice.
