import { describe, it, expect, vi, afterEach } from 'vitest';
import { relativeTime, fetchLatestPush } from '../../src/lib/gh';

describe('relativeTime', () => {
  const now = Date.now();

  it('returns "just now" for very recent times', () => {
    expect(relativeTime(new Date(now - 5 * 1000))).toBe('just now');
  });

  it('formats minutes', () => {
    expect(relativeTime(new Date(now - 5 * 60 * 1000))).toMatch(/5 minutes ago/);
  });

  it('formats hours', () => {
    expect(relativeTime(new Date(now - 3 * 60 * 60 * 1000))).toMatch(/3 hours ago/);
  });

  it('formats days', () => {
    expect(relativeTime(new Date(now - 2 * 24 * 60 * 60 * 1000))).toMatch(/2 days ago/);
  });

  it('always returns a non-empty string', () => {
    expect(typeof relativeTime(new Date(now - 999 * 24 * 60 * 60 * 1000))).toBe('string');
  });
});

describe('fetchLatestPush', () => {
  afterEach(() => vi.unstubAllGlobals());

  const mockFetch = (impl: () => Promise<unknown>) =>
    vi.stubGlobal('fetch', vi.fn(impl));

  it('parses the latest PushEvent into PushInfo', async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => [
        { type: 'WatchEvent' },
        {
          type: 'PushEvent',
          created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
          repo: { name: 'voyagi/cortex' },
          payload: { commits: [{ message: 'feat: add live metrics\n\nbody text', sha: 'abc123' }] },
        },
      ],
    }));
    const push = await fetchLatestPush('voyagi');
    expect(push).not.toBeNull();
    expect(push!.repo).toBe('cortex');
    expect(push!.message).toBe('feat: add live metrics'); // first line only
    expect(push!.url).toBe('https://github.com/voyagi/cortex/commit/abc123');
    expect(push!.when).toMatch(/hour/);
  });

  it('returns null on a non-ok response', async () => {
    mockFetch(async () => ({ ok: false, json: async () => ({}) }));
    expect(await fetchLatestPush('voyagi')).toBeNull();
  });

  it('returns null when there are no push events', async () => {
    mockFetch(async () => ({ ok: true, json: async () => [{ type: 'WatchEvent' }] }));
    expect(await fetchLatestPush('voyagi')).toBeNull();
  });

  it('returns null when fetch throws (offline)', async () => {
    mockFetch(async () => {
      throw new Error('network down');
    });
    expect(await fetchLatestPush('voyagi')).toBeNull();
  });
});
