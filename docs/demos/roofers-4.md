# Roofing demo 04 — Halcyon Roofworks

Local entry: `http://127.0.0.1:5174/demos/roofers-4/`

Branded alias: `/halcyon`. The Vite development/preview middleware and the
Vercel rewrite both map the alias to the separate demo document. It is listed
in slot 04 of the roofing collection. Halcyon Roofworks is a fictional luxury
roofing contractor; the document carries noindex/nofollow metadata and its
own favicon, preview image and bundle. These routing notes do not assert a
deployment.

## Positioning

A cinematic, scroll-driven experience for high-net-worth homeowners. The
primary business is luxury roof installation: new custom builds specified
with the architect, and performance re-roofs that upgrade the full system.
Repairs and stewardship are present but secondary. The page educates on the
roof as an architectural investment (beauty, performance, value) rather than
selling repairs.

## Experience

- **Drone film hero** (`DroneFilm.tsx`): a 12-second AI concept drone flight
  over a mountain-contemporary estate, seeked by scroll inside a 420vh runway.
  Four chapters (Approach, Roofline, Material, Detail) caption the flight,
  which pushes in from the wide establishing frame to the roof detail. Two
  takes were generated; the first flew in reverse and showed more roof-plane
  drift in its close frames, so the second, steadier push-in was kept. Like
  demo 02, it is labeled an AI concept film and fine roof geometry is
  illustrative, not documentary.
  Chapter buttons, Play film and Still view provide keyboard, touch and
  reduced-motion routes; the OS reduced-motion preference starts in Still
  view with the poster and does not preload the film. The poster and chapter
  copy remain if media fails.
- **The investment**: three pillars, then the roof-system layers (deck,
  underlayment, ventilation, flashing, ratings) beside a framing-stage aerial.
- **Two paths**: new builds and performance re-roofs, with stewardship as a
  quiet third card.
- **Materials**: standing-seam metal, natural slate, cedar shake, clay tile
  and designer composite, each with typical service life, weight, performance
  notes and an illustrative installed planning rate.
- **Roof visualizer** (`Visualizer.tsx`, `tiles.ts`): the visitor loads a
  photo (or the sample home), traces each roof plane as a polygon, and picks a
  material, finish and texture scale. A procedural seamless tile is composited
  inside the traced planes with the original image multiplied and soft-lit
  back over it so shading survives. Roof area and complexity drive a planning
  range. Everything runs in the browser; the photo is never uploaded. The
  result can be downloaded and the selection carried into the consultation
  form.
- **Halcyon Ledger**: the high-transparency project-management portal is
  referenced with a static concept preview (daily drone sets, video
  walk-throughs, reports, warranty vault). The portal itself is not built.
- **Process, questions, consultation**: five steps, four FAQs, and a form
  that produces an explicitly unsent preview (`ConsultationPreview` is the
  integration boundary for a future endpoint).

## Assets

All under `public/demos/roofers-4/`. Imagery is AI-generated concept art
produced with Higgsfield (GPT Image 2.5 stills, Seedance 2.5 film).

- `estate-poster.jpg`: 1920×1080 hero poster and first frame of the film.
- `estate-flight.mp4` / `estate-flight-mobile.mp4`: H.264 1920×1080 and
  1280×720, 24 fps, silent, six-frame keyframe interval and fast-start
  metadata for bidirectional seeking. Cache version `halcyon-v1`.
- `material-metal.jpg`, `material-slate.jpg`, `material-cedar.jpg`,
  `material-clay.jpg`, `material-build.jpg`: 1440-wide section imagery.
- `sample-home.jpg`: 1600-wide front elevation used by the visualizer, with
  preset roof polygons in `Visualizer.tsx` (`SAMPLE_ROOF`).
- `preview.jpg`: 1200×630 Open Graph image and gallery thumbnail.
- `favicon.svg`.

Source generations and review frames live in ignored `output/roofers-4/`.

## Content and production configuration

All prices, service lives, weights and ratings are planning illustrations
for the demo, not quotes, manufacturer claims or warranty terms. No licenses,
testimonials, certifications or lender offers are invented. Before adapting
for a real contractor: replace the brand, approve pricing and service-area
copy, supply real warranty terms, connect the consultation endpoint, and
decide whether the visualizer's uploaded photos should ever leave the browser
(today they do not).

## Local import and verification

Imported from the Higgsfield source package on October 11, 2026. The local
copy also corrects clay texture shading: the shade helper returns hex so
the clay painter can shade its varied base without losing the chosen color.

- `npm run build` passes the full TypeScript check and Vite build, including
  the new demo document. Higgsfield's reported `RoofScan.tsx` type errors did
  not reproduce in this checkout, either before or after import.
- `npm run lint -- --ignore-pattern 'd4839bcc-392d-4679-8a9f-10557f75c641/**'`
  passes with four existing Fast Refresh warnings outside this demo. The
  ignore pattern excludes the retained, unmodified download copy.
- The Vite build still reports its existing large-chunk warning. These
  local checks do not establish a deployed release or working backend.

Commit message: `feat: add Halcyon Roofworks luxury roofing demo`
