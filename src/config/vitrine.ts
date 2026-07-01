/**
 * Vitrine design content and per-craft design descriptors.
 *
 * Editable marketing copy lives in src/data/vitrine.json so the owner can change
 * it through the content admin at /admin. This module reads that file, merges the
 * per-craft copy with the fixed (code-only) design descriptors, and re-exports
 * typed content for the Vitrine components. Mirrors the src/data/site.json ←
 * src/config/site.ts pattern established in Phase 1.
 *
 * The craft ORDER, ids, roman numerals, engraved motifs, and colour palettes are
 * deliberately NOT editable: they are design, and "intelligent systems last" is a
 * hard content rule. The admin edits each craft's words only. Because the copy is
 * keyed by a code-owned id in a code-owned order, the CMS cannot add a seventh
 * craft, reorder the six, or rename an id; only their text changes.
 */
import vitrineData from '../data/vitrine.json';

export type CraftMotif = 'page' | 'tag' | 'panels' | 'orbits' | 'compass' | 'constellation';

interface CraftPalette {
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
}

interface CraftDesign {
  numeral: string;
  motif: CraftMotif;
  /** Rich dark-mode plate gradient stops. */
  art: CraftPalette;
  /** Pale light-mode tint of the same hue. */
  artLight: CraftPalette;
}

export interface CraftCopy {
  title: string;
  kicker: string;
  line: string;
  includes: string[];
}

export interface Craft extends CraftCopy, CraftDesign {
  id: string;
}

/**
 * Fixed design per craft. Adding an entry here means authoring new artwork; the
 * CMS cannot do it. Keyed by the same ids used in vitrine.json crafts.items.
 */
const CRAFT_DESIGN: Record<string, CraftDesign> = {
  websites: {
    numeral: 'I',
    motif: 'page',
    art: { a: '#4a3a80', b: '#2d2452', c: '#1a1430', d: '#2a2046', e: '#6e54b4' },
    artLight: { a: '#ece4fb', b: '#ddd0f3', c: '#e3d7f7', d: '#ccbbee', e: '#c2a8ee' },
  },
  commerce: {
    numeral: 'II',
    motif: 'tag',
    art: { a: '#84304e', b: '#4e1f30', c: '#271018', d: '#46202e', e: '#b04a66' },
    artLight: { a: '#fde9ef', b: '#f8d3de', c: '#fadce5', d: '#f3c2d0', e: '#f0a6be' },
  },
  applications: {
    numeral: 'III',
    motif: 'panels',
    art: { a: '#3c5a7a', b: '#243447', c: '#131c26', d: '#27384c', e: '#5a82a8' },
    artLight: { a: '#e6f1fb', b: '#cfe2f6', c: '#d9e9f8', d: '#b8d5ef', e: '#9cc6ed' },
  },
  automation: {
    numeral: 'IV',
    motif: 'orbits',
    art: { a: '#7a5a2c', b: '#473522', c: '#241b12', d: '#42301a', e: '#a87c3c' },
    artLight: { a: '#fdeeda', b: '#f9ddc1', c: '#fce4cb', d: '#f5cca2', e: '#f2bb8c' },
  },
  advisory: {
    numeral: 'V',
    motif: 'compass',
    art: { a: '#5a6474', b: '#393f4c', c: '#1b1f26', d: '#333a46', e: '#7e8aa0' },
    artLight: { a: '#e3f5e8', b: '#cdebd5', c: '#d7f0dd', d: '#b7e1c2', e: '#9bd4ad' },
  },
  intelligentSystems: {
    numeral: 'VI',
    motif: 'constellation',
    art: { a: '#2a6a5e', b: '#1c443c', c: '#102420', d: '#1d4038', e: '#3f947f' },
    artLight: { a: '#e0f4f3', b: '#c7e9e6', c: '#d1eeeb', d: '#aedfd9', e: '#90d0c9' },
  },
};

/** Plate order is code-controlled (design sequence + the "AI last" hard rule). */
const CRAFT_ORDER = [
  'websites',
  'commerce',
  'applications',
  'automation',
  'advisory',
  'intelligentSystems',
] as const;

const craftCopy = vitrineData.crafts.items as Record<string, CraftCopy>;

// Build-time guard: every code-defined craft must have copy. A missing entry is a
// malformed edit; fail loudly at build rather than render a blank plate.
export const crafts: Craft[] = CRAFT_ORDER.map((id) => {
  const copy = craftCopy[id];
  if (!copy || !copy.title || !copy.kicker || !copy.line) {
    throw new Error(`vitrine.json: crafts.items.${id} is missing required copy (title/kicker/line).`);
  }
  return { id, ...copy, ...CRAFT_DESIGN[id] };
});

export const heroContent = vitrineData.hero;
export const manifestoContent = vitrineData.manifesto;
export const studioContent = vitrineData.studio;
export const contactContent = vitrineData.contact;
export const craftsLabel = vitrineData.crafts.label;
export const craftsNote = vitrineData.crafts.note;

// A masked headline with no lines renders as an empty, broken heading. The CMS's
// required-field default blocks an empty save through the admin UI; this is the
// build-time backstop for a direct data edit.
function assertNonEmptyLines(lines: string[], path: string): void {
  if (!lines.some((line) => line.trim() !== '')) {
    throw new Error(`vitrine.json: ${path} must have at least one non-empty line.`);
  }
}
assertNonEmptyLines(heroContent.titleLines, 'hero.titleLines');
assertNonEmptyLines(manifestoContent.statementLines, 'manifesto.statementLines');
assertNonEmptyLines(contactContent.titleLines, 'contact.titleLines');

// Brand hard rule: no em dashes anywhere in copy. A CMS cannot enforce this, so
// lint at build across every extracted string and fail if one slips in. The
// U+2014 char is built from its code point (not a literal) so this guard is
// not itself an AI-tell.
const EM_DASH = String.fromCharCode(0x2014);
function assertNoEmDash(value: unknown, path: string): void {
  if (typeof value === 'string') {
    if (value.includes(EM_DASH)) {
      throw new Error(
        `vitrine.json: em dash found at ${path} (brand rule: no em dashes). Use a comma, colon, or full stop.`,
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
assertNoEmDash(vitrineData, 'vitrine');
