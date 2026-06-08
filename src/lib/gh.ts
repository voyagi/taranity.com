/**
 * "Currently" widget data — latest public GitHub push.
 *
 * Unauthenticated public-events endpoint (60 req/hr per IP). Returns null on any
 * failure (offline, rate-limit, private-only activity) so the widget can fall
 * back to a curated "recently shipped" line. No secrets required.
 */

export interface PushInfo {
  repo: string;
  message: string;
  url: string;
  when: string;
}

export function relativeTime(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, secs] of units) {
    if (Math.abs(seconds) >= secs) {
      return rtf.format(-Math.round(seconds / secs), unit);
    }
  }
  return 'just now';
}

export async function fetchLatestPush(username: string): Promise<PushInfo | null> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=30`,
      { headers: { Accept: 'application/vnd.github+json' } },
    );
    if (!res.ok) return null;
    const events: unknown = await res.json();
    if (!Array.isArray(events)) return null;
    const push = events.find(
      (e: any) => e?.type === 'PushEvent' && Array.isArray(e?.payload?.commits) && e.payload.commits.length,
    ) as any;
    if (!push) return null;
    const commits = push.payload.commits;
    const commit = commits[commits.length - 1];
    const fullRepo: string = push.repo?.name ?? '';
    return {
      repo: fullRepo.split('/')[1] || fullRepo || 'repo',
      message: String(commit.message || '').split('\n')[0].slice(0, 72),
      url: `https://github.com/${fullRepo}/commit/${commit.sha}`,
      when: relativeTime(new Date(push.created_at)),
    };
  } catch {
    return null;
  }
}
