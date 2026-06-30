# Deploying taranity.com

The site is a static Astro build on **Cloudflare Pages** with Pages Functions
(`functions/_middleware.ts` for the in-place design switch, `functions/api/contact.ts`,
`functions/switch.ts`).

## How deploys happen

Deploys are **git-driven**. Push or merge to `main` and Cloudflare Pages builds and
deploys automatically:

1. Cloudflare clones the repo.
2. Runs the build command (`npm run build` -> `astro build` -> `dist/`).
3. Uploads `dist/` + the `functions/` directory and serves it at `taranity.com`.

There is no manual deploy command. Pull-request branches get their own automatic
preview deployment, so you never need `wrangler pages deploy` for a preview either.

## CRITICAL: the Pages build command must stay set

The Cloudflare Pages project (Workers & Pages -> taranity -> Settings -> Build) MUST have:

- **Build command:** `npm run build`
- **Output directory:** `dist`

This lives in the Cloudflare dashboard, not in the repo - git-connected Pages projects
do not read the build command from a committed config file, so it cannot be version
controlled here.

If the build command is ever blank, Cloudflare **skips `astro build` entirely**, keeps
the `functions/` upload, and re-serves a stale snapshot of whatever was last built. That
is exactly what happened on 2026-06-30: the per-design subpages (`/atlas/journal/`,
`/atlas/privacy/`, ...) silently 404'd, so the design switch fell back to Vitrine on every
subpage while the homepage still switched. See the project memory
`taranity-cf-pages-no-build-command` for the full incident.

## Verify after every deploy

```sh
npm run verify:deploy
```

`scripts/verify-deploy.mjs` smoke-tests the live site (override the host with
`VERIFY_BASE`): all theme routes resolve, legacy paths still redirect, and the design
switch serves each of the five non-Vitrine designs in place on `/journal` and `/privacy`
plus a journal article (the article slug is discovered from the live index, not hardcoded).
A non-zero exit means the live site does not match the latest build - the same failure the
build-command bug produced.

## Open follow-up: automated divergence signal

`verify:deploy` is currently a manual check, which is why the build-command bug went
unnoticed for a while. The durable fix is to wire it into the read-only live-health monitor
(in the `general-claude` workspace) so a broken live deploy raises a Telegram alert without
anyone remembering to run it. Until then, run `verify:deploy` after any deploy you are
unsure about.
