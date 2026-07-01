import { describe, it, expect } from 'vitest';
import { relatedPosts } from '../../src/lib/related-posts';

/**
 * Locks the "Keep reading" rotation: the live page renders nothing today (one
 * published article), so these are the only thing proving it stays correct once
 * drip-scheduled drafts go live. Probes the Breaker's question directly: can it
 * ever duplicate or self-link?
 */
describe('relatedPosts (Keep reading rotation)', () => {
  const posts = ['a', 'b', 'c', 'd', 'e'];

  it('never includes the current article and never repeats one', () => {
    posts.forEach((_, i) => {
      const related = relatedPosts(posts, i);
      expect(related).not.toContain(posts[i]); // no self-link
      expect(new Set(related).size).toBe(related.length); // no duplicates
    });
  });

  it('caps at the limit and surfaces the following articles, wrapping around', () => {
    expect(relatedPosts(posts, 0)).toEqual(['b', 'c', 'd']);
    expect(relatedPosts(posts, 3)).toEqual(['e', 'a', 'b']);
    expect(relatedPosts(posts, 4)).toEqual(['a', 'b', 'c']);
  });

  it('rotates so even the highest-order article gets surfaced by some other article', () => {
    const surfaced = new Set<string>();
    posts.forEach((_, i) => relatedPosts(posts, i).forEach((p) => surfaced.add(p)));
    expect(surfaced).toEqual(new Set(posts));
  });

  it('renders nothing when it is the only published article', () => {
    expect(relatedPosts(['only'], 0)).toEqual([]);
  });

  it('returns every other article when there are fewer than the limit', () => {
    expect(relatedPosts(['a', 'b'], 0)).toEqual(['b']);
    expect(relatedPosts(['a', 'b'], 1)).toEqual(['a']);
  });

  it('respects a custom limit', () => {
    expect(relatedPosts(posts, 0, 2)).toEqual(['b', 'c']);
  });

  it('returns empty for an out-of-range index or a non-positive limit', () => {
    expect(relatedPosts(posts, -1)).toEqual([]); // findIndex miss
    expect(relatedPosts(posts, 0, 0)).toEqual([]);
    expect(relatedPosts(posts, 2, -1)).toEqual([]);
  });
});
