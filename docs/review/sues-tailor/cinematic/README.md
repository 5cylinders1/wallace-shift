# Sue’s cinematic dress assembly

Revised local preview: http://127.0.0.1:5194/demo/sues-tailor

The rejected five-cutout treatment has been replaced by original Higgsfield film of fabric curling, closing around a central form, and resolving into a finished gown. React and GSAP ScrollTrigger map native document scroll directly to 180 rendered frames. Scrolling backward reverses those frames; stopping scroll stops the garment. There is no autonomous video playback. Portrait screens at 600px and below use a separately generated portrait film of the same gown.

The existing service, review, process, fitting form, and visit sections retain their scope. Request a fitting remains accessible through the sticky desktop header or fixed mobile bar. The form only previews details locally: nothing is sent or booked. Gown media is explicitly illustrative and does not represent Sue’s work or promise custom dressmaking.

## Review the result

- [Desktop forward and backward scroll recording](scroll-forward-reverse-1440.webm)
- [Mobile forward and backward scroll recording](scroll-forward-reverse-390.webm)
- [Reference comparison and observed differences](reference-comparison.md)
- [Reference and current checkpoint sheet](reference-comparison.jpg)
- [Landscape film storyboard](cinematic-motion-contact-sheet.jpg) and [portrait film storyboard](mobile/cinematic-motion-contact-sheet.jpg)
- [Original reference study](../assembly/reference-study.md)
- [Browser results](browser-results.json) and [loading/resize resilience results](resilience-results.json)
- [Generation costs, exact prompts, and job IDs](../assembly/cinematic-generation.json)

The actual reference is [Tailor by Octaboot](https://tailor-by-octaboot.vercel.app/), identified from the supplied reel and checked against its public script. It uses a 535-frame canvas sequence with GSAP. The study distinguishes observed composition, camera changes, garment stages, type, pinning, and transitions from this single-gown translation. Reference images are review evidence only, not production artwork.

## Scroll storyboard

| Pinned progress | Delivered dress state | Page treatment |
| --- | --- | --- |
| 0% | Curved silk panels surround a warm mesh form; straps float above. | Introductory copy; fitting controls visible. |
| 25% | Broad skirt panels bend inward. | Copy clears to expose the construction. |
| 50% | Bodice and skirt close around the center, with fine strands still visible. | Second editorial heading appears. |
| 75% | The silhouette is nearly complete; strands resolve. | Copy clears again. |
| 100% | Finished gown, including straps and hem. | Closing heading; scene releases into the existing page. |

These percentages are fixed document-scroll checkpoints. They are not claims of matching the reference reel’s recorded seconds or identical tailoring construction. The portrait version folds fabric inward vertically and has slightly different motion.

## Verified behavior

Final main run: **2026-11-18 01:29 UTC**, Chrome **157.0.8103.80**, isolated local headless browser, DPR 1. All five normal-motion viewports (**320, 390, 768, 1440, 1920 × 900**) and all five reduced-motion viewports passed.

- Native scrolling changes the actual canvas pixels and reaches the finished frame. Recorded 390px and 1440px passes use native wheel input, including intermediate frames before checkpoint correction.
- Pausing halfway leaves scroll position and pixel hashes unchanged. Reverse checkpoints select the same frame indices and dimensions. Ten of 31 pixel comparisons had small raster differences; all stayed within explicit bounds. Worst mean RGB difference was **1.248/255**, RMS **3.778**, maximum channel difference **73**, and **0.291%** of pixels had a channel difference above 32. The rendering cause is not established. This is not a claim of byte-identical reverse rendering.
- Actual fitting-link clicks reach the form from the pinned scene. Mobile controls remain inside the viewport with usable touch targets. No horizontal overflow was found.
- Required-field validation and review, edit, and clear actions pass. No POST/PUT/PATCH/DELETE requests or browser-storage writes occur from the demo form.
- Reduced motion shows a static completed gown, removes the long pin, and fetches no sequence frames. Live preference changes remove and restore one pin correctly.
- Five resilience cases pass: delayed frames plus rapid seek/resize, responsive manifest changes, reduced motion, missing manifest, and missing frame. During the held-frame resize case, **24 sampled renders had zero blank samples**, and the canvas caught up after responses resumed. Missing assets retain a visible poster and working fitting link.
- No uncaught browser runtime errors were recorded.

Build, targeted ESLint, TypeScript, and whitespace checks passed. The rebuilt HTTP integration suite passed **737 route/asset responses**; provider requests in that suite were mocked, with no live messages sent.

## Performance measurements

| Width | Scroll input | RAF median | RAF p95 | Long-task time during scroll | CLS during scroll |
| --- | --- | --- | --- | --- | --- |
| 320px | Scripted native document scroll | 33.3ms | 33.4ms | 0ms | 0 |
| 390px | Native wheel, recorded | 16.7ms | 16.7ms | 0ms | 0 |
| 768px | Scripted native document scroll | 33.3ms | 33.4ms | 0ms | 0 |
| 1440px | Native wheel, recorded | 16.7ms | 16.7ms | 0ms | 0 |
| 1920px | Scripted native document scroll | 33.3ms | 33.4ms | 0ms | 0 |

These measure browser animation callbacks, not a guarantee of distinct film frames per second. The recorded wheel passes displayed 78 and 79 distinct film frames during measured scrolling. Raw measurements and compressed Chrome traces are retained beside the report. Trace totals include checkpoint screenshots and pixel hashing; the table filters to scrolling intervals. These are local diagnostics, not production-network or physical-phone performance claims.

Each sequence has 180 WebP frames: landscape **1280 × 720, 7,664,048 bytes**, portrait **720 × 1280, 7,994,014 bytes**, excluding posters and code. Only the chosen orientation loads. The decoder retains at most 22 desktop or 16 mobile decoded frames, roughly 77MiB or 56MiB of image data, plus in-flight decodes and compressed assets. Slow connections may hold the last available frame while the target loads. Initial poster and failure fallback remain usable.

## Actual generation use

| Item | Credits |
| --- | ---: |
| Earlier triptych already used | 6.5 |
| Landscape anchor image | 2.75 |
| Landscape 10-second MiniMax H3 film | 20 |
| Portrait anchor image | 2.75 |
| Portrait 10-second MiniMax H3 film | 20 |
| **Total** | **52** |

The account balance moved from **1,193.5 to 1,148** for these four replacement jobs, confirming **45.5** new credits. Including the original 6.5 gives **52 credits**, approximately **$3.12** at the previously checked $6/100-credit rate, leaving approximately **$1.88** of the $5 cap. This is consumed credit value, not a new card charge; no credits or subscription were purchased. No further generation is planned.

## Remaining limits

- The mobile opening’s outermost fabric is slightly clipped at the sides; the central form and finished gown fit. The empty title band at 25% and 75% is intentional between copy phases.
- The generated sequence illustrates assembly. It is not a sewing tutorial, verified cloth simulation, a photograph of Sue’s work, or a custom dressmaking claim. Some fine strands resolve through generated motion rather than physically modeled stitching.
- The reference’s wearer, lineup, and macro chapters are outside this focused revision. No identical timing, camera choreography, or visual parity is claimed.
- Mobile checks are browser emulation; no physical iPhone/Android or Safari verification was performed. Performance is unthrottled and local.
- This is a local preview. No deployment or messages were sent as part of this revision. Final visual acceptance remains the user’s judgment.

## Reproduce

```sh
npm run dev -- --host 127.0.0.1 --port 5194
node scripts/test-sues-assembly.mjs
node scripts/test-sues-cinematic-resilience.mjs
npm run build
node scripts/test-demo-preview.mjs
```

Frame extraction uses `scripts/sues-tailor/build_cinematic_sequence.py`: trim the first 7.5 seconds **before** reversing, then extract at 24fps. Original generation URLs and arguments are in the cost ledger. Review files in `../assembly/` that depict the five-cutout prototype are obsolete; this directory contains the current film evidence.

Commit message: `feat: replace Sue's cutout hero with cinematic scroll assembly`
