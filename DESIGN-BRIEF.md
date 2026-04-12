# Taranity.com Portfolio — Design Brief

Compiled: 2026-04-12
Sources: 5 parallel research agents, 200+ web sources, Awwwards/Codrops/FWA analysis

---

## 1. Recommended Tech Stack

| Layer | Choice | Size | Why |
|-------|--------|------|-----|
| **Framework** | Astro | ~0-5KB JS shipped | Zero JS by default, islands architecture, native View Transitions, proven by Awwwards winners (Stas Bondar, Joffrey Spitzer portfolios) |
| **Smooth Scroll** | Lenis | 2.13KB gzip | Industry standard by Darkroom Engineering, CSS `sticky` works, no DOM constraints |
| **Animation** | GSAP + ScrollTrigger + SplitText | ~40-50KB gzip | 100% free since April 2025 (Webflow acquisition), nothing else can do pinned scrubbed timelines |
| **3D (optional)** | Three.js (WebGPU backend) | ~50-80KB lazy | Only load via `client:visible` when 3D section enters viewport |
| **Styling** | Tailwind CSS v4 | - | Dark theme tokens, fast prototyping |
| **Hosting** | Cloudflare Pages | - | Unlimited bandwidth free, sub-50ms globally, first-class Astro support |
| **Analytics** | Plausible | <1KB | Built-in scroll depth, no cookies, no consent banner |
| **Contact** | Web3Forms or Formspree | - | No backend needed, spam protection included |

### Why Astro Over Next.js
- Astro ships 0-5KB JS vs Next.js 85-120KB React runtime
- The less framework JS you ship, the more budget for animation JS
- GSAP directly manipulates DOM — React's reconciliation cycle causes dropped frames
- Both Stas Bondar (Codrops, March 2025) and Joffrey Spitzer (Codrops, Feb 2026) used **Astro + GSAP + Three.js + Lenis** and won awards

### The Sync Pattern (Lenis + GSAP)
```js
const lenis = new Lenis();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

### Bundle Budget
| Component | Size (gzip) | Load Strategy |
|-----------|-------------|---------------|
| GSAP core | ~23KB | Eager (hero needs it) |
| ScrollTrigger | ~10KB | Eager |
| SplitText | ~5KB | Lazy (first text animation) |
| Lenis | ~3KB | Eager |
| Three.js (tree-shaken) | ~50-80KB | `client:visible` |
| **Hero total** | **~36KB** | Before first paint |
| **Full site** | **~120-150KB** | Progressive |

---

## 2. Visual Design Direction

### Color Palette
- **Background**: `#0A0A0A` to `#0F172A` (near-black, never pure #000)
- **Primary accent**: Electric cyan `#22D3EE` or `#00F0FF`
- **Secondary accent**: Violet `#8B5CF6`
- **Gradient**: Violet-to-cyan (`#8B5CF6` → `#06B6D4`) — reads as "innovative + premium"
- **Text primary**: `#FFFFFF` or `#F2F2F2` (never grey for primary text)
- **Text secondary**: `#94A3B8`
- **Glass borders**: `rgba(255, 255, 255, 0.1)`
- **Glow effects**: `box-shadow: 0 0 20px rgba(34, 211, 238, 0.4)`

### Typography
| Role | Font | Why |
|------|------|-----|
| **Headlines** | Space Grotesk | Futuristic tone, used by AI/blockchain/deep-tech brands |
| **Body** | Inter | Crystal clear at all sizes, the safest digital all-rounder |
| **Code/Mono** | JetBrains Mono | Developer identity signal, excellent in code blocks |

- Load WOFF2 only (30% better compression)
- Preload 1-2 critical fonts max
- `font-display: swap` for body, `font-display: optional` for decorative
- Consider variable fonts for headline weight transitions on scroll

### Core Aesthetic: Dark Glassmorphism + Holographic
- Semi-transparent frosted panels: `backdrop-filter: blur(12px)` + `background: rgba(255, 255, 255, 0.05)`
- Neon glow edges on interactive elements
- Film grain/noise texture overlay for analog depth
- Holographic/sci-fi interface motifs (glowing grids, data visualization elements)
- Subtle scan lines or CRT effects for authenticity

### What's Overdone — AVOID
- Generic "Hello, I'm [Name]" hero sections
- Purple gradient + Inter + Tailwind defaults (every AI-generated site looks like this)
- Ultra-minimalism with zero personality
- Stock photography and obvious AI-generated images
- Overused script/handwritten fonts
- Excessive aimless particle effects
- Pop-ups and intrusive overlays
- Static bento grids without animation

---

## 3. Animation Toolkit

### GSAP ScrollTrigger Patterns

**Pinned sections with scrubbed timelines** (the signature move):
```js
gsap.timeline({
  scrollTrigger: {
    trigger: ".section",
    pin: true,
    start: "top top",
    end: "+=1500",
    scrub: 1  // 1 second smooth catch-up (recommended)
  }
})
.from(".heading", { opacity: 0, y: 50 })
.from(".content", { opacity: 0, y: 30 }, "-=0.3");
```

**Horizontal scroll project gallery**:
```js
let panels = gsap.utils.toArray(".project-panel");
gsap.to(panels, {
  xPercent: -100 * (panels.length - 1),
  ease: "none",
  scrollTrigger: {
    trigger: ".gallery-container",
    pin: true,
    scrub: 1,
    snap: 1 / (panels.length - 1),
    end: () => "+=" + document.querySelector(".gallery-container").offsetWidth
  }
});
```

**SplitText character reveal**:
```js
const split = SplitText.create("#hero-title", { type: "chars" });
gsap.from(split.chars, {
  opacity: 0, y: 20, rotateX: -90, stagger: 0.03,
  scrollTrigger: { trigger: "#hero-title", start: "top 80%" }
});
```

**Batch processing for many elements** (performance-optimized):
```js
ScrollTrigger.batch('.card', {
  onEnter: (elements) => {
    gsap.to(elements, { opacity: 1, y: 0, stagger: 0.15 });
  },
  start: 'top 90%'
});
```

### CSS Scroll-Timeline (Compositor Thread — Free Performance)
For simple parallax/fade effects, offload to CSS:
```css
.parallax-layer {
  animation: parallax linear;
  animation-timeline: view();
  animation-range: entry 0% exit 100%;
}
@keyframes parallax {
  from { transform: translateY(50px); }
  to { transform: translateY(-50px); }
}
```
Browser support is now universal (Chrome 115+, Firefox 110+, Safari 17.5+).

### Responsive Animations
```js
gsap.matchMedia({
  "(min-width: 1024px)": () => { /* Full desktop animations */ },
  "(max-width: 768px)": () => { /* Simplified mobile animations */ },
  "(prefers-reduced-motion: reduce)": () => { /* Minimal/no animations */ }
});
```

### Performance Rules
- **Only animate `transform` and `opacity`** — compositor-thread, GPU-accelerated
- `will-change: transform` sparingly (too many layers crash mobile)
- `contain: layout style paint` on animated sections
- Cap `devicePixelRatio` at 2 for WebGL
- Use `ScrollTrigger.batch()` for many elements
- Test on mid-range Android phones, not just MacBooks
- Kill ScrollTriggers before removing DOM elements
- ~35% of users have `prefers-reduced-motion` — always support it

---

## 4. Award-Winning Sites to Study

### Tier 1 — Must Study (Directly Relevant)

| Site | What Makes It Special | Tech |
|------|----------------------|------|
| **Corentin Bernadou** (corentinbernadou.com) | Swiss Style + WebGL, Easter egg grid toggle (Option+G), navigation mask follows cursor. Awwwards SOTD + Dev Award March 2026 | Vanilla JS, Three.js, GSAP, Lenis |
| **Dennis Snellenberg** (dennissnellenberg.com) | Refined minimalism with parallax, custom cursor, seamless page transitions. Most cloned portfolio style in creative dev. Awwwards SOTD + Dev Award | Next.js, Framer Motion, GSAP, Lenis |
| **Cyd Stumpel** (cydstumpel.nl) | CSS-only scroll animations, View Transitions API, minimal 2-color palette. Proves you can win top awards without heavy JS. Awwwards SOTD + Dev Award March 2025 | CSS Scroll Driven Animations, View Transitions API |
| **Stas Bondar** (Codrops case study) | Astro + GSAP + Three.js + Matter.js physics. Award-winning with the exact recommended stack | Astro, GSAP, Three.js, Lenis |
| **Joffrey Spitzer** (Codrops case study) | Minimalist Astro + GSAP build with reveals, FLIP transitions, subtle motion | Astro, GSAP, SplitText, Lenis, Three.js, Swup |

### Tier 2 — Aspirational (Push Boundaries)

| Site | What Makes It Special |
|------|----------------------|
| **Bruno Simon** (bruno-simon.com) | Drive a 3D car through the portfolio. Gold standard for interactive 3D. Awwwards Site of the Month Jan 2026 |
| **Samsy** (samsy.ninja) | Cyberpunk WebGPU world at 120+ FPS. Awwwards SOTD + Dev Award Oct 2025 |
| **Joseph Santamaria** (joseph-san.com) | Scroll = camera movement through hand-composed 3D scenes. Codrops tutorial available |
| **Robin Mastromarino** (robinmastromarino.com) | Velocity-based displacement effects — interactions respond to HOW FAST you interact |
| **Messenger** (Awwwards SOTY 2025) | Full interactive 3D planet. Transforms interaction into play |
| **Lando Norris** (landonorris.com) | 3D helmet rotations, Rive animations, scroll-driven cinematics. Awwwards SOTY 2025 |

### Tier 3 — Creative Agencies (Technique Reference)

| Studio | Known For |
|--------|-----------|
| **Darkroom Engineering** (darkroom.engineering) | Created Lenis. "Code that holds up, craft that doesn't quit" |
| **Immersive Garden** (immersive-g.com) | Draggable project navigation, Three.js + Vue + GSAP |
| **Locomotive** | Built Scout Motors (Awwwards Dev SOTY 2025), maintains Locomotive Scroll |
| **Active Theory** | Homepage rendered like a game engine |

---

## 5. Creative Concepts to Consider

### Layout / Structure Ideas

1. **Mission Control Dashboard** — Present the site as a monitoring dashboard with live widgets (GitHub activity, project stats). Directly demonstrates what you build.

2. **Scrollytelling Narrative** — Structure as chapters: "The First Bot", "When Automation Took Over", "Building Intelligence". Each chapter reveals through parallax, transitions, scene changes.

3. **Terminal/CLI Portfolio** — Visitors type commands (`ls projects`, `cat about.md`, `run demo`). Demonstrates technical depth. Multiple open-source templates available.

4. **IDE/VS Code Theme** — File tree sidebar, tabbed navigation, syntax-highlighted content, status bar. Boot screen animation on first visit.

5. **Standard But Elevated** — Hero → About → Projects (horizontal scroll) → Stats → Contact. The safe choice, but with mind-blowing execution on each section.

### Hero Section Ideas

1. **Kinetic SplitText** — Name characters scatter/reform on scroll with 3D rotations
2. **Particle Field** — Three.js particles that react to cursor and form the brand name
3. **Boot Sequence** — Terminal-style initialization: "Loading systems... Connecting... Ready."
4. **Morphing Shapes** — Abstract 3D geometry that morphs between forms as you scroll past
5. **Glitch/Holographic** — Text with scan line effects, RGB split, holographic shimmer

### Project Showcase Ideas

1. **Horizontal scroll gallery** with pinned section and snap points
2. **Stacked card deck** — Cards stack/unstack as you scroll
3. **Live demos embedded** via iframes (visitors interact with actual projects)
4. **Architecture diagrams** as animated visual elements (React Flow / D3.js)
5. **Before/After sliders** — Manual process vs. automated version
6. **Real-time metrics** pulled from live projects (API response times, uptime)

### Interactive Elements

1. **Command palette** (Ctrl+K) — Navigate by typing, signals developer-tool expertise
2. **Custom cursor** — Morphs on hover (circle → "view" text → magnetic snap)
3. **Easter eggs** — Konami code, console ASCII art, hidden pages
4. **Sound design** — Subtle hover/click audio (opt-in with mute toggle)
5. **Generative art per visit** — Unique pattern from timestamp/mouse seed. "No two visits see the same thing."

### Unique Differentiators

1. **AI chatbot integration** — Visitors ask about projects, the portfolio answers. The portfolio IS the demo.
2. **"Currently" section** — Auto-updates with latest commit, current project, local time
3. **Boot sequence preloader** — Terminal initialization themed to AI/automation brand
4. **View Transitions API** — Cinematic page changes (project card morphs into full case study)

---

## 6. Projects to Showcase

From workspace research, these are the strongest portfolio pieces:

| Project | Description | Tech Stack | Visual Hook |
|---------|-------------|------------|-------------|
| **Cortex** | Unified AI development monitoring dashboard | Svelte 5, Express 5, SQLite, Tailwind v4, Chart.js | Dashboard screenshots, live metrics |
| **CallCatch** | Smart business call verification SaaS | Full-stack TS | Phone/AI visual, problem-solution narrative |
| **MCP Server** | Custom Model Context Protocol server | TypeScript, MCP SDK | Architecture diagram, protocol flow |
| **N8N Automation** | Workflow automation platform | N8N, Twilio | Workflow diagram, before/after |
| **AI Chatbot** | Intelligent conversational AI | TypeScript, AI/ML | Chat interface demo |
| **Fontys Schedule** | University schedule management app | Supabase, TypeScript | App screenshots, calendar UI |
| **Claude Code Ecosystem** | 50+ hooks, 30+ skills, overnight automation | Node.js, GSAP, extensive tooling | Stats counter (50 hooks, 30 skills, 300+ conversations) |
| **Dev Browser** | Automated browser testing framework | Puppeteer, CDP | Browser automation visual |

---

## 7. Tagline Ideas

Avoid generic "Hello, I'm..." — communicate specific value:

- "I automate what slows you down"
- "Building the tools that build themselves"
- "From manual chaos to automated calm"
- "Your next team member runs on code"
- "AI-powered. Human-obsessed."
- "Full-stack developer. Automation architect."

---

## 8. Content Strategy

### What Actually Converts (Research-Backed)
- 2-3 exceptional case studies with measurable results > 10 mediocre project cards
- Problem → Solution → Result format for each project
- 87% of hiring managers consider portfolios more valuable than resumes
- CTA placed center-screen gets 682% more clicks than left/right
- Single clear CTA per section boosts conversions by 266%
- Video is the most engaging format (59% of execs prefer watching to reading)

### Page Structure (Recommended)
Multi-page with Astro View Transitions (SEO-friendly, feels like SPA):
- `/` — Hero + overview + featured projects
- `/projects` or `/work` — Full project showcase
- `/about` — Background, skills, story
- `/contact` — Contact form + Calendly

### Essential SEO
- Open Graph image (1200x630)
- JSON-LD structured data (Person schema)
- Semantic HTML (`<main>`, `<article>`, `<section>`, `<nav>`)
- Server-rendered content (Astro default)

---

## 9. Mobile Strategy

- Consider NOT loading Three.js on mobile — replace with static image or CSS animation
- Use `gsap.matchMedia()` for responsive animation breakpoints
- Replace hover effects with tap/press on touch
- 44px minimum touch targets
- Lenis may feel sluggish on mobile — test and consider native scroll as fallback
- WebGPU has better battery efficiency than WebGL (3h vs 2h same workload)

---

## 10. Deployment Checklist

1. Set up Astro project with Cloudflare Pages adapter
2. Transfer DNS for taranity.com to Cloudflare (free DNS hosting)
3. Connect GitHub repo → Cloudflare Pages (auto-builds on push)
4. Add custom domain → SSL is automatic
5. Set up Plausible analytics
6. Add Web3Forms for contact
7. Create OG image for social sharing
8. Test Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms)

---

## Next Steps

1. **You show me examples** of sites whose style you love
2. We pick a layout concept (dashboard / scrollytelling / standard elevated / terminal / other)
3. I build it section by section with the recommended stack
4. We iterate on each section until it's mind-blowing
