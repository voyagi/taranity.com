/**
 * Motion choreography for the Practice design: Lenis scroll, masked line
 * reveals, hairline draws, soft service-card settles, and the top scroll-progress bar.
 *
 * Strictly additive: the page is complete and visible without JS. The initial
 * hidden states live in practice.css behind html.js + reduced-motion gates, and
 * everything here animates them in. The shared plumbing (Lenis, progress,
 * anchor gliding, the Astro view-transition lifecycle, teardown) lives in
 * design-motion.ts; this file is the Practice config plus its unique GSAP block.
 *
 * Like Signal and Storefront, Practice carries no WebGL: the atmosphere is pure
 * CSS, keeping the JS lean (Lenis + GSAP only) so a warm, rich page still loads
 * fast. The scroll is deliberately calm and measured - a trust-led page should
 * feel reassuring, not floaty or hurried.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initDesignMotion } from './design-motion';
import { revealOnScrollReduced } from './rm-reveal';

// Reduced-motion fallback targets: everything the choreography below hides under
// no-preference instead fades in (opacity only, no movement) as it enters the
// viewport. See src/lib/rm-reveal.ts and the shared CSS block in site.css.
const RM_FADE_TARGETS =
  '.p-mask-inner, [data-p-fade], [data-p-hero-fade], [data-p-rule], [data-p-hero-rule], [data-p-card]';
let rmReveal: (() => void) | null = null;

function choreography(_root: HTMLElement) {
  // NOTE on { y: 0 }: practice.css hides mask lines with translateY(120%).
  // GSAP parses that computed style as a pixel matrix (yPercent is not
  // recoverable from a matrix), so without owning `y` the parsed pixel
  // offset survives the yPercent tween and the line stays hidden. The
  // from-pose (yPercent 120 + y 0) is pixel-identical to the CSS pose.

  // Hero entrance: lines rise out of their masks, then the details settle in.
  gsap
    // Calm, soft entrance: everything eases in gently (sine), a little unhurried -
    // the quietest motion of the six, for a trust-led page.
    .timeline({ defaults: { ease: 'sine.out' } })
    .fromTo(
      '.p-hero .p-mask-inner',
      // 120 matches the html.js gate in practice.css (line + descender pad).
      { yPercent: 120, y: 0 },
      { yPercent: 0, y: 0, duration: 1.1, stagger: 0.14 },
      0.1,
    )
    .fromTo(
      '[data-p-hero-fade]',
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 1.0, stagger: 0.12 },
      0.45,
    )
    .fromTo(
      '[data-p-hero-rule]',
      { scaleX: 0 },
      { scaleX: 1, duration: 1.5, ease: 'sine.inOut' },
      0.5,
    );

  // Masked statements below the fold rise when their block enters.
  gsap.utils.toArray<HTMLElement>('[data-p-lines]').forEach((group) => {
    gsap.fromTo(
      group.querySelectorAll('.p-mask-inner'),
      // 120 matches the html.js gate in practice.css (line + descender pad).
      { yPercent: 120, y: 0 },
      {
        yPercent: 0,
        y: 0,
        duration: 1.1,
        stagger: 0.12,
        ease: 'sine.out',
        scrollTrigger: { trigger: group, start: 'top 80%', once: true },
      },
    );
  });

  // Everything tagged for a fade rises gently as it enters.
  ScrollTrigger.batch('[data-p-fade]', {
    start: 'top 88%',
    once: true,
    onEnter: (els) =>
      gsap.fromTo(
        els,
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.95, ease: 'sine.out', stagger: 0.1 },
      ),
  });

  // Hairlines draw themselves in.
  gsap.utils.toArray<HTMLElement>('[data-p-rule]').forEach((line) => {
    gsap.fromTo(
      line,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1.5,
        ease: 'sine.inOut',
        scrollTrigger: { trigger: line, start: 'top 90%', once: true },
      },
    );
  });

  // Service cards settle in softly - a gentle fade + small rise, like a document
  // filed into place. clearProps releases the inline transform on complete so the
  // CSS hover-lift keeps working. Opacity + transform only, so no layout shift.
  gsap.utils.toArray<HTMLElement>('[data-p-card]').forEach((card, i) => {
    gsap.fromTo(
      card,
      { autoAlpha: 0, y: 14 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1.0,
        ease: 'sine.out',
        delay: (i % 3) * 0.08,
        clearProps: 'transform',
        scrollTrigger: { trigger: card, start: 'top 86%', once: true },
      },
    );
  });
}

initDesignMotion({
  rootSelector: '[data-practice]',
  // A calm, measured scroll: a trust-led page should feel steady and reassuring.
  lenis: { duration: 1.1, touchMultiplier: 1.3 },
  anchorDuration: 1.4,
  progress: { fillSelector: '[data-p-progress]', axis: 'x' },
  choreography,
  onReducedMotion: (root) => {
    rmReveal = revealOnScrollReduced(root, RM_FADE_TARGETS);
  },
  cleanupReducedMotion: () => {
    rmReveal?.();
    rmReveal = null;
  },
});
