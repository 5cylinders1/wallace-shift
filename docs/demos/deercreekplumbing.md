# Deer Creek Plumbing: independent second website concept

Target URL: `https://wallaceshift.com/demo/deercreekplumbing`.

This concept has an independent React implementation, red and white visual direction, new page compositions, and a single-page service-request form. The existing `/demo/deercreek` concept is a separate comparison version. Original business photographs and the antler artwork are shared source assets; the new implementation does not import the first concept's layout or components.

## Implementation

- `src/demos/deercreekplumbing/App.tsx`: page layouts, navigation, review excerpts, FAQs, accessibility statement, and reading options.
- `src/demos/deercreekplumbing/site.css`: scoped `.dcp-*` styles, responsive layouts, focus treatment, and CSS motion.
- `src/demos/deercreekplumbing/main.tsx`: hydrates the document using its `data-dcp-slug` page identifier.
- `src/demos/deercreekplumbing/render.tsx`: server-rendered page output, canonical URLs, page metadata, structured data, and public route list.
- `public/demos/deercreek/`: existing original business imagery used as local assets. The second concept leads with the plumber working at a pipe vise.

The render interface returns complete page content before browser hydration. Internal links use ordinary page URLs. The demo's robots directive is `noindex, nofollow`; it should remain unindexed on the Wallace Shift domain.

## Source and review evidence

The full research record is [deercreek-research-2026-11-10.md](./deercreek-research-2026-11-10.md). It records the first-party website pages, Google and Facebook sources, search suggestion evidence, photo provenance, and facts requiring owner confirmation.

On November 10, 2026, all **286 public Google review entries** were loaded in the normal Google Maps review interface. Every available “See more” control was expanded, with zero remaining. Counting the individual rendered rating labels produced **282 five-star, two four-star, and two one-star ratings**, matching the profile's displayed **5.0 / 286**. Both Facebook recommendations were also read directly. This is a dated research snapshot, not a live review feed or a claim to access private or deleted reviews.

The concept uses two short verbatim excerpts from the previously verified Google review record: Elizabeth M. on the phone quote matching the amount paid, and Jennifer K. on trusting Ryan with her house keys. Context accompanies each excerpt. Only the business-profile URL is available, so links say “View Google Business Profile.” Facebook recommendations are not assigned invented star ratings. Do not add copied Google/Facebook review text as `Review` or `aggregateRating` structured data for this business.

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


## Website inquiry refinement (local implementation, November 10, 2026)

The latest brief keeps Site B’s black/white/red composition and working-plumber photography, while adapting selected content and behavior from Site A. Site A’s files must remain unchanged. No direction redraw is needed: this work modifies existing sections within Site B’s established “One motif” direction (seed 467268770).

The claim sequence is: independent Wallace Shift concept with a website inquiry path; local plumbing with supported transparent-pricing wording; two exact customer experiences as evidence; services matching everyday problems; visit preferences; location guidance; common questions; plumbing contact; a visually separate agency invitation.

- The discreet attribution strip and closing invitation use the existing `/contact?demo=deercreekplumbing&project=website` flow. That path has website-specific heading, supporting text, form wording, analytics attribution, and source/project fields. Ordinary contact visitors and Site A’s contact context retain their existing behavior.
- The hero remains “Plumbing. With care.” The official homepage supports transparent pricing and same-day estimates, which appear beside locality, family ownership and the one year warranty.
- **Unresolved content:** “Priced upfront” / “Price agreed first” as a policy applying to every job needs Beau’s confirmation. Existing customer reviews prove particular experiences, not a universal guarantee. Neither instant quotes nor remotely guaranteed fixed prices are promised.
- The two exact excerpts come from Site A’s existing verified review record (`src/demos/deercreek/content.ts`). Elizabeth M.: “What Beau quoted us on the phone is exactly what we paid.” Jennifer K.: “I literally trust him with my house keys.” Jennifer’s context identifies Ryan. No individual review permalinks are recorded; a fresh direct Google review inspection was unavailable during this revision.
- The problem selector keeps the single-page request and maps recognizable symptoms to existing service categories. Selection and other entered details are retained within the same browser tab and can be cleared. Preferences remain unconfirmed and nothing is transmitted by the plumbing demo.

Implementation and inspection results for this revision are recorded below when complete. This revision is not deployed.


### Changed files in this revision

- `src/demos/deercreekplumbing/App.tsx`: agency invitations, supported hero copy, and two attributed review excerpts.
- `src/demos/deercreekplumbing/LeadTools.tsx`: issue/service selector, request summary, and recoverable request editing.
- `src/demos/deercreekplumbing/issues.ts`: issue mapping, validated link context, and tab-scoped draft storage.
- `src/demos/deercreekplumbing/site.css`: responsive attribution, editorial quotes, selection summary, and closing agency invitation.
- `src/content/demoHandoff.ts`, `src/lib/demoHandoff.ts`: allowlisted Site B website-project context and contact URL.
- `src/pages/ContactPage.tsx`, `src/components/ContactForm/ContactForm.tsx`: contextual copy and existing-form payload.
- `src/lib/contactAdapter.ts`, `api/contact.ts`: website-project field and allowlisted demo source in the existing contact delivery.
- `public/site-analytics.js`, `scripts/test-analytics.mjs`: consent-gated Site B attribution and checks.
- `scripts/test-demo-contact-context.mjs`: normal/A/B context and mocked endpoint tests.
- `scripts/test-demo-contact-browser.mjs`: local website handoff, intercepted contact requests, recoverable errors, and normal/A/B browser comparisons.
- `scripts/test-deercreekplumbing-browser.mjs`: issue mapping, changed choices, return navigation, and retained details checks.
- `docs/demos/deercreekplumbing.md`: implementation evidence, content limitations, and validation record.

### Visual review

The existing composition was captured before edits at 1440 × 900, 768 × 1024 and 390 × 844. It passed the design meter with two warnings. The updated production build was inspected at the same sizes. Final artifacts are in `tmp/deercreekplumbing-final-handoff/`.

The first after-check flagged the business wordmark’s “Plumbing” as a decorative eyebrow above the hero on mobile. Visual inspection confirmed this is part of the preserved business identity in the navigation, not a hero label. The final run uses the explicit `eyebrow` allowance for that false positive and reports zero failures and two warnings. The warnings are accepted: fluid responsive sizes preserve Site B’s typography; no video is added because the brief asks to preserve its restrained photography and CSS motion.

ROUND 1 (before)
Seen in one second: Large plumbing headline and real work photography.
Idea (one sentence): The red pipe vise anchors the red service-request field.
Live thing: A service choice and demo request form.
Layout words by section: hero=editorial+photo/form / services=photo pair / reviews=summary columns / care=photo+story / area=checker / faq=disclosures / footer=contact.
Scores: design 8 · usability 8 · creativity 7 · content 7.5 → overall 7.8.
Caps applied: Creativity capped at 7 because the editorial approach is familiar.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. No visible agency inquiry path in the first screen (`before-handoff/desktop-fold.jpg`); add a discreet, separate attribution and link.
2. General summaries are weaker than specific customer proof (`before-handoff/desktop-page-01.jpg`); replace them with two exact, contextualized excerpts closer to the hero.
3. A category-only selector asks homeowners to classify their problem (`before-handoff/mobile-page-01.jpg`); add symptom choices mapped to services while keeping one form.

ROUND 2 (after)
Seen in one second: Plumbing with care, real work, and a distinct website-project invitation.
Idea (one sentence): Deer Creek’s red pipe vise remains the visual anchor for a clear problem-to-request path.
Live thing: Symptom or service selection, editable request details, and a contextual Wallace Shift inquiry.
Layout words by section: attribution=utility strip / hero=editorial+photo/form / proof=two editorial quotes / services=photo pair+list / care=photo+story / area=checker / faq=disclosures / footer=plumbing contact / agency=separate closing invitation.
Scores: design 8 · usability 8.5 · creativity 7 · content 8.5 → overall 8.0.
Caps applied: Creativity capped at 7; original imagery and composition preserved by the brief.
Top three problems addressed:
1. The agency invitation is now visible and distinct at the beginning and end.
2. Quote wording and attribution preserve specific experiences instead of implying a universal pricing policy.
3. Service choices and draft details survive revisions and navigation within the tab; a clear action removes them.

No stock/generated imagery, invented testimonials, availability guarantees, or conversion claims were added. The existing official business photos remain in use.


### Validation results for the website inquiry refinement

- Production build, deployment type checks, SEO/build-boundary verifiers, focused ESLint, and diff whitespace checks passed.
- Site B static checks: 14 passed. Site A regression checks: 25 passed. Contact context/API checks: 3 passed with mocked delivery. Analytics checks: 23 passed.
- Production browser checks at 320, 390, 768 and 1440 pixels passed: no overflow, skip link, mobile menu/Escape/focus return, issue/service mapping, commercial/unsure choices, retained fields, Back/Forward, service-page requests, revised ZIP after reload, explicit clearing, email-only and phone-only requests, optional date preferences, demo review with no network request, larger text, reduced motion, and no-JavaScript fallback.
- Axe found zero violations on all 13 Site B pages and the reviewed request states at four widths. The native date input remains an automated contrast manual-review item.
- The website handoff passed at 1440 × 900, 390 × 844 and 320 × 844. Exact heading/supporting text, source/project payload, recovery from a simulated delivery failure, and ordinary/Site A contact contexts were verified. All contact POSTs were intercepted locally; no live form or message was sent.
- The shared Wallace Shift footer has one existing axe color-contrast rule failure affecting copyright/privacy text (three nodes). Identical findings occur on ordinary `/contact` at all three tested widths; the updated contextual contact content introduced no additional violations. That shared-site issue remains outside this Site B revision.
- `node scripts/verify-enquiry-fields.mjs` cannot reach its tests: its existing module loader reports `Unresolved test import: ./serviceLandingPages.ts` because it appends an extension to an already suffixed import. The harness and imported content were not changed by this revision. The targeted contact tests, intercepted browser flow, and production build passed.
- Lighthouse is not installed in either the project or the available bundled Node runtime, so it was not run and no score is claimed. Manual VoiceOver/NVDA and participant testing remain outstanding; automated checks are not full accessibility conformance.
- The eight final design screenshots were opened and visually reviewed. A touching pair of “Edit demo details” / “Clear demo details” controls found in the request review was separated into a wrapping action row.
- Source/diff verification confirms Site A’s demo components, routes, styles, content, and test files are unchanged. Current published A/B pages were captured separately as reference; this revision was not pushed or deployed.

Screenshots: `tmp/deercreekplumbing-final-handoff/` (desktop/tablet/mobile composition), `tmp/deercreekplumbing-handoff-browser/` (all widths and request review), and `tmp/deercreekplumbing-contact-browser/` (website inquiry at three widths). Live reference captures: `tmp/deercreekplumbing-current-review/`.

Commit message for this revision: `Refine Deer Creek Plumbing website handoff and inquiry flow`.


## Subsequent requested removal

The top Wallace Shift attribution strip and closing website invitation were both removed at Matthew’s request. The earlier design record above describes the superseded version. Site B now keeps its plumbing navigation and footer without those agency promotion sections. The existing contextual contact URL still works when shared directly.

Commit message: `Remove top agency attribution from Deer Creek demo`.
