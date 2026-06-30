/**
 * Motion choreography for the Vitrine design: slow Lenis scroll, masked line
 * reveals, hairline draws, and plate parallax.
 *
 * Strictly additive: the server HTML is complete and visible without JS. The
 * initial hidden states live in vitrine.css behind html.js + reduced-motion
 * gates, and everything here animates them in. The shared plumbing (Lenis,
 * progress, anchor gliding, the Astro view-transition lifecycle, teardown)
 * lives in design-motion.ts; this file is the Vitrine config plus its unique
 * GSAP block.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initDesignMotion } from './design-motion';
import { revealOnScrollReduced } from './rm-reveal';

// Reduced-motion fallback targets: everything the choreography below hides under
// no-preference instead fades in (opacity only, no movement) as it enters the
// viewport. See src/lib/rm-reveal.ts and the shared CSS block in site.css.
const RM_FADE_TARGETS =
  '.v-mask-inner, [data-v-fade], [data-v-hero-fade], [data-v-hero-rule], [data-v-plate-art]';
let rmReveal: (() => void) | null = null;

function choreography(_root: HTMLElement) {
  // NOTE on { y: 0 }: vitrine.css hides mask lines with translateY(120%).
  // GSAP parses that computed style as a pixel matrix (yPercent is not
  // recoverable from a matrix), so without owning `y` the parsed pixel
  // offset survives the yPercent tween and the line stays hidden. The
  // from-pose (yPercent 120 + y 0) is pixel-identical to the CSS pose.

  // Hero entrance: lines rise out of their masks, then the details settle in.
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .fromTo(
      '.v-hero .v-mask-inner',
      // 120 matches the html.js gate in vitrine.css (line + descender pad).
      { yPercent: 120, y: 0 },
      { yPercent: 0, y: 0, duration: 1.15, stagger: 0.14 },
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
      // 120 matches the html.js gate in vitrine.css (line + descender pad).
      { yPercent: 120, y: 0 },
      {
        yPercent: 0,
        y: 0,
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

  // Plates wipe open bottom-up as they enter (initial clip in vitrine.css),
  // then the oversized art layer drifts as the plate crosses the viewport
  // (its -10% inset means edges never show).
  gsap.utils.toArray<HTMLElement>('[data-v-plate-art]').forEach((art) => {
    gsap.fromTo(
      art,
      // Must match the `html.js .vitrine [data-v-plate-art]` gate in
      // vitrine.css, or the first tween tick snaps to a different pose.
      { clipPath: 'inset(0% 0% 100% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1.25,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: art, start: 'top 74%', once: true },
      },
    );
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
}

initDesignMotion({
  rootSelector: '[data-vitrine]',
  // Slow, cinematic scroll.
  lenis: { duration: 1.35, touchMultiplier: 1.4 },
  anchorDuration: 1.6,
  progress: { fillSelector: '[data-v-progress]', axis: 'x' },
  choreography,
  onReducedMotion: (root) => {
    rmReveal = revealOnScrollReduced(root, RM_FADE_TARGETS);
  },
  cleanupReducedMotion: () => {
    rmReveal?.();
    rmReveal = null;
  },
});
