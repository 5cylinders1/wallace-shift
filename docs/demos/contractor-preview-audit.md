# Contractor collection: inventory and preview acceptance

Audit date: October 27, 2026 (America/Chicago). Baseline HTTP checks were made at approximately October 28, 2026 01:28 UTC. Local production evidence below was added after all 11 films were rendered. Production baseline and local completion are recorded separately; this is not a claim that the new gallery has been deployed.

## Primary sources

- Gallery cards: [`src/demos/contractors/catalog.ts`](../../src/demos/contractors/catalog.ts) and [`ContractorsLander.tsx`](../../src/demos/contractors/ContractorsLander.tsx).
- Six roofing concepts: [`src/demos/roofers-offer/catalog.ts`](../../src/demos/roofers-offer/catalog.ts).
- Protected aliases and files: [`api/_lib/demo-access.ts`](../../api/_lib/demo-access.ts), [`middleware.ts`](../../middleware.ts), [`vercel.json`](../../vercel.json), and local aliases in [`vite.config.ts`](../../vite.config.ts).
- Separate CRM: [`src/roofing-dashboard/DashboardApp.tsx`](../../src/roofing-dashboard/DashboardApp.tsx) and [`roofing-dashboard.md`](roofing-dashboard.md).
- Genuine prepared visualizer states: [`roofers-4/prepared-previews.ts`](../../src/demos/roofers-4/prepared-previews.ts) and [`roofers-5/RoofVisualizer.tsx`](../../src/demos/roofers-5/RoofVisualizer.tsx). These are prepared studies, not proof of live generation speed or a successful new uploaded-photo request.

## Reconciled inventory

The existing collection contains **10 customer-facing website concepts and one separate CRM demonstration**. The CRM is not a seventh roofing website. Each listed local HTML entry exists and is included in the Vite demo build inputs.

Production host for all aliases in the table: `https://contractors.wallaceshift.com`. Every baseline unauthenticated alias request returned HTTP 303 to `/request-demo/?demo=<gate key>` with the key shown below.

| Preview ID | Concept | Trade/category | Alias | Gate key | Local document |
| --- | --- | --- | --- | --- | --- |
| `northvane` | Northvane Roofing | Roofing | `/northvane` | `roofers` | `/demos/roofers/` |
| `alder-stone` | Alder & Stone | Roofing | `/alder-stone` | `roofers-2` | `/demos/roofers-2/` |
| `contour` | Contour Roofing | Roofing | `/contour` | `roofers-3` | `/demos/roofers-3/` |
| `halcyon` | Halcyon Roofworks | Roofing | `/halcyon` | `roofers-4` | `/demos/roofers-4/` |
| `velar` | Velar Roof Atelier | Roofing | `/velar` | `roofers-5` | `/demos/roofers-5/` |
| `stratum` | Stratum Roofing Co. | Roofing | `/stratum` | `roofers-6` | `/demos/roofers-6/` |
| `datum` | Datum | Foundation repair | `/datum` | `foundation` | `/demos/foundation/` |
| `tambour` | Tambour | Kitchens & cabinetry | `/tambour` | `cabinetry` | `/demos/cabinetry/` |
| `mitre` | Mitre & Rift | Kitchens & cabinetry | `/mitre` | `cabinetry-2` | `/demos/cabinetry-2/` |
| `stillwater` | Stillwater Pool Co. | Pools & outdoor living | `/stillwater` | `pools` | `/demos/pools/` |
| `roofing-crm` | Roofing CRM | Business systems | `/roofing-dashboard` | `roofers-dashboard` | `/demos/roofers-dashboard/` |

### Baseline production findings

- `GET /` returned HTTP 200 and the public contractors HTML. Its entry bundle was `/assets/contractors-2NNkEuSM.js` with stylesheet `/assets/contractors-EZo1JqSe.css`.
- The actual deployed public entry bundle contained **five cards**: Datum, “The roofing collection” (“Six concepts”), Tambour, Mitre & Rift, and Stillwater. It did not contain individual Northvane, Alder & Stone, Contour, Halcyon, Velar, or Stratum cards. The local pre-change gallery matched this aggregate structure.
- All 11 aliases were recognized by the intended access gate. Their 303 responses are expected guest behavior and do **not** establish that each authenticated production interface renders correctly. No authenticated production session was used in this baseline check.
- `/demos/contractors/` and `/demos/roofers-offer/` returned HTTP 308 to their clean URL forms. This is slash normalization, not an unpublished route.
- `/media/demo-previews/velar.mp4` returned HTTP 404 before this release. There was no previous preview film at the intended new URL.
- Guest requests to `/api/roof-render` and `/demos/roofers-5/residence-slate.jpg` returned HTTP 403 with JSON content. The generation endpoint and original prepared-study media were not exposed by the public collection.

The evidenced baseline issue is **individual discoverability and absent new preview media**, not a demonstrated broken roofing route. A gate response alone cannot distinguish missing backing content from working authenticated content.

## Public-media boundary

Delivery assets live at `/media/demo-previews/<preview ID>.mp4`, `.jpg`, and `.vtt`. This namespace is already public under the existing middleware; no demo gate exception or weakening is necessary. Editable composition source, capture recipes and raw recordings belong outside `public/`.

The following remain gated: individual alias documents, `/demos/<private demo>/` documents and media, `/demo-assets/` bundles, private demo source routes during local development, and `/api/roof-*` endpoints. Watching a public film must not issue an access cookie or grant an interactive session.

[`scripts/contractor-preview-contract.mjs`](../../scripts/contractor-preview-contract.mjs) provides an independent acceptance inventory of 11 IDs and 33 public files. The release build checks exact inventory, MP4/JPEG signatures and timed WebVTT captions. The access suite checks public delivery on both collection hosts even without demo-secret configuration, plus continued protection of all 11 aliases and private resources. The built-output HTTP integration checks MIME types, nonempty files and byte-range responses for seeking.

## Local video production evidence

All **11 local delivery films** are present with their JPEG posters and WebVTT tracks. Independent `ffprobe` inspection of every delivery MP4 confirmed a **36.000-second, 1920 × 1080 H.264 video stream**. The files range from approximately 2.8 MB (Contour) to 7.9 MB (Halcyon); they are delivery encodes rather than the larger production masters.

Stratum was recaptured with the studio panel in focus. Its final film shows the changed roof finish and complete $44,250–$75,750 illustrative planning range. The replacement passed the same layout, motion, contrast and delivery-format checks. All 11 films have completed local production; deployment and final browser verification are separate release steps.

Each film uses the actual locally running interface captured with Playwright at a 1440 × 900 browser viewport. Original recordings, scene start/end screenshots and [`evidence.json`](../../output/contractor-previews/velar/evidence.json) files are retained under `output/contractor-previews/<ID>/`. The evidence records the exact local path, viewport, scene timings, selectors and inputs. All 11 capture records have an empty `errors` array. The editable capture definitions are [`pilot.mjs`](../../videos/contractor-previews/pilot.mjs) and [`scenarios.mjs`](../../videos/contractor-previews/scenarios.mjs); reproduction and retention instructions are in the [production README](../../videos/contractor-previews/README.md).

| Film | Significant interface behavior recorded | Required interpretation |
| --- | --- | --- |
| Northvane | The illustrated roof story leads into a sample-property estimate; pitch and material controls are exercised. | Sample property and illustrative planning range; no address-specific measurement or binding quote. |
| Alder & Stone | The actual film chapter controls change stages, followed by a sample roof planner and material selection. | AI concept film and a sample planning range. |
| Contour | The 3D roof survey switches to top view; sample roof pitch and a hypothetical loan amount are changed. | Illustrative model and financing scenario, not a measured property or financing offer. |
| Halcyon | The concept drone film leads to a prepared slate study; original and prepared-preview views are compared. | Prepared study only; no live generation or generation-speed claim. |
| Velar | The original/preview comparison slider is moved between 22% and 78%; a second prepared material is selected. | Prepared sample residence with illustrative planning prices; no new uploaded-photo generation. |
| Stratum | Storm mode, sample roof shape and standing-seam finish controls are exercised in the real 3D interface. | Sample model with illustrative measurements and planning prices. |
| Datum | Season controls, a crack symptom and storm-water fixes are selected on the sample house. | Exaggerated illustrative movement and educational guidance, not a diagnosis. |
| Tambour | The scroll-built kitchen is followed by selecting wood and stone samples in the material library. | Illustrative build imagery and local selections for a fictional brand. |
| Mitre & Rift | Normal scrolling drives the continuous kitchen assembly, then opens its material palette. | Rendered 3D concept sequence, not a photographed customer installation. |
| Stillwater | Pool-construction stages and a second inspiration style are selected, then a timeframe produces a local brief. | Concept imagery and an unsent project brief; nothing is submitted or booked. |
| Roofing CRM | The sample dashboard opens its customer table, filters existing customers and opens the follow-up worklist. | Fictional records and sample weather; no real CRM/provider integration or outreach. |

The capture runner blocked API POST requests. The recorded sequences use shipped prepared studies, sample-property controls and local state; no paid generation, real customer upload, email submission or outreach was performed. Every film carries its own visible sample/fictional-data disclosure and explanatory captions. No live-processing wait is presented as instantaneous.

Velar was completed and checked as the visualizer pilot before the remaining films reused the production structure. HyperFrames/GSAP supplies the editorial framing and transitions; FFmpeg supplies the optimized public encodes. The complete production source is under [`videos/contractor-previews/`](../../videos/contractor-previews/), with individual editable `index.html` compositions. Original recordings and masters are intentionally ignored by Git and excluded from the deployed public assets.

### Composition checks and their limits

The latest saved HyperFrames check for **each of the 11 films** reports `ok: true`, zero lint errors, zero runtime errors, zero sampled layout issues, and **50/50 passing text-contrast checks**. Reports live at `videos/contractor-previews/<ID>/.hyperframes/artifacts/checks/*.json`; per-film logs are in `output/contractor-previews/<ID>/hyperframes-check.log`, with the pilot's exported report at [`velar/final-check.json`](../../output/contractor-previews/velar/final-check.json). Five sampled composition frames per film are retained with the HyperFrames artifacts.

The consistent remaining craft warning is `film_silent`, accompanied by the informational `audio_none` result. Silence is intentional: the visual captions carry the complete explanation and the films have no narration or music. This warning is disclosed rather than represented as a warning-free check. Motion analysis was not enabled in these reports. Automated layout/contrast checks validate the added composition, and successful capture selectors validate exercised interactions; neither independently certifies estimator accuracy, every interface state, or production integration behavior.

The access unit suite passed **34/34 tests** after the public-media contract was added. Full release-build, built-output HTTP, category-navigation, actual decoded playback and deployment checks must be reported from their own completed runs; the existence of a rendered MP4 does not establish those results.

## Validation status and buyer evaluation

Local, deployment and live-browser results must be reported separately in the delivery report. Baseline HTTP evidence above is not post-release verification. Video capture using a local evaluation cookie verifies local demo behavior only; it does not prove production AI generation, a real customer integration, or delivered customer outcomes.

No representative contractor buyer participants were available during this audit, and no participant feedback or completion rate has been fabricated. The remaining small task-based evaluation is:

1. Ask a contractor to find the category relevant to their trade, without explaining the page structure. Record whether they find it unaided and how long it takes.
2. Ask them to start a preview. Record whether they can do so without access instructions or a form.
3. After viewing, ask what the concept does and how it differs from another example in the same category. Record their explanation in their own words and any mistaken assumptions about sample results or live processing.

Recruitment and participant outreach have not been performed. Automated checks and internal review cannot substitute for these observations.
