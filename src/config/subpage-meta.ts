/**
 * Per-design theme-colour + LCP font preloads for the NON-Vitrine subpage routes
 * (privacy, journal). Each value mirrors that design's home entry page in src/pages/
 * so a subpage's browser chrome and font loading match its home. Kept in one place so
 * the privacy and journal variant routes can't drift from each other.
 *
 * Vitrine is intentionally absent: it keeps the canonical /privacy, /journal, and
 * /journal/<slug> routes with its own bespoke shell and theme.
 */
export interface SubpageMeta {
  themeLight: string;
  themeDark: string;
  /** LCP-critical fonts to preload, matching the design's home page. */
  fonts: string[];
}

// `satisfies` (not a `: Record<string, …>` annotation) keeps the keys as a literal union
// so `keyof typeof subpageMeta` ties the per-route SHELLS maps to these exact designs.
export const subpageMeta = {
  atlas: {
    themeLight: '#05070d',
    themeDark: '#05070d',
    fonts: ['/fonts/space-grotesk-latin-var.woff2', '/fonts/inter-latin-var.woff2', '/fonts/jetbrains-mono-latin-400.woff2'],
  },
  signal: {
    themeLight: '#f5f7fc',
    themeDark: '#0a0f1d',
    fonts: ['/fonts/inter-latin-var.woff2', '/fonts/jetbrains-mono-latin-400.woff2'],
  },
  storefront: {
    themeLight: '#fff5ea',
    themeDark: '#fff5ea',
    fonts: ['/fonts/space-grotesk-latin-var.woff2', '/fonts/inter-latin-var.woff2', '/fonts/jetbrains-mono-latin-400.woff2'],
  },
  practice: {
    themeLight: '#f6f1e6',
    themeDark: '#f6f1e6',
    fonts: ['/fonts/fraunces-latin-var.woff2', '/fonts/inter-latin-var.woff2', '/fonts/jetbrains-mono-latin-400.woff2'],
  },
  raw: {
    themeLight: '#efeee8',
    themeDark: '#0a0a0b',
    fonts: ['/fonts/jetbrains-mono-latin-700.woff2', '/fonts/jetbrains-mono-latin-400.woff2'],
  },
} satisfies Record<string, SubpageMeta>;
