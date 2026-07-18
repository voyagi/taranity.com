---
title: How Website Speed Quietly Kills Your Conversion Rate
description: "Slow pages cost sales before anyone reads your copy. How website speed affects conversion rate, what to measure, and the fixes that actually move revenue."
lead: "Speed is the tax every visitor pays before they see your offer. Most teams never connect the soft quarter to the four-second load."
kicker: Performance
pubDate: 2026-06-29
heroImage: /journal/website-speed-conversions.png
keywords:
  - website speed and conversion rate
  - page load time conversions
  - Core Web Vitals
  - website performance optimization
  - LCP
order: 1
faqs:
  - q: Does website speed really affect conversion rate?
    a: "Yes, directly and measurably. Deloitte found a 0.1 second mobile load-time improvement raised retail conversions by roughly 8 percent, and bounce rates rise sharply as load time passes three seconds. Slow pages lose visitors before they ever reach your funnel."
  - q: What is a good website load time?
    a: "Aim for a Largest Contentful Paint (LCP) under 2.5 seconds on a mid-range mobile phone. That is Google's good threshold and a sensible target for most marketing and commerce sites."
  - q: What slows down a website the most?
    a: "Unoptimised images are the most common cause, followed by too many third-party scripts (chat widgets, analytics, A/B tools), heavy JavaScript frameworks used where they are not needed, and the absence of a CDN or caching."
  - q: Do I need a redesign to make my site faster?
    a: "Usually not. Most sites recover the majority of their speed by compressing images, trimming third-party scripts, and adding a CDN, which takes weeks rather than a rebuild."
  - q: Is page speed a Google ranking factor?
    a: "Yes. Core Web Vitals (LCP, INP, CLS) are a confirmed ranking signal, so a slow page both ranks lower and converts worse. It loses at both ends."
---

Most teams find out their site is slow the same way. A soft quarter, a marketing spend
that is not paying back, and nobody can point to why. The homepage looks fine. The copy is
fine. The product is fine. So the speed never gets blamed, because speed is the one thing
you do not notice when it is missing. You just leave.

We design and build these sites for a living, and website speed and conversion rate are
joined at the hip more tightly than almost anything else we touch. Not because speed is
glamorous, but because it is the first impression a visitor forms, made before a single
line of your copy is read.

## The number that should bother you

Deloitte's "Milliseconds Make Millions" study put a figure on it that is hard to unsee. A
0.1 second improvement in mobile load time lifted retail conversions by around 8 percent.
A tenth of a second. Google's own data has shown bounce probability climbing fast as load
time stretches from one second to three, then falling off a cliff past five.

Here is the part people miss. You do not lose the slow-page visitors at checkout, where
you would see them in the funnel. You lose them at the first paint, before they enter any
funnel you are measuring. They never become a data point. So your analytics look healthy
while a third of your traffic bails in the gap between "clicked the ad" and "saw anything".
That invisibility is exactly why slow sites stay slow.

## What "slow" actually means now

Fast stopped being a vibe and became a measurement. Google's Core Web Vitals are the three
you are graded on, and they map to how a real person experiences the page:

- **LCP (Largest Contentful Paint):** how long until the main thing, usually your hero
  image or headline, shows up. Aim for under 2.5 seconds. This is the big one.
- **INP (Interaction to Next Paint):** when someone taps a button, how long before
  something happens. Under 200 milliseconds. Sluggish menus and laggy add-to-cart buttons
  live here.
- **CLS (Cumulative Layout Shift):** how much the page jumps around while loading. You
  have felt this. You go to tap a link, an ad shoves it down, and you tap the wrong thing.

These are not just experience niceties. They are a confirmed Google ranking input, so a
slow page loses twice: fewer people arrive from search, and the ones who do convert worse.

## Where the time actually goes

After enough audits you start seeing the same culprits. In rough order of how often they
are the real problem:

**Images.** Almost always images. A 2 MB hero photo that could have been 180 KB. PNGs
where WebP or AVIF would have cut the weight by 70 percent with no visible difference.
Images with no width or height set, so the layout reflows as each one loads. Fixing images
alone often takes a site from embarrassing to fine.

**Third-party scripts.** The chat widget, the heatmap tool, the three analytics tags, the
A/B testing snippet, the cookie banner that loads a second cookie banner. Each one feels
free. Together they are often half your load time, and they run on every page whether or
not anyone uses them. We have cut a site's load time nearly in half just by auditing the
tag manager and deleting what no one had looked at in a year.

**The framework tax.** A marketing site built as a heavy single-page app, shipping a
megabyte of JavaScript to render what could have been mostly plain HTML. Sometimes that
complexity is earned. Often it is a default nobody questioned.

**No caching or CDN.** Serving every visitor from one server in one location, with no edge
cache, so someone three time zones away waits for a round trip on every asset.

## The fixes, in the order we would do them

You do not need a rebuild. You need to attack the list in the order that pays back fastest:

1. Compress and convert every image to WebP or AVIF, size them to what is actually
   displayed, and set explicit dimensions. Lazy-load anything below the fold.
2. Audit third-party scripts and remove anything you cannot name a current reason for.
   Defer the rest so they do not block the page from rendering.
3. Put a CDN in front of everything and cache aggressively. For most marketing sites this
   is a config change, not a project.
4. Measure on a real mid-range phone on a normal connection, not your laptop on office
   wifi. A developer's MacBook is the most misleading test environment in existence.

A redesign is the expensive, slow way to get faster. Most of the time you can get 80
percent of the win from this list in a couple of weeks, and then decide whether the
structure itself needs rethinking.

## The honest caveat

Speed is necessary, not sufficient. A blistering-fast page selling the wrong thing to the
wrong person still will not convert. We have seen perfect Core Web Vitals scores on sites
that sold nothing, because the offer was the problem. Speed removes a tax. It does not
write your value proposition. But of all the levers that affect conversion, it is the one
that is most measurable, most often broken, and cheapest to fix relative to what it returns.

If your numbers feel soft and you cannot explain it, measure your LCP on a phone before you
touch the copy. The answer is there more often than people expect. It is the kind of thing
we look at first in [the work we do](/#crafts), and the same logic holds for a store: fix
the load before you reach for a redesign budget. Either way,
[tell us what you are seeing](/#contact).
