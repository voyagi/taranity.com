import { describe, it, expect, vi } from 'vitest';
import { site, services, socials, contactEmail } from '../../src/config/site';

describe('site config', () => {
  it('has core identity fields', () => {
    expect(site.name).toBe('Taranity');
    // Studio voice: founder feeds the Organization `founder` in JSON-LD, not a public byline.
    expect(site.founder).toBeTruthy();
    expect(site.shortTagline).toBeTruthy();
    expect(site.url).toMatch(/^https?:\/\//);
  });

  it('Organization description honours the hard rules (no em dash, AI never leads)', () => {
    expect(site.description).toBeTruthy();
    // Rule 4: no em dashes (U+2014) in site copy or structured data.
    expect(site.description).not.toContain('—');
    // Rule 3: AI never leads — "intelligent systems" must trail the other crafts.
    const desc = site.description.toLowerCase();
    // Assert both terms exist first: without this, a missing "websites" makes
    // indexOf return -1 and the ordering check below passes vacuously.
    expect(desc).toContain('websites');
    expect(desc).toContain('intelligent systems');
    expect(desc.indexOf('intelligent systems')).toBeGreaterThan(desc.indexOf('websites'));
  });

  it('provides safe service fallbacks (runs with zero secrets)', () => {
    // Turnstile's site key is public config, so zero-secret production builds
    // should still render the bot-check widget instead of falling into demo mode.
    expect(services.turnstileSitekey).toMatch(/^0x[a-zA-Z0-9]+$/);
    expect(typeof services.plausibleDomain).toBe('string');
    // Web Analytics beacon token: empty in dev/test builds (PROD false), a public
    // token in production builds. Assert the field exists so an accidental deletion
    // or rename is caught by the suite.
    expect(typeof services.cfBeaconToken).toBe('string');
  });

  it('cfBeaconToken honours the PUBLIC_CF_BEACON_TOKEN override', async () => {
    // Verifies the env wiring end-to-end, since the hardcoded production fallback
    // is gated behind import.meta.env.PROD and so is empty under test.
    vi.stubEnv('PUBLIC_CF_BEACON_TOKEN', 'e2e-override-token');
    vi.resetModules();
    const { services: overridden } = await import('../../src/config/site');
    expect(overridden.cfBeaconToken).toBe('e2e-override-token');
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('cfBeaconToken disables via the PUBLIC_CF_BEACON_TOKEN=off sentinel', async () => {
    // The off sentinel is the preview/incident kill switch; an empty-intent override
    // must NOT silently fall back to the hardcoded production token.
    vi.stubEnv('PUBLIC_CF_BEACON_TOKEN', 'off');
    vi.resetModules();
    const { services: disabled } = await import('../../src/config/site');
    expect(disabled.cfBeaconToken).toBe('');
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('has socials and a valid contact email', () => {
    expect(socials.length).toBeGreaterThan(0);
    expect(socials.every((s) => /^https?:\/\//.test(s.href))).toBe(true);
    expect(contactEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});
