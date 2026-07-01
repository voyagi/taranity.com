import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * slug -> date (updatedDate, else pubDate) for PUBLISHED journal articles.
 *
 * Used by astro.config.mjs to stamp an accurate <lastmod> on the journal's
 * sitemap URLs; an inaccurate lastmod is worse than none, so only pages with a
 * real content date get one. Reads frontmatter with fs because astro:content
 * is not available inside the Astro config. Drafts are skipped (they are not
 * built, so they never appear in the sitemap).
 *
 * Walks subdirectories to mirror the collection's `**\/*.md` glob: a nested
 * article's slug is its path relative to the content dir (posix separators,
 * no extension), exactly how the content collection derives `post.id`.
 */
export function journalLastmod(dir = 'src/content/journal'): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (current: string, prefix: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(join(current, entry.name), `${prefix}${entry.name}/`);
        continue;
      }
      if (!entry.name.endsWith('.md')) continue;
      const raw = readFileSync(join(current, entry.name), 'utf8');
      const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      if (/^draft:\s*true\s*$/m.test(frontmatter)) continue;
      const date =
        frontmatter.match(/^updatedDate:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1] ??
        frontmatter.match(/^pubDate:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
      if (date) map.set(`${prefix}${entry.name.replace(/\.md$/, '')}`, date);
    }
  };
  walk(dir, '');
  return map;
}

/** The newest date in the map: the honest lastmod for the /journal listing page. */
export function newestLastmod(map: Map<string, string>): string | undefined {
  let newest: string | undefined;
  for (const date of map.values()) {
    if (!newest || date > newest) newest = date;
  }
  return newest;
}
