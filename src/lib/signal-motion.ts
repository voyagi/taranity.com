/**
 * Motion choreography for the Signal design: Lenis scroll, masked line
 * reveals, hairline draws, quick precise card scans, and the top scroll-progress bar.
 *
 * Strictly additive: the page is complete and visible without JS. The initial
 * hidden states live in signal.css behind html.js + reduced-motion gates, and
 * everything here animates them in. The shared plumbing (Lenis, progress,
 * anchor gliding, the Astro view-transition lifecycle, teardown) lives in
 * design-motion.ts; this file is the Signal config plus its unique GSAP block.
 *
 * Unlike Atlas, Signal carries no WebGL: the atmosphere is pure CSS, keeping
 * the JS lean (Lenis + GSAP only) for the most-sellable, fastest design.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initDesignMotion } from './design-motion';
import { revealOnScrollReduced } from './rm-reveal';

// Reduced-motion fallback targets: everything the choreography below hides under
// no-preference instead fades in (opacity only, no movement) as it enters the
// viewport. See src/lib/rm-reveal.ts and the shared CSS block in site.css.
const RM_FADE_TARGETS =
  '.s-mask-inner, [data-s-fade], [data-s-hero-fade], [data-s-rule], [data-s-hero-rule], [data-s-card]';
let rmReveal: (() => void) | null = null;

function choreography(_root: HTMLElement) {
  // NOTE on { y: 0 }: signal.css hides mask lines with translateY(120%).
  // GSAP parses that computed style as a pixel matrix (yPercent is not
  // recoverable from a matrix), so without owning `y` the parsed pixel
  // offset survives the yPercent tween and the line stays hidden. The
  // from-pose (yPercent 120 + y 0) is pixel-identical to the CSS pose.

  // Hero entrance: lines rise out of their masks, then the details settle in.
  gsap
    // Precise, instrument-quick entrance: panels snap into place, no float.
    .timeline({ defaults: { ease: 'power2.out' } })
    .fromTo(
      '.s-hero .s-mask-inner',
      // 120 matches the html.js gate in signal.css (line + descender pad).
      { yPercent: 120, y: 0 },
      { yPercent: 0, y: 0, duration: 0.7, stagger: 0.1 },
      0.1,
    )
    .fromTo(
      '[data-s-hero-fade]',
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 },
      0.4,
    )
    .fromTo(
      '[data-s-hero-rule]',
      { scaleX: 0 },
      { scaleX: 1, duration: 0.7, ease: 'power2.inOut' },
      0.45,
    );

  // Masked statements below the fold rise when their block enters.
  gsap.utils.toArray<HTMLElement>('[data-s-lines]').forEach((group) => {
    gsap.fromTo(
      group.querySelectorAll('.s-mask-inner'),
      // 120 matches the html.js gate in signal.css (line + descender pad).
      { yPercent: 120, y: 0 },
      {
        yPercent: 0,
        y: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: { trigger: group, start: 'top 80%', once: true },
      },
    );
  });

  // Everything tagged for a fade rises gently as it enters.
  ScrollTrigger.batch('[data-s-fade]', {
    start: 'top 88%',
    once: true,
    onEnter: (els) =>
      gsap.fromTo(
        els,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.06 },
      ),
  });

  // Hairlines draw themselves in.
  gsap.utils.toArray<HTMLElement>('[data-s-rule]').forEach((line) => {
    gsap.fromTo(
      line,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 0.7,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: line, start: 'top 90%', once: true },
      },
    );
  });

  // Offering cards scan open left-to-right as they enter - quick and precise,
  // like a dashboard panel rendering (initial clip in signal.css; the from-pose
  // must match that gate exactly).
  gsap.utils.toArray<HTMLElement>('[data-s-card]').forEach((card, i) => {
    gsap.fromTo(
      card,
      { clipPath: 'inset(0% 100% 0% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 0.5,
        ease: 'power2.out',
        delay: (i % 3) * 0.05,
        scrollTrigger: { trigger: card, start: 'top 86%', once: true },
      },
    );
  });
}

initDesignMotion({
  rootSelector: '[data-signal]',
  // A crisp, slightly quick scroll: a product page should feel responsive, not floaty.
  lenis: { duration: 1, touchMultiplier: 1.4 },
  anchorDuration: 1.4,
  progress: { fillSelector: '[data-s-progress]', axis: 'x' },
  choreography,
  onReducedMotion: (root) => {
    rmReveal = revealOnScrollReduced(root, RM_FADE_TARGETS);
  },
  cleanupReducedMotion: () => {
    rmReveal?.();
    rmReveal = null;
  },
});
