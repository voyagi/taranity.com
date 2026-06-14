import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDesign } from '../../src/config/designs';

/**
 * Pins the cross-file invariants of the Signal design: the CSS motion gates
 * must stay byte-compatible with the poses signal-motion.ts animates from, the
 * fixed layers must never be re-pinned by a containing block, the dual-mode
 * dark palette must be defined twice in step, and the standalone stylesheet
 * must carry everything the page needs without vitrine.css/atlas.css (each
 * design's CSS ships alone).
 */

const css = readFileSync(
  resolve(__dirname, '../../src/components/designs/signal/signal.css'),
  'utf8',
);
const motion = readFileSync(resolve(__dirname, '../../src/lib/signal-motion.ts'), 'utf8');
const shell = readFileSync(
  resolve(__dirname, '../../src/components/designs/signal/Signal.astro'),
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

describe('signal registry wiring', () => {
  it('is ready, dual-mode, and routed where the page lives', () => {
    const signal = getDesign('signal');
    expect(signal?.ready).toBe(true);
    expect(signal?.modes).toEqual(['light', 'dark']);
    expect(signal?.route).toBe('/signal');
  });
});

describe('signal fixed-layer containment invariant', () => {
  /* .s-field and .s-progress are position: fixed inside .signal. Any of these
     properties on the base .signal block would turn it into a containing block
     and silently re-pin both layers inside the page flow instead of the
     viewport. */
  const baseBlock = css.match(/^\.signal \{([^}]*)\}/m)?.[1];

  it('finds the base .signal block', () => {
    expect(baseBlock, 'base .signal block missing').toBeTruthy();
  });

  it('never declares containing-block-forming properties on .signal', () => {
    const offenders = declarations(baseBlock).filter((d) =>
      /^(transform|filter|backdrop-filter|perspective|contain|isolation|will-change)\s*:/.test(d),
    );
    expect(offenders).toEqual([]);
  });
});

describe('signal dual-mode dark palette', () => {
  /* signal.css must define the dark palette twice: once for the explicit
     data-mode attribute and once as the no-JS prefers-color-scheme fallback
     (pure CSS cannot express "attribute OR media query" in one block without
     regressing older browsers). Pin the two copies together so an edit to one
     without the other fails loudly. */
  const attrBlock = css.match(/:root\[data-mode='dark'\] \.signal \{([^}]*)\}/)?.[1];
  const noJsBlock = css.match(/:root:not\(\[data-mode\]\) \.signal \{([^}]*)\}/)?.[1];

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

describe('signal standalone stylesheet', () => {
  it('carries its own html.v-lenis scrollbar rules (other designs css never loads on /signal)', () => {
    expect(css).toMatch(/html\.v-lenis \{[^}]*scrollbar-width: none/);
    expect(css).toMatch(/html\.v-lenis::-webkit-scrollbar/);
  });
});

describe('signal motion gate sync', () => {
  /* The CSS hides content pre-reveal; signal-motion.ts animates from poses
     that must be pixel-identical to those gates, or the first tween tick snaps
     visibly (or the content never reveals at all). */
  it('mask gate translateY(120%) matches the yPercent the tweens own', () => {
    expect(css).toMatch(/html\.js \.signal \.s-mask-inner \{[^}]*translateY\(120%\)/);
    expect(motion).toMatch(/yPercent: 120/);
  });

  it('card clip gate matches the from-pose string exactly', () => {
    const gate = css.match(/html\.js \.signal \[data-s-card\] \{[^}]*clip-path: (inset\([^)]*\))/)?.[1];
    expect(gate, 'card clip gate missing').toBeTruthy();
    expect(motion).toContain(`clipPath: '${gate}'`);
  });

  it('hides only attributes the choreography actually animates back in', () => {
    for (const attr of ['data-s-fade', 'data-s-hero-fade', 'data-s-rule', 'data-s-hero-rule']) {
      expect(css.includes(`[${attr}]`), `${attr} gate missing in css`).toBe(true);
      expect(motion.includes(`[${attr}]`), `${attr} never animated in motion`).toBe(true);
    }
  });
});

describe('signal field layer wiring', () => {
  /* The .s-field layers are addressed by nth-child, so the CSS and the <i>
     count in the shell must move together: a dropped <i> silently kills layers
     with no other failure. */
  it('the shell carries three field layers', () => {
    const fieldLine = shell.match(/class="s-field"[^>]*>((?:<i><\/i>)+)/)?.[1] ?? '';
    const count = (fieldLine.match(/<i><\/i>/g) ?? []).length;
    expect(count).toBe(3);
  });

  it('the CSS addresses every field layer it expects', () => {
    expect(css.includes('.s-field i:first-child'), 'first-child rule missing').toBe(true);
    for (const n of [2, 3]) {
      expect(css.includes(`.s-field i:nth-child(${n})`), `nth-child(${n}) rule missing`).toBe(true);
    }
  });

  it('the shell mounts the progress bar the runtime drives', () => {
    expect(shell).toContain('data-s-progress');
    expect(motion).toContain('data-s-progress');
  });
});
