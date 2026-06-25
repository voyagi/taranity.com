# Contact Security Fix Plan

Created: 2026-06-25

## Goal

Fix all confirmed contact-form security and reliability findings:

- Server-side payload and field limits.
- Turnstile `action` and `hostname` validation.
- Turnstile widget reset after failed submissions.
- Production-safe behavior when Turnstile site key is missing.
- Rename the server-only Web3Forms key away from the `PUBLIC_` prefix.

## Implementation Plan

1. Create a safe working branch.
   - Branch from current `main` before code changes: `fix/contact-hardening`.
   - Keep existing untracked `.agents/` untouched.

2. Harden `functions/api/contact.ts`.
   - Rename env binding from `PUBLIC_WEB3FORMS_KEY` to `WEB3FORMS_ACCESS_KEY`.
     - Do not keep `PUBLIC_WEB3FORMS_KEY` in `src/env.d.ts`.
     - Update tests to use `WEB3FORMS_ACCESS_KEY`.
     - Record the required Cloudflare Pages runtime env rename in `VERIFICATION.md`
       because the deployed function will fail closed until the Pages secret is
       renamed there too.
   - Add request/field limits before forwarding:
     - Define named constants in the function, and use the same values in tests:
       `MAX_BODY_BYTES = 16_384`, `MAX_NAME_CHARS = 100`,
       `MAX_EMAIL_CHARS = 150`, `MAX_MESSAGE_CHARS = 3000`,
       `MAX_SUBJECT_CHARS = 120`, `MAX_TURNSTILE_TOKEN_CHARS = 2048`.
     - Reject excessive or invalid `Content-Length` before `request.formData()`
       when the header is present. Treat this as a cheap pre-parse guard, not
       the only control.
     - Enforce max lengths server-side for `name`, `email`, `message`,
       `subject`, and Turnstile token after parsing. This is the authoritative
       app-level guard because a direct POST can bypass HTML `maxlength`.
     - Keep current min-message and email checks.
     - Do not claim this fully prevents a platform-level large multipart parse
       when `Content-Length` is missing; Cloudflare/platform request limits still
       bound that case. The app fix is field-size rejection plus best-effort body
       preflight.
   - Validate Turnstile response fields:
     - Require `success === true`.
     - Require `action === "turnstile-spin-v1"`.
     - Require `hostname` in `TURNSTILE_ALLOWED_HOSTNAMES`, defaulting to
       `taranity.com,www.taranity.com` if the env var is absent.
     - Parse `TURNSTILE_ALLOWED_HOSTNAMES` as a comma-separated list of exact,
       lowercased hostnames. No substring matching and no wildcard matching.
     - Tests should mock Siteverify responses with `hostname: "taranity.com"`;
       do not weaken production validation just to support tests.
   - Keep upstream URLs fixed and timeout-wrapped.

3. Centralize the duplicated contact-form runtime before changing behavior.
   - Add a shared helper such as `src/lib/contact-form.ts`.
   - Each design passes only selectors/copy/classes that differ:
     - form selector, status selector, submit button selector, submit label
       selector, field-row selector, field-invalid selector, success-panel
       selector, sending label, retry label, demo delay, and direct-email
       fallback.
   - The helper owns all security-sensitive behavior:
     - hardcoded POST target `/api/contact`;
     - client validation;
     - Turnstile explicit render;
     - stored widget ID from `turnstile.render(tsEl)`;
     - reset after failed real submit;
     - DEV-only demo success behavior.
   - Keep design components responsible only for markup and styling. This
     removes the current six-copy bug surface.

4. Fix client retry behavior through the shared helper.
   - Store the widget ID returned by `turnstile.render(tsEl)`.
   - On any failed real submit, call `window.turnstile.reset(widgetId ?? tsEl)`
     before re-enabling submit.
   - Also reset before retry when the server returns `verification-failed`,
     `verify-unreachable`, or any non-success response; the client does not need
     to distinguish provider causes.
   - Do not add global callback names unless necessary. If adding
     `expired-callback`/`error-callback`/`timeout-callback`, keep them inside the
     helper and test that they do not create new globals.

5. Remove false success in production when the site key is missing.
   - In the shared helper, use `import.meta.env.DEV` as the only condition that
     permits no-widget demo success.
   - In production and preview builds (`import.meta.env.PROD === true`), if no
     Turnstile widget exists, do not call `showSuccess()`. Show an error that
     points to the fallback email.
   - Keep the visible "Demo mode" note rendered only when no site key exists;
     it is acceptable in dev, but production submit behavior must still fail
     visibly rather than claim delivery.

6. Update docs and config examples.
   - Change `.env.example` from `PUBLIC_WEB3FORMS_KEY` to `WEB3FORMS_ACCESS_KEY`.
   - Update comments in `functions/api/contact.ts` and README references if present.
   - Add `TURNSTILE_ALLOWED_HOSTNAMES=taranity.com,www.taranity.com` to
     `.env.example` as optional runtime config, documented as exact hostnames.
   - Keep `PUBLIC_TURNSTILE_SITEKEY` public; it is correctly public.
   - Search `src`, `functions`, `tests`, `.env.example`, `README.md`, and `dist`
     after build for `PUBLIC_WEB3FORMS_KEY`; expected result is no production
     source or built-client references.

7. Add tests.
   - Unit tests for rejecting oversized fields and oversized `Content-Length`.
     - Include tests for name, email, message, subject, and Turnstile token.
     - Include a test that missing `Content-Length` still enforces parsed field
       lengths.
   - Unit tests for rejecting Siteverify action mismatch.
   - Unit tests for rejecting Siteverify hostname mismatch.
   - Unit test for accepting the expected action/hostname.
   - Unit test that `WEB3FORMS_ACCESS_KEY` is required and forwarded.
   - Because Vitest currently runs in `node` environment, do not add a new DOM
     test dependency just for this fix. Add static/runtime-structure tests that:
     - all six contact components import/use the shared helper;
     - no contact component contains its own duplicated `fetch('/api/contact')`
       submit flow after the helper migration;
     - the helper contains `turnstile.reset`;
     - the helper gates demo success on `import.meta.env.DEV`;
     - no source file except migration notes references `PUBLIC_WEB3FORMS_KEY`.
   - If the existing e2e browser works locally, add one browser assertion that a
     mocked failed submit re-enables the form and resets the Turnstile widget.
     If `dev-browser` still fails to launch, keep this as a documented tooling
     limitation rather than adding fragile unrun coverage.

8. Verify.
   - Run `npm run check`.
   - Run `npm test`.
   - Run `npm run lint`.
   - Run `npm run build`.
   - Run `npm audit --json`.
   - Run Semgrep if available: `semgrep --config auto --json --exclude node_modules --exclude dist --exclude coverage .`.
   - Search built output after `npm run build`: `rg -n "PUBLIC_WEB3FORMS_KEY|WEB3FORMS_ACCESS_KEY|access_key" dist`.
     - `access_key` may appear only if server function bundles are emitted into
       build artifacts; it must not appear in browser-delivered HTML/JS.
   - Try `npm run e2e`; if `dev-browser` still fails to launch, record that separately and do not block the code fix on the local browser tooling failure.

## Expected Outcome

- Direct POSTs cannot bypass client field limits.
- Turnstile validation is tied to this form and hostname.
- Users can retry failed sends without reloading.
- Missing production Turnstile config fails visibly instead of losing messages.
- Server-only Web3Forms credential no longer carries Astro's client-public prefix.
