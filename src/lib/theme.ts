/**
 * Theme runtime: applies / persists the chosen design + mode and keeps it stable
 * across Astro View-Transition navigations.
 *
 * Why the after-swap re-apply: a VT swap brings in static HTML whose <html> has no
 * data-design/data-mode (those are set at runtime), so without re-applying, the
 * theme flashes back to the default on every in-app navigation (REWORK-PLAN A4 /
 * peer-review Ⓐ). The synchronous <head> init script handles the very first paint;
 * this module handles every navigation after it and all switcher interaction.
 *
 * Storage is wrapped in try/catch with an in-memory fallback so a blocked
 * localStorage (private mode, corporate lockdown) never throws (A5).
 */
import {
  STORAGE_KEY_DESIGN,
  STORAGE_KEY_MODE,
  DEFAULT_DESIGN,
  DEFAULT_MODE,
  resolveDesign,
  resolveMode,
  themeColorFor,
  type ThemeMode,
} from '../config/themes';

let mem: { design: string; mode: ThemeMode } = { design: DEFAULT_DESIGN, mode: DEFAULT_MODE };
let bound = false;

function readStored(): { design: string; mode: ThemeMode } {
  try {
    return {
      design: resolveDesign(localStorage.getItem(STORAGE_KEY_DESIGN)),
      mode: resolveMode(localStorage.getItem(STORAGE_KEY_MODE)),
    };
  } catch {
    return { design: mem.design, mode: mem.mode };
  }
}

function persist(design: string, mode: ThemeMode) {
  mem = { design, mode };
  try {
    localStorage.setItem(STORAGE_KEY_DESIGN, design);
    localStorage.setItem(STORAGE_KEY_MODE, mode);
  } catch {
    /* private mode / blocked storage — in-memory only */
  }
}

export function getActive(): { design: string; mode: ThemeMode } {
  const el = document.documentElement;
  return {
    design: resolveDesign(el.getAttribute('data-design')),
    mode: resolveMode(el.getAttribute('data-mode')),
  };
}

export function applyTheme(
  designIn: string,
  modeIn: ThemeMode,
  opts: { persist?: boolean; source?: 'user' | 'restore' } = {},
) {
  const design = resolveDesign(designIn);
  const mode = resolveMode(modeIn);
  const el = document.documentElement;
  el.setAttribute('data-design', design);
  el.setAttribute('data-mode', mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', themeColorFor(design, mode));
  if (opts.persist !== false) persist(design, mode);
  const source = opts.source ?? 'user';
  document.dispatchEvent(new CustomEvent('theme:change', { detail: { design, mode, source } }));
  syncControls(design, mode);
}

/** Reflect current state on any rendered switcher controls. */
function syncControls(design: string, mode: ThemeMode) {
  for (const btn of document.querySelectorAll<HTMLElement>('[data-theme-mode-toggle]')) {
    const isLight = mode === 'light';
    btn.setAttribute('aria-pressed', String(isLight));
    btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-theme-design]')) {
    el.setAttribute('aria-pressed', String(el.dataset.themeDesign === design));
  }
}

export function initTheme() {
  if (bound) return;
  bound = true;

  // Sync the stored choice + controls on first load (inline script already set
  // attributes pre-paint; this re-asserts and wires the UI without persisting).
  const stored = readStored();
  applyTheme(stored.design, stored.mode, { persist: false, source: 'restore' });

  // Re-apply after every View-Transition swap (incoming HTML carries no attrs).
  document.addEventListener('astro:after-swap', () => {
    const next = readStored();
    applyTheme(next.design, next.mode, { persist: false, source: 'restore' });
  });

  // Delegated handlers — controls are re-rendered on each navigation.
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-theme-mode-toggle]')) {
      e.preventDefault();
      const { design, mode } = getActive();
      applyTheme(design, mode === 'dark' ? 'light' : 'dark');
      return;
    }
    const pick = target.closest<HTMLElement>('[data-theme-design]');
    if (pick) {
      e.preventDefault();
      applyTheme(pick.dataset.themeDesign || DEFAULT_DESIGN, getActive().mode);
    }
  });
}
