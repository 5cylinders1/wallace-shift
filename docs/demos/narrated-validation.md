# Narrated contractor walkthrough validation

Evidence snapshot: **2026-10-28, 20:15 UTC**. Measurements below come from current local files and retained reports. Local completion, deployment, live verification and buyer validation are separate states.

## Current result

All **eleven demos** have narrated encoded films, editable scripts and operated local capture records: ten website concepts and the separate Roofing CRM workspace, across **83 story scenes**. The current Velar pilot is **65.583 seconds**. The user watched the first pilot and said: **“Keep the voice and tighten the pacing, it felt pretty slow”.** The revision retains Grady with tighter pacing; this feedback does not establish acceptance of the revised mix or the entire collection.

**11 current films have complete technical desktop sound-enabled and phone-muted playback.** All eleven current films also have sampled final visual review, including the replacement Datum and CRM encodes. The latest saved gallery run passed **181/181** checks and media run **132/132**; their exact snapshot scope is recorded below. All **33** initial focused paused desktop/portrait/landscape control samples, plus six final-replacement samples, showed captions clear of native controls.

**The narrated preview deployment is READY. Production still serves the previous collection; fresh public live verification is pending. Subjective listening and representative-buyer validation remain unresolved.** No participants have been recruited or tested. Sound-enabled playback proves player operation, not that a person listened or understood the story.

## Inventory and operated evidence

The [gallery catalog](../../src/demos/contractors/catalog.ts) contains five trade categories, six individually discoverable roofing concepts and a separate CRM card. [Access rules](../../api/_lib/demo-access.ts) and [middleware](../../middleware.ts) distinguish public preview media from gated interactive routes. The route table below is reconciled with source and local captures; it is not a new production HTTP audit.

Each capture record reports a **1600 × 900** local viewport, an empty page-error array and blocked API POST requests. The journeys use fictional/sample inputs. A successful local capture does not prove a live external integration or a fresh generation request.

| Demo / local evidence | Category | Interactive alias / gate key | Operated beats | Verified journey boundary |
| --- | --- | --- | --- | --- |
| [Northvane Roofing](../../output/narrated-previews/northvane/evidence.json) | Roofing | `/northvane` / `roofers` | 8 | Sample estimate and hypothetical payment carry into an unsent lead preview. |
| [Alder & Stone](../../output/narrated-previews/alder-stone/evidence.json) | Roofing | `/alder-stone` / `roofers-2` | 8 | Sample estimate carries across the project-page route into an unsent brief. |
| [Contour Roofing](../../output/narrated-previews/contour/evidence.json) | Roofing | `/contour` / `roofers-3` | 8 | Illustrative model, separate estimator, payment comparison and unsent brief. |
| [Halcyon Roofworks](../../output/narrated-previews/halcyon/evidence.json) | Roofing | `/halcyon` / `roofers-4` | 8 | Local photo input, prepared studies, entered area and unsent consultation preview. |
| [Velar Roof Atelier](../../output/narrated-previews/velar/evidence.json) | Roofing | `/velar` / `roofers-5` | 8 | Prepared study comparison and planning brief; separate fictional client room. |
| [Stratum Roofing Co.](../../output/narrated-previews/stratum/evidence.json) | Roofing | `/stratum` / `roofers-6` | 8 | Authored roof geometry and finish change the model, measurements and sample brief. |
| [Tambour Studio](../../output/narrated-previews/tambour/evidence.json) | Kitchens & cabinetry | `/tambour` / `cabinetry` | 7 | Material sample choices and illustrative budget carry into a local consultation preview. |
| [Mitre & Rift](../../output/narrated-previews/mitre/evidence.json) | Kitchens & cabinetry | `/mitre` / `cabinetry-2` | 7 | Rendered room assembly follows scroll, then process, materials and placeholder contacts. |
| [Stillwater Pool Co.](../../output/narrated-previews/stillwater/evidence.json) | Pools & outdoor living | `/stillwater` / `pools` | 6 | Inspiration, features and timing carry into a local downloadable idea brief. |
| [Datum Foundation](../../output/narrated-previews/datum/evidence.json) | Foundation repair | `/datum` / `foundation` | 8 | Crack follow-up changes guidance and carries the concern into an unsent request. |
| [Roofing CRM workspace](../../output/narrated-previews/roofing-crm/evidence.json) | Business systems | `/roofing-dashboard` / `roofers-dashboard` | 7 | Fictional property follow-up and outcome become a sample inspection appointment. |

Detailed primary-source explanations and current two-column scripts are in [roofing research](narrated-roofing-research.md), [other trades and CRM](narrated-other-research.md), and the [Velar storyboard](../../videos/contractor-previews/NARRATED-STORYBOARD.md). The old [silent-preview audit](contractor-preview-audit.md) and [legacy baseline media](../../output/narrated-previews/legacy-baseline/) are historical comparison material, not authority for current product claims or narrated playback results.

Public assets use `/media/demo-previews/<ID>.mp4`, `.jpg` and `.vtt`; these are preview files, not access grants. The catalog now rounds each encoded duration up to a whole second: **63, 60, 62, 61, 66, 57, 60, 56, 57, 51 and 57 seconds** in catalog order. The old 36-second labels in historical screenshots are superseded by the current catalog and gallery check.

## Narration, story and retained sources

The selected provider is **Higgsfield through the browser, Seed Audio 1.0, Grady**. The user selected this existing-credit route instead of the initially requested HeyGen route. Source manifests retain actual browser provenance and quoted-credit evidence; provider job IDs were not exposed and remain null. A source filename is not treated as a job ID.

Pacing uses pitch-preserving **1.08× tempo**, 0.14-second boundary handles, measured-silence trims, and sentence caption remapping. Existing successful runs retain algorithm 1; later runs use algorithm 2, which merges overlapping sentence ranges before cutting and requires complete removed gaps to be measured silence. Do not silently repace an accepted run: it changes timings and invalidates later checks. All **12 retained source exports** have recorded source hashes (Stillwater has separate body and repair takes).

| Demo / active timing | Paced narration | Sentence cues | Pacing algorithm | Independent content evidence |
| --- | --- | --- | --- | --- |
| [Northvane Roofing](../../videos/contractor-previews/narrated/audio/northvane/timing.json) | 55.173s | 13 | 1 | [Paced ASR review](../../output/narrated-previews/northvane/asr-paced-review.json) |
| [Alder & Stone](../../videos/contractor-previews/narrated/audio/alder-stone/timing.json) | 51.782s | 12 | 1 | [Paced ASR review](../../output/narrated-previews/alder-stone/asr-paced-review.json) |
| [Contour Roofing](../../videos/contractor-previews/narrated/audio/contour/timing.json) | 53.591s | 11 | 1 | [Paced ASR review](../../output/narrated-previews/contour/asr-paced-review.json) |
| [Halcyon Roofworks](../../videos/contractor-previews/narrated/audio/halcyon/timing.json) | 52.811s | 13 | 2 | [Paced ASR review](../../output/narrated-previews/halcyon/asr-paced-review.json) |
| [Velar Roof Atelier](../../videos/contractor-previews/narrated/audio/velar/timing.json) | 58.158s | 14 | 1 | [Paced ASR review](../../output/narrated-previews/velar/asr-paced-review.json) |
| [Stratum Roofing Co.](../../videos/contractor-previews/narrated/audio/stratum/timing.json) | 48.663s | 11 | 1 | [Paced ASR review](../../output/narrated-previews/stratum/asr-paced-review.json) |
| [Tambour Studio](../../videos/contractor-previews/narrated/audio/tambour/timing.json) | 48.665s | 11 | 2 | [Paced ASR review](../../output/narrated-previews/tambour/paced-asr-review.json) |
| [Mitre & Rift](../../videos/contractor-previews/narrated/audio/mitre/timing.json) | 47.571s | 10 | 2 | [Paced ASR review](../../output/narrated-previews/mitre/asr-paced-review.json) |
| [Stillwater Pool Co.](../../videos/contractor-previews/narrated/audio/stillwater/timing.json) | 43.690s | 11 | 2 | [Paced ASR review](../../output/narrated-previews/stillwater/asr-paced-review.json) |
| [Datum Foundation](../../videos/contractor-previews/narrated/audio/datum/timing.json) | 52.276s | 13 | 1 | [Paced ASR review](../../output/narrated-previews/datum/paced-asr-review.json) |
| [Roofing CRM workspace](../../videos/contractor-previews/narrated/audio/roofing-crm/timing.json) | 49.261s | 14 | 2 | [Paced ASR review](../../output/narrated-previews/roofing-crm/asr-paced-review.json) |

Exact take reconciliations are documented, not hidden: Mitre retains the independently corroborated leading “The”; Stillwater uses a separately generated opening that clearly names the concept. The rejected Stillwater opening is excluded from delivery but retained with the original export. Proper-name spelling aliases and approved `unscent`/`unsent` orthography are explicit in the review reports. Substantive omissions were resolved with independent audio excerpts or replacement audio, not by deleting capability or disclosure words. The [script entry point](../../videos/contractor-previews/NARRATED-SCRIPT.md) states the current wording.

Original source hashes, accepted word mappings, independent crop/ASR evidence, intermediate WAVs and unpaced timing snapshots remain in the linked timing/audio manifests. The deliberate Tambour `response`/`responds` phonetic uncertainty remains disclosed; automated agreement is not described as word-perfect listening. See [AUDIO.md](../../videos/contractor-previews/narrated/AUDIO.md) for methods and limitations. Music provenance and required attribution are in [LICENSE.md](../../videos/contractor-previews/narrated/music/LICENSE.md); credits are retained in the films and gallery.

## Encoded films and file identity

This table is recomputed from each current delivery probe, decoded-AAC loudness report and the MP4 bytes. MB means decimal megabytes. Each film is H.264, 1920 × 1080, 24 fps, with stereo AAC at 48 kHz. The measured true-peak range is **−2.23 to −1.47 dBTP**. These are delivery checks, not a subjective mix assessment. A pending row is an existing encoded candidate, not accepted final QA.

| Film / delivery measurements | Seconds | MB | LUFS | SHA-256 of current public MP4 | Current final QA |
| --- | ---: | ---: | ---: | --- | --- |
| [Northvane Roofing](../../public/media/demo-previews/northvane.mp4) · [probe](../../output/narrated-previews/northvane/delivery-probe.json) · [audio](../../output/narrated-previews/northvane/delivery-loudness.json) | 62.625 | 14.641 | -16.48 | `937a92ee4b942780a16e98e4dd2ebe5cb7f201bccd6ba7caa589f9e21ff69287` | Technical playback + sampled visuals recorded |
| [Alder & Stone](../../public/media/demo-previews/alder-stone.mp4) · [probe](../../output/narrated-previews/alder-stone/delivery-probe.json) · [audio](../../output/narrated-previews/alder-stone/delivery-loudness.json) | 59.250 | 15.531 | -15.51 | `03061dc15fdd552d7a61afb23c8c14ffcf4ab9fefe70e974e39ae8d598936f5c` | Technical playback + sampled visuals recorded |
| [Contour Roofing](../../public/media/demo-previews/contour.mp4) · [probe](../../output/narrated-previews/contour/delivery-probe.json) · [audio](../../output/narrated-previews/contour/delivery-loudness.json) | 61.083 | 9.713 | -16.69 | `e4ce7865f34418f270dd82890a9d6515a54e0f481f4c1f98f0a1a78b423ea973` | Technical playback + sampled visuals recorded |
| [Halcyon Roofworks](../../public/media/demo-previews/halcyon.mp4) · [probe](../../output/narrated-previews/halcyon/delivery-probe.json) · [audio](../../output/narrated-previews/halcyon/delivery-loudness.json) | 60.542 | 15.888 | -16.20 | `efe65729bdbc998da17f17218c7fa3b27a0ac719be058ba4933fd87e0cb9ee99` | Technical playback + sampled visuals recorded |
| [Velar Roof Atelier](../../public/media/demo-previews/velar.mp4) · [probe](../../output/narrated-previews/velar/delivery-probe.json) · [audio](../../output/narrated-previews/velar/delivery-loudness.json) | 65.583 | 25.757 | -17.12 | `a741969741195fc4832e301dcf287b4b2c278d4b3cf5ad44d5e770f967c8cda9` | Technical playback + sampled visuals recorded |
| [Stratum Roofing Co.](../../public/media/demo-previews/stratum.mp4) · [probe](../../output/narrated-previews/stratum/delivery-probe.json) · [audio](../../output/narrated-previews/stratum/delivery-loudness.json) | 56.167 | 14.866 | -16.39 | `4252d0e7d3923794fbcea7eef2977a90a6d7b033c5a5b17d14759045e8b0a250` | Technical playback + sampled visuals recorded |
| [Tambour Studio](../../public/media/demo-previews/tambour.mp4) · [probe](../../output/narrated-previews/tambour/delivery-probe.json) · [audio](../../output/narrated-previews/tambour/delivery-loudness.json) | 55.750 | 13.116 | -16.87 | `5b895fbacd70404a382ff1ce8e9e90aa66bba29743e577ce2cf7104a3fb7a2b8` | Technical playback + sampled visuals recorded |
| [Mitre & Rift](../../public/media/demo-previews/mitre.mp4) · [probe](../../output/narrated-previews/mitre/delivery-probe.json) · [audio](../../output/narrated-previews/mitre/delivery-loudness.json) | 56.458 | 11.472 | -16.36 | `6d17b73755a12a80cc68a5511091693552580c53d43040858a7af6925050298f` | Technical playback + sampled visuals recorded |
| [Stillwater Pool Co.](../../public/media/demo-previews/stillwater.mp4) · [probe](../../output/narrated-previews/stillwater/delivery-probe.json) · [audio](../../output/narrated-previews/stillwater/delivery-loudness.json) | 50.417 | 14.640 | -16.11 | `e979acff4ed50b295be8f06a060dc9495a107bca227c626cd373ece28f90f008` | Technical playback + sampled visuals recorded |
| [Datum Foundation](../../public/media/demo-previews/datum.mp4) · [probe](../../output/narrated-previews/datum/delivery-probe.json) · [audio](../../output/narrated-previews/datum/delivery-loudness.json) | 59.708 | 11.298 | -16.78 | `94385c9812b6b50ae5035e28d30e7f105003a655fa97047b4b6d8c7ee896ae32` | Technical playback + sampled visuals recorded |
| [Roofing CRM workspace](../../public/media/demo-previews/roofing-crm.mp4) · [probe](../../output/narrated-previews/roofing-crm/delivery-probe.json) · [audio](../../output/narrated-previews/roofing-crm/delivery-loudness.json) | 56.417 | 13.875 | -16.43 | `a2dee47d04c9d9a671ba7923096e50d42154d8150ba23e6feb50e5902f7cb9a6` | Technical playback + sampled visuals recorded |

Any recapture, crop, timing or mix replacement invalidates checks of the older bytes. Playback reports do not embed a media hash; report times were checked against MP4 modification times, and the current hashes above bind this document snapshot. The visual report retains its own hashes and historical evidence.

## Complete playback and gallery behavior

All eleven current-film reports below each contain two uninterrupted normal-speed passes: desktop **1440 × 1000**, sound enabled at volume 1, then phone emulation **390 × 844**, muted. Each reaches `ended` without seeking or rate changes and has zero browser/media errors. Captured scene first/middle/final frames and post-pass landscape samples are retained. This is **full technical playback plus sampled-frame inspection**, not a continuous subjective viewing/listening session. The current Northvane, Stillwater and CRM phone passes each dropped one frame; the other listed passes dropped zero.

| Film / complete playback report | Desktop start | Phone start | Dropped frames, desktop / phone | Snapshot status |
| --- | ---: | ---: | ---: | --- |
| [Northvane Roofing](../../output/narrated-previews/northvane/playback-qa/report.json) | 520ms | 116ms | 0 / 1 | Both complete passes passed |
| [Alder & Stone](../../output/narrated-previews/alder-stone/playback-qa/report.json) | 382ms | 1501ms | 0 / 0 | Both complete passes passed |
| [Contour Roofing](../../output/narrated-previews/contour/playback-qa/report.json) | 333ms | 117ms | 0 / 0 | Both complete passes passed |
| [Halcyon Roofworks](../../output/narrated-previews/halcyon/playback-qa/report.json) | 368ms | 116ms | 0 / 0 | Both complete passes passed |
| [Velar Roof Atelier](../../output/narrated-previews/player-revision/velar/playback-qa/report.json) | 433ms | 116ms | 0 / 0 | Both complete passes passed |
| [Stratum Roofing Co.](../../output/narrated-previews/stratum/playback-qa/report.json) | 364ms | 134ms | 0 / 0 | Both complete passes passed |
| [Tambour Studio](../../output/narrated-previews/tambour/playback-qa/report.json) | 150ms | 117ms | 0 / 0 | Both complete passes passed |
| [Mitre & Rift](../../output/narrated-previews/mitre/playback-qa/report.json) | 137ms | 1500ms | 0 / 0 | Both complete passes passed |
| [Stillwater Pool Co.](../../output/narrated-previews/stillwater/playback-qa/report.json) | 671ms | 368ms | 0 / 1 | Both complete passes passed |
| [Datum Foundation](../../output/narrated-previews/final-framing/datum/playback-qa/report.json) | 392ms | 116ms | 0 / 0 | Both complete passes passed |
| [Roofing CRM workspace](../../output/narrated-previews/final-framing/roofing-crm/playback-qa/report.json) | 416ms | 118ms | 0 / 1 | Both complete passes passed |

Watch and Close use real buttons with ordinary autoplay policy; public playback supplies no access cookie. Full-pass reports check captions load, mute changes, pause/rewind, one mounted player, selected-media requests, closing and focus return. Post-pass media/text-track API checks do not establish native-control touch hit targets. Phone testing is browser emulation, not physical iOS or Android hardware.

The current [gallery check](../../output/contractor-previews/gallery-verification.json), recorded **19:21:21 UTC**, passed **181/181** assertions across all eleven cards. It verifies the six roofing entries, separate CRM, five categories, visible next-card peek, arrow navigation, keyboard movement, modal focus containment, return focus, one-item control removal, 390px overflow, touch swipe, reduced motion and public audio-enabled playback. Card durations match the then-current encoded files; the final CRM revision still rounds to the same 57-second badge. One-click starts in that short gallery pass ranged **98–332ms** on desktop and **133ms** for phone Velar. These starts do not replace complete playback.

Initial browsing mounted **zero video elements** and requested **zero MP4 files** in desktop/mobile gallery checks and all ten repeated startup trials. Only selected films are requested after Watch; full media is not eagerly loaded. The gallery report’s mutable request-array details include later requested films, so the initial observation is the explicit `navigation.initialMp4Requests: []` and its synchronous assertion, corroborated by independent startup reports.

The [media check](../../output/contractor-previews/media-verification.json), recorded **19:53:13 UTC**, passed **132/132** checks for video/audio streams, duration, WebVTT, posters, audio headroom and fast-start metadata. **This full-inventory rerun includes the final Datum and CRM encodes.** The access suite, `node scripts/test-demo-access.mjs`, passed **34 tests, 0 failures** in production-lead tool session `76560` (exit 0; 1,536.936375ms). This is a directly observed local test result; no saved result file or independently inferred run timestamp is asserted.

The production build exited **0**. Its [saved build log](../../output/narrated-previews/release-build.log) confirms the boundary of **19 private demo documents, 29 private JavaScript bundles and 33 public preview assets**, plus successful blog validation for the hub and **16 published articles**. The built-output [HTTP integration test](../../scripts/test-demo-preview.mjs) passed **575 route/asset responses across 19 private documents** in production-lead tool result `f84d50`. It exercised the public/private boundary and the approval, verified-email, NDA, owner sign-in/logout and cookie flows using **three mocked emails and modeled Redis operations**. No external email, live provider call or production access claim follows from this local integration result.

## Measured local performance

The single gallery navigation recorded **166.4ms DCL, 167.2ms load, 240ms LCP, 0.0402 CLS and 4,464,464 transferred bytes**. This is the local Vite development server, including development tooling; it is not a production page-weight or field Core Web Vitals result.

The separate [Velar startup report](../../output/narrated-previews/velar/startup-qa/report.json) measures trusted Watch click to the first `requestVideoFrameCallback`, with no fallback play call. Five cold contexts and five new pages in the retained warm context all passed. Initial MP4 requests and bytes were zero in every trial.

| Local start condition | Runs | Median click → first frame | Observed range | Median DCL / load | Median initial transferred bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fresh browser context | 5 | 80.7ms | 62.9–435.5ms | 162.2 / 162.9ms | 4,869,285 |
| New page in retained context | 5 | 93.6ms | 70.2–94.8ms | 54.3 / 54.5ms | 2,978 |

These are unthrottled local desktop measurements. “Cold” means browser cache/storage isolation, not a cold OS, DNS or CDN. No trial observed a cached MP4. With five samples, nearest-rank p95 is the maximum and is not a reliable field percentile. Physical-phone, constrained-network and deployed performance remain unmeasured.

## Visual review and remaining limits

The [encoded visual review](../../output/narrated-previews/encoded-visual-review.json) distinguishes saved encoded-film frames from raw captures. All eleven current films have sampled final review, with current MP4 hashes matched to the review evidence. The final Datum samples show “HAVE IT LOOKED AT” and “Raised from Watch it” together. Final CRM samples show Quinn Fiction’s “Inspection scheduled” status and the 107 Example Ridge appointment at 10:30 with Jordan Sample above the disclosure banner. Earlier findings and screenshots remain retained as historical evidence.

The player now reserves about **60px below the picture** for native controls. All **33 paused control screenshots** across eleven desktop, portrait and landscape cases were inspected and showed the full burned-caption band clear of controls. Six additional final-replacement desktop/portrait/landscape captures passed technical layout checks in the [Datum controls report](../../output/narrated-previews/final-framing/datum/controls-qa/report.json) and [CRM controls report](../../output/narrated-previews/final-framing/roofing-crm/controls-qa/report.json); all six were also visually inspected and showed native controls clear of the caption band.

Main imagery and enlarged results read more clearly than fine interface text on a portrait phone. At the measured **372px** picture width, 56px source captions scale to about **10.85px**, and 29px chapter/disclosure labels to **5.62px**. Fine labels alone are therefore not a reliable portrait reading surface. Spoken and captioned disclosure language remains essential; fullscreen, physical-device, screen-reader, complete muted comprehension and buyer checks remain unresolved.

Reviewed corrections include visible Northvane estimate/unsent states, Alder’s carried-forward sample estimate, Contour repayment context, and Tambour’s real $88,000–$177,000 range. Tambour required a source CSS fix that stopped nested odometer digits being repeatedly reduced in size; no fabricated price overlay replaced the interface. The [capture-story evidence](../../output/narrated-previews/tambour/capture-story-review.json) retains its actual planning and unsent-result boundaries.

The Velar boundary remains explicit: photo preparation is local; displayed generated studies are prepared samples; area is entered, not measured from the photo; prices are illustrative; the brief is unsent; the client room is a separate fictional sample. Each other story retains its own sample, illustrative-price and unsent/fictional limits in scripts, captions and operated evidence.

## Release states

| State | Evidence | Outstanding |
| --- | --- | --- |
| Local source, stories and capture | 11 stories; 83 operated scenes; editable scripts, Playwright actions, HyperFrames/GSAP compositions and retained audio sources | Subjective listening and buyer review remain separate |
| Encoded local delivery | All 11 current MP4/poster/VTT sets; probe/hash/loudness table above | Final subjective listening and buyer review |
| Local production build and access | Build exit 0; 19 private documents, 29 private bundles, 33 public preview assets; 575 HTTP responses and 34 access tests passed | Verify these boundaries on the exact deployed revision |
| Local playback and accessibility | All eleven current films have two complete technical passes; 181 gallery assertions; 33 visually reviewed control samples plus six visually reviewed final-replacement samples | Physical-device/native-control and screen-reader validation |
| Narration and mix | Independent content alignment, pitch-preserving pacing, licensed music and measured decoded audio | Subjective pronunciation, joins, synchronization and mix listening |
| Preview deployment | **READY**, application revision `05ffbb4c9add06181ad0e0464fba4e81ad5131ac`, deployment `dpl_8gXsvCaw5HUmzy9P8JVv3rEK3EvT` | Preview can require Vercel sign-in; it is not the public production release |
| Production deployment | **Not performed for the narrated collection** | Publish approval and the exact production revision |
| Live verification | **Pending** | Guest gallery/media/routes, range requests, gated resources, playback and demand-loading on exact deployed revision |
| Buyer validation | **Unresolved: zero participants** | Five representative contractor buyers; protocol below |

The previous `output/contractor-previews/release-summary.json` and silent-preview production HTTP records describe the earlier 36-second collection. Their deployed status and metrics do not validate this narrated replacement. Current gallery/media JSON files have newer local evidence and are identified explicitly above.

Review the [narrated preview gallery](https://wallace-shift-m0lvp3h0z-matthews-projects-a78a2f2e.vercel.app/demos/contractors) and [pull request 15](https://github.com/5cylinders1/wallace-shift/pull/15). The Vercel connector confirmed READY again at 20:14:48 UTC. An authenticated preview HTML fetch returned 200 at 20:10:59 UTC; that establishes document availability with authentication, not unauthenticated playback or a production route audit. The main implementation commit is `05ffbb4` (`Replace contractor previews with narrated walkthroughs and verified playback`). Later handoff documentation and packaging changes do not change the application or films in this preview.

## Five-buyer evaluation protocol

**Current recruitment and results: no participants available or tested. Buyer validation remains unresolved.** No completion rate, comprehension score, testimonial, or participant quote is asserted. This is a small formative evaluation, not a claim of conversion or revenue impact.

Recruit five people who buy or evaluate websites/operations systems for contractor businesses, including roofing owners or decision makers for the Velar pilot. Record their role, trade, prior exposure to these concepts, device, and whether sound is available. Do not coach them or explain the interface before the tasks.

1. From the gallery, ask: “Find the demos relevant to your business.” Record their chosen category, elapsed time, navigation, and any help requested.
2. Ask: “Watch the preview that interests you.” Record whether playback starts unaided in one click, any expectation of a form/account, and sound/caption behavior.
3. For the pilot evaluation, allow one uninterrupted Velar viewing. Before replaying or explaining, ask the four questions below and retain the participant's answer verbatim.
4. Ask: “What was unclear, too fast, missing, or hard to read?” Record the specific shot/time where possible. Do not convert a preference into a factual comprehension pass.

| Unaided question | Accurate-answer rubric, stated for evaluators only |
| --- | --- |
| “What did Wallace Shift build?” | Identifies a roofing website concept and connected customer journey; does not mistake Wallace Shift for the fictional roofing contractor or see only a standalone slideshow |
| “How does the journey you watched work?” | Describes photo/material exploration, prepared comparison, entered area/complexity and planning allowance, then the local project brief; recognizes the sample client room as a separate demonstration |
| “What distinguishes this concept?” | Names at least one specific demonstrated distinction, such as architectural presentation connected to material comparison and a carried-forward brief, rather than only “looks nice” |
| “Which results are examples, and what has actually happened?” | Recognizes prepared roof studies, illustrative prices and fictional project records; does not claim live roof measurement, newly generated output, a real project approval, or a sent/booked request |

Score each answer **accurate / partial / incorrect** before discussion. The pilot target is **at least four of five participants answering all four questions accurately after one unaided viewing**. Separately report category-finding and unaided playback success for all five. A successful click does not offset a mistaken belief that a sample is a real measurement or sent request.

Compare the narrated pilot with a retained, labeled copy of the original silent preview using the same questions. Counterbalance order (three narrated first, two legacy first), ask immediately after each single viewing, and record viewing order. Report first-exposure findings separately from second-view answers because the earlier film can teach the later one. With five people, treat differences as directional observations, not statistical proof.

| Participant | Role/trade, device, order | Find trade / start unaided | Narrated four-question scores | Legacy four-question scores | Misunderstanding and revision |
| --- | --- | --- | --- | --- | --- |
| P1 | Not recruited | Not tested | Not tested | Not tested | Pending |
| P2 | Not recruited | Not tested | Not tested | Not tested | Pending |
| P3 | Not recruited | Not tested | Not tested | Not tested | Pending |
| P4 | Not recruited | Not tested | Not tested | Not tested | Pending |
| P5 | Not recruited | Not tested | Not tested | Not tested | Pending |

Report every misunderstanding and which script, shot, caption, or disclosure changed in response. If the threshold is missed, revise the pilot and retest with fresh participants where available. Repeated viewers have learned from the first session and must be labeled as repeat reviewers. If participants remain unavailable, deliver technical/editorial findings with **buyer validation unresolved**, rather than calling the approach buyer-validated.

## Handoff

Editable source and handoff instructions are in [README.md](../../videos/contractor-previews/README.md). The archive helper includes scripts, original narration, derived WAVs, capture clips and QA evidence while excluding credentials, local grants, dependencies and ASR models. Run it only after final QA stops writing outputs; archive creation is separate from deployment.

The completed [editable archive](../../output/narrated-handoffs/2026-10-28T20-04-29-413Z/wallace-shift-contractor-narrated-editables.tar.gz) is **1,408,378,117 bytes**. Its SHA-256 is `9538b9231e1a4604db1891b50a231b0599c599117a0d40adb5ecd2108ca7d75d`. The adjacent [verification record](../../output/narrated-handoffs/2026-10-28T20-04-29-413Z/archive-verification.json) confirms that all **2,892 project files**, within **2,894 archive members** including the two handoff documents, matched their manifest sizes and hashes. The archive is a fixed snapshot made before the preview-status documentation update; its included deployment statement is superseded by this release record.

Commit message: `Replace contractor previews with narrated walkthroughs and verified playback`.
