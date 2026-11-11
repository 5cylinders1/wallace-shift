# Deer Creek Plumbing: independent second website concept

Target URL: `https://wallaceshift.com/demo/deercreekplumbing`.

This concept has an independent React implementation, red and white visual direction, new page compositions, and a single-page service-request form. The existing `/demo/deercreek` concept is a separate comparison version. Original business photographs and the antler artwork are shared source assets; the new implementation does not import the first concept's layout or components.

## Implementation

- `src/demos/deercreekplumbing/App.tsx`: page layouts, navigation, review summaries, FAQs, accessibility statement, and reading options.
- `src/demos/deercreekplumbing/site.css`: scoped `.dcp-*` styles, responsive layouts, focus treatment, and CSS motion.
- `src/demos/deercreekplumbing/main.tsx`: hydrates the document using its `data-dcp-slug` page identifier.
- `src/demos/deercreekplumbing/render.tsx`: server-rendered page output, canonical URLs, page metadata, structured data, and public route list.
- `public/demos/deercreek/`: existing original business imagery used as local assets. The second concept leads with the plumber working at a pipe vise.

The render interface returns complete page content before browser hydration. Internal links use ordinary page URLs. The demo's robots directive is `noindex, nofollow`; it should remain unindexed on the Wallace Shift domain.

## Source and review evidence

The full research record is [deercreek-research-2026-11-10.md](./deercreek-research-2026-11-10.md). It records the first-party website pages, Google and Facebook sources, search suggestion evidence, photo provenance, and facts requiring owner confirmation.

On November 10, 2026, all **286 public Google review entries** were loaded in the normal Google Maps review interface. Every available “See more” control was expanded, with zero remaining. Counting the individual rendered rating labels produced **282 five-star, two four-star, and two one-star ratings**, matching the profile's displayed **5.0 / 286**. Both Facebook recommendations were also read directly. This is a dated research snapshot, not a live review feed or a claim to access private or deleted reviews.

The concept uses six short, attributed summaries. They are explicitly labeled as summaries rather than direct quotations. Facebook recommendations are not assigned invented star ratings. Links let visitors read the original platforms. Do not add copied Google/Facebook review text as `Review` or `aggregateRating` structured data for this business.

## Conversion and accessibility boundaries

The lead form is a demonstration. It must not transmit data, reserve a time, imply a confirmed appointment, or show an ordinary “request sent” receipt. A visible concept notice and a clear completion state explain that boundary. Real assistance remains available through the business's published telephone number and email address.

Location lookup is guidance, not a guarantee of coverage. The business states that it serves the Kansas City metropolitan area, but no authoritative ZIP whitelist or service radius was found. The office must confirm exact-address coverage and availability. Avoid automatic rejection or acceptance using an invented distance band.

Email contact must be possible without a telephone number. Optional visit notes should request practical preferences, without requiring a diagnosis or other medical information. The business must confirm any arrangements before a real visit. Beau's family circumstances are private background and are not included in public copy.

Accessibility targets WCAG 2.2 AA through semantic structure, visible labels, keyboard operation, readable contrast, focus visibility, responsive reflow, and reduced motion. Reading options offer larger text and reduced motion. CSS effects use short entrance or interaction transitions and must leave content available when animation is disabled or unsupported. The statement describes a target and remaining testing, not a certification of legal compliance.

## Before a real business launch

1. Confirm the owner's surname, exact service coverage, after-hours policy, accommodations, and permission to use the existing photography.
2. Connect an approved request destination and real availability workflow. Add delivery-failure handling and explicit confirmation before describing requests as sent or booked.
3. Replace the demo origin/base with the business domain, preserve existing service URLs with suitable redirects, configure indexing and a sitemap, and verify the Google Business Profile website link.
4. Check structured data against visible content. Keep business facts consistent across pages and do not claim keyword-volume research: this task used autocomplete and service intent, not measured search volumes.
5. Complete responsive browser, keyboard, zoom, reduced-motion, and automated accessibility checks. Before client launch, also test VoiceOver or NVDA and seek feedback from people with disabilities.

Deployment and validation status belong in the final task report. This document does not itself certify that the new route is live or that browser checks have passed.

Suggested commit message: `feat: add independent accessible Deer Creek Plumbing demo`

## Validation completed November 10, 2026

- Full `npm run build` passed, including deployment type checks, public/private bundle boundaries, blog, SEO and marketing entry verification.
- New concept: 14 static document/routing checks passed. Original concept: 20 checks passed. Shared access boundary: 41 checks passed.
- Focused ESLint passed for the new app, plugin and browser/static tests.
- Production browser checks passed at 320, 390, 768 and 1440 pixels: keyboard skip link and mobile menu, location outcomes, validation summary and focus, email-only and phone-only requests, no network calls on form review, reading preferences, reduced motion, reflow and no-JavaScript contact fallback.
- Axe found zero WCAG A/AA violations on all 13 pages and all four form-review widths. Native date-input contrast remained an automated manual-review item; this is not a full accessibility certification. Real assistive technology and participant testing remains a launch task.
- Production visual inspector: zero failures at 1440, 768 and 390 pixels. Two style warnings are accepted: fluid type produces more measured sizes than the five semantic roles, and no video is used because the brief favors restrained CSS movement. All seven generated fold/page sheets were visually reviewed.
- Original `src/demos/deercreek/`, `deercreek/`, `demos/deercreek/` and its test are unchanged from the starting commit.

## Design record

Direction: One motif, seed 467268770, General Sans and a red/white palette. The red was deepened to #be2c22 for text contrast. The visual idea is that the red pipe vise in Deer Creek’s own working photograph becomes the solid service-request field. A repeated curved corner connects that field, the real work photography and the buttons. The live interaction is a service choice that leads directly into the single-page request.

The available official photographs support work and process, not customer portraits. Accordingly, testimonial portrait slots became short attributed review summaries. The contact treatment uses visible native labels rather than decorative coupon perforations. There are no stock or generated photos, invented testimonials, fake appointment availability, or invented service radii. Four real working photographs appear on the homepage; their source is the official business gallery recorded in the research notes.

ROUND 2
Seen in one second: Large plumbing headline, real plumber at work, red request panel.
Idea (one sentence): Deer Creek’s red pipe vise becomes a visual frame for careful work and a clear next step.
Live thing: Choose a service and enter a local-only request, with a separate location checker.
Layout words by section: hero=editorial+photo/form / services=paired photography+list / reviews=prose columns / care=photo+story / area=inline form / faq=disclosures / footer=contact band.
Scores: design 8 · usability 8.5 · creativity 7 · content 8 → overall 8.0.
Caps applied: None; production inspector reports zero failures.
Top three problems addressed:
1. Mobile fixed actions covered content during scrolling; removed the overlay and retained clear in-flow calls to action.
2. Scroll entrances initially faded entire blocks from invisible; changed them to transform-only settling so content is always readable.
3. Text-star glyphs and a menu shadow triggered visual noise checks; replaced stars with the explicit numeric rating and removed the shadow.

CSS entrances and interactions were checked in desktop Chrome with responsive emulation. Real mid-range-phone frame-time profiling has not been performed.
