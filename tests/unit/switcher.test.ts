import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The discoverability cues on the shared DesignSwitcher (a label, an active-state
 * pill, and a one-time invite) are easy to break with a careless edit and have no
 * cheap browser-free render. These tests pin the contract between the markup and
 * its behaviour module as source text — the same approach the per-design CSS tests
 * use — so a drift fails loudly here instead of silently shipping a dead cue.
 */
const switcher = readFileSync(
  resolve(__dirname, '../../src/components/DesignSwitcher.astro'),
  'utf8',
);
const theme = readFileSync(resolve(__dirname, '../../src/lib/design-theme.ts'), 'utf8');

describe('DesignSwitcher discoverability cues', () => {
  it('frames the pills with a non-interactive label', () => {
    expect(switcher).toMatch(/class="ds-label"/);
  });

  it('marks the current design active at build time', () => {
    expect(switcher).toMatch(/aria-current=\{d\.id === design \? 'page' : undefined\}/);
    expect(switcher).toMatch(/\.ds-design\[aria-current='page'\]/);
  });

  it('ships the first-visit invite with a dismiss control', () => {
    expect(switcher).toMatch(/data-design-nudge/);
    expect(switcher).toMatch(/data-nudge-dismiss/);
    // the dismiss button must carry an accessible name (axe runs over the page)
    expect(switcher).toMatch(/data-nudge-dismiss[^>]*aria-label="Dismiss"/);
  });

  it('starts the invite hidden and overrides the UA [hidden] rule explicitly', () => {
    expect(switcher).toMatch(/data-design-nudge[^>]*\shidden\b/);
    expect(switcher).toMatch(/\.ds-nudge\[hidden\]\s*\{\s*display:\s*none/);
  });

  it('keeps the invite copy count-driven so it stays correct as designs change', () => {
    expect(switcher).toMatch(/\$\{items\.length\} designs/);
  });

  it('never uses an em dash (site-copy hard rule)', () => {
    expect(switcher).not.toContain('—');
  });
});

describe('design-theme invite behaviour', () => {
  it('offers the invite on load and re-offers it after a View-Transition swap', () => {
    expect(theme).toMatch(/const KEY_SEEN = 'taranity-switcher-seen'/);
    expect(theme).toMatch(/function revealNudgeIfUnseen\(\)/);
    expect(theme).toMatch(/initDesignTheme\(\)[\s\S]*?revealNudgeIfUnseen\(\)/);
    // keeps inviting across navigations until the visitor engages
    expect(theme).toMatch(/after-swap[\s\S]*?revealNudgeIfUnseen\(\)/);
  });

  it('persists the seen flag only when hidden, so it never returns once handled', () => {
    expect(theme).toMatch(/function hideNudge\(\)/);
    expect(theme).toMatch(/setAttribute\('hidden', ''\)[\s\S]*?setItem\(KEY_SEEN, '1'\)/);
  });

  it('hides the invite on dismiss and when a design is chosen', () => {
    expect(theme).toMatch(/data-nudge-dismiss\]'\)\)\s*\{[\s\S]*?hideNudge\(\)/);
    expect(theme).toMatch(/data-design-go\]'\)[\s\S]*?hideNudge\(\)/);
  });
});
