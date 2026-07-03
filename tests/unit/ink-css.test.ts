import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDesign } from '../../src/config/designs';
import { HERO_WORDS } from '../../src/lib/ink-hero';
import { services as inkServices } from '../../src/config/ink';

/**
 * Pins the cross-file invariants of the Ink design. Ink is a literal clone of
 * the approved hero mockup: monochrome (no second colour, no gradients), THINGS
 * not atmosphere (the ink drawings are the craft), light-only, native-scroll.
 * What it MUST keep:
 *  - the fixed-layer containment invariant on .ink (the edge blob, burger, and
 *    menu overlay are FIXED children; a containing-block-forming property on the
 *    base block silently re-pins them inside the flow and they scroll away);
 *  - monochrome: no linear/radial gradients anywhere (the anti-generic contract);
 *  - no scrolling marquee (owner hard rule after four rejections);
 *  - every transition/animation gated behind prefers-reduced-motion: no-preference;
 *  - the hero island staying an EXTERNAL chunk under the strict header CSP;
 *  - the hero a11y contract (a stable visually-hidden h1 sentence + the rotating
 *    word aria-hidden) and the blob menu button exposing aria-expanded.
 */

const readRel = (p: string): string => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const css = readRel('src/components/designs/ink/ink.css');
const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '');
const cssCode = stripComments(css);
const shell = readRel('src/components/designs/ink/Ink.astro');

/* Ink's transitions live in ink.css AND in the component <style> blocks, so the
   reduced-motion and monochrome checks span all of them. */
const componentCss = [
  'src/components/designs/ink/Ink.astro',
  'src/components/designs/ink/InkContact.astro',
  'src/components/designs/ink/InkFooter.astro',
  'src/components/designs/ink/InkSubpage.astro',
]
  .map((p) => {
    const source = readRel(p);
    return Array.from(source.matchAll(/<style>([\s\S]*?)<\/style>/g), (m) => m[1]).join('\n');
  })
  .join('\n');
const componentCode = stripComments(componentCss);

/* These regexes assume the matched blocks stay FLAT (no nested rules):
   [^}]* stops at the first closing brace. */
const declarations = (block: string | undefined): string[] =>
  (block ?? '')
    .split(';')
    .map((d) => d.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .sort();

describe('ink registry wiring', () => {
  it('is ready, light-only, routed /ink', () => {
    const ink = getDesign('ink');
    expect(ink?.ready).toBe(true);
    expect(ink?.modes).toEqual(['light']);
    expect(ink?.route).toBe('/ink');
  });
});

describe('ink fixed-layer containment invariant', () => {
  const baseBlock = css.match(/^\.ink \{([^}]*)\}/m)?.[1];

  it('finds the base .ink block', () => {
    expect(baseBlock, 'base .ink block missing').toBeTruthy();
  });

  it('never declares containing-block-forming properties on .ink', () => {
    const offenders = declarations(baseBlock).filter((d) =>
      /^(transform|filter|backdrop-filter|perspective|contain|isolation|will-change)\s*:/.test(d),
    );
    expect(offenders).toEqual([]);
  });

  it('actually contains tokens (guards against a regex/refactor silently matching nothing)', () => {
    expect(declarations(baseBlock).length).toBeGreaterThanOrEqual(10);
  });
});

describe('ink is monochrome, things not atmosphere', () => {
  it('uses no gradients anywhere (the anti-generic contract)', () => {
    expect(cssCode).not.toMatch(/linear-gradient|radial-gradient/i);
    expect(componentCode).not.toMatch(/linear-gradient|radial-gradient/i);
  });

  it('has no scrolling marquee (owner hard rule)', () => {
    expect(cssCode).not.toMatch(/marquee/i);
    expect(componentCode).not.toMatch(/marquee/i);
    expect(shell).not.toMatch(/marquee/i);
  });
});

describe('ink reduced motion', () => {
  it('gates every transition and animation behind prefers-reduced-motion: no-preference', () => {
    // Brace-match each no-preference media block and strip it, then assert no
    // stray `transition:` or `animation:` survives, across ink.css and every Ink
    // component <style> block (comment-stripped so prose can't false-match).
    let stripped = `${cssCode}\n${componentCode}`;
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
    expect(stripped).not.toMatch(/(^|[;{}\s])animation\s*:/);
  });
});

describe('ink hero island stays an external chunk (strict CSP)', () => {
  const astroConfig = readRel('astro.config.mjs');

  it('imports the bundled island (no inline script, so no new CSP hash)', () => {
    expect(shell).toMatch(/import '\.\.\/\.\.\/\.\.\/lib\/ink-hero'/);
  });

  it('forces ink-hero into its own manualChunk so it is never inlined', () => {
    expect(astroConfig).toMatch(/manualChunks\s*\(\s*id\s*\)/);
    expect(astroConfig).toMatch(/id\.includes\('\/lib\/ink-hero'\)/);
    expect(astroConfig).toMatch(/return 'ink-hero'/);
  });

  it('the island honours reduced motion, rebinds on nav, and self-guards for node', () => {
    const island = readRel('src/lib/ink-hero.ts');
    expect(island).toMatch(/prefers-reduced-motion: reduce/);
    expect(island).toMatch(/astro:page-load/);
    expect(island).toMatch(/dataset\.ikBound/);
    // Importable from the node test env (this file imports HERO_WORDS).
    expect(island).toMatch(/typeof document !== 'undefined'/);
  });
});

describe('ink hero + menu a11y contract', () => {
  it('keeps a stable visually-hidden h1 sentence and an aria-hidden rotating word', () => {
    // The rotating slab must never change what assistive tech announces.
    expect(shell).toMatch(/class="ik-sr-only"/);
    expect(shell).toMatch(/data-ik-word[^>]*aria-hidden="true"/);
  });

  it('derives the five service sections from HERO_WORDS (rotation and sections cannot drift)', () => {
    expect(HERO_WORDS.length).toBe(5);
    for (const word of HERO_WORDS) {
      expect(shell).toContain(`id="${word.toLowerCase()}"`);
    }
  });

  it('exposes the blob menu as a real button with aria-expanded and a dialog overlay', () => {
    // Attribute order is not guaranteed, so match the whole button tag.
    const menuButton = shell.match(/<button[^>]*data-ik-menu-button[^>]*>/)?.[0] ?? '';
    expect(menuButton, 'menu button present').not.toBe('');
    expect(menuButton).toMatch(/aria-expanded="false"/);
    expect(shell).toMatch(/data-ik-menu[^>]*role="dialog"/);
  });
});

describe('ink service order + jump-target focus (no positional drift)', () => {
  it('config services match the five hero words in order (id and title)', () => {
    // Ink.astro looks services up by id, so this pins the derived order to the
    // hero words: a HERO_WORDS reorder that broke a section would fail here.
    expect(inkServices.map((s) => s.id)).toEqual(HERO_WORDS.map((w) => w.toLowerCase()));
    expect(inkServices.map((s) => s.title)).toEqual([...HERO_WORDS]);
  });

  it('every jump-target section is focusable so a jump lands focus (tabindex -1)', () => {
    for (const word of HERO_WORDS) {
      expect(shell, `#${word.toLowerCase()} focusable`).toMatch(
        new RegExp(`<section[^>]*id="${word.toLowerCase()}"[^>]*tabindex="-1"`),
      );
    }
    expect(shell, '#approach focusable').toMatch(/<section[^>]*id="approach"[^>]*tabindex="-1"/);
  });

  it('the word-fade duration matches between the island and the CSS (no silent desync)', () => {
    // FADE_MS in ink-hero.ts and the .ik-word transition in ink.css must agree, or
    // the slab word pops instead of fading. Only a comment links them, so pin it.
    const island = readRel('src/lib/ink-hero.ts');
    const fadeMs = Number(island.match(/FADE_MS\s*=\s*(\d+)/)?.[1]);
    const cssSeconds = Number(css.match(/\.ik-word\s*\{\s*transition:\s*opacity\s*([\d.]+)s/)?.[1]);
    expect(fadeMs, 'FADE_MS present').toBeGreaterThan(0);
    expect(cssSeconds, '.ik-word transition present').toBeGreaterThan(0);
    expect(Math.round(cssSeconds * 1000)).toBe(fadeMs);
  });

  it('the menu makes background content inert up the ancestor chain (aria-modal hygiene)', () => {
    // The skip-link and the global design switcher live OUTSIDE [data-ink], so
    // the inert sweep must walk the overlay's ancestors, not just its siblings.
    const island = readRel('src/lib/ink-hero.ts');
    expect(island).toMatch(/setAttribute\('inert'/);
    expect(island).toMatch(/parentElement/);
    // And the overlay must stack above the global switcher (z-index 1000).
    const menuBlock = css.match(/\.ik-menu \{([^}]*)\}/)?.[1] ?? '';
    const z = Number(menuBlock.match(/z-index:\s*(\d+)/)?.[1] ?? '0');
    expect(z).toBeGreaterThan(1000);
  });
});
