import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The reduced-motion reveal must stay accessible AND opacity-only across all
 * six designs:
 *  - the shared CSS fades content in with opacity alone, never any movement;
 *  - the helper never arms a hidden state it cannot guarantee to reveal
 *    (a past regression shipped an invisible hero - this pins it shut);
 *  - each design fades EXACTLY the hooks its motion-ON choreography hides, so a
 *    new reveal hook can never be added to one path and forgotten in the other.
 */

const read = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

/** Brace-match the block beginning at the first occurrence of `opener`. */
function block(css: string, opener: string): string {
  const start = css.indexOf(opener);
  if (start === -1) return '';
  let depth = 0;
  for (let i = css.indexOf('{', start); i >= 0 && i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  return '';
}

const designs = ['vitrine', 'atlas', 'signal', 'storefront', 'practice', 'raw'];

describe('reduced-motion reveal: shared CSS contract', () => {
  const reduce = block(read('src/styles/site.css'), '@media (prefers-reduced-motion: reduce)');

  it('site.css carries the reduced-motion reveal block', () => {
    expect(reduce).toContain('.rm-fade');
  });

  it('arms opacity:0, reveals to opacity:1, and transitions opacity only', () => {
    expect(reduce).toMatch(/\.rm-fade\s*\{\s*opacity:\s*0/);
    expect(reduce).toMatch(/\.rm-fade\.is-revealed\s*\{\s*opacity:\s*1/);
    expect(reduce).toMatch(/html\.rm-ready\s+\.rm-fade\s*\{\s*transition:\s*opacity/);
  });

  it('is OPACITY-ONLY: no positional, scale, or clip movement under reduced motion', () => {
    expect(reduce).not.toMatch(/transform|translate|scale\(|clip-path|rotate|skew/);
    // Whatever transitions exist, they may only animate opacity.
    for (const t of reduce.match(/transition:[^;]*/g) ?? []) expect(t).toMatch(/transition:\s*opacity/);
  });
});

describe('reduced-motion reveal: helper robustness contract', () => {
  const helper = read('src/lib/rm-reveal.ts');

  it('never arms the hidden state when IntersectionObserver is unavailable', () => {
    expect(helper).toMatch(/typeof IntersectionObserver === 'undefined'/);
  });

  it('keys the hidden/revealed/ready states on the classes the shared CSS uses', () => {
    expect(helper).toContain("'rm-fade'");
    expect(helper).toContain("'is-revealed'");
    expect(helper).toContain("'rm-ready'");
  });
});

describe('reduced-motion reveal: each design fades exactly what its motion hides', () => {
  for (const id of designs) {
    const css = read(`src/components/designs/${id}/${id}.css`);
    const motion = read(`src/lib/${id}-motion.ts`);
    // Selectors the motion-ON gate hides: `html.js .<design> <token>`. Relies on
    // each selector keeping its own `html.js .<design>` prefix on its own line
    // (the repo's CSS convention); a formatter that collapsed multi-selector rules
    // would drop the later selectors from this coverage set.
    const re = new RegExp(`html\\.js \\.${id}\\s+([.\\[][^,{\\n]*?)\\s*(?:,|\\{)`, 'g');
    const hidden = new Set<string>();
    for (let m; (m = re.exec(css)); ) hidden.add(m[1].trim());
    const targets = motion.match(/RM_FADE_TARGETS\s*=\s*'([^']+)'/)?.[1] ?? '';

    it(`${id}: wires the reduced-motion reveal helper into setup/teardown`, () => {
      expect(motion).toContain("from './rm-reveal'");
      expect(motion).toContain('revealOnScrollReduced(root, RM_FADE_TARGETS)');
      expect(motion).toMatch(/rmReveal\?\.\(\);/);
    });

    it(`${id}: the fade targets cover every hook the choreography hides`, () => {
      expect(hidden.size).toBeGreaterThanOrEqual(4);
      for (const hook of hidden) expect(targets, `${hook} missing from RM_FADE_TARGETS`).toContain(hook);
    });
  }
});
