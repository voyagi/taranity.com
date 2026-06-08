import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchLatestPush } from '../../src/lib/gh';

describe('fetchLatestPush', () => {
  afterEach(() => vi.unstubAllGlobals());

  const mockFetch = (impl: () => Promise<unknown>) => vi.stubGlobal('fetch', vi.fn(impl));

  it('parses the latest PushEvent into PushInfo', async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => [
        { type: 'WatchEvent' },
        {
          type: 'PushEvent',
          created_at: '2026-06-08T10:00:00Z',
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
    expect(push!.dateISO).toBe('2026-06-08T10:00:00Z');
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
