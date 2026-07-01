/**
 * Prism design content.
 *
 * Editable marketing copy lives in src/data/prism.json so the owner can change
 * it through the content admin at /admin. This module reads that file, merges
 * the per-service copy with the fixed (code-only) order and numbering, and
 * re-exports typed content for the Prism components. Mirrors the
 * src/data/vitrine.json <- src/config/vitrine.ts pattern.
 *
 * The service ORDER, ids, and 01-05 numbering are deliberately NOT editable:
 * they are design. Because the copy is keyed by a code-owned id in a code-owned
 * order, the CMS cannot add a sixth service, reorder the five, or rename an id;
 * only their text changes.
 */
import prismData from '../data/prism.json';

export interface ServiceCopy {
  title: string;
  line: string;
  /** The constraint we hold ourselves to; rendered as the "we honor" line. */
  honor: string;
}

export interface Service extends ServiceCopy {
  id: string;
  /** Zero-padded index ("01".."05"), derived from the code-owned order. */
  index: string;
}

/** Service order is code-controlled (the numbered list is the design). */
const SERVICE_ORDER = ['websites', 'commerce', 'apps', 'automation', 'systems'] as const;

const serviceCopy = prismData.services.items as Record<string, ServiceCopy>;

/** A value is blank if it is not a string or is empty once trimmed. */
const isBlank = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';

// Build-time guard: every code-defined service must have complete copy. A
// missing or whitespace-only field is a malformed edit; fail loudly at build
// rather than render a blank row in the numbered list.
export const services: Service[] = SERVICE_ORDER.map((id, i) => {
  const copy = serviceCopy[id];
  if (!copy || isBlank(copy.title) || isBlank(copy.line) || isBlank(copy.honor)) {
    throw new Error(`prism.json: services.items.${id} is missing required copy (title/line/honor).`);
  }
  return { id, index: String(i + 1).padStart(2, '0'), ...copy };
});

export const heroContent = prismData.hero;
export const servicesLabel = prismData.services.label;
export const approachContent = prismData.approach;
export const contactContent = prismData.contact;

// The stacked poster headline needs every line present: a blank line renders an
// empty serif row and breaks the overlap rhythm. The CMS's required-field
// default blocks empty saves through the admin UI; this is the build-time
// backstop for a direct edit.
function assertNonEmptyLines(lines: string[], path: string): void {
  if (lines.length === 0 || lines.some(isBlank)) {
    throw new Error(`prism.json: ${path} must have at least one line and no blank lines.`);
  }
}
assertNonEmptyLines(heroContent.titleLines, 'hero.titleLines');
assertNonEmptyLines(heroContent.captions, 'hero.captions');
assertNonEmptyLines(approachContent.lines, 'approach.lines');

// Brand hard rule: no em dashes anywhere in copy. A CMS cannot enforce this, so
// lint at build across every extracted string and fail if one slips in. The
// U+2014 char is built from its code point (not a literal) so this guard is
// not itself an AI-tell.
const EM_DASH = String.fromCharCode(0x2014);
function assertNoEmDash(value: unknown, path: string): void {
  if (typeof value === 'string') {
    if (value.includes(EM_DASH)) {
      throw new Error(
        `prism.json: em dash found at ${path} (brand rule: no em dashes). Use a comma, colon, or full stop.`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoEmDash(item, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      assertNoEmDash(v, `${path}.${key}`);
    }
  }
}
assertNoEmDash(prismData, 'prism');
