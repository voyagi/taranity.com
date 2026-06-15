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

function hideNudge() {
  document.querySelectorAll('[data-design-nudge]').forEach((n) => n.setAttribute('hidden', ''));
}

/**
 * Reveal the "try another design" invite, but only on a visitor's first visit.
 * The flag is set the moment it is shown (not on dismissal), so a single missed
 * glance does not nag on every reload; the always-on label and active-state pill
 * carry the affordance after that. Storage-blocked (private mode) visitors just
 * see it each load, which is harmless.
 */
function revealNudgeOnce() {
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
  if (seen) return;
  nudge.removeAttribute('hidden');
  try {
    localStorage.setItem(KEY_SEEN, '1');
  } catch {
    /* not fatal: it simply reappears next load when storage is unavailable */
  }
}

export function initDesignTheme() {
  if (bound) return;
  bound = true;

  revealNudgeOnce();

  // Re-apply after a View-Transition swap (the swapped-in HTML has the build-time attr).
  document.addEventListener('astro:after-swap', () => applyMode(effectiveMode()));

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
