/**
 * Central motion runtime for taranity.com.
 *
 * One bundle drives all animation declaratively via data-* hooks, so it stays
 * correct across Astro View Transitions (page <script> tags don't re-run on
 * client nav — but `astro:page-load` does fire, and we re-wire from the DOM).
 *
 * Hooks read from markup:
 *   [data-reveal]                 staggered fade/slide-in (IntersectionObserver)
 *   [data-anim="hero-title"]      SplitText character reveal
 *   [data-count]                  count-up number (+ data-count-suffix/-decimals/-prefix)
 *   [data-gallery] / [data-panel] horizontal pinned scrubbed gallery (desktop only)
 *
 * Everything is gated by prefers-reduced-motion and pointer type. With motion
 * reduced, content is simply present — no transforms, no Lenis, no pin.
 */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const mq = (q: string) => window.matchMedia(q);
const reduceMotion = () => mq('(prefers-reduced-motion: reduce)').matches;
const isCoarse = () => mq('(hover: none), (pointer: coarse)').matches;
const isDesktop = () => mq('(min-width: 1024px)').matches && !isCoarse();

let lenis: Lenis | null = null;
let rafCb: ((time: number) => void) | null = null;
let teardowns: Array<() => void> = [];
let booted = false;

function getLenis() {
  return lenis;
}

function initLenis() {
  if (lenis || reduceMotion()) return;
  lenis = new Lenis({
    duration: 1.1,
    lerp: 0.1,
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.6,
  });
  lenis.on('scroll', () => ScrollTrigger.update());
  rafCb = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(rafCb);
  gsap.ticker.lagSmoothing(0);
}

function clearPage() {
  for (const fn of teardowns) {
    try {
      fn();
    } catch {
      /* ignore teardown errors */
    }
  }
  teardowns = [];
  ScrollTrigger.getAll().forEach((st) => st.kill(false));
}

function setupReveals() {
  const els = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  if (!els.length) return;
  if (reduceMotion()) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        const delay = Number(el.dataset.revealDelay ?? 0);
        if (delay) el.style.transitionDelay = `${delay}ms`;
        el.classList.add('is-in');
        io.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  els.forEach((el) => io.observe(el));
  teardowns.push(() => io.disconnect());
}

function setupHero() {
  const title = document.querySelector<HTMLElement>('[data-anim="hero-title"]');
  if (!title || reduceMotion()) return;
  let split: SplitText | null = null;
  try {
    // Split words *and* chars: chars animate, but the word wrappers keep the
    // browser from breaking lines mid-word (e.g. "d|escribe").
    split = new SplitText(title, { type: 'words,chars' });
    const tween = gsap.from(split.chars, {
      yPercent: 115,
      opacity: 0,
      rotateX: -55,
      transformOrigin: '50% 100%',
      stagger: 0.022,
      duration: 0.85,
      ease: 'power3.out',
      delay: 0.1,
    });
    teardowns.push(() => {
      tween.kill();
      split?.revert();
    });
  } catch {
    title.style.opacity = '1';
  }
}

const fmt = (n: number, decimals: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);

function setupCounters() {
  const els = gsap.utils.toArray<HTMLElement>('[data-count]');
  for (const el of els) {
    const target = parseFloat(el.dataset.count ?? '0');
    const decimals = Number(el.dataset.countDecimals ?? 0);
    const prefix = el.dataset.countPrefix ?? '';
    const suffix = el.dataset.countSuffix ?? '';
    const render = (v: number) => {
      el.textContent = `${prefix}${fmt(v, decimals)}${suffix}`;
    };
    if (reduceMotion()) {
      render(target);
      continue;
    }
    render(0);
    const obj = { v: 0 };
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () =>
        gsap.to(obj, {
          v: target,
          duration: 1.4,
          ease: 'power2.out',
          onUpdate: () => render(obj.v),
        }),
    });
    teardowns.push(() => st.kill());
  }
}

function setupGallery() {
  const track = document.querySelector<HTMLElement>('[data-gallery]');
  const pin = track?.closest<HTMLElement>('[data-gallery-pin]');
  if (!track || !pin) return;
  // Mobile / reduced-motion: CSS renders a vertical stack; no JS pinning.
  if (!isDesktop() || reduceMotion()) return;

  const panels = gsap.utils.toArray<HTMLElement>('[data-panel]', track);
  if (panels.length < 2) return;

  track.classList.add('is-horizontal');
  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => '+=' + distance(),
      pin: true,
      scrub: 1,
      snap: { snapTo: 1 / (panels.length - 1), duration: 0.3, ease: 'power1.inOut' },
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  // A11y: when a card is tabbed to, scroll it into the pinned viewport.
  const onFocus = (i: number) => () => {
    const st = tween.scrollTrigger;
    if (!st) return;
    const progress = panels.length > 1 ? i / (panels.length - 1) : 0;
    const y = st.start + (st.end - st.start) * progress;
    const l = getLenis();
    if (l) l.scrollTo(y);
    else window.scrollTo({ top: y });
  };
  const focusHandlers = panels.map((panel, i) => {
    const h = onFocus(i);
    panel.addEventListener('focusin', h);
    return [panel, h] as const;
  });

  teardowns.push(() => {
    focusHandlers.forEach(([panel, h]) => panel.removeEventListener('focusin', h));
    tween.scrollTrigger?.kill();
    tween.kill();
    track.classList.remove('is-horizontal');
    gsap.set(track, { clearProps: 'x' });
  });
}

function setupPage() {
  document.documentElement.classList.add('js');
  clearPage();
  setupReveals();
  setupHero();
  setupCounters();
  setupGallery();
  ScrollTrigger.refresh();
}

function onLoad() {
  booted = true;
  initLenis();
  setupPage();
}

// Initial + every View-Transition navigation.
document.addEventListener('astro:page-load', onLoad);
// Tear down before the DOM is swapped out.
document.addEventListener('astro:before-swap', clearPage);
// Belt-and-suspenders: if astro:page-load somehow didn't fire, wire up on load.
window.addEventListener('load', () => {
  if (!booted) onLoad();
});

// Respond to a mid-session prefers-reduced-motion change.
mq('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
  if (e.matches) {
    lenis?.destroy();
    lenis = null;
    if (rafCb) {
      gsap.ticker.remove(rafCb);
      rafCb = null;
    }
    clearPage();
    setupPage();
  } else {
    onLoad();
  }
});

// Recompute scroll triggers on a user-driven theme change. Designs share one DOM
// (A1), so a CSS-only swap rarely shifts layout, but refresh keeps any pins correct.
// Skip 'restore' events (after-swap re-applies) — motion already re-inits per nav.
document.addEventListener('theme:change', (e) => {
  if (booted && (e as CustomEvent).detail?.source !== 'restore') ScrollTrigger.refresh();
});
