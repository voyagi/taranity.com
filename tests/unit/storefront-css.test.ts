import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDesign } from '../../src/config/designs';

/**
 * Pins the cross-file invariants of the Storefront design: the CSS motion gates
 * must stay byte-compatible with the poses storefront-motion.ts animates from,
 * the fixed layers must never be re-pinned by a containing block, color-scheme
 * must stay pinned to light (a light-only design must not let a dark data-mode
 * restyle native widgets), and the standalone stylesheet must carry everything
 * the page needs without the other designs' css (each design's CSS ships alone).
 */

const css = readFileSync(
  resolve(__dirname, '../../src/components/designs/storefront/storefront.css'),
  'utf8',
);
const motion = readFileSync(resolve(__dirname, '../../src/lib/storefront-motion.ts'), 'utf8');
const shell = readFileSync(
  resolve(__dirname, '../../src/components/designs/storefront/Storefront.astro'),
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

describe('storefront registry wiring', () => {
  it('is ready, light-only, and routed where the page lives', () => {
    const storefront = getDesign('storefront');
    expect(storefront?.ready).toBe(true);
    expect(storefront?.modes).toEqual(['light']);
    expect(storefront?.route).toBe('/storefront');
  });
});

describe('storefront fixed-layer containment invariant', () => {
  /* .f-field and .f-progress are position: fixed inside .storefront. Any of
     these properties on the base .storefront block would turn it into a
     containing block and silently re-pin both layers inside the page flow
     instead of the viewport. */
  const baseBlock = css.match(/^\.storefront \{([^}]*)\}/m)?.[1];

  it('finds the base .storefront block', () => {
    expect(baseBlock, 'base .storefront block missing').toBeTruthy();
  });

  it('never declares containing-block-forming properties on .storefront', () => {
    const offenders = declarations(baseBlock).filter((d) =>
      /^(transform|filter|backdrop-filter|perspective|contain|isolation|will-change)\s*:/.test(d),
    );
    expect(offenders).toEqual([]);
  });

  it('pins color-scheme light (a light-only design must not let a dark data-mode restyle widgets)', () => {
    expect(declarations(baseBlock)).toContain('color-scheme: light');
  });
});

describe('storefront standalone stylesheet', () => {
  it('carries its own html.v-lenis scrollbar rules (other designs css never loads on /storefront)', () => {
    expect(css).toMatch(/html\.v-lenis \{[^}]*scrollbar-width: none/);
    expect(css).toMatch(/html\.v-lenis::-webkit-scrollbar/);
  });
});

describe('storefront motion gate sync', () => {
  /* The CSS hides content pre-reveal; storefront-motion.ts animates from poses
     that must be pixel-identical to those gates, or the first tween tick snaps
     visibly (or the content never reveals at all). */
  it('mask gate translateY(120%) matches the yPercent the tweens own', () => {
    expect(css).toMatch(/html\.js \.storefront \.f-mask-inner \{[^}]*translateY\(120%\)/);
    expect(motion).toMatch(/yPercent: 120/);
  });

  it('card clip gate matches the from-pose string exactly', () => {
    const gate = css.match(/html\.js \.storefront \[data-f-card\] \{[^}]*clip-path: (inset\([^)]*\))/)?.[1];
    expect(gate, 'card clip gate missing').toBeTruthy();
    expect(motion).toContain(`clipPath: '${gate}'`);
  });

  it('hides only attributes the choreography actually animates back in', () => {
    for (const attr of ['data-f-fade', 'data-f-hero-fade', 'data-f-rule', 'data-f-hero-rule']) {
      expect(css.includes(`[${attr}]`), `${attr} gate missing in css`).toBe(true);
      expect(motion.includes(`[${attr}]`), `${attr} never animated in motion`).toBe(true);
    }
  });
});

describe('storefront field layer wiring', () => {
  /* The .f-field layers are addressed by nth-child, so the CSS and the <i>
     count in the shell must move together: a dropped <i> silently kills layers
     with no other failure. */
  it('the shell carries three field layers', () => {
    const fieldLine = shell.match(/class="f-field"[^>]*>((?:<i><\/i>)+)/)?.[1] ?? '';
    const count = (fieldLine.match(/<i><\/i>/g) ?? []).length;
    expect(count).toBe(3);
  });

  it('the CSS addresses every field layer it expects', () => {
    expect(css.includes('.f-field i:first-child'), 'first-child rule missing').toBe(true);
    for (const n of [2, 3]) {
      expect(css.includes(`.f-field i:nth-child(${n})`), `nth-child(${n}) rule missing`).toBe(true);
    }
  });

  it('the shell mounts the progress bar the runtime drives', () => {
    expect(shell).toContain('data-f-progress');
    expect(motion).toContain('data-f-progress');
  });
});
