/**
 * "Keep reading" selection for a journal article.
 *
 * Returns up to `limit` OTHER articles, starting with the one immediately after
 * `currentIndex` in the (already sorted) list and wrapping around to the start.
 * Rotating the window means each article surfaces a different set, rather than
 * every article linking the same lowest-order few.
 *
 * The current article is never included: it sits at `currentIndex`, between the
 * two slices (`slice(currentIndex + 1)` starts after it, `slice(0, currentIndex)`
 * stops before it), so no entry repeats and the article never links to itself.
 */
export function relatedPosts<T>(posts: readonly T[], currentIndex: number, limit = 3): T[] {
  return posts
    .slice(currentIndex + 1)
    .concat(posts.slice(0, currentIndex))
    .slice(0, limit);
}
