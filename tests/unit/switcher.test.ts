import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The discoverability cues on the shared DesignSwitcher (a label, an active-state
 * pill, and a permanent floating invite) are easy to break with a careless edit
 * and have no cheap browser-free render. These tests pin the markup contract as
 * source text — the same approach the per-design CSS tests use — so a drift fails
 * loudly here instead of silently shipping a dead cue.
 */
const switcher = readFileSync(
  resolve(__dirname, '../../src/components/DesignSwitcher.astro'),
  'utf8',
);

describe('DesignSwitcher discoverability cues', () => {
  it('frames the pills with a non-interactive label', () => {
    expect(switcher).toMatch(/class="ds-label"/);
  });

  it('marks the current design active at build time', () => {
    expect(switcher).toMatch(/aria-current=\{d\.id === design \? 'page' : undefined\}/);
    expect(switcher).toMatch(/\.ds-design\[aria-current='page'\]/);
  });

  it('ships a permanent invite with no dismiss control', () => {
    expect(switcher).toMatch(/data-design-nudge/);
    // permanent: never starts hidden, and has no dismiss button to remove it
    expect(switcher).not.toMatch(/data-design-nudge[^>]*\shidden\b/);
    expect(switcher).not.toContain('data-nudge-dismiss');
  });

  it('keeps the invite copy count-driven so it stays correct as designs change', () => {
    expect(switcher).toMatch(/\$\{items\.length\} designs/);
  });

  it('never uses an em dash (site-copy hard rule)', () => {
    expect(switcher).not.toContain('—');
  });
});
