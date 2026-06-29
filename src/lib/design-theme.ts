/**
 * Theme + design runtime for the showcase.
 *
 * Light or dark follows the visitor's system setting (prefers-color-scheme) until
 * they pick one with the toggle, after which their choice is remembered. Storage is
 * crash-safe (private mode / quota). The chosen design id is stored in a cookie the edge
 * reads to serve that design in place; switching sets the cookie and reloads (no URL change).
 *
 * The very first paint is handled by a tiny inline <head> script in SiteLayout (so
 * there is no flash); this module wires the controls and re-applies after a
 * View-Transition swap, where the incoming static HTML carries the build-time attr.
 */
import { DEFAULT_DESIGN } from '../config/designs';
import { SWITCH_SCROLL_KEY } from './scroll-reset';

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

/**
 * The sun/moon toggle shows the current mode visually; tell assistive tech the
 * action it will take, so its purpose is clear without seeing the lit icon.
 */
function syncToggleLabel(mode: 'light' | 'dark') {
  const toggle = document.querySelector('[data-mode-toggle]');
  if (toggle) {
    toggle.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

function applyMode(mode: 'light' | 'dark') {
  const el = document.documentElement;
  el.setAttribute('data-mode', mode);
  // Keep the browser chrome in step: SiteLayout exposes per-design colours as
  // data-theme-light/-dark on <html> (also read by the pre-paint script).
  const color = el.getAttribute(mode === 'dark' ? 'data-theme-dark' : 'data-theme-light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && color) meta.setAttribute('content', color);
  syncToggleLabel(mode);
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

/**
 * After a design-switch reload, restore the reader's scroll position on native-scroll pages
 * (the subpages). Motion (Lenis) pages leave it to resetScrollOnReload (scroll-reset.ts),
 * which restores through Lenis so the native value is not overridden by the smooth runtime.
 * Whichever path owns the page clears the key, so it never lingers into a later reload.
 */
function restoreSwitchScroll() {
  const willUseLenis =
    document.documentElement.hasAttribute('data-smooth') &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (willUseLenis) return; // the design's motion module restores it through Lenis
  try {
    const v = sessionStorage.getItem(SWITCH_SCROLL_KEY);
    sessionStorage.removeItem(SWITCH_SCROLL_KEY);
    if (v === null) return;
    const y = parseInt(v, 10);
    if (Number.isFinite(y)) window.scrollTo(0, y);
  } catch {
    /* sessionStorage blocked: nothing to restore */
  }
}

export function initDesignTheme() {
  if (bound) return;
  bound = true;

  // Restore the reading position after a design-switch reload (native-scroll subpages).
  restoreSwitchScroll();

  // The pre-paint script set data-mode but cannot see the toggle; label it now.
  syncToggleLabel(effectiveMode());

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
      // Switching design is in-place: the choice is stored in a cookie that the Cloudflare
      // edge reads to serve the chosen design's prebuilt HTML at THIS same URL. Set it and
      // reload. No URL change, and the visitor stays on the page they're on.
      e.preventDefault();
      const id = go.dataset.designGo || DEFAULT_DESIGN;
      try {
        localStorage.setItem(KEY_DESIGN, id);
      } catch {
        /* not fatal: the cookie below is the source of truth the edge reads */
      }
      // No HttpOnly on purpose: the switcher reads/writes this cookie client-side, so it
      // must stay JS-visible (adding HttpOnly would silently break switching). The value is
      // a non-sensitive design id. Omit Secure on http (local `wrangler pages dev`) so the
      // cookie persists there; the production site is https-only (HSTS preload) so it is
      // Secure in prod.
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${KEY_DESIGN}=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
      // Stash the scroll position so the reload restores the reader's place (best-effort,
      // approximate across designs) instead of jumping to the top. See scroll-reset.ts.
      try {
        sessionStorage.setItem(SWITCH_SCROLL_KEY, String(Math.round(window.scrollY)));
      } catch {
        /* sessionStorage blocked: switch still works, just without scroll restore */
      }
      location.reload();
    }
  });
}
