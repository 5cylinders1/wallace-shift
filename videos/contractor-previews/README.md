# Contractor preview production

Eleven 36-second films show actual local demo interfaces. `pilot.mjs` and `scenarios.mjs` are editable scripts and shot lists; `compose.mjs` creates the HyperFrames compositions and accessible WebVTT; `capture.mjs` records repeatable Playwright interactions; `render.mjs` checks, renders, and optimizes the delivery files with FFmpeg.

## Reproduce

Use Node 24, Chrome, and FFmpeg/ffprobe. Install the application dependencies at the repository root, then install this folder's pinned production tools (`npm install` in this folder). Run `npx playwright install ffmpeg` with `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/wallace-preview-browsers`, or set that variable to an existing Playwright browser directory. Chrome is selected by the supported `channel: chrome` setting.

The existing gitignored `.demo-preview.local` must contain the local demo-access secret and admin email used by the local preview server. No production credential is needed. Never print, publish, or commit it. Capture grants are restricted to localhost, expire after an hour, and are never saved in screenshots or evidence.

From the repository root:

```sh
node videos/contractor-previews/server.mjs
# In a second terminal, complete and inspect the pilot first:
node videos/contractor-previews/capture.mjs velar
node videos/contractor-previews/compose.mjs velar
node videos/contractor-previews/render.mjs velar
# Then capture, compose, and render the remaining IDs (or omit IDs for all).
```

`HYPERFRAMES_CLI` can select a local `hyperframes/bin/hyperframes.mjs`; otherwise rendering uses the pinned CLI through npx. `HYPERFRAMES_BROWSER_PATH` can select system Chrome for HyperFrames. `WORKSPACE_NODE_MODULES` optionally selects a bundled Playwright installation. `CAPTURE_ORIGIN` can change the local preview origin; the server and recorder must use the same value.

## Files and evidence

- `DESIGN.md`, `SCRIPT.md`, `STORYBOARD.md`: visual identity, editorial structure, and truthful sample handling.
- `<id>/index.html`: editable composition. Rerunning compose replaces it from the central template and manifest.
- `<id>/clips/`: retained local source recordings, ignored by Git and deployment; regenerate with capture.
- `fonts/`: the site's Manrope and Instrument Serif with their SIL Open Font licenses. Generated per-film copies and GSAP copies are ignored.
- `output/contractor-previews/<id>/`: screenshots, original browser video, timing/input evidence, full checks, and master render; intentionally excluded from deployment.
- `public/media/demo-previews/`: the 33 delivery assets (MP4, poster JPEG, WebVTT for each film).

Capture blocks API POSTs. Visualizers use shipped prepared studies; estimators use explicit sample-property controls; CRM uses fictional records. No live image generation, email, real customer upload, or outreach is performed. The silent edit is intentional: captions carry the entire explanation, with no autoplay audio surprise. Processing time is not simulated or represented as instantaneous.

Run `node scripts/test-contractor-gallery.mjs` against the local or deployed public gallery (`BASE_URL` selects its exact URL). It measures real decoded playback and verifies no initial MP4 requests, keyboard/modal behavior, and touch navigation. Its performance numbers are lab observations, not field Core Web Vitals. Representative contractor-buyer evaluation remains a separately disclosed gap until actual participants are available.

Working clips are local editable assets, not release files. To transfer the project to a machine without local capture access, include the ignored `<id>/clips` folders alongside these sources.
