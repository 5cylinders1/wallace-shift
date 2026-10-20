# Foundation demo 01: Datum Foundation & Waterproofing

Local entry: `/demos/foundation/` or `/datum` on the running Vite development
server. Production path: `https://contractors.wallaceshift.com/datum`. Gated like
the roofing demos (`foundation` in `DEMO_PATHS`); only `preview.jpg` is public,
for the contractors lander. Datum is a fictional contractor; the document is
`noindex, nofollow`. These notes do not assert a deployment.

## Idea

Foundation trouble is invisible: the homeowner sees a crack, the cause is in
the clay. So the site shows the ground. One live 3D section, a ranch house
with a block basement cut open with the soil beneath it, carries the home page:

1. **Hero**: the section cycles through a Kansas City year (spring water, late
   summer drying, winter frost) with a season control and readout.
2. **How it moves**: five scroll steps. The strata, spring pressure (horizontal crack,
   bowing wall, water at the floor joint), summer settlement (gap, fissures,
   stair-step crack, sloping floor, racked door), winter frost at the 36 in.
   footing depth, and the damage together.
3. **Crack decoder**: 2D tool. Area → illustrated symptom → urgency tier,
   follow-up checks that can raise it, what to do now, usual repairs with
   planning ranges. Every symptom has its own page (`/datum/cracks/<slug>`),
   which is the SEO architecture the demo is pitching.
4. **Repairs**: seven scroll steps, least invasive first. Downspout extension and
   regrade, interior drain and sump with battery backup, then carbon fiber straps,
   anchors and braces as wall alternatives, then push and helical piers lifting
   the settled corner.
5. **Storm mode**: a night storm with toggleable fixes in cost order and a power
   cut. Particles follow the water's actual route for the current fixes; the
   readout (`stormReading` in `content.ts`) is deterministic, so copy always
   matches the model.
6. Report preview, crack log teaser, buying/selling lane, process, FAQ and a
   four-step inspection request.

Other pages, all in the same document: `/datum/cracks` (decoder + index),
`/datum/cracks/<slug>` (ten symptom guides), `/datum/crack-log` and
`/datum/report` (sample inspection report with an interactive floor-level
survey, crack map and three priced options).

## Architecture

- `engine/` is plain three.js, loaded as its own chunk after first paint.
  `FoundationEngine` owns renderer, camera rig, lights, adaptive resolution and
  anchor projection. `ground.ts` defines strata boundaries once in TypeScript
  and once in GLSL (they must match). `earth.ts` paints and shades the soil
  (wetness, water table, drying fissures, gap at the wall, frost, regrade);
  `house.ts` builds the house with section caps and crack overlays;
  `uniforms.ts` holds the shared uniforms and the exaggerated settle/bow vertex
  deform; `repairs.ts` and `water.ts` add the fixes and the water routes.
- `stage/director.ts` maps section and scroll step to a scene target; the
  engine eases toward it. `DatumFoundation.tsx` runs the director loop and the
  in-document router (`routes.ts`).
- Copy is in `content.ts`, the decoder in `symptoms.ts`, prices in `pricing.ts`.
  `brief.ts` carries what the visitor chose (decoder, crack log, report) into
  the request form via sessionStorage.

## Accessibility, motion and fallbacks

- All explanation is in page text; model labels are `aria-hidden` duplicates.
  Landmarks, heading order, skip link, focus-trapped mobile menu, visible focus,
  `aria-pressed` toggles, live regions for decoder and storm results, and a
  table alternative for the floor survey.
- Reduced motion: no camera drift or hero auto-play; water is drawn as static
  dashed routes instead of particles; card transitions off.
- No WebGL, a failed engine load or a lost context leaves the poster stills, and
  every tool still works. Rendering pauses when no 3D section is on screen.
- Phones get their own shots, a model window in the hero, and the storm
  readout above the fix list.

## Assets

Under `public/demos/foundation/`, rendered from the engine itself:
`hero-poster.jpg` (1920×1200), `hero-poster-mobile.jpg` (780×1688),
`preview.jpg` (1200×630, public) and `favicon.svg`. In development,
`window.datum` (engine) and `window.datumDirect` (director) let the stills be
re-rendered from the same shots.

## Content rules

Claims trace to `docs/demos/foundation-research.md`. Urgency tiers are Datum's
own language, labelled as a guide. Prices are illustrative planning ranges,
labelled wherever shown. The phone is a 555-01xx number and the email an
`.example` address. No reviews, licences, warranty terms or statistics are
claimed. The sample report and its survey are invented for a fictional home.
The inspection request is a preview: it says plainly that nothing is sent.

Before adapting for a real contractor: replace brand, contact and service area,
approve the prices and urgency language, supply warranty terms, and connect the
request (the state in `sections/Request.tsx` is the integration boundary).

## Verification

`npm run lint`, `tsc -b`, both Vite builds and `scripts/verify-demo-build.mjs`
(16 private documents) pass. `node --test scripts/test-demo-access.mjs`,
`scripts/test-demo-preview.mjs` and `scripts/test-demo-admin.mjs` pass with
`/datum` routes gated and the lander and preview public. Browser checks covered
1440, 390 and 360px (no horizontal overflow on any page), every year and repair
step, storm mode, decoder escalation, decoder-to-request handoff and the crack
log example.
