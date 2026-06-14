import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDesign } from '../../src/config/designs';

/**
 * Pins the cross-file invariants of the Raw design: the CSS motion gates must
 * stay byte-compatible with the poses raw-motion.ts animates from, the fixed
 * layers must never be re-pinned by a containing block, the dual-mode dark
 * palette must be defined twice in step, and the standalone stylesheet must
 * carry everything the page needs without the other designs' css (each design's
 * CSS ships alone).
 */

const css = readFileSync(
  resolve(__dirname, '../../src/components/designs/raw/raw.css'),
  'utf8',
);
const motion = readFileSync(resolve(__dirname, '../../src/lib/raw-motion.ts'), 'utf8');
const shell = readFileSync(
  resolve(__dirname, '../../src/components/designs/raw/Raw.astro'),
  'utf8',
);

/* NOTE: these regexes assume the matched blocks stay FLAT (no nested rules):
   [^}]* stops at the first closing brace. If the token blocks ever gain
   nesting, switch to a real CSS parser instead of widening the regex. */
const declarations = (block: string | undefined): string[] =>
  (block ?? '')
    .split(';')
    .map((d) => d.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .sort();

describe('raw registry wiring', () => {
  it('is ready, dual-mode, and routed where the page lives', () => {
    const raw = getDesign('raw');
    expect(raw?.ready).toBe(true);
    expect(raw?.modes).toEqual(['dark', 'light']);
    expect(raw?.route).toBe('/raw');
  });
});

describe('raw fixed-layer containment invariant', () => {
  /* .r-field and .r-progress are position: fixed inside .raw. Any of these
     properties on the base .raw block would turn it into a containing block and
     silently re-pin both layers inside the page flow instead of the viewport. */
  const baseBlock = css.match(/^\.raw \{([^}]*)\}/m)?.[1];

  it('finds the base .raw block', () => {
    expect(baseBlock, 'base .raw block missing').toBeTruthy();
  });

  it('never declares containing-block-forming properties on .raw', () => {
    const offenders = declarations(baseBlock).filter((d) =>
      /^(transform|filter|backdrop-filter|perspective|contain|isolation|will-change)\s*:/.test(d),
    );
    expect(offenders).toEqual([]);
  });
});

describe('raw dual-mode dark palette', () => {
  /* raw.css must define the dark palette twice: once for the explicit data-mode
     attribute and once as the no-JS prefers-color-scheme fallback (pure CSS
     cannot express "attribute OR media query" in one block without regressing
     older browsers). Pin the two copies together so an edit to one without the
     other fails loudly. */
  const attrBlock = css.match(/:root\[data-mode='dark'\] \.raw \{([^}]*)\}/)?.[1];
  const noJsBlock = css.match(/:root:not\(\[data-mode\]\) \.raw \{([^}]*)\}/)?.[1];

  it('defines both the data-mode block and the no-JS fallback block', () => {
    expect(attrBlock, 'data-mode dark block missing').toBeTruthy();
    expect(noJsBlock, 'no-JS prefers-color-scheme fallback block missing').toBeTruthy();
  });

  it('keeps the two dark token sets identical', () => {
    expect(declarations(noJsBlock)).toEqual(declarations(attrBlock));
  });

  it('actually contains tokens (guards against a regex/refactor silently matching nothing)', () => {
    expect(declarations(attrBlock).length).toBeGreaterThanOrEqual(5);
  });
});

describe('raw standalone stylesheet', () => {
  it('carries its own html.v-lenis scrollbar rules (other designs css never loads on /raw)', () => {
    expect(css).toMatch(/html\.v-lenis \{[^}]*scrollbar-width: none/);
    expect(css).toMatch(/html\.v-lenis::-webkit-scrollbar/);
  });
});

describe('raw motion gate sync', () => {
  /* The CSS hides content pre-reveal; raw-motion.ts animates from poses that
     must be pixel-identical to those gates, or the first tween tick snaps
     visibly (or the content never reveals at all). */
  it('mask gate translateY(120%) matches the yPercent the tweens own', () => {
    expect(css).toMatch(/html\.js \.raw \.r-mask-inner \{[^}]*translateY\(120%\)/);
    expect(motion).toMatch(/yPercent: 120/);
  });

  it('mask from-pose co-owns y:0 with the yPercent (GSAP cannot recover yPercent from a matrix)', () => {
    // The CSS hides lines with translateY(120%), which GSAP reads as a pixel
    // matrix. Without owning `y` in the same from-pose, that parsed pixel offset
    // survives the yPercent tween and the line stays hidden forever. Pin it.
    expect(motion).toMatch(/yPercent: 120, y: 0/);
  });

  it('card clip gate matches the from-pose string exactly', () => {
    const gate = css.match(/html\.js \.raw \[data-r-card\] \{[^}]*clip-path: (inset\([^)]*\))/)?.[1];
    expect(gate, 'card clip gate missing').toBeTruthy();
    expect(motion).toContain(`clipPath: '${gate}'`);
  });

  it('hides only attributes the choreography actually animates back in', () => {
    for (const attr of ['data-r-fade', 'data-r-hero-fade', 'data-r-rule', 'data-r-hero-rule']) {
      expect(css.includes(`[${attr}]`), `${attr} gate missing in css`).toBe(true);
      expect(motion.includes(`[${attr}]`), `${attr} never animated in motion`).toBe(true);
    }
  });
});

describe('raw field layer wiring', () => {
  /* The .r-field layers are addressed by nth-child, so the CSS and the <i> count
     in the shell must move together: a dropped <i> silently kills layers with no
     other failure. */
  it('the shell carries three field layers', () => {
    const fieldLine = shell.match(/class="r-field"[^>]*>((?:<i><\/i>)+)/)?.[1] ?? '';
    const count = (fieldLine.match(/<i><\/i>/g) ?? []).length;
    expect(count).toBe(3);
  });

  it('the CSS addresses every field layer it expects', () => {
    expect(css.includes('.r-field i:first-child'), 'first-child rule missing').toBe(true);
    for (const n of [2, 3]) {
      expect(css.includes(`.r-field i:nth-child(${n})`), `nth-child(${n}) rule missing`).toBe(true);
    }
  });

  it('the shell mounts the progress bar the runtime drives', () => {
    expect(shell).toContain('data-r-progress');
    expect(motion).toContain('data-r-progress');
  });
});
