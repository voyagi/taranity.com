/**
 * Design showcase registry. Taranity ships several genuinely different design
 * languages, each aimed at a different kind of client, that a visitor can switch
 * between. A "design" here is a whole self-contained experience (its own layout,
 * type, motion, structure), not a recolour. Each lives under
 * src/components/designs/<id>/ and renders at its own route; the flagship at "/".
 *
 * Only `ready` designs appear in the switcher, so partially-built work is never
 * exposed. Designs are built and flipped to ready one per PR, in this order.
 */
export type DesignMode = 'light' | 'dark';

export interface Design {
  id: string;
  name: string;
  /** One line shown in the switcher. */
  tagline: string;
  /** The kind of client it is aimed at. */
  audience: string;
  /** Route it renders at ("/" for the flagship). */
  route: string;
  /** Modes it supports; the system preference picks the default where both exist. */
  modes: DesignMode[];
  /** Only ready designs are offered. */
  ready: boolean;
}

export const designs: Design[] = [
  { id: 'vitrine', name: 'Vitrine', tagline: 'Luxury and editorial', audience: 'Anyone who values craft', route: '/', modes: ['dark', 'light'], ready: true },
  { id: 'atlas', name: 'Atlas', tagline: 'Immersive 3D', audience: 'Agencies, tech, launches', route: '/atlas', modes: ['dark'], ready: true },
  { id: 'signal', name: 'Signal', tagline: 'Clean product', audience: 'SaaS, fintech, startups', route: '/signal', modes: ['light', 'dark'], ready: true },
  { id: 'storefront', name: 'Storefront', tagline: 'Commerce', audience: 'E-commerce and DTC brands', route: '/storefront', modes: ['light'], ready: true },
  { id: 'practice', name: 'Practice', tagline: 'Trusted local service', audience: 'Medical, legal, trades', route: '/practice', modes: ['light'], ready: false },
  { id: 'raw', name: 'Raw', tagline: 'Brutalist', audience: 'Art, music, culture, dev', route: '/raw', modes: ['dark', 'light'], ready: false },
];

export const DEFAULT_DESIGN = 'vitrine';
export const readyDesigns = (): Design[] => designs.filter((d) => d.ready);
export const getDesign = (id: string): Design | undefined => designs.find((d) => d.id === id);
