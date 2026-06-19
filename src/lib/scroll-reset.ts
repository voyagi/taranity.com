import type Lenis from 'lenis';

/**
 * On a plain page reload, start at the top.
 *
 * The browser (and Astro's View-Transition router) restore the prior scroll
 * position on reload, and once Lenis is driving it keeps that position — a
 * native `scrollTo(0, 0)` is overridden by the smooth-scroll runtime. Resetting
 * through Lenis itself sticks. Call this right after the Lenis instance is
 * created, in each design's motion module.
 *
 * Only fires for an actual reload (not a View-Transition navigation, which the
 * router already scrolls to the top), and never when the URL targets an anchor
 * (e.g. /#contact) — that destination must be preserved.
 */
export function resetScrollOnReload(lenis: Lenis): void {
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navEntry?.type === 'reload' && !location.hash) {
    lenis.scrollTo(0, { immediate: true });
  }
}
