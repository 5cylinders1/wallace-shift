# Roofing demo 05 — Velar Roof Atelier

The final collection slot is a separate luxury roofing demo at
`/demos/roofers-5/`, with the branded alias `/velar`. It has its own React
entry, stylesheet, favicon and noindex/nofollow document. The Vite and
Vercel route configuration includes the alias; these notes do not assert a
deployment. Demos 01–04 retain their existing experiences.

## Experience

Velar uses chalk, forest ink and muted olive, Manrope and Cormorant Garamond,
generous editorial typography and restrained reveal animations. The focus
is architectural roof installation and replacement for exceptional homes.

- A three-scene luxury-estate drone film, with a pause control, offscreen
  playback suspension, persistent manual pause intent, reduced-motion
  preference support and a still-image fallback.
- Immediately below the hero, a browser-local photo roof studio. A visitor
  can import a JPG, PNG or WebP, trace individual roof planes, adjust eave
  and ridge anchors, preview slate, standing-seam metal, cedar or clay,
  compare against the original and download a JPEG.
- Each plane has its own perspective or parallel-course mapping. Physical
  eave span, horizontal run and rise-over-12 pitch determine texture scale;
  the camera projection comes from visitor-defined anchors. Broad source
  illumination is retained without overlaying the previous roof texture.
- Total sloped roof area and complexity produce an illustrative planning
  range. A photo does not measure area or establish structural suitability.
- An architectural material library and complete-system/process guidance,
  including insurance, financing and warranty questions.
- A sourced investment explorer compares JLC Cost vs. Value national report
  snapshots from 2024 and 2025. Reported resale contributions are professional
  survey estimates, not observed sale prices or a home appreciation forecast.
  See [the evidence notes](roofers-5-research.md) for exact data and sources.
- A functioning homeowner portal preview, with project overview, daily
  updates, enlarged photographs, simulated finish approval and document
  previews. The project data is fictional and there is no live connection,
  authentication or saved approval.
- A consultation form produces an explicitly unsent project brief and TXT
  download. The studio selection carries into the brief. Editing preserves
  entered fields and restores focus. Details stay in the current browser.

## Media provenance

The hero was generated in the authenticated Higgsfield workspace for this
request, using **Seedance 2.5**. The approval UI displayed that model and the
completed result confirmed it. No video model was substituted.

Generation conversation:
<https://higgsfield.ai/supercomputer/799c9d9d-f6d4-4fae-97f9-865bf10fe16f>

The single 15.041667-second generation contains three hard-cut scenes:
slate on a French limestone estate, standing-seam metal on a coastal
residence, and clay tile on a Mediterranean courtyard villa. The original
was 1920×1080 HEVC at 24 fps with no audio stream. Local delivery encodes:

- `public/demos/roofers-5/estate-film.mp4`: H.264, 1920×1080, 24 fps,
  6,888,075 bytes, fast-start metadata, silent.
- `public/demos/roofers-5/estate-film-mobile.mp4`: H.264, 1280×720,
  2,129,229 bytes, fast-start metadata, silent.
- `public/demos/roofers-5/hero-poster.jpg`: matching French slate-estate
  poster, generated with GPT Image 2.5 in Higgsfield and optimized to
  1920 pixels wide.

Representative film frames are retained in ignored
`output/roofers-5/qa/seedance-contact-sheet.jpg`. The frame check verifies
the three intended roof scenes and a credible overall appearance; it is
not a guarantee of artifact-free geometry in every generated frame.

Material-library, portal and sample-home images reuse the existing
Higgsfield concept assets under `public/demos/roofers-4/`. Their source files
remain intact. Velar's photo studio performs geometric compositing locally,
with no AI re-render or external photo upload. It does not synthesize new
ridge caps, flashing, cast shadows or product-specific installation details.

## Validation

- Full TypeScript/Vite production build passes.
- Scoped ESLint and whitespace checks pass.
- `node --test scripts/test-velar-visualizer.mjs`: six geometry and pricing
  checks pass, including perspective anchors, foreshortening, uncrossed
  outlines, pitch and invalid/bounded estimate inputs.
- Browser checks cover desktop and 390/320-pixel widths, material/finish
  controls, original comparison, local image import, keyboard plane tracing,
  portal interactions and consultation preview/editing.
- Root browser checks verified the H.264 mobile source loaded with
  `readyState=4`, the expected 15.041667-second duration and working pause.
- JPEG study and TXT brief were saved into the browser download directory,
  then inspected on disk. Browser download-event waits did not resolve,
  so on-disk evidence was used to verify the completed files.

This is a local demonstrator. Production portal authentication, live
project ingestion, customer storage, notifications, consultation delivery
and manufacturer-approved visualizations are future integration work.

Commit message: `feat: add Velar luxury roofing demo with Seedance film and roof studio`
