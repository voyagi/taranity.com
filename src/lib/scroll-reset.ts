import type Lenis from 'lenis';

/**
 * Key for the scroll position the design switcher stashes (design-theme.ts) right before it
 * reloads to switch design. A design switch reloads the SAME URL, so we restore the prior
 * position instead of jumping to the top. Best-effort: designs differ in height, so the
 * restored position is approximate, but far better than losing the reader's place.
 *
 * Two consumers, one per page type: motion (Lenis) pages restore through Lenis here (native
 * scroll is overridden by the smooth runtime); native-scroll subpages restore in
 * design-theme.ts. Whichever path owns the page clears the key, so it never lingers.
 */
export const SWITCH_SCROLL_KEY = 'taranity-switch-scroll';

function consumeSwitchScroll(): number | null {
  try {
    const v = sessionStorage.getItem(SWITCH_SCROLL_KEY);
    if (v === null) return null;
    sessionStorage.removeItem(SWITCH_SCROLL_KEY);
    const y = parseInt(v, 10);
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

/**
 * On a plain page reload, start at the top.
 *
 * The browser (and Astro's View-Transition router) restore the prior scroll position on
 * reload, and once Lenis is driving it keeps that position - a native `scrollTo(0, 0)` is
 * overridden by the smooth-scroll runtime. Resetting through Lenis itself sticks. Call this
 * right after the Lenis instance is created, in each design's motion module.
 *
 * Exception: a design-switch reload restores the stashed position (above) instead of the top.
 * Only fires the top-reset for an actual reload (not a View-Transition navigation, which the
 * router already scrolls to the top), and never when the URL targets an anchor (e.g.
 * /#contact) - that destination must be preserved.
 */
export function resetScrollOnReload(lenis: Lenis): void {
  const switchY = consumeSwitchScroll();
  if (switchY !== null) {
    lenis.scrollTo(switchY, { immediate: true });
    return;
  }
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navEntry?.type === 'reload' && !location.hash) {
    lenis.scrollTo(0, { immediate: true });
  }
}
