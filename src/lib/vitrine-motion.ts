/**
 * Motion choreography for the Vitrine design: slow Lenis scroll, masked line
 * reveals, hairline draws, and plate parallax.
 *
 * Strictly additive: the server HTML is complete and visible without JS. The
 * initial hidden states live in vitrine.css behind html.js + reduced-motion
 * gates, and everything here animates them in. Gated on [data-vitrine] so it
 * does nothing on other designs' pages after a View-Transition swap, and torn
 * down (Lenis included) before every swap so designs never double-drive the
 * scroll.
 */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let rafCb: ((time: number) => void) | null = null;
let ctx: gsap.Context | null = null;
let removeAnchorHandler: (() => void) | null = null;
// Guards the window-load fallback only; `load` fires once per full page load,
// so this never needs to reset across View-Transition navigations.
let pageLoadFired = false;

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function teardown() {
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
}

function setup() {
  teardown();
  const root = document.querySelector<HTMLElement>('[data-vitrine]');
  // Reduced motion: vitrine.css never hides anything, so there is nothing to do.
  if (!root || reduceMotion()) return;

  // Slow, cinematic scroll.
  lenis = new Lenis({ duration: 1.35, smoothWheel: true, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  rafCb = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(rafCb);
  gsap.ticker.lagSmoothing(0);

  // Anchor navigation glides through Lenis; focus still moves for keyboards.
  const onAnchorClick = (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!anchor) return;
    const target = document.querySelector<HTMLElement>(anchor.hash);
    if (!target) return;
    e.preventDefault();
    lenis?.scrollTo(target, { duration: 1.6 });
    target.focus({ preventScroll: true });
    history.pushState(null, '', anchor.hash);
  };
  root.addEventListener('click', onAnchorClick);
  removeAnchorHandler = () => root.removeEventListener('click', onAnchorClick);

  ctx = gsap.context(() => {
    // Hero entrance: lines rise out of their masks, then the details settle in.
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(
        '.v-hero .v-mask-inner',
        { yPercent: 112 },
        { yPercent: 0, duration: 1.15, stagger: 0.14 },
        0.15,
      )
      .fromTo(
        '[data-v-hero-fade]',
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 },
        0.7,
      )
      .fromTo(
        '[data-v-hero-rule]',
        { scaleX: 0 },
        { scaleX: 1, duration: 1.4, ease: 'power2.inOut' },
        0.6,
      );

    // Masked statements below the fold rise when their block enters.
    gsap.utils.toArray<HTMLElement>('[data-v-lines]').forEach((group) => {
      gsap.fromTo(
        group.querySelectorAll('.v-mask-inner'),
        { yPercent: 112 },
        {
          yPercent: 0,
          duration: 1.05,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: group, start: 'top 78%', once: true },
        },
      );
    });

    // Everything tagged for a fade rises gently as it enters.
    ScrollTrigger.batch('[data-v-fade]', {
      start: 'top 86%',
      once: true,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { autoAlpha: 0, y: 26 },
          { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 },
        ),
    });

    // Hairlines draw themselves in.
    gsap.utils.toArray<HTMLElement>('[data-v-rule]').forEach((line) => {
      gsap.fromTo(
        line,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.3,
          ease: 'power2.inOut',
          scrollTrigger: { trigger: line, start: 'top 90%', once: true },
        },
      );
    });

    // Plate parallax: the oversized art layer drifts as the plate crosses the
    // viewport (its -10% inset means edges never show).
    gsap.utils.toArray<HTMLElement>('[data-v-plate-art]').forEach((art) => {
      const inner = art.querySelector<HTMLElement>('[data-v-art-inner]');
      if (!inner) return;
      gsap.fromTo(
        inner,
        { yPercent: -6 },
        {
          yPercent: 6,
          ease: 'none',
          scrollTrigger: { trigger: art, start: 'top bottom', end: 'bottom top', scrub: true },
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
// setup() handles its own teardown, and the CSS gates flip with the media query.
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => setup());
