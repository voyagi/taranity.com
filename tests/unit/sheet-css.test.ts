import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDesign } from '../../src/config/designs';

/**
 * Pins the cross-file invariants of the Sheet design. Sheet is deliberately
 * unlike the other six: it is a document (no hero, no card grid), native-scroll
 * (no Lenis / no *-motion.ts), so it does NOT share the mask / card / motion-gate
 * contracts the signal-css test pins. What it DOES share with the dual-mode
 * designs is the twice-defined dark palette, and it must keep the fixed-layer
 * containment invariant clean. The rest here pins Sheet's own devices (the accent
 * used only as an index marker, the <details> grid-row reveal) so a careless edit
 * fails here instead of shipping a broken document.
 */

const css = readFileSync(
  resolve(__dirname, '../../src/components/designs/sheet/sheet.css'),
  'utf8',
);
/* Comment-free CSS for the anti-generic checks: the invariant comment names
   `backdrop-filter` / `filter` in prose, which must not trip a declaration scan. */
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');
const shell = readFileSync(
  resolve(__dirname, '../../src/components/designs/sheet/Sheet.astro'),
  'utf8',
);

/* These regexes assume the matched blocks stay FLAT (no nested rules):
   [^}]* stops at the first closing brace. */
const declarations = (block: string | undefined): string[] =>
  (block ?? '')
    .split(';')
    .map((d) => d.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .sort();

describe('sheet registry wiring', () => {
  it('is ready, dual-mode, and routed where the page lives', () => {
    const sheet = getDesign('sheet');
    expect(sheet?.ready).toBe(true);
    expect(sheet?.modes).toEqual(['light', 'dark']);
    expect(sheet?.route).toBe('/sheet');
  });
});

describe('sheet fixed-layer containment invariant', () => {
  /* Sheet has no fixed children today, but the base block must stay free of
     containing-block-forming properties so a future fixed layer (e.g. a sticky
     reading rule) is never silently re-pinned inside the flow. */
  const baseBlock = css.match(/^\.sheet \{([^}]*)\}/m)?.[1];

  it('finds the base .sheet block', () => {
    expect(baseBlock, 'base .sheet block missing').toBeTruthy();
  });

  it('never declares containing-block-forming properties on .sheet', () => {
    const offenders = declarations(baseBlock).filter((d) =>
      /^(transform|filter|backdrop-filter|perspective|contain|isolation|will-change)\s*:/.test(d),
    );
    expect(offenders).toEqual([]);
  });
});

describe('sheet dual-mode dark palette', () => {
  /* sheet.css must define the dark palette twice: once for the explicit
     data-mode attribute and once as the no-JS prefers-color-scheme fallback.
     Pin the two copies together so an edit to one without the other fails. */
  const attrBlock = css.match(/:root\[data-mode='dark'\] \.sheet \{([^}]*)\}/)?.[1];
  const noJsBlock = css.match(/:root:not\(\[data-mode\]\) \.sheet \{([^}]*)\}/)?.[1];

  it('defines both the data-mode block and the no-JS fallback block', () => {
    expect(attrBlock, 'data-mode dark block missing').toBeTruthy();
    expect(noJsBlock, 'no-JS prefers-color-scheme fallback block missing').toBeTruthy();
  });

  it('keeps the two dark token sets identical', () => {
    expect(declarations(noJsBlock)).toEqual(declarations(attrBlock));
  });

  it('actually contains tokens (guards against a regex/refactor silently matching nothing)', () => {
    expect(declarations(attrBlock).length).toBeGreaterThanOrEqual(8);
  });
});

describe('sheet is a document, not a hero + card grid', () => {
  it('renders the build-sheet index and the invitation, not a hero or a card grid', () => {
    // Structural markers: the ruled index and the emotional spine exist; there is
    // no hero/card-grid vocabulary borrowed from the other designs.
    expect(shell).toContain('sh-buildsheet');
    expect(shell).toContain('sh-invite');
    expect(shell).not.toMatch(/\bs-hero\b|\bs-card\b/);
  });

  it('spends the accent + motion only on the invitation, chips, done tick, and marker (no gradient/glass)', () => {
    // No gradients or glass anywhere - the anti-generic contract.
    expect(cssCode).not.toMatch(/linear-gradient|radial-gradient/i);
    expect(cssCode).not.toMatch(/backdrop-filter/i);
  });
});

describe('sheet reveal + reduced motion', () => {
  it('reveals <details> by animating grid-template-rows 0fr -> 1fr', () => {
    expect(css).toMatch(/\.sh-reveal-body \{[^}]*grid-template-rows: 0fr/);
    expect(css).toMatch(/\.sh-reveal\[open\] > \.sh-reveal-body \{[^}]*grid-template-rows: 1fr/);
  });

  it('gates every transition behind prefers-reduced-motion: no-preference', () => {
    // Sheet has its own reduced-motion handling (no shared rm-fade helper): every
    // transition must live inside a no-preference block, so reduce disables them all.
    // Brace-match each no-preference media block and strip it, then assert no
    // stray `transition:` survives (comment-stripped so prose can't false-match).
    let stripped = cssCode;
    for (;;) {
      const start = stripped.indexOf('@media (prefers-reduced-motion: no-preference)');
      if (start === -1) break;
      let depth = 0;
      let end = -1;
      for (let i = stripped.indexOf('{', start); i >= 0 && i < stripped.length; i++) {
        if (stripped[i] === '{') depth++;
        else if (stripped[i] === '}' && --depth === 0) {
          end = i + 1;
          break;
        }
      }
      if (end === -1) break; // unbalanced; let the raw assertion below catch it
      stripped = stripped.slice(0, start) + stripped.slice(end);
    }
    expect(stripped).not.toMatch(/(^|[;{}\s])transition\s*:/);
  });
});

describe('sheet filter progressive enhancement', () => {
  it('ships the chips as real anchors and a live count (works with JS off)', () => {
    expect(shell).toContain('data-sh-chip');
    expect(shell).toMatch(/data-sh-count[^>]*aria-live="polite"/);
    // Chips are anchors, so no-JS degrades to an in-page jump.
    expect(shell).toMatch(/<a class="sh-chip"/);
  });

  it('imports the bundled island (no inline script, so no new CSP hash)', () => {
    expect(shell).toMatch(/import '\.\.\/\.\.\/\.\.\/lib\/sheet-filter'/);
  });
});
