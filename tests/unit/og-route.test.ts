import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * The per-article OG card route, checked against the BUILT output (an .astro
 * page cannot be imported under vitest). Skips when dist/ is absent so a bare
 * `npm test` still passes; the pre-push gate always builds first, so these run
 * on every push. Covers: draft inclusion, the noindex meta, the title on the
 * card, and both tiers of the title-size step.
 */
const dist = resolve(__dirname, '../../dist/og-preview/journal');
const page = (slug: string) => readFileSync(join(dist, slug, 'index.html'), 'utf8');

describe.skipIf(!existsSync(dist))('og card routes (built dist)', () => {
  it('builds a card for the published article, noindex, carrying its title', () => {
    const html = page('website-speed-conversions');
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain('How Website Speed Quietly Kills Your Conversion Rate');
    expect(html).toContain('Journal · Performance');
  });

  it('builds cards for drafts too (image exists before publish)', () => {
    expect(existsSync(join(dist, 'what-to-automate-first', 'index.html'))).toBe(true);
  });

  it('steps the title size down for long titles and up for short ones', () => {
    // 62 chars -> compact tier; 42 chars -> display tier.
    expect(page('studio-vs-agency-vs-freelancer')).toContain('font-size: 74px');
    expect(page('what-to-automate-first')).toContain('font-size: 88px');
  });
});
