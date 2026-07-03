/**
 * Subpage content editable through the admin at /admin: the privacy page's
 * plain-text layer and the 404 page. Mirrors the src/data/vitrine.json ←
 * src/config/vitrine.ts pattern.
 *
 * The privacy BODY prose is deliberately NOT here: it is legal text that
 * embeds live values (contact email, site URL) and describes what the site
 * technically does with data (Turnstile, Web3Forms, analytics, cookies), so
 * it must only change together with code, under review. The admin edits the
 * framing (kicker, title, section headings, the "last reviewed" date); the
 * section KEYS and order are code-owned, so the CMS cannot add or reorder
 * sections. Em dashes in these files fail the build via check-brand-rules.mjs.
 */
import privacyData from '../data/privacy.json';
import notFoundData from '../data/not-found.json';

/** A value is blank if it is not a string or is empty once trimmed. */
const isBlank = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';

function assertPresent(record: Record<string, unknown>, fields: string[], file: string): void {
  for (const field of fields) {
    const value = field.includes('.')
      ? field.split('.').reduce<unknown>((v, k) => (v as Record<string, unknown>)?.[k], record)
      : record[field];
    if (isBlank(value)) {
      throw new Error(`${file}: "${field}" is missing or blank; the page cannot render without it.`);
    }
  }
}

assertPresent(
  privacyData,
  [
    'metaTitle',
    'metaDescription',
    'kicker',
    'title',
    'headings.collect',
    'headings.cookies',
    'headings.rights',
    'headings.retention',
    'lastReviewed',
  ],
  'privacy.json',
);
assertPresent(
  notFoundData,
  ['metaTitle', 'metaDescription', 'label', 'heading', 'lead', 'backLabel'],
  'not-found.json',
);

export const privacyContent = privacyData;
export const notFoundContent = notFoundData;
