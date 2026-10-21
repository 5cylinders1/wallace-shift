# Pool demo 01: Stillwater Pool Co.

Stillwater Pool Co. is a fictional pool contractor concept for the Wallace Shift
contractors collection. Its hero follows a backyard pool from plan through
excavation, shell, finishes and water as the visitor scrolls. A pool style selector
and consultation planner carry the project into the rest of the website.

## Projected plan and filling water

The six chapters are the idea, plan, dig, shell, details and first swim. The plan
chapter draws a perspective outline of the finished pool, entry steps, raised
spa, deck and loungers directly over the excavation. `PoolPlanOverlay.tsx`
traces the original 1672 by 941 image coordinate system; the SVG and photographs
share a centered cover crop so they stay registered on phones and desktop.

`PoolFillVideo.tsx` plays an original complete scene video through native video
seeking. Hero progress from 0.74 through 0.94 maps to the filling clip; its actual
last frame remains visible through the end of the hero. Scrolling backward
selects earlier video frames. Stopping scroll holds the current frame, including
its water, reflections and surrounding architecture. The browser constructs no
water surface and does not blend empty and full images to simulate filling.

The video shares the photographs' centered cover crop and common scene
transform. It replaces the finished empty photo when filling begins. The former
transition to `pool-complete.webp` was removed to avoid introducing furniture
and a different final scene after the clip.

The existing `useScrollVideo` hook prepares muted inline playback for mobile
decoders and retries preparation on interaction. The component reconciles the
latest requested time after seeking and reveals the film only after a requested
frame is available. Loading or failed video leaves the existing empty photograph
visible during partial filling and shows an extracted final poster at completion.
Reduced motion renders the poster without a video element or video request.
Manual chapter navigation remains available. No new dependency was added.

## Routes and access

- Local entry: `/demos/pools/` or `/stillwater` on the running Vite server.
- Production route: `https://contractors.wallaceshift.com/stillwater`.
- Demo access key: `pools`.
- Document entry: `demos/pools/index.html`.
- React entry: `src/demos/pools/main.tsx`.
- Static media: `public/demos/pools/`.
- Public collection thumbnail: `/demos/pools/preview.jpg`.

The route and its implementation use the existing private demo gate. The
thumbnail is the only pool asset explicitly exposed for the public contractors
collection. The document should use `noindex, nofollow`; these integration notes
do not assert a deployment.

## Integration

`api/_lib/demo-access.ts` registers the pool key and alias. The existing gate
covers `/demos/pools/`, source paths and compiled `/demo-assets/` bundles.
`vite.config.ts` supplies the local alias and includes the new document only in
the private build. `vercel.json` supplies the matching production rewrite.

The owner dashboard, access request page and agreement page all identify the
concept as Stillwater Pool Co. The contractors catalog features this pool demo,
keeps Tambour in the collection and removes Pools from the list of future trades.
The invitation CLI accepts `--demo pools` through the shared access registry.

The build verifier compares the private source HTML entries with emitted HTML
instead of relying on a fixed document count. The HTTP preview test makes the
same comparison and checks the Stillwater alias, public thumbnail and private
source/media paths. The access tests also check encoded aliases and pool invite
grants.

## Image provenance and generation direction

The scroll driven hero in `example-contractor-website.mov`, beginning at
18 seconds, was reviewed as the interaction reference. The pool imagery was
generated for this fictional concept. These are concept images, not photographs
of a client's property or completed contractor projects.

All media lives in `public/demos/pools/`:

| Asset | Purpose | Output |
| --- | --- | --- |
| `pool-yard.webp` | Existing grass backyard | 1672 × 941 WebP |
| `pool-excavation.webp` | Excavated pool footprint | 1672 × 941 WebP |
| `pool-shell.webp` | Rough shotcrete shell and surrounding dirt | 1672 × 941 WebP |
| `pool-finish.webp` | Finished plaster pool before filling | 1672 × 941 WebP |
| `pool-complete.webp` | Completed pool and outdoor living space | 1672 × 941 WebP |
| `pool-fill.mp4` | Original AI generated filling film | 1916 × 1080 H.264 MP4, 24 fps |
| `pool-fill-mobile.mp4` | Smaller encoding of the same film | 960 × 542 H.264 MP4, 24 fps |
| `pool-fill-poster.webp` | Actual final frame of the filling film | 1916 × 1080 WebP |
| `courtyard.webp` | Intimate courtyard inspiration | 1672 × 941 WebP |
| `organic.webp` | Curved woodland pool inspiration | 1672 × 941 WebP |
| Each corresponding `-mobile.webp` | Responsive image variant | 1000 pixels wide |
| `preview.jpg` | Public contractors collection thumbnail | 1200 × 630 JPEG |

The following direction preserves the substance of the generation prompts; it
is a reconstruction of their intent, not an exact transcript of tool arguments.
No seed or model identifier is asserted here.

**Base scene:** Photoreal architectural photography from a fixed camera about
2.7 meters high near the short end of a rectangular pool. Show a limestone and
white single story home with a dark roof, a square spa at the far right,
travertine paving, trees and warm golden light. No people or text.

**Construction edits:** Preserve the camera, house, composition and lighting.
Change only the pool footprint and immediate yard to depict, in turn, an
existing grass yard, a pool excavation, a rough shotcrete shell surrounded by
dirt, and an empty pool with its finished plaster and surrounding surfaces.
The completed scene remains an inspiration image. The original filling film now
supplies the hero's final water filled stage.

**Original filling film:** Generated specifically for Stillwater with Kling 3.0
through Higgsfield, using the concept's finished empty pool and a matching full
pool endpoint. No reference video or reference website frames were used as
replacement media. The selected second generation contains 193 complete scene
frames over 8.041667 seconds. Both browser encodes use a six frame keyframe
interval, no B frames and faststart metadata to support seeking.

The first generation was rejected because a rectangular area of water moved
across the floor instead of showing convincing rising depth. The second
generation passed a standalone frame review before integration. It is still an
AI concept, with some soft submerged edges and an early uniform water surface;
it is not camera footage or evidence of a completed contractor project.

**Courtyard inspiration:** An intimate plunge pool within white courtyard
walls, with an olive tree and a quiet architectural setting.

**Natural inspiration:** A softly curved pool in a woodland setting, with
natural stone and a round spa.

## Validation commands

```sh
npm run build
npm run lint
node --test scripts/test-demo-access.mjs scripts/test-demo-admin.mjs
node scripts/test-demo-preview.mjs
```

Build and preview checks require the page and its thumbnail to exist. Local
browser access uses the normal demo owner session. The helper
`scripts/demo-preview-cookie.mjs` can create a local session from the gitignored
preview configuration; its origin must match the browser exactly.

## Verification record

October 19, 2026, completed local verification:

- `node --test scripts/test-demo-access.mjs scripts/test-demo-admin.mjs` passed
  all 55 tests, including the new Stillwater aliases, pool invitation grants,
  private source/media denial and public thumbnail exception.
- `npm run build` passed TypeScript, public and private production builds, and
  the boundary verifier: 18 private documents and 28 private JavaScript bundles.
- `node scripts/test-demo-preview.mjs` passed 496 route and asset responses.
  Email and Redis behavior in this test is modeled locally; no real messages
  were sent.
- `npm run lint` finished with zero errors and four existing refresh warnings in
  `PitStopScene.tsx` and roofing dashboard `ui.tsx`. Scoped pool ESLint is clean.
- `git diff --check` passed.
- Browser review covered the desktop hero, forward and reverse stage selection,
  scrolling, anchor navigation, gallery selection, FAQ expansion, and planner
  generation. Phone viewports of 390 by 844 and 320 by 568 fit without horizontal
  overflow. The compact layout hides the decorative blueprint to keep copy clear.
- The mobile menu supports keyboard progression into its links and Escape closes
  it with focus returned to the toggle. Changing inspiration after creating a
  brief reopens the form while preserving features, timing and notes.
- The brief download link contains the expected text payload. The browser's
  native download event timed out, so native file saving remains unverified.
- Browser console review reported no warnings or errors after a clean reload.

The earlier canvas water revision passed technical and layout checks but failed
the user's visual review. Its texture projection and continuous surface animation
were removed. Those earlier checks do not establish the new video's visual
quality or playback behavior.

The hero uses GSAP ScrollTrigger progress directly, including refresh updates,
so anchor jumps and viewport changes keep the photograph and stage control in
sync. Reduced motion uses a single viewport with manual stage buttons; that
branch was reviewed in source but was not exercised through OS media emulation.

October 20, 2026: the original second video candidate passed standalone frame
review. The first candidate was rejected because a straight water edge advanced
across the floor. The selected revision covers the floor before rising vertically
against the walls and progressively covering the steps. Its early water is
somewhat uniform and submerged step edges soften. These are visual judgments,
not proof of physically accurate fluid behavior.

The original MP4 played at normal speed in Chrome. Intermediate frames were
inspected separately and compared with the supplied reference. A local review
page with both playable clips, frame stepping and intermediate snapshots is at
`output/pools/video-generation/review.html`. The reference is comparison material
only; the generated clip uses Stillwater's own scene. Higgsfield's
[commercial use guidance](https://higgsfield.ai/creator-hub/help-center/account/who-owns-my-generations-and-can-i-use-them-commercially)
states that it does not restrict commercial use of outputs. Exact prompts,
source downloads, generation records and rejected attempts remain in the ignored
local output folder.

Technical checks for the replacement:

- Production build passed TypeScript, both Vite builds and the private boundary
  check of 18 documents and 28 private JavaScript bundles.
- Scoped pool ESLint and whitespace checks passed.
- Actual iframe page viewports in Chrome at 1440 by 900, 390 by 844 and 320 by 568
  passed forward, stopped and reverse seeking. The phone widths selected the
  smaller video. No horizontal page overflow was observed.
- At half fill, `currentTime` remained exactly unchanged during a 1.8 second
  stopped interval in each viewport. Rapid alternating scroll positions settled
  on the latest requested frame. Returning to the plan hid the video.
- The final frame is held after filling; a boundary comparison avoids floating
  point rounding at progress 0.94.
- A clean page reload produced no new browser warnings or errors. Earlier HMR
  messages referred to the removed water component and stylesheet.
- These are desktop Chrome responsive viewport checks, not physical iOS or
  Android tests. Reduced motion and failure fallback were reviewed in source;
  OS preference emulation and network failure injection were not performed.

These checks cover local access behavior and source quality. They do not record
a production deployment, live email delivery or physical device result. The
generated video download was verified; the planner's separate native brief
download remains unverified. The planner is a local concept and has no inquiry
backend.

## Commit message

`feat: replace simulated pool water with original scroll driven video`
