import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * vitrine.css must define the dark palette twice: once for the explicit
 * data-mode attribute and once as the no-JS prefers-color-scheme fallback
 * (pure CSS cannot express "attribute OR media query" in one block without
 * regressing older browsers via light-dark()). This pins the two copies
 * together so an edit to one without the other fails loudly.
 */

const css = readFileSync(
  resolve(__dirname, '../../src/components/designs/vitrine/vitrine.css'),
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

describe('vitrine dark palette', () => {
  const attrBlock = css.match(/:root\[data-mode='dark'\] \.vitrine \{([^}]*)\}/)?.[1];
  const noJsBlock = css.match(/:root:not\(\[data-mode\]\) \.vitrine \{([^}]*)\}/)?.[1];

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

describe('vitrine atmosphere layer wiring', () => {
  /* The .v-paper layers are addressed by nth-child, so the CSS and the <i>
     count in BOTH shells must move together: a dropped <i> silently kills
     layers with no other failure. */
  const shells = ['Vitrine.astro', 'VitrinePage.astro'].map((name) => ({
    name,
    source: readFileSync(resolve(__dirname, '../../src/components/designs/vitrine', name), 'utf8'),
  }));

  it('both shells carry five paper layers', () => {
    for (const shell of shells) {
      const paperLine = shell.source.match(/class="v-paper"[^>]*>((?:<i><\/i>)+)/)?.[1] ?? '';
      const count = (paperLine.match(/<i><\/i>/g) ?? []).length;
      expect(count, `${shell.name} .v-paper <i> count`).toBe(5);
    }
  });

  it('the CSS addresses every paper layer it expects', () => {
    for (const n of [2, 3, 4, 5]) {
      expect(css.includes(`.v-paper i:nth-child(${n})`), `nth-child(${n}) rule missing`).toBe(true);
    }
  });
});

describe('vitrine fixed-layer containment invariant', () => {
  /* .v-stars and .v-progress are position: fixed inside .vitrine. Any of
     these properties on the base .vitrine block would turn it into a
     containing block and silently re-pin both layers inside the page flow
     instead of the viewport. */
  const baseBlock = css.match(/^\.vitrine \{([^}]*)\}/m)?.[1];

  it('finds the base .vitrine block', () => {
    expect(baseBlock, 'base .vitrine block missing').toBeTruthy();
  });

  it('never declares containing-block-forming properties on .vitrine', () => {
    const offenders = declarations(baseBlock).filter((d) =>
      /^(transform|filter|backdrop-filter|perspective|contain|isolation|will-change)\s*:/.test(d),
    );
    expect(offenders).toEqual([]);
  });
});
