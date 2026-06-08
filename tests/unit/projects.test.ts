import { describe, it, expect } from 'vitest';
import { projects, featuredProjects, orderedProjects } from '../../src/content/projects';

describe('projects content model', () => {
  it('has at least 6 projects', () => {
    expect(projects.length).toBeGreaterThanOrEqual(6);
  });

  it('has unique slugs', () => {
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('exposes exactly 3 featured projects (the home "strongest 3")', () => {
    expect(featuredProjects.length).toBe(3);
    expect(featuredProjects.every((p) => p.featured)).toBe(true);
  });

  it('orders projects ascending by `order`', () => {
    const orders = orderedProjects.map((p) => p.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('every project is a complete Problem -> Solution -> Result case study with a metric', () => {
    for (const p of projects) {
      expect(p.title, `${p.slug} title`).toBeTruthy();
      expect(p.tagline, `${p.slug} tagline`).toBeTruthy();
      expect(p.summary, `${p.slug} summary`).toBeTruthy();
      expect(p.problem.length, `${p.slug} problem`).toBeGreaterThan(0);
      expect(p.solution.length, `${p.slug} solution`).toBeGreaterThan(0);
      expect(p.highlights.length, `${p.slug} highlights`).toBeGreaterThan(0);
      expect(p.result.length, `${p.slug} result`).toBeGreaterThan(0);
      expect(p.stack.length, `${p.slug} stack`).toBeGreaterThan(0);
      expect(p.metrics.length, `${p.slug} metrics`).toBeGreaterThan(0);
      expect(p.headlineMetric.value, `${p.slug} headline metric`).toBeTruthy();
      expect(['cyan', 'violet']).toContain(p.accent);
    }
  });

  it('slugs resolve to projects (the [slug] route mechanism) and reject unknowns', () => {
    expect(projects.find((p) => p.slug === 'cortex')?.title).toBe('Cortex');
    expect(projects.find((p) => p.slug === 'does-not-exist')).toBeUndefined();
  });
});
