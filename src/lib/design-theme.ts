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
const KEY_SEEN = 'taranity-switcher-seen';
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
  const el = document.documentElement;
  el.setAttribute('data-mode', mode);
  // Keep the browser chrome in step: SiteLayout exposes per-design colours as
  // data-theme-light/-dark on <html> (also read by the pre-paint script).
  const color = el.getAttribute(mode === 'dark' ? 'data-theme-dark' : 'data-theme-light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && color) meta.setAttribute('content', color);
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

/** Hide the invite and remember it as handled, so it does not return. */
function hideNudge() {
  document.querySelectorAll('[data-design-nudge]').forEach((n) => n.setAttribute('hidden', ''));
  try {
    localStorage.setItem(KEY_SEEN, '1');
  } catch {
    /* not fatal: the invite simply re-offers after the next navigation */
  }
}

/**
 * Offer the "try another design" invite until the visitor engages with the
 * switcher. It is revealed on the first load and re-checked after each
 * View-Transition swap, so it keeps inviting across navigations and subpages;
 * the flag is set only when the visitor dismisses it or picks a design
 * (hideNudge), after which it never returns. Storage-blocked (private mode)
 * visitors see it re-offer after each navigation, which is harmless.
 */
function revealNudgeIfUnseen() {
  const nudge = document.querySelector('[data-design-nudge]');
  if (!nudge) return;
  // No initializer: both branches assign before use, so `= false` would trip
  // eslint no-useless-assignment; TS still proves definite assignment here.
  let seen: boolean;
  try {
    seen = localStorage.getItem(KEY_SEEN) === '1';
  } catch {
    seen = false;
  }
  if (!seen) nudge.removeAttribute('hidden');
}

export function initDesignTheme() {
  if (bound) return;
  bound = true;

  revealNudgeIfUnseen();

  // Re-apply after a View-Transition swap (the swapped-in HTML carries the
  // build-time attrs) and re-offer the invite until the visitor has engaged.
  document.addEventListener('astro:after-swap', () => {
    applyMode(effectiveMode());
    revealNudgeIfUnseen();
  });

  // Follow the system while the visitor has made no explicit choice.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readStoredMode() === null) applyMode(systemMode());
  });

  // Delegated controls: dismiss the invite, mode toggle, and remembering the
  // chosen design before nav.
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-nudge-dismiss]')) {
      e.preventDefault();
      hideNudge();
      return;
    }
    if (target.closest('[data-mode-toggle]')) {
      e.preventDefault();
      chooseMode(document.documentElement.getAttribute('data-mode') === 'dark' ? 'light' : 'dark');
      return;
    }
    const go = target.closest<HTMLElement>('[data-design-go]');
    if (go) {
      // Acting on the switcher answers the invite: get it out of the way.
      hideNudge();
      try {
        localStorage.setItem(KEY_DESIGN, go.dataset.designGo || DEFAULT_DESIGN);
      } catch {
        /* not fatal: the link still navigates to the design route */
      }
    }
  });
}
