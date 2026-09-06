# design/ - hi-fi artifacts

Real rendered screenshots of the built site, not mockups, captured from a served build with the
actual fonts and styles via [`../scripts/capture.devbrowser.js`](../scripts/capture.devbrowser.js).
Regenerate them with `npm run build`, serve `dist` (`npm run serve:test`), then run that script and
copy the PNGs out of `~/.dev-browser/tmp`.

> Captured with `prefers-reduced-motion: reduce`, and the script walks the page down and back
> before each shot so the scroll-revealed sections are actually in frame. The live experience adds
> the slow cinematic scroll, the reveal transitions, and the design switcher.

## Pages

Shot in the canonical **Vitrine** design. The other design languages are switchable on the live
site and share the same content.

| Page | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| Home | [home-desktop.png](home-desktop.png) | [home-tablet.png](home-tablet.png) | [home-mobile.png](home-mobile.png) |
| Privacy | [privacy-desktop.png](privacy-desktop.png) | [privacy-tablet.png](privacy-tablet.png) | [privacy-mobile.png](privacy-mobile.png) |
| 404 | [notfound-desktop.png](notfound-desktop.png) | [notfound-tablet.png](notfound-tablet.png) | [notfound-mobile.png](notfound-mobile.png) |

## Social

- [og.png](og.png) - the share card (1200x630). This is a copy of the shipped
  `public/og.png`, byte for byte, so the two can never drift apart. Regenerate the shipped one
  from `/og-preview` and copy it here.

## Self-critique (what was checked against the "not-a-template" bar)

- **Identity is legible in a screenshot** - the `ta.` mark and the lowercase wordmark sit in every
  masthead, the oversized Fraunces headline carries the page, and the warm paper ground is a colour
  no competing studio in the surveyed field uses. Nothing here reads as a stock template.
- **Colour is rationed** - warm paper and ink carry the whole page, with bronze and brass as the
  single accent. No gradients, no colour washes.
- **Hierarchy and rhythm** - Fraunces display against Inter body, a fluid type scale, hairline
  rules, and one clear next step per section.
- **Real content** - every craft and case is specific, with a measurable number where one is known,
  and no lorem anywhere.
- **Responsive** - the tablet and mobile shots stack cleanly with no horizontal overflow, and the
  masthead swaps to the compact mark on the narrowest screens.
