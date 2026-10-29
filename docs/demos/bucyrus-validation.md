# Bucyrus demo validation

Checked October 29, 2026. See the latest routing check below; earlier sections record the design iterations.

## Public route correction — latest check

Bucyrus now lives at `/bucyrus-auto`, backed by `/demos/bucyrus-auto/index.html` and `src/demos/bucyrus-auto/`. Production URL after deployment is **https://contractors.wallaceshift.com/bucyrus-auto**. The contractors homepage, styles, entry metadata, and documentation were restored exactly from the original committed version. No tile was added.

Full build and the six public-route regression tests passed. Browser inspection confirmed the restored gallery headline, zero Bucyrus links in the gallery, the new demo headline at the clean alias, and `noindex, nofollow` metadata. Vercel response-header rules cover both alias and direct entry; local preview also emits the header. The page and its bundles require no application session. Production deployment verification remains separate from commit/push.

Earlier references to the Bucyrus implementation under `src/demos/contractors/` or its preview at `/demos/contractors/` describe the superseded initial location; the restored gallery now owns that path.

## Cinematic hero revision — latest check

The traditional three-image slideshow is replaced by a five-shot, 25.6-second image film, including the requested open-hood immaculate engine. New hero stills generated with the built-in image tool; exact prompts and paths are in `bucyrus-imagery.md`.

- Full `npm run build` passed after the unrelated concurrent lawn work became buildable (20 demo documents, 30 private JavaScript bundles). The earlier blocker below is historical.
- Focused TypeScript and ESLint passed; `git diff --check` passed.
- `node scripts/test-bucyrus-film.mjs` checks the visible opening, edit boundaries, wraparound, camera movement, three complete loops, and image-edge coverage throughout both active and outgoing shot movement.
- Browser inspection confirmed all five film assets loaded, camera transforms advance during playback, pause preserves identical transforms across observations, resume advances, and manual navigation selects and announces “Shot 3 of 5: Under the hood.”
- Desktop 1440 × 1000 and phone 390 × 844 inspection confirmed the hood-up engine composition, readable fixed headline/CTA, compact film controls, and no horizontal overflow.
- Reduced motion is handled by the existing preference listener, disables the animation clock, and renders a static image; actual OS preference was not changed during QA.
- Five-shot WebP payload is 1,001,658 bytes at full resolutions, or 381,172 bytes for the smaller variants. This supersedes the initial three-shot budget below. High-DPR devices can select larger images. New production timing was not benchmarked.
- Image-load errors are handled by skipping failed shots; all-failed imagery retains the static text/CTA on a dark background. Error handling was reviewed in code, not tested by interrupting the local server.

Commit message: `feat: turn Bucyrus hero into a cinematic five-shot image film`

## Initial version evidence

## Checks

- Initial full `npm run build` passed TypeScript, both Vite builds, demo boundary verification, and blog build verification.
- Final focused TypeScript check of `ContractorsLander.tsx`, `BucyrusAppointment.tsx`, and `main.tsx` passed using the repository compiler options.
- Focused ESLint and `git diff --check` passed.
- Final public production Vite build passed, including the contractors entry.
- Later full-workspace checks encountered unrelated concurrent lawn-demo work: a typed-array mismatch in `src/demos/lawn/estimate/measure.ts:169`, then an unresolved `demos/lawn/index.html` entry during the demo-mode build. Those files were not modified for Bucyrus. Full-workspace release validation must be rerun once that work is complete.

## Browser inspection

Inspected the actual page at 1440 × 1000 desktop and 390 × 844 phone viewports, as well as the default tablet-width panel. No horizontal overflow; all five images loaded. Corrected phone hero cropping, footer wordmark size, and narrow form columns. Final phone fields are one column with 16px input text. Browser error/warning log was empty during inspection.

Verified:

- Hero anchor scrolls to the appointment section.
- Slides change automatically; selecting a slide pauses; play/pause control changes state.
- Keyboard Tab moves through slide controls with a visible outline.
- Empty required fields show errors and focus the first invalid field.
- Whitespace-only name is rejected.
- Malformed email and a past preferred date are rejected.
- Valid test input produces “Request preview ready. Nothing has been sent or booked.”
- Preview receives focus, shows entered details, and marks the date unconfirmed.
- Edit preserves input; clear empties fields and returns focus to name.
- Source review confirms there is no fetch/API or persistent storage in the form.
- Reduced-motion implementation reviewed: initial preference suppresses timer, preference change cleans up timer, CSS disables transitions and smooth scrolling. An actual OS reduced-motion setting was not toggled during browser QA.

Screenshots: `output/bucyrus/desktop.jpg`, `output/bucyrus/mobile.jpg` (local ignored output). Preview: `http://127.0.0.1:5173/demos/contractors/`. The pre-existing server was reused for handoff; the temporary test server was stopped.

## Performance

A temporary local QA document used PerformanceObserver for LCP and layout shifts, then was removed. Warm-cache Vite-development results, not production/network benchmarks:

| Viewport | LCP | First contentful paint | CLS |
| --- | ---: | ---: | ---: |
| 390 × 844 | 96 ms | 96 ms | 0.00188 |
| 1440 × 1000 | 112 ms | 96 ms | 0.00051 |

Resource sizes measured from the production output: approximately 68 KB gzip for the entry, React dependencies, CSS and HTML; excludes external Google font responses. Three large hero images total 356,534 bytes, smaller variants total 118,646 bytes. Shop photos total 208,024 bytes. The first hero is 134,692 bytes at 1600px or 44,380 bytes at 800px. High-DPR phones may choose the larger image. No video, Three.js or animation-library dependency is loaded by this page. Fonts use display=swap and direct head stylesheet loading with preconnects.

## Remaining launch dependencies

There is no verified Bucyrus appointment inbox, so no live delivery claim or delivery test was made. Current hours, operating street address, and specific services need owner confirmation. Source evidence and precise image prompts are in the adjacent audit and imagery documents. The existing contractors host rewrite was preserved and inspected, but production behavior was not reverified.

Commit message: `feat: build Bucyrus Auto and Drivetrain demo on contractors route`
