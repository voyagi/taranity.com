/**
 * Theme registry — the single source of truth for the style switcher.
 *
 * A "design" is a complete visual language (a set of semantic tokens, defined in
 * global.css per [data-design][data-mode]). Each design supports light + dark.
 * Only designs flagged `ready` are offered in the switcher (REWORK-PLAN A6 — never
 * expose a half-built theme). The synchronous pre-paint init script in BaseLayout
 * duplicates the defaults below as literals; keep the two in sync.
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeDesign {
  id: string;
  /** Switcher label. */
  label: string;
  /** One-line descriptor shown in the switcher. */
  blurb: string;
  /** Mode shown first when this design is selected with no stored mode. */
  defaultMode: ThemeMode;
  /** Only `true` designs are selectable; partial work stays hidden. */
  ready: boolean;
}

export const designs: ThemeDesign[] = [
  {
    id: 'aurora',
    label: 'Aurora',
    blurb: 'Bright, living gradients in motion.',
    defaultMode: 'light',
    ready: true,
  },
  {
    id: 'console',
    label: 'Operator Console',
    blurb: 'Dark, holographic, telemetry-grade.',
    defaultMode: 'dark',
    ready: true,
  },
  {
    id: 'world',
    label: 'World',
    blurb: 'A 3D crystal field you move through.',
    defaultMode: 'dark',
    ready: true,
  },
];

export const readyDesigns = designs.filter((d) => d.ready);

/** Applied when the visitor has no stored preference (and as the inline-script fallback).
 *  DEFAULT_MODE follows the default design's preferred mode, so promoting a new
 *  default design (e.g. light-first Aurora in Phase C) flips the site default too. */
export const DEFAULT_DESIGN = 'aurora';
export const DEFAULT_MODE: ThemeMode =
  designs.find((d) => d.id === DEFAULT_DESIGN)?.defaultMode ?? 'dark';

export const STORAGE_KEY_DESIGN = 'taranity-design';
export const STORAGE_KEY_MODE = 'taranity-mode';

/** `<meta name="theme-color">` per design×mode — matches each theme's --bg. */
const THEME_COLORS: Record<string, string> = {
  'aurora:light': '#f6f4ff',
  'aurora:dark': '#0a0613',
  'console:dark': '#070709',
  'console:light': '#eef1f7',
  'world:dark': '#05050f',
  'world:light': '#eef1ff',
};

export function themeColorFor(design: string, mode: ThemeMode): string {
  return THEME_COLORS[`${design}:${mode}`] ?? (mode === 'dark' ? '#0a0613' : '#f6f4ff');
}

/** Validate a stored value against the ready registry, falling back to defaults. */
export function resolveDesign(value: string | null | undefined): string {
  return readyDesigns.some((d) => d.id === value) ? (value as string) : DEFAULT_DESIGN;
}

export function resolveMode(value: string | null | undefined): ThemeMode {
  return value === 'light' || value === 'dark' ? value : DEFAULT_MODE;
}
