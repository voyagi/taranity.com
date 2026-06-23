/**
 * Reduced-motion reveal: a gentle, OPACITY-ONLY fade-in for scroll sections
 * when `prefers-reduced-motion: reduce` is active.
 *
 * Each design's motion runtime early-returns from its kinetic GSAP choreography
 * under reduced motion and calls this instead, so accessibility-minded visitors
 * still get a polished entrance - just with zero positional, scale, or clip
 * movement. The matching CSS lives in src/styles/site.css (one shared
 * `@media (prefers-reduced-motion: reduce)` block keyed on the classes below).
 *
 * Robustness contract (a past regression shipped an invisible hero - never
 * again). Content is visible by default:
 *  - The `opacity: 0` base state is keyed on `.rm-fade`, and THIS function is
 *    the only code that ever adds it - and only once an IntersectionObserver is
 *    confirmed supported and armed to reveal it. So with no JS, no
 *    IntersectionObserver, or no targets, `.rm-fade` is never added and every
 *    element stays fully visible.
 *  - Targets already on screen at setup are revealed synchronously, in the same
 *    task that arms them, so above-the-fold content paints at full opacity with
 *    no flash and no load-time fade.
 *  - The opacity transition is enabled one frame later (`html.rm-ready`), so
 *    arming the hidden state never animates content out; only later scroll
 *    reveals fade.
 */

/** Marks a target as armed for the reduced-motion fade (CSS sets opacity: 0). */
const FADE_CLASS = 'rm-fade';
/** Added once a target has entered the viewport (CSS sets opacity: 1). */
const REVEALED_CLASS = 'is-revealed';
/** Set on <html> one frame after arming, to enable the opacity transition. */
const READY_CLASS = 'rm-ready';

const inViewport = (el: Element): boolean => {
  const rect = el.getBoundingClientRect();
  // Reveal targets always have layout height (text lines, 1-2px rules), so the
  // strict `> 0` is safe. A hypothetical zero-area element could slip past here,
  // but the observer (threshold 0) still reveals it on the first scroll.
  return rect.bottom > 0 && rect.top < window.innerHeight;
};

/**
 * Fade `selector` matches inside `root` in (opacity only) as they enter the
 * viewport. Returns a teardown that disconnects the observer and disarms every
 * target - call it before a View-Transition swap or when motion is re-enabled.
 */
export function revealOnScrollReduced(root: HTMLElement, selector: string): () => void {
  const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
  // Default-visible exits: with no IntersectionObserver (so no reveal mechanism)
  // or nothing to reveal, never arm the hidden state. The no-op teardown keeps
  // the call sites uniform.
  if (typeof IntersectionObserver === 'undefined' || targets.length === 0) return () => {};

  const html = document.documentElement;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add(REVEALED_CLASS);
        obs.unobserve(entry.target);
      }
    },
    // Default root margin (no negative inset): every element that can be
    // scrolled into view is guaranteed to cross the threshold and reveal, so
    // nothing is ever left stuck hidden. The 0.7s opacity transition is what
    // makes the entrance gentle - not a delayed trigger.
    { threshold: 0 },
  );

  for (const el of targets) {
    // Arm the hidden state only now that a reveal is guaranteed to follow.
    el.classList.add(FADE_CLASS);
    // Anything already on screen is revealed synchronously, in this same task,
    // so it paints at full opacity on the first frame (no flash, no load fade).
    if (inViewport(el)) el.classList.add(REVEALED_CLASS);
    observer.observe(el);
  }

  // Enable the transition only after the armed + synchronously-revealed state
  // has painted, so arming never fades content out and above-the-fold reveals
  // stay instant; only subsequent scroll reveals animate.
  let rafId: number | null = null;
  if (typeof requestAnimationFrame === 'function') {
    rafId = requestAnimationFrame(() => html.classList.add(READY_CLASS));
  } else {
    html.classList.add(READY_CLASS);
  }

  return () => {
    if (rafId !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
    observer.disconnect();
    for (const el of targets) el.classList.remove(FADE_CLASS, REVEALED_CLASS);
    html.classList.remove(READY_CLASS);
  };
}
