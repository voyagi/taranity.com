import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getDesign } from '../../src/config/designs';
import { FIELD_MAX_LINEAR_LUMINANCE, FRAG } from '../../src/lib/prism-field';

/**
 * Pins the cross-file invariants of the Prism design. Prism is dark-only and
 * native-scroll (no Lenis / no *-motion.ts), so it does not share the dual-mode
 * or motion-gate contracts other design tests pin. What it MUST keep is:
 *  - the fixed-layer containment invariant on .prism (the WebGL colour field is
 *    a FIXED child; any containing-block-forming property on the base block
 *    silently re-pins it inside the flow and it scrolls away with the page);
 *  - the static CSS gradient fallback that no-JS / no-WebGL / a lost context
 *    all degrade to;
 *  - every transition/animation gated behind prefers-reduced-motion:
 *    no-preference (the marquee, the badge rotation, the hovers);
 *  - the shader island staying an EXTERNAL chunk under the strict header CSP.
 */

const readRel = (p: string): string => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const css = readRel('src/components/designs/prism/prism.css');
/* Comment-free CSS for declaration scans: the invariant comment names
   `backdrop-filter` / `filter` in prose, which must not trip them. */
const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '');
const cssCode = stripComments(css);
const shell = readRel('src/components/designs/prism/Prism.astro');

/* Prism's transitions live in prism.css AND in the component <style> blocks,
   so the reduced-motion gate is asserted across all of them. */
const componentCss = [
  'src/components/designs/prism/Prism.astro',
  'src/components/designs/prism/PrismContact.astro',
  'src/components/designs/prism/PrismFooter.astro',
  'src/components/designs/prism/PrismSubpage.astro',
]
  .map((p) => {
    const source = readRel(p);
    return Array.from(source.matchAll(/<style>([\s\S]*?)<\/style>/g), (m) => m[1]).join('\n');
  })
  .join('\n');

/* These regexes assume the matched blocks stay FLAT (no nested rules):
   [^}]* stops at the first closing brace. */
const declarations = (block: string | undefined): string[] =>
  (block ?? '')
    .split(';')
    .map((d) => d.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .sort();

describe('prism registry wiring', () => {
  it('is ready, dark-only, routed /prism', () => {
    const prism = getDesign('prism');
    expect(prism?.ready).toBe(true);
    expect(prism?.modes).toEqual(['dark']);
    expect(prism?.route).toBe('/prism');
  });
});

describe('prism fixed-layer containment invariant', () => {
  const baseBlock = css.match(/^\.prism \{([^}]*)\}/m)?.[1];

  it('finds the base .prism block', () => {
    expect(baseBlock, 'base .prism block missing').toBeTruthy();
  });

  it('never declares containing-block-forming properties on .prism', () => {
    const offenders = declarations(baseBlock).filter((d) =>
      /^(transform|filter|backdrop-filter|perspective|contain|isolation|will-change)\s*:/.test(d),
    );
    expect(offenders).toEqual([]);
  });

  it('actually contains tokens (guards against a regex/refactor silently matching nothing)', () => {
    expect(declarations(baseBlock).length).toBeGreaterThanOrEqual(10);
  });
});

describe('prism field: canvas over a static gradient fallback', () => {
  it('ships the fixed field with the fallback UNDER the canvas, aria-hidden', () => {
    // The fallback must precede the canvas inside the field wrapper, so an
    // un-rendered (transparent) canvas simply shows the gradient through.
    expect(shell).toMatch(/data-prism-field[^>]*aria-hidden="true"/);
    const fallbackAt = shell.indexOf('pr-field-fallback');
    const canvasAt = shell.indexOf('data-prism-canvas');
    expect(fallbackAt).toBeGreaterThan(-1);
    expect(canvasAt).toBeGreaterThan(fallbackAt);
  });

  it('defines the static fallback class as a gradient blend of the palette', () => {
    const fallback = cssCode.match(/\.pr-field-fallback \{([^}]*)\}/)?.[1];
    expect(fallback, '.pr-field-fallback block missing').toBeTruthy();
    expect(fallback).toMatch(/radial-gradient/);
    expect(fallback).toMatch(/linear-gradient/);
  });

  it('keeps the field itself fixed and inert to the pointer', () => {
    const field = cssCode.match(/\.pr-field \{([^}]*)\}/)?.[1];
    expect(field).toMatch(/position:\s*fixed/);
    expect(field).toMatch(/pointer-events:\s*none/);
  });

  it('never uses backdrop-filter (solid scrims only; containment + readability contract)', () => {
    expect(cssCode).not.toMatch(/backdrop-filter/i);
    expect(stripComments(componentCss)).not.toMatch(/backdrop-filter/i);
  });
});

describe('prism reduced motion', () => {
  it('gates every transition and animation behind prefers-reduced-motion: no-preference', () => {
    // Brace-match each no-preference media block and strip it, then assert no
    // stray `transition:` or `animation:` survives, across prism.css and every
    // Prism component <style> block (comment-stripped so prose can't match).
    let stripped = `${cssCode}\n${stripComments(componentCss)}`;
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

  it('keeps the marquee a seamless two-copy loop with an sr-only equivalent', () => {
    // Two aria-hidden copies sliding by exactly one copy's width; the sr-only
    // line carries the meaning for assistive tech.
    expect(css).toMatch(/@keyframes pr-marquee/);
    expect(css).toMatch(/translateX\(-50%\)/);
    expect(shell).toMatch(/pr-marquee-track[^>]*aria-hidden="true"/);
    expect(shell.match(/pr-marquee-copy/g)?.length).toBe(2);
    expect(shell).toMatch(/pr-sr-only/);
  });
});

describe('prism shader island stays an external chunk (strict CSP)', () => {
  const astroConfig = readRel('astro.config.mjs');

  it('imports the bundled island (no inline script, so no new CSP hash)', () => {
    expect(shell).toMatch(/import '\.\.\/\.\.\/\.\.\/lib\/prism-field'/);
  });

  it('forces prism-field into its own manualChunk so it is never inlined', () => {
    // The strict header CSP (public/_headers) has no 'unsafe-inline' and blocks
    // an inline <script type="module">. prism-field is a standalone island that
    // Vite would otherwise inline; the manualChunks mapping keeps it an external
    // /_astro/*.js (allowed by script-src 'self'). Pin the exact mapping.
    expect(astroConfig).toMatch(/manualChunks\s*\(\s*id\s*\)/);
    expect(astroConfig).toMatch(/id\.includes\('\/lib\/prism-field'\)/);
    expect(astroConfig).toMatch(/return 'prism-field'/);
  });

  it('renders one static frame then stops under reduced motion, pauses when hidden', () => {
    const island = readRel('src/lib/prism-field.ts');
    expect(island).toMatch(/prefers-reduced-motion: reduce/);
    expect(island).toMatch(/visibilitychange/);
    expect(island).toMatch(/webglcontextlost/);
    // The bind guard that makes astro:page-load re-runs idempotent.
    expect(island).toMatch(/dataset\.prismBound/);
  });
});

describe('prism on-field text contrast guarantee', () => {
  /* Text sitting DIRECTLY on the canvas (masthead, hero, marquee) has no scrim,
     and axe cannot sample a WebGL canvas, so this is the only automated check
     of that contrast. It works because the shader's last colour op hard-caps
     every pixel's linear luminance at FIELD_MAX_LINEAR_LUMINANCE (imported from
     the island itself, one source of truth): worst-case contrast is then a
     plain WCAG computation against that ceiling. */
  const srgbChannel = (byte: number): number => {
    const s = byte / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luminance = (hex: string): number => {
    const n = parseInt(hex.slice(1), 16);
    return (
      0.2126 * srgbChannel((n >> 16) & 255) +
      0.7152 * srgbChannel((n >> 8) & 255) +
      0.0722 * srgbChannel(n & 255)
    );
  };
  const contrast = (a: number, b: number): number =>
    (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const token = (name: string): string => {
    const m = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
    expect(m, `${name} token present in prism.css`).toBeTruthy();
    return m![1];
  };

  it('interpolates the exported ceiling into the shader source (cap actually applies)', () => {
    expect(FRAG).toContain(FIELD_MAX_LINEAR_LUMINANCE.toFixed(4));
  });

  it('keeps the ink >= 4.5:1 and the hero accent >= 3:1 (large text) over the capped field', () => {
    const worstField = FIELD_MAX_LINEAR_LUMINANCE;
    expect(contrast(luminance(token('--pr-ink')), worstField)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(luminance(token('--pr-accent-text')), worstField)).toBeGreaterThanOrEqual(3);
  });

  it('keeps raw periwinkle off on-field text (it matches the shader pools at ~2:1)', () => {
    // Periwinkle stays a scrim-side colour; the hero line and the focus outline
    // (the two on-field uses that failed review) must use the pale accent.
    expect(cssCode).toMatch(/\.pr-hero-line:nth-child\(2\)[^}]*var\(--pr-accent-text\)/);
    expect(cssCode).toMatch(/:focus-visible[^}]*var\(--pr-accent-text\)/);
  });

  it('keeps link hovers decoration-only (the ink never changes colour on hover)', () => {
    // Cyan text over the capped field is ~3.7:1; as a DECORATION it only needs
    // the 3:1 non-text bar. Rather than per-surface math, Prism holds one rule
    // everywhere (canvas AND scrims): a hover moves the underline/border, never
    // the text colour. Pin every serif/label link hover, in prism.css and in
    // the component <style> blocks alike.
    const componentCode = stripComments(componentCss);
    const hovers: Array<[string, string]> = [
      ['masthead nav', cssCode.match(/\.pr-masthead-nav a:hover \{([^}]*)\}/)?.[1] ?? ''],
      ['hero link', cssCode.match(/\.pr-hero-link:hover \{([^}]*)\}/)?.[1] ?? ''],
      ['contact email', componentCode.match(/\.pr-contact-email:hover \{([^}]*)\}/)?.[1] ?? ''],
      ['footer signoff', componentCode.match(/\.pr-signoff a:hover \{([^}]*)\}/)?.[1] ?? ''],
    ];
    for (const [label, block] of hovers) {
      expect(block, `${label} hover rule present`).not.toBe('');
      expect(
        declarations(block).filter((d) => /^color\s*:/.test(d)),
        `${label} hover must not set a text colour`,
      ).toEqual([]);
    }
  });
});
