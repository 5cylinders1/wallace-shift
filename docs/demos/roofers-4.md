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
- **Roof visualizer** (`Visualizer.tsx`): the visitor loads a photo (or the
  sample home), picks a material and finish, and explicitly generates a new
  roof image through the OpenAI API. The sample starts as the original
  photograph, without a prepared AI preview. Quick and refined quality
  options control each requested render. A permission checkbox and Generate
  button precede sending the resized photo to the server; selecting a
  material or finish alone does not start a paid request. Original, preview
  and comparison views keep the source available, and generated results can
  be downloaded. Manual roof-plane tracing and procedural material-size
  controls are no longer part of the experience. Roof area and complexity
  still drive an illustrative planning range, and the selection can be
  carried into the consultation form.
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
  `material-clay.jpg`, `material-designer.jpg`, `material-build.jpg`:
  1440-wide section imagery (the framing-stage aerial illustrates the roof
  system layers, not a material).
- `sample-home.jpg`: 1600-wide front elevation used as the visualizer's
  initial original photo. AI previews are generated on request.
- `preview.jpg`: 1200×630 Open Graph image and gallery thumbnail.
- `favicon.svg`.

Source generations and review frames live in ignored `output/roofers-4/`.

## Content and production configuration

All prices, service lives, weights and ratings are planning illustrations
for the demo, not quotes, manufacturer claims or warranty terms. No licenses,
testimonials, certifications or lender offers are invented. Before adapting
for a real contractor: replace the brand, approve pricing and service-area
copy, supply real warranty terms, connect the consultation endpoint, and
approve the photo-processing consent and production API configuration.

## OpenAI photo rerenders

Halcyon uses the shared `POST /api/roof-render` endpoint with
`studio: "halcyon"`. The browser prepares a resized JPEG locally and sends it
only after the visitor gives permission and selects Generate. The server
chooses the roof-edit prompt from allowlisted Halcyon materials and finishes;
the visitor cannot supply a prompt, model or remote image URL. Quick uses
low quality and refined uses medium quality. Each new preview is based on
the original photograph rather than an earlier AI result.

The server-held `OPENAI_API_KEY` is never exposed in the client bundle.
Halcyon inherits the shared endpoint's input validation, availability check,
usage caps, concurrency controls, cache and failure cooldown. Non-local
generation remains disabled unless the production enablement, exact allowed
origin and Redis-backed limits are configured. See the
[shared endpoint configuration](./roofers-5.md#openai-endpoint) for the
required environment variables and limits. The original photo is not stored
by this application; generated results are temporarily cached by the server.
The photo is sent to OpenAI to produce the requested image.

The editing prompt asks the model to preserve the home and roof geometry,
but AI can alter architectural details. A generated image is a planning
concept, not an exact product representation, measured roof survey,
installation specification or quote. The area and complexity inputs affect
the illustrative price range; they do not measure the photo. API generation
is separately billed by OpenAI and is not included in a ChatGPT subscription.

## Local import and verification history

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

### October 12 update

Imported the updated source ZIP after verifying its 26 files against the
final file hashes in the two-commit Git patch. The first commit is the
original demo already imported; this update applies the second commit's
visualizer and composite-slate image changes. The local clay-color fix and
October 11 verification notes are preserved.

Both October 12 ZIPs and their extracted root folders are ignored by Git.
The imported source and new image remain available to commit.

- Full TypeScript/Vite build passes; ESLint reports no errors and the same
  four existing Fast Refresh warnings. Lint excludes all three retained
  source/export folders.
- Local browser checks cover the sample home, all five materials, all three
  roof-plane modes and the material-size control, with no console errors.
- The embedded browser did not report a completed image-download event, so
  saving the exported image through that browser remains unverified.
- These are local checks; the update has not been deployed by this import.

Commit message: `fix: improve Halcyon roof visualizer and ignore update exports`

### October 16 update

Replaced the browser-only roof texture preview with opt-in OpenAI photo
rerenders through the shared roof-render endpoint. Materials, finishes,
planning prices, uploads, image download and consultation selection remain
available. The original image stays available for comparison, and the page
now describes the remote photo processing and AI limitations.

The October 11 and October 12 checks above apply to the earlier procedural
visualizer. They do not validate this API integration or establish that it
has been deployed.
