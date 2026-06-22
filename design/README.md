# design/ - hi-fi artifacts

These are **real rendered screenshots** of the built site (not Figma comps) - the strongest
possible proof of the design language, captured from the live dev server with the actual fonts
and styles via `dev-browser` (Playwright). Regenerate any time with
[`../scripts/capture.devbrowser.js`](../scripts/capture.devbrowser.js).

> Captured with `prefers-reduced-motion: reduce` so every scroll-reveal section is fully visible
> in the full-page shots. The live desktop experience adds the kinetic SplitText hero, the pinned
> horizontal gallery, the magnetic cursor, and the holographic hover edges.

## Pages

| Page | Desktop | Mobile |
|------|---------|--------|
| Home | [home-desktop.png](home-desktop.png) | [home-mobile.png](home-mobile.png) |
| Work (gallery) | [work-desktop.png](work-desktop.png) | [work-mobile.png](work-mobile.png) |
| Case study | [case-study-desktop.png](case-study-desktop.png) | [case-study-mobile.png](case-study-mobile.png) |
| About | [about-desktop.png](about-desktop.png) | [about-mobile.png](about-mobile.png) |
| Contact | [contact-desktop.png](contact-desktop.png) | [contact-mobile.png](contact-mobile.png) |
| 404 | [notfound-desktop.png](notfound-desktop.png) | [notfound-mobile.png](notfound-mobile.png) |

## Social

- [og.png](og.png) - Open Graph image (1200×630), shipped at `public/og.png`.

## Self-critique (what was checked against the "not-a-template" bar)

- **Identity is legible in a screenshot** - HUD corner brackets, the `~/ taranity ●` shell
  wordmark, telemetry mono labels, and the live Currently console make every page unmistakably
  *this* site, not a generic dark SaaS page.
- **Accent is rationed** - the violet→cyan gradient appears only on accent words, metric numbers,
  and edges; backgrounds are near-black with light, never colour washes (avoids the "purple SaaS
  gradient" cliché).
- **Hierarchy & rhythm** - Space Grotesk display vs. Inter body vs. JetBrains Mono "system voice";
  fluid type scale; one centred CTA per section.
- **Real content** - every project is Problem→Solution→Result with a measurable number; copy is
  specific and human, no lorem.
- **Responsive** - mobile stacks cleanly with no horizontal overflow; the horizontal gallery
  becomes a vertical card stack on small screens / reduced motion.
