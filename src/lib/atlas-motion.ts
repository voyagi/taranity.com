/**
 * Motion choreography for the Atlas design: Lenis scroll, masked line
 * reveals, hairline draws, waypoint wipes, the instrument rail, and the
 * lazy-loaded WebGL journey (atlas-gl.ts, imported after first paint so the
 * server HTML always wins the race to the screen).
 *
 * Strictly additive: the page is complete and visible without JS. The
 * initial hidden states live in atlas.css behind html.js + reduced-motion
 * gates, and everything here animates them in. The shared plumbing (Lenis,
 * progress, anchor gliding, the Astro view-transition lifecycle, teardown)
 * lives in design-motion.ts; this file is the Atlas config, its unique GSAP
 * block, and the WebGL scene lifecycle (scheduled in onSetup, disposed in
 * onTeardown, so the GL scene is torn down before every swap too).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initDesignMotion } from './design-motion';
import { revealOnScrollReduced } from './rm-reveal';
import type { AtlasScene } from './atlas-gl';

let gl: AtlasScene | null = null;
let glIdle: number | null = null;
let glTimer: number | null = null;
// Generation counter: a swap or reduced-motion flip while the GL chunk is
// still downloading must orphan that in-flight boot, not mount a zombie scene.
let glGen = 0;

// Reduced-motion fallback targets: everything the choreography below hides under
// no-preference instead fades in (opacity only, no movement) as it enters the
// viewport. See src/lib/rm-reveal.ts and the shared CSS block in site.css.
const RM_FADE_TARGETS =
  '.a-mask-inner, [data-a-fade], [data-a-hero-fade], [data-a-rule], [data-a-hero-rule], [data-a-card]';
let rmReveal: (() => void) | null = null;

async function bootGl(gen: number, root: HTMLElement) {
  try {
    const mod = await import('./atlas-gl');
    if (gen !== glGen || gl) return; // torn down (or re-run) while loading
    gl = mod.createAtlasScene(root);
    // Deterministic signal for CSS and the e2e suite: 'on' = canvas live,
    // 'off' = WebGL declined, attribute absent = GL never attempted.
    root.setAttribute('data-gl', gl ? 'on' : 'off');
  } catch {
    if (gen === glGen) root.setAttribute('data-gl', 'off');
  }
}

function scheduleGl(root: HTMLElement) {
  const gen = ++glGen;
  const start = () => void bootGl(gen, root);
  // After first paint, when the main thread is quiet (rule 6: the content
  // never waits for WebGL). The timeout still bounds the wait on busy pages.
  if (typeof requestIdleCallback === 'function') {
    glIdle = requestIdleCallback(start, { timeout: 2000 });
  } else {
    glTimer = window.setTimeout(start, 350);
  }
}

function teardownGl() {
  glGen++; // orphan any in-flight GL boot
  if (glIdle !== null) {
    cancelIdleCallback(glIdle);
    glIdle = null;
  }
  if (glTimer !== null) {
    clearTimeout(glTimer);
    glTimer = null;
  }
  gl?.destroy();
  gl = null;
  // Mid-session reduced-motion flips tear down on a DOM that stays: clear the
  // signal so the CSS field returns to full strength (no-op before a swap).
  document.querySelector<HTMLElement>('[data-atlas]')?.removeAttribute('data-gl');
}

function choreography(_root: HTMLElement) {
  // NOTE on { y: 0 }: atlas.css hides mask lines with translateY(120%).
  // GSAP parses that computed style as a pixel matrix (yPercent is not
  // recoverable from a matrix), so without owning `y` the parsed pixel
  // offset survives the yPercent tween and the line stays hidden. The
  // from-pose (yPercent 120 + y 0) is pixel-identical to the CSS pose.

  // Hero entrance: lines rise out of their masks, then the details settle in.
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .fromTo(
      '.a-hero .a-mask-inner',
      // 120 matches the html.js gate in atlas.css (line + descender pad).
      { yPercent: 120, y: 0 },
      { yPercent: 0, y: 0, duration: 1.15, stagger: 0.14 },
      0.15,
    )
    .fromTo(
      '[data-a-hero-fade]',
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 },
      0.7,
    )
    .fromTo(
      '[data-a-hero-rule]',
      { scaleX: 0 },
      { scaleX: 1, duration: 1.4, ease: 'power2.inOut' },
      0.6,
    );

  // Masked statements below the fold rise when their block enters.
  gsap.utils.toArray<HTMLElement>('[data-a-lines]').forEach((group) => {
    gsap.fromTo(
      group.querySelectorAll('.a-mask-inner'),
      // 120 matches the html.js gate in atlas.css (line + descender pad).
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
  ScrollTrigger.batch('[data-a-fade]', {
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
  gsap.utils.toArray<HTMLElement>('[data-a-rule]').forEach((line) => {
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

  // Waypoint rows wipe open left-to-right as they enter (initial clip in
  // atlas.css; the from-pose must match that gate exactly).
  gsap.utils.toArray<HTMLElement>('[data-a-card]').forEach((card) => {
    gsap.fromTo(
      card,
      { clipPath: 'inset(0% 100% 0% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1.1,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: card, start: 'top 82%', once: true },
      },
    );
  });
}

initDesignMotion({
  rootSelector: '[data-atlas]',
  // The journey scroll: a touch quicker than Vitrine's gallery glide, still
  // smooth enough that the camera path reads as travel.
  lenis: { duration: 1.1, touchMultiplier: 1.4 },
  anchorDuration: 1.6,
  progress: { fillSelector: '[data-a-track-fill]', axis: 'y', pctSelector: '[data-a-track-pct]' },
  choreography,
  onReducedMotion: (root) => {
    // Skip the kinetic choreography and the GL journey entirely (onSetup, and so
    // scheduleGl, never runs under reduce); the .a-field backdrop stays as the
    // atmosphere while each section fades in.
    rmReveal = revealOnScrollReduced(root, RM_FADE_TARGETS);
  },
  cleanupReducedMotion: () => {
    rmReveal?.();
    rmReveal = null;
  },
  // The WebGL journey arrives last, on idle, never blocking the content.
  onSetup: (root) => scheduleGl(root),
  // Tear down the GL scene early (right after the reduced-motion cleanup), before
  // ctx/Lenis, so a View-Transition swap never leaks a context.
  onTeardown: teardownGl,
});
