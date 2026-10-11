# Roofing demo 03 — Contour Roofing

Local entry: `http://127.0.0.1:5174/demos/roofers-3/`

Branded alias: `/contour`. The Vite development/preview middleware and Vercel
rewrites both map this alias to the separate demo document. It is listed in slot
03 of the roofing collection. This is a fictional contractor concept, with
noindex/nofollow metadata; these routing notes do not assert deployment.

## Experience

An estimator-first architectural direction with white space, graphite, restrained
orange, sans-serif typography, and a real-time Three.js roof study. It does not
load either of the earlier demo layouts or the studio application.

The sample model locates, scans, and marks the roof in a bounded animation.
Controls pause/resume or replay the scan and switch between perspective and top
views. Reduced-motion visitors start with a still model and can opt into playback.
Rendering pauses when the scene is offscreen or the document is hidden; the
finished scene uses demand rendering. WebGL failure falls back to a static SVG.
The model and its 2,420 sq ft / 6:12 labels are explicitly illustrative and do not
represent a visitor's property or the estimator's separate sample footprint.

The shared RoofTool provides address lookup, sample and manual modes, building
selection, pitch adjustment, material options, and planning prices. Only its
presentation is scoped here. The optional insuranceLine presentation override
preserves previous-demo defaults while allowing a fuller explanation of possible
out-of-pocket costs. The shared measurement endpoint now caches licensed roof
measurements across visits; current pricing is recalculated from the visitor's
selections. Provider attribution and billing limits remain in place. See
`docs/roofing-demo.md` for retention, local persistence, and Redis configuration.

Sections cover inspection through handover, insurance and ACV/RCV questions,
payment planning, and the distinction between product and workmanship coverage.
Links to NAIC, CFPB, and GAF provide further reading. No licenses, testimonials,
claim approvals, lender offers, or actual warranty terms are invented.

## Calculators and project brief

The payment explorer uses an amortized fixed-rate calculation with a zero-rate
branch and log1p/expm1 for stable small-rate results. It shows total payments and
interest; rates are hypothetical, and fees are excluded. The current estimate's
midpoint can populate the amount. Invalid inputs suppress the result.

The project brief snapshots the current planning range, selected options, and
source description together with visitor-entered name, email, issue, and timing.
Only outline/provider-based results can include a real property address. Editing
retains the entered fields. All state stays in React memory and clears on reload.
The output is an explicitly unsent preview: no email, CRM entry, appointment,
credit application, or contractor submission occurs.

## Local verification

- Production build and TypeScript passed; the shared Three.js runtime triggers
  Vite's large-chunk warning and is loaded through the lazy scan component.
- Scoped ESLint, nine existing estimator-context tests, and whitespace checks
  passed.
- Browser: desktop 1440 px, phone 390 px, and narrow 320 px layouts inspected;
  no horizontal document overflow at the checked widths. Tablet spacing was
  corrected after inspecting the 768 px view.
- Scan replay, pause/resume, and top view; sample estimation, pitch presets,
  material updates, manual home-size/stories, keyboard pitch control, brief
  creation/editing, mobile navigation, and insurance accordions checked.
- Payment example: $12,000, 0%, 24 months produces $500/month and $0 interest.
  A zero-month term suppresses the result.
- Paid/live property measurement requests, actual lender offers, and production
  deployment were not exercised. Reduced motion is implemented but was not
  tested by changing the operating-system preference.
- Nineteen mocked measurement-cache integration tests cover result reuse,
  expiration, concurrent requests, signed building identity, provider isolation,
  storage failures, and spending limits without paid API calls.

Before using for a real contractor, provide approved service-area and pricing
configuration, genuine warranty terms, and an authorized lead-submission flow.

Commit message: `feat: add Contour Roofing estimator demo`
