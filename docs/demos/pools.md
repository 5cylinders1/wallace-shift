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

`PoolWater.tsx` projects the completed photograph's water texture onto moving
pool and spa surfaces. Scroll progress expands water across the floor and raises
the surface toward the rim, with masks for the spa structure and exposed steps.
The water is full before the last photograph completes the surrounding furniture.
The fill is geometric rather than an opacity transition between empty and full
photographs, and it reverses when scrolling back.

Subtle texture refraction and surface glints continue while the water is visible.
Rendering is capped at 30 frames per second and device pixel ratio 1.5, pauses
when offscreen or when the document is hidden, and becomes static for reduced
motion. No new dependency or generated image was needed for this revision.

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
The completed scene supplies the final water filled stage. This shared framing
lets scrolling transition through the construction sequence without changing
the viewpoint.

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

The outline and water revision also passed a production build, TypeScript,
scoped ESLint and diff whitespace checks. Desktop browser review confirmed water
at 25%, 53% and 100%, then 33% when reversing from 53%. Two screenshots at a fixed
53% fill showed changing pixels within the water and identical pixels on the
house, confirming that surface animation continues after scrolling stops.
Phone review checked the registered outline and partial filling at 390 by 844,
plus the six chapter controls and outline at 320 by 568 without horizontal
overflow. Returning to the plan cleared the water to zero.

The hero uses GSAP ScrollTrigger progress directly, including refresh updates,
so anchor jumps and viewport changes keep the photograph and stage control in
sync. Reduced motion uses a single viewport with manual stage buttons; that
branch was reviewed in source but was not exercised through OS media emulation.

These checks cover local access behavior and source quality. They do not record
a production deployment, live email delivery, physical device result or native
download verification. The planner is a local concept and has no inquiry backend.

## Commit message

`feat: add projected pool plans and rising animated water`
