# Roofing demo 06 — Stratum Roofing Co.

Local entry: `/demos/roofers-6/` on the running Vite development server.
Branded alias: `/stratum`. The Vite development/preview middleware and the
Vercel rewrite both map the alias to the separate demo document. It is slot 06
of the roofing collection and is gated like demos 01–05 (`roofers-6` in
`DEMO_PATHS`; only `preview.jpg` is public). Stratum Roofing Co. is a fictional
contractor; the document carries noindex/nofollow metadata. These notes do not
assert a deployment.

## Idea

Every other demo is film- or photo-led. Stratum is built around one **live,
real-time 3D house** that never leaves the screen. Each section of the page is a
different view of the same model, so scrolling reads as one continuous shot:

1. **Hero** — the home at golden hour on an architectural site plinth whose cut
   edge shows the ground in section (the "strata"). Four buttons replay the
   services on the model in place: Storm, Tune-up, New build, Upgrades.
2. **Anatomy** — the roof comes apart as a stepped cutaway in build order:
   rafters, deck, drip edge, ice and water barrier, synthetic underlayment,
   starter course, finish, flashing and penetrations, ridge vent and cap. The
   current layer is lit and tagged on the model; the rest recede.
3. **Services** — storm (wind-driven rain, hail that bounces off the actual roof
   planes, lightning), the morning after (bruising, lifted tab, dented gutter,
   cracked vent cap, granules), tune-up inspection points, a scroll-scrubbed
   construction sequence and progressive upgrades at dusk.
4. **Storm desk** — two questions produce a 48-hour plan; hail size reference.
5. **Roof health check** — age, finish, last inspection and warning signs give an
   outlook gauge and the matching visit. Labelled a guide, not a diagnosis.
6. **Roof studio** — gable or hip, pitch 4/12–12/12, five finishes and colours,
   six upgrades, time of day and three cameras, with drag-to-orbit. Area,
   squares, ridge and gutter runs are computed from the real roof geometry, and a
   planning range follows. The design can be attached to the booking request.
7. Process, commitments, FAQ, booking (explicitly unsent preview) and footer.

The studio's roof is the hero's roof: changing it changes the house everywhere.

## Architecture

- `engine/` is plain three.js (already a dependency), isolated from React and
  loaded as its own chunk after first paint. `RoofEngine` owns the renderer,
  camera, sky, lights, reflections, bloom (desktop), adaptive resolution, the
  smoothed scene state and anchor projection for HTML labels.
- `engine/roof.ts` builds exact gable, hip and shed planes from a footprint,
  eave height, pitch and overhang. `engine/measure.ts` computes the same areas
  without WebGL, so the studio's numbers work even when 3D is unavailable.
- `engine/textures.ts` paints every surface procedurally (shingles, standing
  seam pans, slate, clay, cedar, OSB, underlayment, ice and water, board and
  batten, stone, lawn, concrete) with normal maps. The demo ships no material
  images.
- `stage/director.ts` maps each section and scroll step to a camera, time of
  day and roof state; the engine eases between them. `StratumRoofing.tsx` runs
  one frame loop that finds the section and step on screen, directs the model
  and decides which labels to show.
- Copy lives in `content.ts`; finishes, rates and upgrades in `catalog.ts`;
  planning ranges in `pricing.ts`.

## Accessibility, motion and fallbacks

- All explanatory text is in the page; model labels are `aria-hidden`
  duplicates. Landmarks, heading order, keyboard tabs in the studio, a focus-
  trapped mobile menu, visible focus and skip link are included.
- `prefers-reduced-motion`: no camera drift, frozen rain, no hail or lightning,
  CSS animations off. Scroll-driven changes remain because the visitor drives
  them.
- No WebGL2, a failed engine load or a lost context leaves the matching still
  (`hero-poster.jpg` / `hero-poster-mobile.jpg`) and every tool still works.
- Rendering pauses when no 3D section is on screen or the tab is hidden.
  Resolution, not effects, drops if frames run long.
- Phones (< 900px) get their own cameras and a single bottom card that
  cross-fades between steps while the model fills the top of the screen.

## Assets

All under `public/demos/roofers-6/`, generated from the engine itself:

- `hero-poster.jpg` (1920×1200) and `hero-poster-mobile.jpg` (780×1688): first
  paint and fallback stills, matching the live hero framings.
- `preview.jpg` (1200×630): gallery card and Open Graph image (public).
- `favicon.svg`: the stacked-chevron Stratum mark.

## Content rules

All prices, service lives, weights and ratings are illustrative planning
assumptions for a fictional contractor, not quotes or manufacturer claims.
The phone uses a 555-01xx fictional number and the email an `.example` domain.
No licences, reviews, certifications, warranty terms or insurance outcomes are
claimed; storm copy states that the insurer decides coverage. Before adapting
for a real contractor: replace brand, contact and service area, approve rates,
supply real warranty terms and connect the booking endpoint (the `Request` type
in `sections/Booking.tsx` is the integration boundary).

## Verification

`npm run lint`, `tsc -b`, both Vite builds and `scripts/verify-demo-build.mjs`
(now 15 private documents) pass. `node --test scripts/test-demo-access.mjs`
(32 tests) and `node --test scripts/test-demo-preview.mjs` pass with the new
alias and public preview. Browser checks covered 1440, 768, 390 and 360px
widths; storm, aftermath, tune-up, build, upgrades and anatomy states; studio
hip/pitch/finish changes; and the mobile menu. The engine renders a 1440×900
frame in about 4 ms on the development Mac. The shared three.js chunk keeps
Vite's existing large-chunk warning; it loads only with the 3D engine.
