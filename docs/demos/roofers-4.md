# Roofing demo 04 — Halcyon Roofworks

Local entry: `/demos/roofers-4/` on the running Vite development server.

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
- **Roof visualizer** (`Visualizer.tsx`): the sample home opens with a
  prepared Charcoal metal preview. Each of the five material choices loads
  a prepared image of its first finish immediately, at either detail
  setting, without generation or photo processing consent. Other finishes
  and uploaded homes still require an explicit OpenAI render unless that
  exact selection was already generated in the current session. Quick and
  refined quality options control those requested renders. A permission
  checkbox and Generate button precede sending the resized photo to the
  server; selecting a material or finish alone does not start a paid
  request. Original, preview
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

All under `public/demos/roofers-4/`. The original concept imagery was
produced with Higgsfield (GPT Image 2.5 stills, Seedance 2.5 film). The five
prepared sample roof variants were created with the built in image
generation tool from the same original sample photograph.

- `estate-poster.jpg`: 1920×1080 hero poster and first frame of the film.
- `estate-flight.mp4` / `estate-flight-mobile.mp4`: H.264 1920×1080 and
  1280×720, 24 fps, silent, six-frame keyframe interval and fast-start
  metadata for bidirectional seeking. Cache version `halcyon-v1`.
- `material-metal.jpg`, `material-slate.jpg`, `material-cedar.jpg`,
  `material-clay.jpg`, `material-designer.jpg`, `material-build.jpg`:
  1440-wide section imagery (the framing-stage aerial illustrates the roof
  system layers, not a material).
- `sample-home.jpg`: original front elevation, retained for comparison
  and as the source for any new sample render.
- `sample-standing-seam-charcoal.jpg`, `sample-slate-vermont-gray.jpg`,
  `sample-cedar-new-honey.jpg`, `sample-clay-terracotta.jpg`, and
  `sample-designer-graphite.jpg`: prepared sample concepts for the first
  finish of each material. These never substitute for an uploaded home.
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

Validation for the OpenAI update:

- Full TypeScript/Vite production build and private-demo bundle-boundary
  verification passed. Only the existing large-chunk warnings remain.
- Scoped ESLint and `git diff --check` passed.
- All 20 mocked roof-render API tests passed, including all five Halcyon
  materials and 23 finishes, invalid selections, studio cache isolation,
  and compatibility with existing Velar requests.
- An isolated loopback browser preview made one real OpenAI request with
  the existing server key: standing-seam metal / Charcoal, refined quality.
  It returned a 1536×1024 JPEG using `gpt-image-2`; token-based estimated
  API cost was $0.055433. This verifies provider access locally, not a
  deployed origin or production configuration. The request format was
  checked against the [OpenAI image-edit reference](https://developers.openai.com/api/reference/resources/images/methods/edit).
- Browser checks covered original/preview/comparison, the keyboard-operated
  comparison slider, native JPEG download (saved bytes match the provider
  result), upload/reset/consent, all five material controls, finish and
  quality selection, and a 390×844 viewport without horizontal overflow.
  No browser warning or error logs were captured during these checks.
- Delayed-success and provider-error fixtures verified in-flight selection
  changes, saved-preview reuse, disabled duplicate submission, and retention
  of the original and previous preview after a failed request. Only the
  first request used OpenAI; these follow-up cases were mocked.
- Desktop and mobile review screenshots are retained in ignored
  `output/roofers-4/openai-visualizer-*.png`. The temporary QA server does not
  change the normal demo access gate. No deployment or physical-device test
  was performed.

Commit message: `feat: render Halcyon roof previews with OpenAI`

### October 18 update

Added prepared sample studies for the first finish of all five materials.
The sample opens in Charcoal metal, and material selection immediately
shows the matching prepared image. Both detail settings can use these
studies without consent or a working generation service. Other finishes
and uploaded homes retain the explicit Generate preview flow. Use sample
restores the selected material's first finish.

Prepared studies live outside the bounded generated preview cache and are
preloaded for material switching. The built in image generation tool edited
the original sample home independently for each material. Source paths and
exact prompts are retained locally in ignored
`output/roofers-4/prepared-preview-prompts.md`.

Validation:

- Full TypeScript/Vite build and demo boundary verification passed. The
  existing large chunk warnings remain.
- `node --test scripts/test-halcyon-previews.mjs` passes all three checks:
  five distinct JPEGs with matching aspect ratios, correct sample and finish
  isolation at both detail settings, and immutable prepared lookup behavior.
- Scoped ESLint and `git diff --check` passed.
- An isolated loopback browser fixture with generation unavailable verified
  all five material images, both detail settings, alternate finish gating,
  Original/Preview/Compare, and the keyboard comparison slider.
- Uploading a different sample house did not show prepared Halcyon images.
  Use sample restored the current material's first finish. Native JPEG
  download completed and matched the prepared clay image byte for byte.
- The fixture recorded zero generation requests and no browser warnings or
  errors. No live provider request was needed for browser validation.
- A review screenshot is retained in ignored
  `output/roofers-4/prepared-preview-qa/halcyon-prepared-clay.jpg`.
  No deployment or physical device test was performed.

Commit message: `feat: add instant prepared Halcyon roof previews`

### Prepared image peak correction

Repaired the front center hip roof peak in the Charcoal metal, Vermont gray
slate and Graphite composite sample images. Both diagonal hips now meet at
one pointed apex below the longer rear ridge, using the accepted cedar
image as the geometry reference. Cedar and clay images were not changed.

All three replacements were visually reviewed and verified in the local
visualizer. The three prepared preview regression checks and
`git diff --check` passed. No application logic changed and no deployment
was performed. Exact built in image edit prompts and output paths are
retained in ignored `output/roofers-4/roof-peak-repair-prompts.md`.

Commit message: `fix: restore front roof peaks in Halcyon sample previews`

### Charcoal metal seam correction — October 19, 2026

Corrected the irregular standing seam beside the right edge of the front
center roof in `sample-standing-seam-charcoal.jpg` with the built-in image
editing tool. The pointed center apex and roof silhouette remain intact.
The other material images and visualizer behavior are unchanged.

The previous JPEG is preserved byte for byte in
`public/demos/roofers-4/archive/sample-standing-seam-charcoal-before-seam-fix-2026-10-19.jpg`.
The exact edit prompt and generated source path are recorded in ignored
`output/roofers-4/metal-seam-repair/prompt.md`.

The corrected 1538 × 1023 JPEG was verified in the local visualizer. All three
prepared preview checks and `git diff --check` passed. The original archive's
SHA-256 matches the replaced file. No deployment was performed.

Commit message: `fix: clean up Halcyon charcoal roof seam`

### Landing page motion update

The investment introduction now enters with a light reveal, followed by
Beauty, Performance and Value in order. The five roof system details use
individual architectural icons in a carousel, showing two cards where the
panel has room and one on smaller screens. The construction photograph has
a subtle scroll parallax.

The service section includes a lazy loaded 3D survey drone that travels
across the three project stations as each card opens from its top edge.
The stage pins only when its measured content fits below the header.
Smaller or shorter screens keep the content in natural flow. A static
drone illustration remains available for reduced motion or WebGL failure.

Materials now form a horizontal image gallery driven by page scrolling on
large screens. Smaller screens use a native scrollable carousel. Arrow
buttons and keyboard controls reach all five materials. Existing images,
descriptions, prices and disclosures are retained. Reduced motion removes
pinning and presents the materials as a static list.

The visualizer comparison arrows are now a draggable handle with keyboard
support and a 48 pixel hit area. The separate range input was removed.
Pointer release, cancellation and window blur clear the drag state even
if a view change removes the handle.

Validation:

- Local browser checks covered 1440×1000, 1280×720, 390×844 and 844×390
  viewports. Desktop checks confirmed sticky travel, sequential card
  opening, reverse scrolling, the final material and keyboard navigation.
  Phone checks confirmed all five system details and materials remain
  reachable, service text is fully revealed, the drone fits its canvas,
  and no horizontal page overflow occurs.
- Comparison dragging and repeated grabbing worked in desktop and phone
  layouts. Home and End reached 0 and 100; no range input remains. The
  held pointer plus view change cleanup was reviewed in code, rather than
  reproduced as a simultaneous keyboard and pointer gesture.
- Scoped ESLint, Halcyon TypeScript and the three prepared preview regression
  checks passed. Both Vite builds compiled. The final repository build
  guard failed because a separate roofers-6 addition emits 15 private
  documents while the guard still expects 14. That unrelated work was
  left unchanged. A later repository TypeScript run also encountered
  missing Booking imports in the new roofers-6 work; the focused Halcyon
  check passes independently. Existing large bundle warnings remain.
- No browser errors were captured. Three.js reports a Clock deprecation
  warning from the rendering dependency. The fixture recorded zero image
  generation requests. Reduced motion behavior was reviewed in source;
  no OS preference emulation or physical device testing was performed.
- Review screenshots are retained locally in ignored
  `output/roofers-4/motion-qa/`. No deployment was performed.

Commit message: `feat: add cinematic motion to the Halcyon landing page`

### Process wave reveal

The five process steps now enter in an overlapping wave from 01 to 05.
Each top rule draws across as its card rises and settles, with the number,
heading and description following in sequence. Stacked layouts wait for
each visible row; reduced motion and print show the complete static list.
Copy, list semantics and final layout remain unchanged.

Local browser checks verified staggered desktop animation phases, delayed
offscreen steps and all five completed steps at 390×844, plus the two
column layout at 1000×800. Focused TypeScript, ESLint and whitespace checks
passed. Reduced motion cleanup was reviewed in source. No deployment was
performed. Desktop proof is in ignored
`output/roofers-4/motion-qa/process-wave-desktop.jpg`.

Commit message: `feat: add a wave reveal to the Halcyon process steps`
