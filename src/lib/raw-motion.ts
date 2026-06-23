/**
 * Motion choreography for the Raw design: Lenis scroll, masked line reveals,
 * hairline draws, card wipes, and the top scroll-progress bar.
 *
 * Strictly additive: the page is complete and visible without JS. The initial
 * hidden states live in raw.css behind html.js + reduced-motion gates, and
 * everything here animates them in. Gated on [data-raw] so it does nothing on
 * other designs' pages after a View-Transition swap, and torn down (Lenis
 * included) before every swap so designs never double-drive the scroll.
 *
 * Like Signal, Storefront, and Practice, Raw carries no WebGL: the atmosphere is
 * pure CSS (the graph grid, scanlines, and glitch), keeping the JS lean (Lenis +
 * GSAP only) so a dense brutalist page still loads fast. The scroll is a touch
 * snappier than the trust-led designs - brutalist motion reads decisive.
 */
import Lenis from 'lenis';
import { resetScrollOnReload } from './scroll-reset';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { revealOnScrollReduced } from './rm-reveal';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let rafCb: ((time: number) => void) | null = null;
let ctx: gsap.Context | null = null;
let removeAnchorHandler: (() => void) | null = null;
// Guards the window-load fallback only; `load` fires once per full page load,
// so this never needs to reset across View-Transition navigations.
let pageLoadFired = false;

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reduced-motion fallback targets: everything the choreography below hides under
// no-preference instead fades in (opacity only, no movement) as it enters the
// viewport. See src/lib/rm-reveal.ts and the shared CSS block in site.css.
const RM_FADE_TARGETS =
  '.r-mask-inner, [data-r-fade], [data-r-hero-fade], [data-r-rule], [data-r-hero-rule], [data-r-card]';
let rmReveal: (() => void) | null = null;

function teardown() {
  rmReveal?.();
  rmReveal = null;
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
  document.querySelector<HTMLElement>('[data-r-progress]')?.style.removeProperty('transform');
}

function setup() {
  teardown();
  const root = document.querySelector<HTMLElement>('[data-raw]');
  if (!root) return;
  // Reduced motion: skip the kinetic choreography and instead reveal each scroll
  // section with a gentle opacity-only fade as it enters the viewport.
  if (reduceMotion()) {
    rmReveal = revealOnScrollReduced(root, RM_FADE_TARGETS);
    return;
  }

  // A snappy, decisive scroll. While Lenis drives, the native scrollbar is
  // hidden (dragging it fights the smoothing loop) and the top progress bar
  // takes over.
  lenis = new Lenis({ duration: 0.9, smoothWheel: true, touchMultiplier: 1.4 });
  resetScrollOnReload(lenis);
  // Usually already set pre-paint by SiteLayout's inline script (data-smooth);
  // re-adding covers the mid-session "reduced motion turned off" path.
  document.documentElement.classList.add('v-lenis');
  const progress = document.querySelector<HTMLElement>('[data-r-progress]');
  const setProgress = (p: number) => {
    if (progress) progress.style.transform = `scaleX(${p})`;
  };
  // Sync immediately so a visitor already mid-page (motion toggled on, or a
  // restored scroll position) does not see the bar stuck at zero.
  const limit = document.documentElement.scrollHeight - window.innerHeight;
  setProgress(limit > 0 ? window.scrollY / limit : 0);
  lenis.on('scroll', (l: Lenis) => {
    ScrollTrigger.update();
    if (l.limit > 0) setProgress(l.scroll / l.limit);
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
    lenis?.scrollTo(target, { duration: 1.3 });
    target.focus({ preventScroll: true });
    history.pushState(null, '', anchor.hash);
  };
  root.addEventListener('click', onAnchorClick);
  removeAnchorHandler = () => root.removeEventListener('click', onAnchorClick);

  ctx = gsap.context(() => {
    // NOTE on { y: 0 }: raw.css hides mask lines with translateY(120%). GSAP
    // parses that computed style as a pixel matrix (yPercent is not recoverable
    // from a matrix), so without owning `y` the parsed pixel offset survives the
    // yPercent tween and the line stays hidden. The from-pose (yPercent 120 +
    // y 0) is pixel-identical to the CSS pose.

    // Hero entrance: lines rise out of their masks, then the details settle in.
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(
        '.r-hero .r-mask-inner',
        // 120 matches the html.js gate in raw.css (line + descender pad).
        { yPercent: 120, y: 0 },
        { yPercent: 0, y: 0, duration: 1.0, stagger: 0.12 },
        0.1,
      )
      .fromTo(
        '[data-r-hero-fade]',
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 },
        0.4,
      )
      .fromTo(
        '[data-r-hero-rule]',
        { scaleX: 0 },
        { scaleX: 1, duration: 1.2, ease: 'power2.inOut' },
        0.45,
      );

    // Masked statements below the fold rise when their block enters.
    gsap.utils.toArray<HTMLElement>('[data-r-lines]').forEach((group) => {
      gsap.fromTo(
        group.querySelectorAll('.r-mask-inner'),
        // 120 matches the html.js gate in raw.css (line + descender pad).
        { yPercent: 120, y: 0 },
        {
          yPercent: 0,
          y: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: group, start: 'top 80%', once: true },
        },
      );
    });

    // Everything tagged for a fade rises gently as it enters.
    ScrollTrigger.batch('[data-r-fade]', {
      start: 'top 88%',
      once: true,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.08 },
        ),
    });

    // Hairlines draw themselves in.
    gsap.utils.toArray<HTMLElement>('[data-r-rule]').forEach((line) => {
      gsap.fromTo(
        line,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.1,
          ease: 'power2.inOut',
          scrollTrigger: { trigger: line, start: 'top 90%', once: true },
        },
      );
    });

    // Cards wipe open left-to-right as they enter (initial clip in raw.css; the
    // from-pose must match that gate exactly).
    gsap.utils.toArray<HTMLElement>('[data-r-card]').forEach((card, i) => {
      gsap.fromTo(
        card,
        { clipPath: 'inset(0% 100% 0% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.8,
          ease: 'power4.inOut',
          delay: (i % 3) * 0.06,
          scrollTrigger: { trigger: card, start: 'top 86%', once: true },
        },
      );
    });
  }, root);

  ScrollTrigger.refresh();
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
// new state is reduce, removing v-lenis and the runtime), and the CSS gates flip
// with the media query.
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => setup());
