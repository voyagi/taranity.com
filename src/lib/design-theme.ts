/**
 * Theme + design runtime for the showcase.
 *
 * Light or dark follows the visitor's system setting (prefers-color-scheme) until
 * they pick one with the toggle, after which their choice is remembered. Storage is
 * crash-safe (private mode / quota). The chosen design id is remembered too; the
 * switcher links navigate between design routes.
 *
 * The very first paint is handled by a tiny inline <head> script in SiteLayout (so
 * there is no flash); this module wires the controls and re-applies after a
 * View-Transition swap, where the incoming static HTML carries the build-time attr.
 */
import { DEFAULT_DESIGN } from '../config/designs';

const KEY_MODE = 'taranity-mode';
const KEY_DESIGN = 'taranity-design';
let memMode: 'light' | 'dark' | null = null;
let storageOk = true;
let bound = false;

function readStoredMode(): 'light' | 'dark' | null {
  if (!storageOk) return memMode;
  try {
    const v = localStorage.getItem(KEY_MODE);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return memMode;
  }
}

const systemMode = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const effectiveMode = (): 'light' | 'dark' => readStoredMode() ?? systemMode();

function applyMode(mode: 'light' | 'dark') {
  document.documentElement.setAttribute('data-mode', mode);
  document.dispatchEvent(new CustomEvent('mode:change', { detail: { mode } }));
}

function chooseMode(mode: 'light' | 'dark') {
  memMode = mode;
  try {
    localStorage.setItem(KEY_MODE, mode);
  } catch {
    storageOk = false;
  }
  applyMode(mode);
}

export function initDesignTheme() {
  if (bound) return;
  bound = true;

  // Re-apply after a View-Transition swap (the swapped-in HTML has the build-time attr).
  document.addEventListener('astro:after-swap', () => applyMode(effectiveMode()));

  // Follow the system while the visitor has made no explicit choice.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readStoredMode() === null) applyMode(systemMode());
  });

  // Delegated controls: mode toggle, and remembering the chosen design before nav.
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-mode-toggle]')) {
      e.preventDefault();
      chooseMode(document.documentElement.getAttribute('data-mode') === 'dark' ? 'light' : 'dark');
      return;
    }
    const go = target.closest<HTMLElement>('[data-design-go]');
    if (go) {
      try {
        localStorage.setItem(KEY_DESIGN, go.dataset.designGo || DEFAULT_DESIGN);
      } catch {
        /* not fatal: the link still navigates to the design route */
      }
    }
  });
}
