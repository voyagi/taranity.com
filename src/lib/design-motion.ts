/**
 * Shared motion runtime for every design (Vitrine, Atlas, Signal, Storefront,
 * Practice, Raw). The six designs ran byte-identical plumbing - Lenis
 * smooth-scroll, a scroll-progress indicator, anchor-link gliding, the
 * reduced-motion fallback, scroll-reset, the Astro view-transition lifecycle,
 * and teardown - differing only in a handful of values and one unique GSAP
 * choreography block. That plumbing lives here once; each `*-motion.ts` file is
 * now a thin config plus its own choreography.
 *
 * Strictly additive: the server HTML is complete and visible without JS. Each
 * design's initial hidden states live in its own CSS behind html.js +
 * reduced-motion gates, and the choreography animates them in. Gated on the
 * design's root selector so it does nothing on other designs' pages after a
 * View-Transition swap, and torn down (Lenis included) before every swap so
 * designs never double-drive the scroll.
 */
import Lenis from 'lenis';
import { resetScrollOnReload } from './scroll-reset';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Scroll-progress indicator: an element scaled along one axis as the page scrolls. */
export interface DesignProgress {
  /** The fill element whose transform tracks scroll progress (0..1). */
  fillSelector: string;
  /** `'x'` scales it horizontally (a top bar), `'y'` vertically (a side rail). */
  axis: 'x' | 'y';
  /** Optional readout element whose textContent becomes the rounded percent (Atlas rail). */
  pctSelector?: string;
}

export interface DesignMotionConfig {
  /** Identifies this design's page; the runtime no-ops when it is absent. */
  rootSelector: string;
  /** Lenis tuning. `smoothWheel` is always true. */
  lenis: { duration: number; touchMultiplier: number };
  /** Duration of the Lenis glide used by the anchor-link click handler. */
  anchorDuration: number;
  /** The scroll-progress indicator. */
  progress: DesignProgress;
  /**
   * The unique GSAP block for this design. Run inside `gsap.context(..., root)`
   * so every tween/ScrollTrigger it creates is reverted together on teardown.
   */
  choreography: (root: HTMLElement) => void;
  /**
   * Reduced-motion fallback: arm the opacity-only reveal for this design's fade
   * targets and stash the returned teardown. The design owns this because the
   * fade-target list is per-design. Called (and only called) when reduced motion
   * is active, in place of the kinetic setup - so onSetup, and thus Atlas GL,
   * never runs under reduce (correct).
   */
  onReducedMotion: (root: HTMLElement) => void;
  /** Tear down the reduced-motion reveal (the design's `rmReveal?.()`). Runs first in teardown. */
  cleanupReducedMotion: () => void;
  /** Called at the very end of setup, after ScrollTrigger.refresh() (Atlas schedules its WebGL boot). */
  onSetup?: (root: HTMLElement) => void;
  /** Called early in teardown, right after the reduced-motion cleanup (Atlas disposes its WebGL scene). */
  onTeardown?: () => void;
}

/**
 * Wire a design's motion runtime: self-registers on the Astro page-load /
 * before-swap lifecycle (plus a window-load fallback and a reduced-motion
 * change listener), exactly as each design used to do at module top level.
 */
export function initDesignMotion(config: DesignMotionConfig): void {
  let lenis: Lenis | null = null;
  let rafCb: ((time: number) => void) | null = null;
  let ctx: gsap.Context | null = null;
  let removeAnchorHandler: (() => void) | null = null;
  // Guards the window-load fallback only; `load` fires once per full page load,
  // so this never needs to reset across View-Transition navigations.
  let pageLoadFired = false;

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function teardown() {
    config.cleanupReducedMotion();
    config.onTeardown?.();
    ctx?.revert();
    ctx = null;
    removeAnchorHandler?.();
    removeAnchorHandler = null;
    lenis?.destroy();
    lenis = null;
    if (rafCb) {
      gsap.ticker.remove(rafCb);
      rafCb = null;
      // Undo the lagSmoothing(0) below: the ticker is shared GSAP state, and the
      // next design's motion would otherwise inherit disabled smoothing. GSAP has
      // no getter for it, so restore the documented defaults.
      gsap.ticker.lagSmoothing(500, 33);
    }
    // Native scrollbar comes back the moment Lenis stops driving.
    document.documentElement.classList.remove('v-lenis');
    document.querySelector<HTMLElement>(config.progress.fillSelector)?.style.removeProperty('transform');
  }

  function setup() {
    teardown();
    const root = document.querySelector<HTMLElement>(config.rootSelector);
    if (!root) return;
    // Reduced motion: skip the kinetic choreography and instead reveal each scroll
    // section with a gentle opacity-only fade as it enters the viewport. The
    // design arms its own rmReveal; a true return short-circuits (so onSetup,
    // and thus Atlas GL, never runs under reduce).
    if (reduceMotion()) {
      config.onReducedMotion(root);
      return;
    }

    // While Lenis drives, the native scrollbar is hidden (dragging it fights the
    // smoothing loop) and the design's progress indicator takes over.
    lenis = new Lenis({
      duration: config.lenis.duration,
      smoothWheel: true,
      touchMultiplier: config.lenis.touchMultiplier,
    });
    resetScrollOnReload(lenis);
    // Usually already set pre-paint by SiteLayout's inline script (data-smooth);
    // re-adding covers the mid-session "reduced motion turned off" path. The
    // 'v-lenis' class is shared across all designs.
    document.documentElement.classList.add('v-lenis');

    const fill = document.querySelector<HTMLElement>(config.progress.fillSelector);
    const pct = config.progress.pctSelector
      ? document.querySelector<HTMLElement>(config.progress.pctSelector)
      : null;
    const scaleAxis = config.progress.axis === 'x' ? 'scaleX' : 'scaleY';
    const update = (p: number) => {
      if (fill) fill.style.transform = `${scaleAxis}(${p})`;
      if (pct) pct.textContent = `${Math.round(p * 100)}%`;
    };
    // Sync immediately so a visitor already mid-page (motion toggled on, or a
    // restored scroll position) does not see the indicator stuck at zero until
    // the first scroll event.
    const limit = document.documentElement.scrollHeight - window.innerHeight;
    update(limit > 0 ? window.scrollY / limit : 0);
    lenis.on('scroll', (l: Lenis) => {
      ScrollTrigger.update();
      if (l.limit > 0) update(l.scroll / l.limit);
    });
    rafCb = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(rafCb);
    gsap.ticker.lagSmoothing(0);

    // Anchor navigation glides through Lenis; focus still moves for keyboards.
    const onAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      // A malformed hash (e.g. "#1foo" or "#a:b") is not a valid selector and
      // makes querySelector throw; fall through to the browser's default nav.
      let target: HTMLElement | null;
      try {
        target = document.querySelector<HTMLElement>(anchor.hash);
      } catch {
        return;
      }
      if (!target) return;
      e.preventDefault();
      lenis?.scrollTo(target, { duration: config.anchorDuration });
      target.focus({ preventScroll: true });
      history.pushState(null, '', anchor.hash);
    };
    root.addEventListener('click', onAnchorClick);
    removeAnchorHandler = () => root.removeEventListener('click', onAnchorClick);

    ctx = gsap.context(() => config.choreography(root), root);

    ScrollTrigger.refresh();

    config.onSetup?.(root);
  }

  // Initial load + every View-Transition navigation.
  document.addEventListener('astro:page-load', () => {
    pageLoadFired = true;
    setup();
  });
  // Tear down (Lenis included) before the DOM is swapped out.
  document.addEventListener('astro:before-swap', teardown);
  // Belt-and-suspenders: if astro:page-load somehow didn't fire, wire up on load.
  window.addEventListener('load', () => {
    if (!pageLoadFired) {
      pageLoadFired = true;
      setup();
    }
  });

  // Respond to a mid-session prefers-reduced-motion change in either direction:
  // setup() calls teardown() first (that teardown doubles as the cleanup when the
  // new state is reduce, removing v-lenis and the progress transform), and the
  // CSS gates flip with the media query.
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => setup());
}
