import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readyDesigns, DEFAULT_DESIGN } from '../../src/config/designs';

const read = (p: string): string => readFileSync(resolve(__dirname, '../../', p), 'utf8');

/**
 * The edge functions each keep a hardcoded per-design allowlist that MUST track the
 * design registry: functions/switch.ts (the no-JS switch cookie) allows every ready
 * design, and functions/_middleware.ts (in-place variant serving) allows every ready
 * NON-default design. A design added to designs.ts but missing from one of these
 * silently breaks (Vitrine gets served instead of the picked design). Deriving the
 * lists from the registry inside the CF Functions bundle isn't locally verifiable,
 * so pin the sync here: this fails the moment either list drifts. (This is exactly
 * the drift that shipped switch.ts without 'sheet'.)
 */
function setMembers(source: string, name: string): string[] {
  const m = source.match(new RegExp(`${name}\\s*=\\s*new Set\\(\\[([^\\]]*)\\]`));
  return m ? Array.from(m[1].matchAll(/'([^']+)'/g), (x) => x[1]) : [];
}

function arrayMembers(source: string, name: string): string[] {
  const m = source.match(new RegExp(`${name}\\s*=\\s*\\[([^\\]]*)\\]`));
  return m ? Array.from(m[1].matchAll(/'([^']+)'/g), (x) => x[1]) : [];
}

describe('edge-function design allowlists stay in sync with the registry', () => {
  const readyIds = readyDesigns()
    .map((d) => d.id)
    .sort();
  const variantIds = readyDesigns()
    .map((d) => d.id)
    .filter((id) => id !== DEFAULT_DESIGN)
    .sort();

  it('functions/switch.ts READY = every ready design (no-JS switch works for each)', () => {
    expect(setMembers(read('functions/switch.ts'), 'READY').sort()).toEqual(readyIds);
  });

  it('functions/_middleware.ts VARIANT_DESIGNS = every non-default ready design', () => {
    expect(setMembers(read('functions/_middleware.ts'), 'VARIANT_DESIGNS').sort()).toEqual(
      variantIds,
    );
  });

  it('scripts/verify-deploy.mjs DESIGNS = every non-default ready design (deploy smoke)', () => {
    // A design missing here still deploys, but the live smoke test never
    // exercises its route or cookie rewrites, so a broken variant reports PASS.
    expect(arrayMembers(read('scripts/verify-deploy.mjs'), 'DESIGNS').sort()).toEqual(
      variantIds,
    );
  });
});
