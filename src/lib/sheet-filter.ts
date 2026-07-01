/**
 * Sheet's build-sheet filter, a small bundled island (imported from Sheet.astro
 * via `<script>import`, so it compiles to /_astro/*.js under script-src 'self'
 * and adds ZERO CSP inline hashes).
 *
 * Progressive enhancement: with JS OFF the chips are real in-page anchor links
 * and every entry is visible (the server renders them all), so filtering
 * degrades to a jump and nothing is hidden. With JS ON this upgrades the chips
 * to buttons-in-behaviour: it toggles the `hidden` attribute on entries that do
 * not carry the active intent, updates a live "N of M" count (aria-live), sets
 * aria-current on the active chip, and keeps keyboard focus sane. CSS does the
 * visual state off aria-current; this file owns only the data + a11y.
 */

const ALL = 'all';

interface Refs {
  root: HTMLElement;
  chips: HTMLAnchorElement[];
  entries: HTMLElement[];
  count: HTMLElement;
}

function collect(root: HTMLElement): Refs | null {
  const chips = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-sh-chip]'));
  const entries = Array.from(root.querySelectorAll<HTMLElement>('[data-sh-entry]'));
  const count = root.querySelector<HTMLElement>('[data-sh-count]');
  if (!chips.length || !entries.length || !count) return null;
  return { root, chips, entries, count };
}

/** An entry matches "all", or when its space-separated intents include the filter. */
function matches(entry: HTMLElement, intent: string): boolean {
  if (intent === ALL) return true;
  const intents = (entry.dataset.shIntents ?? '').split(/\s+/).filter(Boolean);
  return intents.includes(intent);
}

function apply(refs: Refs, intent: string, prefersReduced: boolean, animate = true): void {
  let shown = 0;
  for (const entry of refs.entries) {
    const show = matches(entry, intent);
    entry.hidden = !show;
    if (show) shown++;
  }

  // Live count: "N of M". aria-live on the element announces the change.
  refs.count.textContent = `${shown} of ${refs.entries.length}`;

  for (const chip of refs.chips) {
    // aria-current (valid on the <a> chips) marks the active filter; aria-pressed
    // is not allowed on an anchor.
    if (chip.dataset.shChip === intent) chip.setAttribute('aria-current', 'true');
    else chip.removeAttribute('aria-current');
  }

  // A subtle re-scan dip on the list, only on an actual filter change (not the
  // initial sync) and never under reduced motion.
  if (animate && !prefersReduced) {
    refs.root.setAttribute('data-scanning', '');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => refs.root.removeAttribute('data-scanning'));
    });
  }
}

function init(): void {
  const root = document.querySelector<HTMLElement>('[data-sh-buildsheet]');
  if (!root || root.dataset.shBound) return;
  const refs = collect(root);
  if (!refs) return;
  root.dataset.shBound = '1';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Every entry renders server-side; the sheet opens on "all" (nothing hidden). No
  // scan animation on this initial sync - the dip signals a filter change, not load.
  apply(refs, ALL, prefersReduced, false);

  for (const chip of refs.chips) {
    chip.addEventListener('click', (e) => {
      // Intercept: filter in place instead of jumping. The href stays a real
      // anchor for the no-JS path, so we preventDefault only when we handle it.
      const intent = chip.dataset.shChip;
      if (!intent) return;
      e.preventDefault();
      apply(refs, intent, prefersReduced);
      // Keep focus on the chip the user activated (a jump would have moved it).
      chip.focus();
    });
  }
}

// Bind on first load and after each client-side navigation (Astro view transitions).
document.addEventListener('astro:page-load', init);
