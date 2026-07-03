/**
 * Ink design content.
 *
 * Editable copy lives in src/data/ink.json so the owner can change it through
 * the content admin at /admin. This module reads that file, merges the
 * per-service copy with the code-owned order and headings (both derived from
 * HERO_WORDS, so the rotating slab word and the five service sections can never
 * drift apart), and re-exports typed content for the Ink components. Mirrors the
 * src/data/vitrine.json <- src/config/vitrine.ts pattern.
 *
 * The service ORDER, ids, and headings are deliberately NOT editable: they are
 * design (the same five nouns the hero word rotates through). The CMS can only
 * change each service's paragraph and honor line.
 */
import inkData from '../data/ink.json';
import { HERO_WORDS } from '../lib/ink-hero';

export interface ServiceCopy {
  paragraph: string;
  /** The constraint we hold ourselves to; rendered as the "we honor" line. */
  honor: string;
}

export interface Service extends ServiceCopy {
  /** Section anchor id, the hero word lowercased (code-owned). */
  id: string;
  /** The service noun (the hero word), also the section heading. */
  title: string;
}

/** A value is blank if it is not a string or is empty once trimmed. */
const isBlank = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';

const serviceCopy = inkData.services.items as Record<string, ServiceCopy>;

// Build-time guard: every code-defined service (one per hero word) must have
// complete copy. A missing or whitespace-only field is a malformed edit; fail
// loudly at build rather than render a blank section.
export const services: Service[] = HERO_WORDS.map((word) => {
  const id = word.toLowerCase();
  const copy = serviceCopy[id];
  if (!copy || isBlank(copy.paragraph) || isBlank(copy.honor)) {
    throw new Error(
      `ink.json: services.items.${id} is missing required copy (paragraph and honor).`,
    );
  }
  return { id, title: word, paragraph: copy.paragraph, honor: copy.honor };
});

export const heroContent = inkData.hero;
export const servicesKicker = inkData.services.kicker;
export const approachContent = inkData.approach;
export const contactContent = inkData.contact;

// Blank-field backstop for the small copy the CMS marks required (the admin UI
// blocks empty saves; this catches a direct edit that bypasses it).
const required: Array<[unknown, string]> = [
  [heroContent.tagLead, 'hero.tagLead'],
  [heroContent.tagStrong, 'hero.tagStrong'],
  [heroContent.kicker, 'hero.kicker'],
  [servicesKicker, 'services.kicker'],
  [approachContent.kicker, 'approach.kicker'],
  [approachContent.paragraph, 'approach.paragraph'],
  [contactContent.eyebrow, 'contact.eyebrow'],
  [contactContent.title, 'contact.title'],
  [contactContent.lead, 'contact.lead'],
];
for (const [value, path] of required) {
  if (isBlank(value)) throw new Error(`ink.json: ${path} must not be blank.`);
}

// Brand hard rule: no em dashes anywhere in copy. A CMS cannot enforce it on
// every surface, so lint at build across every string and fail if one slips in.
// The U+2014 char is built from its code point (not a literal) so this guard is
// not itself an AI-tell.
const EM_DASH = String.fromCharCode(0x2014);
function assertNoEmDash(value: unknown, path: string): void {
  if (typeof value === 'string') {
    if (value.includes(EM_DASH)) {
      throw new Error(
        `ink.json: em dash found at ${path} (brand rule: no em dashes). Use a comma, colon, or full stop.`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoEmDash(item, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) assertNoEmDash(v, `${path}.${key}`);
  }
}
assertNoEmDash(inkData, 'ink');
