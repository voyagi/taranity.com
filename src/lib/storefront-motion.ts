/**
 * Motion choreography for the Storefront design: Lenis scroll, masked line
 * reveals, hairline draws, product-card pop-ins, and the top scroll-progress bar.
 *
 * Strictly additive: the page is complete and visible without JS. The initial
 * hidden states live in storefront.css behind html.js + reduced-motion gates,
 * and everything here animates them in. The shared plumbing (Lenis, progress,
 * anchor gliding, the Astro view-transition lifecycle, teardown) lives in
 * design-motion.ts; this file is the Storefront config plus its unique GSAP
 * block.
 *
 * Like Signal, Storefront carries no WebGL: the atmosphere is pure CSS, keeping
 * the JS lean (Lenis + GSAP only) so a vivid page still loads fast.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initDesignMotion } from './design-motion';
import { revealOnScrollReduced } from './rm-reveal';

// Reduced-motion fallback targets: everything the choreography below hides under
// no-preference instead fades in (opacity only, no movement) as it enters the
// viewport. See src/lib/rm-reveal.ts and the shared CSS block in site.css.
const RM_FADE_TARGETS =
  '.f-mask-inner, [data-f-fade], [data-f-hero-fade], [data-f-rule], [data-f-hero-rule], [data-f-card]';
let rmReveal: (() => void) | null = null;

function choreography(_root: HTMLElement) {
  // NOTE on { y: 0 }: storefront.css hides mask lines with translateY(120%).
  // GSAP parses that computed style as a pixel matrix (yPercent is not
  // recoverable from a matrix), so without owning `y` the parsed pixel
  // offset survives the yPercent tween and the line stays hidden. The
  // from-pose (yPercent 120 + y 0) is pixel-identical to the CSS pose.

  // Hero entrance: lines rise out of their masks, then the details settle in.
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .fromTo(
      '.f-hero .f-mask-inner',
      // 120 matches the html.js gate in storefront.css (line + descender pad).
      { yPercent: 120, y: 0 },
      { yPercent: 0, y: 0, duration: 1.05, stagger: 0.12 },
      0.1,
    )
    .fromTo(
      '[data-f-hero-fade]',
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 0.7, ease: 'back.out(1.2)', stagger: 0.1 },
      0.45,
    )
    .fromTo(
      '[data-f-hero-rule]',
      { scaleX: 0 },
      { scaleX: 1, duration: 1.3, ease: 'power2.inOut' },
      0.5,
    );

  // Masked statements below the fold rise when their block enters.
  gsap.utils.toArray<HTMLElement>('[data-f-lines]').forEach((group) => {
    gsap.fromTo(
      group.querySelectorAll('.f-mask-inner'),
      // 120 matches the html.js gate in storefront.css (line + descender pad).
      { yPercent: 120, y: 0 },
      {
        yPercent: 0,
        y: 0,
        duration: 0.95,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: group, start: 'top 80%', once: true },
      },
    );
  });

  // Everything tagged for a fade rises gently as it enters.
  ScrollTrigger.batch('[data-f-fade]', {
    start: 'top 88%',
    once: true,
    onEnter: (els) =>
      gsap.fromTo(
        els,
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.7, ease: 'back.out(1.2)', stagger: 0.08 },
      ),
  });

  // Hairlines draw themselves in.
  gsap.utils.toArray<HTMLElement>('[data-f-rule]').forEach((line) => {
    gsap.fromTo(
      line,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1.2,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: line, start: 'top 90%', once: true },
      },
    );
  });

  // Product cards POP onto the shelf as they enter: scale + rise + fade with a
  // friendly overshoot (back.out), staggered across each row like items being
  // stocked. clearProps releases the inline transform on complete so the CSS
  // hover-lift keeps working. Transform + opacity only, so no layout shift.
  gsap.utils.toArray<HTMLElement>('[data-f-card]').forEach((card, i) => {
    gsap.fromTo(
      card,
      { autoAlpha: 0, y: 22, scale: 0.95 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        ease: 'back.out(1.5)',
        delay: (i % 3) * 0.05,
        clearProps: 'transform',
        scrollTrigger: { trigger: card, start: 'top 86%', once: true },
      },
    );
  });
}

initDesignMotion({
  rootSelector: '[data-storefront]',
  // A crisp, slightly quick scroll: a product page should feel responsive, not floaty.
  lenis: { duration: 1, touchMultiplier: 1.4 },
  anchorDuration: 1.4,
  progress: { fillSelector: '[data-f-progress]', axis: 'x' },
  choreography,
  onReducedMotion: (root) => {
    rmReveal = revealOnScrollReduced(root, RM_FADE_TARGETS);
  },
  cleanupReducedMotion: () => {
    rmReveal?.();
    rmReveal = null;
  },
});
