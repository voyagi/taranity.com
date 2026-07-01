/**
 * Motion choreography for the Raw design: Lenis scroll, masked line reveals,
 * hairline draws, card wipes, and the top scroll-progress bar.
 *
 * Strictly additive: the page is complete and visible without JS. The initial
 * hidden states live in raw.css behind html.js + reduced-motion gates, and
 * everything here animates them in. The shared plumbing (Lenis, progress,
 * anchor gliding, the Astro view-transition lifecycle, teardown) lives in
 * design-motion.ts; this file is the Raw config plus its unique GSAP block.
 *
 * Like Signal, Storefront, and Practice, Raw carries no WebGL: the atmosphere is
 * pure CSS (the graph grid, scanlines, and glitch), keeping the JS lean (Lenis +
 * GSAP only) so a dense brutalist page still loads fast. Unlike the other five
 * designs, Raw's reveals are STEPPED and abrupt (steps() eases over a fast Lenis),
 * never buttery - content ratchets up and "loads in" like a terminal rendering
 * blocks, the rules fill like a progress bar. The chromatic glitch stays a static
 * CSS effect; nothing flickers on scroll (vestibular/photosensitivity safety).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initDesignMotion } from './design-motion';
import { revealOnScrollReduced } from './rm-reveal';

// Reduced-motion fallback targets: everything the choreography below hides under
// no-preference instead fades in (opacity only, no movement) as it enters the
// viewport. See src/lib/rm-reveal.ts and the shared CSS block in site.css.
const RM_FADE_TARGETS =
  '.r-mask-inner, [data-r-fade], [data-r-hero-fade], [data-r-rule], [data-r-hero-rule], [data-r-card]';
let rmReveal: (() => void) | null = null;

function choreography(_root: HTMLElement) {
  // NOTE on { y: 0 }: raw.css hides mask lines with translateY(120%). GSAP
  // parses that computed style as a pixel matrix (yPercent is not recoverable
  // from a matrix), so without owning `y` the parsed pixel offset survives the
  // yPercent tween and the line stays hidden. The from-pose (yPercent 120 +
  // y 0) is pixel-identical to the CSS pose.

  // Hero entrance: lines rise out of their masks, then the details settle in.
  gsap
    // Stepped, mechanical entrance: lines ratchet up, the rule loads across.
    .timeline({ defaults: { ease: 'steps(3)' } })
    .fromTo(
      '.r-hero .r-mask-inner',
      // 120 matches the html.js gate in raw.css (line + descender pad).
      { yPercent: 120, y: 0 },
      { yPercent: 0, y: 0, duration: 0.45, stagger: 0.08 },
      0.1,
    )
    .fromTo(
      '[data-r-hero-fade]',
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 0.3, ease: 'steps(2)', stagger: 0.07 },
      0.35,
    )
    .fromTo(
      '[data-r-hero-rule]',
      { scaleX: 0 },
      // Loads across in hard chunks, like a terminal progress bar.
      { scaleX: 1, duration: 0.4, ease: 'steps(6)' },
      0.4,
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
        duration: 0.4,
        stagger: 0.07,
        ease: 'steps(3)',
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
        { autoAlpha: 1, y: 0, duration: 0.25, ease: 'steps(2)', stagger: 0.06 },
      ),
  });

  // Hairlines draw themselves in.
  gsap.utils.toArray<HTMLElement>('[data-r-rule]').forEach((line) => {
    gsap.fromTo(
      line,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 0.4,
        ease: 'steps(6)',
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
        // Renders open in hard chunks, like a CRT drawing blocks.
        duration: 0.35,
        ease: 'steps(4)',
        delay: (i % 3) * 0.05,
        scrollTrigger: { trigger: card, start: 'top 86%', once: true },
      },
    );
  });
}

initDesignMotion({
  rootSelector: '[data-raw]',
  // Fast and immediate: the brutalist page should respond like a terminal, not
  // glide. The snappiest Lenis of the six (was 0.9).
  lenis: { duration: 0.55, touchMultiplier: 1.4 },
  anchorDuration: 1.3,
  progress: { fillSelector: '[data-r-progress]', axis: 'x' },
  choreography,
  onReducedMotion: (root) => {
    rmReveal = revealOnScrollReduced(root, RM_FADE_TARGETS);
  },
  cleanupReducedMotion: () => {
    rmReveal?.();
    rmReveal = null;
  },
});
