/**
 * Ink's hero island, a small bundled module (imported from Ink.astro via
 * `<script>import`, so it compiles to /_astro/*.js under script-src 'self' and
 * adds ZERO CSP inline hashes; astro.config.mjs pins it to its own chunk).
 *
 * Two jobs, both strictly additive on top of complete server HTML:
 *
 *  1. The giant slab word rotates through the five build nouns. The server
 *     renders the first word; with JS off it simply stays. Under reduced
 *     motion the rotation NEVER starts (and a live switch to reduce stops it),
 *     so the page holds one static word. The h1's accessible name is a stable
 *     visually-hidden sentence either way; the rotating span is aria-hidden.
 *
 *  2. The blob menu. The burger button (a real <button> on the black edge
 *     blob) opens a full-screen solid-white overlay of big links. Focus moves
 *     to the Close button, Tab wraps inside the overlay, Escape or Close
 *     dismisses and returns focus to the trigger, aria-expanded tracks state,
 *     and scrolling behind is locked via a class on <html>. Choosing a link
 *     closes first (unlocking scroll) so the in-page anchor can land.
 */

/**
 * Code-owned word list: Ink.astro derives the first word, the visually-hidden
 * h1 sentence, AND the five service section ids/headings from this one array
 * (via src/config/ink.ts), so the rotation and the sections can never drift.
 */
export const HERO_WORDS = ['Websites', 'Stores', 'Apps', 'Automation', 'Systems'] as const;

const SWAP_MS = 2800;
/* Must match the .ik-word transition duration in ink.css: the text swaps at
   the faded-out point so the next word fades back in rather than popping. */
const FADE_MS = 240;

interface Handle {
  root: HTMLElement;
  destroy(): void;
}

function bindWord(root: HTMLElement): (() => void) | null {
  const word = root.querySelector<HTMLElement>('[data-ik-word]');
  if (!word) return null;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let interval = 0;
  let fadeTimer = 0;
  let index = 0;

  const swap = () => {
    index = (index + 1) % HERO_WORDS.length;
    word.classList.add('is-swapping');
    fadeTimer = window.setTimeout(() => {
      word.textContent = HERO_WORDS[index];
      word.classList.remove('is-swapping');
    }, FADE_MS);
  };
  const start = () => {
    if (!interval) interval = window.setInterval(swap, SWAP_MS);
  };
  const stop = () => {
    window.clearInterval(interval);
    window.clearTimeout(fadeTimer);
    interval = 0;
    // Never park the word mid-fade: a stop between swap() and its timeout
    // would otherwise leave the slab invisible.
    word.classList.remove('is-swapping');
  };
  // Live preference change (the OS toggle mid-visit), both directions.
  const onMotionChange = () => {
    if (motionQuery.matches) stop();
    else start();
  };

  // Reduced motion: the rotation never starts; the first word stands.
  if (!motionQuery.matches) start();
  motionQuery.addEventListener('change', onMotionChange);

  return () => {
    stop();
    motionQuery.removeEventListener('change', onMotionChange);
  };
}

function bindMenu(root: HTMLElement): (() => void) | null {
  const trigger = root.querySelector<HTMLButtonElement>('[data-ik-menu-button]');
  const overlay = root.querySelector<HTMLElement>('[data-ik-menu]');
  const closeBtn = overlay?.querySelector<HTMLButtonElement>('[data-ik-menu-close]');
  if (!trigger || !overlay || !closeBtn) return null;

  const isOpen = () => !overlay.hidden;

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    // Dead-simple focus trap: Tab wraps within the overlay's own focusables.
    const focusables = Array.from(
      overlay.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;
    if (e.shiftKey && (current === first || !overlay.contains(current))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && current === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const open = () => {
    overlay.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    // Scroll lock lives on <html> so the page behind the overlay cannot move.
    document.documentElement.classList.add('ik-menu-open');
    document.addEventListener('keydown', onKeydown);
    closeBtn.focus();
  };
  const close = (returnFocus = true) => {
    if (!isOpen()) return;
    overlay.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('ik-menu-open');
    document.removeEventListener('keydown', onKeydown);
    if (returnFocus) trigger.focus();
  };

  const onTrigger = () => (isOpen() ? close() : open());
  const onClose = () => close();
  // A chosen link must land on its target: close first (unlocking scroll) and
  // do NOT pull focus back to the trigger, or the anchor jump gets stranded.
  const onLink = () => close(false);

  trigger.addEventListener('click', onTrigger);
  closeBtn.addEventListener('click', onClose);
  const links = Array.from(overlay.querySelectorAll<HTMLAnchorElement>('a[href]'));
  for (const link of links) link.addEventListener('click', onLink);

  return () => {
    close(false); // unlock scroll + drop the document listener on page swap
    trigger.removeEventListener('click', onTrigger);
    closeBtn.removeEventListener('click', onClose);
    for (const link of links) link.removeEventListener('click', onLink);
  };
}

let active: Handle | null = null;

function init(): void {
  const root = document.querySelector<HTMLElement>('[data-ink]');
  // A client-side navigation swaps the DOM: release the handlers bound to the
  // removed tree (the word interval would otherwise tick against dead nodes).
  if (active && active.root !== root) {
    active.destroy();
    active = null;
  }
  if (!root || root.dataset.ikBound) return;
  root.dataset.ikBound = '1';
  const cleanups: Array<() => void> = [];
  const wordCleanup = bindWord(root);
  if (wordCleanup) cleanups.push(wordCleanup);
  const menuCleanup = bindMenu(root);
  if (menuCleanup) cleanups.push(menuCleanup);
  active = {
    root,
    destroy() {
      for (const cleanup of cleanups) cleanup();
    },
  };
}

// Bind on first load and after each client-side navigation (Astro view
// transitions). Guarded so the module stays importable from node (Ink.astro
// and src/config/ink.ts import HERO_WORDS at build time).
if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', init);
}
