/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// Side-effect CSS imports from variable-font packages (no bundled .d.ts).
declare module '@fontsource-variable/inter';
declare module '@fontsource-variable/space-grotesk';

interface ImportMetaEnv {
  readonly PUBLIC_WEB3FORMS_KEY?: string;
  readonly PUBLIC_PLAUSIBLE_DOMAIN?: string;
  readonly PUBLIC_BOOKING_URL?: string;
  readonly PUBLIC_GITHUB_USERNAME?: string;
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
