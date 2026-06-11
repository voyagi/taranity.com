/**
 * Motion choreography for the Atlas design: Lenis scroll, masked line
 * reveals, hairline draws, waypoint wipes, the instrument rail, and the
 * lazy-loaded WebGL journey (atlas-gl.ts, imported after first paint so the
 * server HTML always wins the race to the screen).
 *
 * Strictly additive: the page is complete and visible without JS. The
 * initial hidden states live in atlas.css behind html.js + reduced-motion
 * gates, and everything here animates them in. Gated on [data-atlas] so it
 * does nothing on other designs' pages after a View-Transition swap, and
 * torn down (Lenis and the GL scene included) before every swap so designs
 * never double-drive the scroll.
 */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { AtlasScene } from './atlas-gl';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let rafCb: ((time: number) => void) | null = null;
let ctx: gsap.Context | null = null;
let removeAnchorHandler: (() => void) | null = null;
let gl: AtlasScene | null = null;
let glIdle: number | null = null;
let glTimer: number | null = null;
// Generation counter: a swap or reduced-motion flip while the GL chunk is
// still downloading must orphan that in-flight boot, not mount a zombie scene.
let glGen = 0;
// Guards the window-load fallback only; `load` fires once per full page load,
// so this never needs to reset across View-Transition navigations.
let pageLoadFired = false;

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

function teardown() {
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
  document.querySelector<HTMLElement>('[data-a-track-fill]')?.style.removeProperty('transform');
}

function setup() {
  teardown();
  const root = document.querySelector<HTMLElement>('[data-atlas]');
  // Reduced motion: atlas.css never hides anything and the GL journey is
  // skipped entirely (the .a-field backdrop is the whole atmosphere).
  if (!root || reduceMotion()) return;

  // The journey scroll: a touch quicker than Vitrine's gallery glide, still
  // smooth enough that the camera path reads as travel. While Lenis drives,
  // the native scrollbar is hidden (dragging it fights the smoothing loop)
  // and the instrument rail takes over as the position indicator.
  lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.4 });
  // Usually already set pre-paint by SiteLayout's inline script (data-smooth);
  // re-adding covers the mid-session "reduced motion turned off" path.
  document.documentElement.classList.add('v-lenis');
  const fill = document.querySelector<HTMLElement>('[data-a-track-fill]');
  const pct = document.querySelector<HTMLElement>('[data-a-track-pct]');
  const setTrack = (progress: number) => {
    if (fill) fill.style.transform = `scaleY(${progress})`;
    if (pct) pct.textContent = `${Math.round(progress * 100)}%`;
  };
  // Sync immediately so a visitor already mid-page (motion toggled on, or a
  // restored scroll position) does not see the rail stuck at zero until the
  // first scroll event.
  const limit = document.documentElement.scrollHeight - window.innerHeight;
  setTrack(limit > 0 ? window.scrollY / limit : 0);
  lenis.on('scroll', (l: Lenis) => {
    ScrollTrigger.update();
    if (l.limit > 0) setTrack(l.scroll / l.limit);
  });
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
  }, root);

  ScrollTrigger.refresh();

  // The WebGL journey arrives last, on idle, never blocking the content.
  scheduleGl(root);
}

// Initial load + every View-Transition navigation.
document.addEventListener('astro:page-load', () => {
  pageLoadFired = true;
  setup();
});
// Tear down (Lenis and GL included) before the DOM is swapped out.
document.addEventListener('astro:before-swap', teardown);
// Belt-and-suspenders: if astro:page-load somehow didn't fire, wire up on load.
window.addEventListener('load', () => {
  if (!pageLoadFired) {
    pageLoadFired = true;
    setup();
  }
});

// Respond to a mid-session prefers-reduced-motion change in either direction:
// setup() calls teardown() first (that teardown doubles as the cleanup when
// the new state is reduce, destroying the GL scene and removing v-lenis), and
// the CSS gates flip with the media query.
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => setup());
