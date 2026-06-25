/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_PLAUSIBLE_DOMAIN?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_TURNSTILE_SITEKEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Cloudflare Turnstile injects `window.turnstile` once its api.js loads. Typed
// here so the contact forms' explicit render/reset calls stay type-safe (no `any`).
interface Window {
  turnstile?: {
    render: (container: string | HTMLElement, params?: Record<string, unknown>) => string | undefined;
    reset: (widget?: string | HTMLElement) => void;
    remove: (widget?: string | HTMLElement) => void;
  };
}
