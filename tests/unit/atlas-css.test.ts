import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDesign } from '../../src/config/designs';

/**
 * Pins the cross-file invariants of the Atlas design: the CSS motion gates
 * must stay byte-compatible with the poses atlas-motion.ts animates from,
 * the fixed layers must never be re-pinned by a containing block, and the
 * standalone stylesheet must carry everything the page needs without
 * vitrine.css (each design's CSS ships alone).
 */

const css = readFileSync(
  resolve(__dirname, '../../src/components/designs/atlas/atlas.css'),
  'utf8',
);
const motion = readFileSync(resolve(__dirname, '../../src/lib/atlas-motion.ts'), 'utf8');
const shell = readFileSync(
  resolve(__dirname, '../../src/components/designs/atlas/Atlas.astro'),
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

describe('atlas registry wiring', () => {
  it('is ready, dark-only, and routed where the page lives', () => {
    const atlas = getDesign('atlas');
    expect(atlas?.ready).toBe(true);
    expect(atlas?.modes).toEqual(['dark']);
    expect(atlas?.route).toBe('/atlas');
  });
});

describe('atlas fixed-layer containment invariant', () => {
  /* .a-field, .a-gl, and .a-track are position: fixed inside .atlas. Any of
     these properties on the base .atlas block would turn it into a
     containing block and silently re-pin all three layers inside the page
     flow instead of the viewport. */
  const baseBlock = css.match(/^\.atlas \{([^}]*)\}/m)?.[1];

  it('finds the base .atlas block', () => {
    expect(baseBlock, 'base .atlas block missing').toBeTruthy();
  });

  it('never declares containing-block-forming properties on .atlas', () => {
    const offenders = declarations(baseBlock).filter((d) =>
      /^(transform|filter|backdrop-filter|perspective|contain|isolation|will-change)\s*:/.test(d),
    );
    expect(offenders).toEqual([]);
  });

  it('pins color-scheme dark (a dark-only design must not let a light data-mode restyle widgets)', () => {
    expect(declarations(baseBlock)).toContain('color-scheme: dark');
  });
});

describe('atlas standalone stylesheet', () => {
  it('carries its own html.v-lenis scrollbar rules (vitrine.css never loads on /atlas)', () => {
    expect(css).toMatch(/html\.v-lenis \{[^}]*scrollbar-width: none/);
    expect(css).toMatch(/html\.v-lenis::-webkit-scrollbar/);
  });
});

describe('atlas motion gate sync', () => {
  /* The CSS hides content pre-reveal; atlas-motion.ts animates from poses
     that must be pixel-identical to those gates, or the first tween tick
     snaps visibly (or the content never reveals at all). */
  it('mask gate translateY(120%) matches the yPercent the tweens own', () => {
    expect(css).toMatch(/html\.js \.atlas \.a-mask-inner \{[^}]*translateY\(120%\)/);
    expect(motion).toMatch(/yPercent: 120/);
  });

  it('waypoint clip gate matches the from-pose string exactly', () => {
    const gate = css.match(/html\.js \.atlas \[data-a-card\] \{[^}]*clip-path: (inset\([^)]*\))/)?.[1];
    expect(gate, 'card clip gate missing').toBeTruthy();
    expect(motion).toContain(`clipPath: '${gate}'`);
  });

  it('hides only attributes the choreography actually animates back in', () => {
    for (const attr of ['data-a-fade', 'data-a-hero-fade', 'data-a-rule', 'data-a-hero-rule']) {
      expect(css.includes(`[${attr}]`), `${attr} gate missing in css`).toBe(true);
      expect(motion.includes(`[${attr}]`), `${attr} never animated in motion`).toBe(true);
    }
  });
});

describe('atlas field layer wiring', () => {
  /* The .a-field layers are addressed by nth-child, so the CSS and the <i>
     count in the shell must move together: a dropped <i> silently kills
     layers with no other failure. */
  it('the shell carries three field layers', () => {
    const fieldLine = shell.match(/class="a-field"[^>]*>((?:<i><\/i>)+)/)?.[1] ?? '';
    const count = (fieldLine.match(/<i><\/i>/g) ?? []).length;
    expect(count).toBe(3);
  });

  it('the CSS addresses every field layer it expects', () => {
    expect(css.includes('.a-field i:first-child'), 'first-child rule missing').toBe(true);
    for (const n of [2, 3]) {
      expect(css.includes(`.a-field i:nth-child(${n})`), `nth-child(${n}) rule missing`).toBe(true);
    }
  });

  it('the shell mounts the GL container and instrument rail the runtime expects', () => {
    expect(shell).toContain('data-a-gl');
    expect(shell).toContain('data-a-track-fill');
    expect(shell).toContain('data-a-track-pct');
    expect(motion).toContain('data-a-track-fill');
  });
});
