import { describe, it, expect } from 'vitest';
import { site, services, socials, nav, cta, contactEmail } from '../../src/config/site';
import { story, principles, skillGroups, timeline, languages } from '../../src/config/about';

describe('site config', () => {
  it('has core identity fields', () => {
    expect(site.name).toBe('Taranity');
    // Studio voice: founder feeds the Organization `founder` in JSON-LD, not a public byline.
    expect(site.founder).toBeTruthy();
    expect(site.role).toBeTruthy();
    expect(site.shortTagline).toBeTruthy();
    expect(site.url).toMatch(/^https?:\/\//);
  });

  it('has a 3-item primary nav with hrefs and indices', () => {
    expect(nav.length).toBe(3);
    for (const item of nav) {
      expect(item.href.startsWith('/')).toBe(true);
      expect(item.index).toMatch(/^\d{2}$/);
    }
  });

  it('provides safe service fallbacks (runs with zero secrets)', () => {
    expect(services.bookingUrl).toBeTruthy();
    expect(services.githubUser).toBeTruthy();
    // demo mode: empty key is allowed and must not throw
    expect(typeof services.web3formsKey).toBe('string');
  });

  it('has socials and a valid contact email', () => {
    expect(socials.length).toBeGreaterThan(0);
    expect(socials.every((s) => /^https?:\/\//.test(s.href))).toBe(true);
    expect(contactEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('defines both CTAs', () => {
    expect(cta.primaryLabel).toBeTruthy();
    expect(cta.primaryHref).toBeTruthy();
    expect(cta.secondaryHref).toBeTruthy();
  });
});

describe('about config', () => {
  it('has a multi-paragraph story', () => {
    expect(story.length).toBeGreaterThanOrEqual(2);
    expect(story.every((p) => p.length > 40)).toBe(true);
  });

  it('has principles, skills and a timeline', () => {
    expect(principles.length).toBeGreaterThan(0);
    expect(skillGroups.length).toBeGreaterThan(0);
    expect(skillGroups.every((g) => g.skills.length > 0)).toBe(true);
    expect(skillGroups.every((g) => g.skills.every((s) => s.level >= 0 && s.level <= 100))).toBe(true);
    expect(timeline.length).toBeGreaterThan(0);
  });

  it('lists languages', () => {
    expect(languages.map((l) => l.name)).toEqual(expect.arrayContaining(['Farsi', 'Dutch', 'English']));
  });
});
