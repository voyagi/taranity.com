import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDesign } from '../../src/config/designs';

/**
 * Pins the cross-file invariants of the Practice design: the CSS motion gates
 * must stay byte-compatible with the poses practice-motion.ts animates from, the
 * fixed layers must never be re-pinned by a containing block, color-scheme must
 * stay pinned to light (a light-only design must not let a dark data-mode
 * restyle native widgets), and the standalone stylesheet must carry everything
 * the page needs without the other designs' css (each design's CSS ships alone).
 */

const css = readFileSync(
  resolve(__dirname, '../../src/components/designs/practice/practice.css'),
  'utf8',
);
const motion = readFileSync(resolve(__dirname, '../../src/lib/practice-motion.ts'), 'utf8');
const shell = readFileSync(
  resolve(__dirname, '../../src/components/designs/practice/Practice.astro'),
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

describe('practice registry wiring', () => {
  it('is ready, light-only, and routed where the page lives', () => {
    const practice = getDesign('practice');
    expect(practice?.ready).toBe(true);
    expect(practice?.modes).toEqual(['light']);
    expect(practice?.route).toBe('/practice');
  });
});

describe('practice fixed-layer containment invariant', () => {
  /* .p-field and .p-progress are position: fixed inside .practice. Any of these
     properties on the base .practice block would turn it into a containing
     block and silently re-pin both layers inside the page flow instead of the
     viewport. */
  const baseBlock = css.match(/^\.practice \{([^}]*)\}/m)?.[1];

  it('finds the base .practice block', () => {
    expect(baseBlock, 'base .practice block missing').toBeTruthy();
  });

  it('never declares containing-block-forming properties on .practice', () => {
    const offenders = declarations(baseBlock).filter((d) =>
      /^(transform|filter|backdrop-filter|perspective|contain|isolation|will-change)\s*:/.test(d),
    );
    expect(offenders).toEqual([]);
  });

  it('pins color-scheme light (a light-only design must not let a dark data-mode restyle widgets)', () => {
    expect(declarations(baseBlock)).toContain('color-scheme: light');
  });
});

describe('practice standalone stylesheet', () => {
  it('carries its own html.v-lenis scrollbar rules (other designs css never loads on /practice)', () => {
    expect(css).toMatch(/html\.v-lenis \{[^}]*scrollbar-width: none/);
    expect(css).toMatch(/html\.v-lenis::-webkit-scrollbar/);
  });
});

describe('practice motion gate sync', () => {
  /* The CSS hides content pre-reveal; practice-motion.ts animates from poses
     that must be pixel-identical to those gates, or the first tween tick snaps
     visibly (or the content never reveals at all). */
  it('mask gate translateY(120%) matches the yPercent the tweens own', () => {
    expect(css).toMatch(/html\.js \.practice \.p-mask-inner \{[^}]*translateY\(120%\)/);
    expect(motion).toMatch(/yPercent: 120/);
  });

  it('mask from-pose co-owns y:0 with the yPercent (GSAP cannot recover yPercent from a matrix)', () => {
    // The CSS hides lines with translateY(120%), which GSAP reads as a pixel
    // matrix. Without owning `y` in the same from-pose, that parsed pixel offset
    // survives the yPercent tween and the line stays hidden forever. Pin it.
    expect(motion).toMatch(/yPercent: 120, y: 0/);
  });

  it('card gate hides via opacity, and the tween owns the settle-in from-pose + clears transform for hover', () => {
    // The cards settle in softly (a gentle fade + rise). An opacity-only gate lets
    // the tween clear its inline transform on complete so the CSS :hover lift still applies.
    expect(css).toMatch(/html\.js \.practice \[data-p-card\] \{[^}]*opacity:\s*0/);
    expect(motion).toMatch(/autoAlpha: 0, y: 14/);
    expect(motion).toMatch(/clearProps: 'transform'/);
  });

  it('hides only attributes the choreography actually animates back in', () => {
    for (const attr of ['data-p-fade', 'data-p-hero-fade', 'data-p-rule', 'data-p-hero-rule']) {
      expect(css.includes(`[${attr}]`), `${attr} gate missing in css`).toBe(true);
      expect(motion.includes(`[${attr}]`), `${attr} never animated in motion`).toBe(true);
    }
  });
});

describe('practice field layer wiring', () => {
  /* The .p-field layers are addressed by nth-child, so the CSS and the <i>
     count in the shell must move together: a dropped <i> silently kills layers
     with no other failure. */
  it('the shell carries three field layers', () => {
    const fieldLine = shell.match(/class="p-field"[^>]*>((?:<i><\/i>)+)/)?.[1] ?? '';
    const count = (fieldLine.match(/<i><\/i>/g) ?? []).length;
    expect(count).toBe(3);
  });

  it('the CSS addresses every field layer it expects', () => {
    expect(css.includes('.p-field i:first-child'), 'first-child rule missing').toBe(true);
    for (const n of [2, 3]) {
      expect(css.includes(`.p-field i:nth-child(${n})`), `nth-child(${n}) rule missing`).toBe(true);
    }
  });

  it('the shell mounts the progress bar the runtime drives', () => {
    expect(shell).toContain('data-p-progress');
    expect(motion).toContain('data-p-progress');
  });
});
