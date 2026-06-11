import { describe, it, expect } from 'vitest';
import { site, services, socials, contactEmail } from '../../src/config/site';

describe('site config', () => {
  it('has core identity fields', () => {
    expect(site.name).toBe('Taranity');
    // Studio voice: founder feeds the Organization `founder` in JSON-LD, not a public byline.
    expect(site.founder).toBeTruthy();
    expect(site.role).toBeTruthy();
    expect(site.shortTagline).toBeTruthy();
    expect(site.url).toMatch(/^https?:\/\//);
  });

  it('provides safe service fallbacks (runs with zero secrets)', () => {
    // demo mode: empty key is allowed and must not throw
    expect(typeof services.web3formsKey).toBe('string');
    expect(typeof services.plausibleDomain).toBe('string');
  });

  it('has socials and a valid contact email', () => {
    expect(socials.length).toBeGreaterThan(0);
    expect(socials.every((s) => /^https?:\/\//.test(s.href))).toBe(true);
    expect(contactEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});
