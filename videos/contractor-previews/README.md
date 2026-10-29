# Narrated contractor walkthrough production

The current work replaces the original silent previews with narrated walkthroughs of the same eleven demos. Start with [NARRATED-DESIGN.md](NARRATED-DESIGN.md), [NARRATED-SCRIPT.md](NARRATED-SCRIPT.md), and the Velar [NARRATED-STORYBOARD.md](NARRATED-STORYBOARD.md). The authoritative editable stories are `narrated-pilot.mjs`, `narrated-roofing.mjs`, and `narrated-other.mjs`. Each spoken claim is paired with a real screen action or result; duration follows the complete explanation and measured narration.

The [validation record](../../docs/demos/narrated-validation.md) distinguishes source research, local capture, finished-film review, deployment, live verification, and buyer comprehension. A captured journey or a file on disk is not a completed film or release. Finish and review Velar before applying its production approach to the other films.

## Current production entry points

Use Node 24, Chrome, and FFmpeg/ffprobe. Application dependencies are installed at the repository root; this folder pins HyperFrames and Playwright. `HYPERFRAMES_CLI` selects an installed HyperFrames CLI, `HYPERFRAMES_BROWSER_PATH` can select Chrome, and `WORKSPACE_NODE_MODULES` can select a bundled Playwright installation. Set `PLAYWRIGHT_BROWSERS_PATH` to the configured Playwright recording runtime. The recorder uses Chrome through `channel: 'chrome'`.

The existing gitignored `.demo-preview.local` contains the local access configuration used by the preview server. No production credential is needed. Never print or commit it. Capture grants are restricted to localhost and expire after an hour. `CAPTURE_ORIGIN` changes the local origin; the server and recorder must use the same value.

The current narration route and import procedure are documented in [narrated/AUDIO.md](narrated/AUDIO.md). Retain the exported take, exact transcript, provider provenance, listened sentence timestamps, and source hashes. Import the accepted audio before final capture so each shot is long enough for its spoken explanation. Audio extraction alone does not establish a passed listening review.

From the repository root:

```sh
node videos/contractor-previews/server.mjs
# In another terminal, after exporting and aligning the accepted narration:
node videos/contractor-previews/narrated-import-audio.mjs /absolute/path/to/alignment.json
node videos/contractor-previews/narrated-capture.mjs velar --warm
node videos/contractor-previews/narrated-compose.mjs velar
node videos/contractor-previews/narrated-render.mjs velar
```

Watch the complete encoded pilot with sound and muted at desktop and phone sizes, record findings, and revise before producing the other films. Run the same explicit commands with each remaining ID; `narrated-capture.mjs` and `narrated-compose.mjs` default to Velar when the ID is omitted. `narrated-render.mjs` requires one or more explicit verified IDs. The optional `CHECK_ONLY=1` render setting runs composition checks and snapshots without encoding delivery files.

For a separate check → visual review → render workflow, run `CHECK_ONLY=1 node videos/contractor-previews/narrated-render.mjs <id>`, review its snapshots, then run `node videos/contractor-previews/narrated-render.mjs --render-checked <id>`. Successful checks write `output/narrated-previews/<id>/checked-composition.json`. The shortcut requires matching hashes for the generated HTML, soundtrack, edited clips, fonts, animation runtime, timeline, checking runtime, and check settings. A missing or stale proof fails with instructions to check again. Assets are hashed before and after checking and again after rendering; a change during either operation prevents certification or delivery encoding. The proof records automated checks and snapshot production, not a claim of human visual or audio review. Checks run before this proof mechanism existed cannot be reused.

Composition writes the current `<id>/index.html`, soundtrack, and public VTT. Rendering writes the public MP4 and poster. These use the same delivery paths as the legacy films, so preserve a dated copy of the old baseline before replacement if it will be used in the buyer comparison. Do not infer a completed set while these steps are in progress. After encoding, update the gallery's displayed durations from the measured files before release.

## Editable sources and evidence

- `narrated-pilot.mjs`: Velar's story, claims, disclosures, and capture actions.
- `narrated-roofing.mjs`, `narrated-other.mjs`, `narrated-scenarios.mjs`: the ten other scripts and their combined capture inventory.
- [Roofing research](../../docs/demos/narrated-roofing-research.md) and [other-demo research](../../docs/demos/narrated-other-research.md): primary components, input/output behavior, limitations, and two-column scripts. These establish source evidence; capture records establish operated behavior.
- `narrated-capture.mjs`: repeatable Playwright capture with API POST requests blocked. Visualizers use shipped prepared studies; estimators use sample controls; CRM uses fictional records.
- `narrated-import-audio.mjs` and `narrated/audio/<id>/`: retained original takes, exact transcript, alignment, scene WAVs, and measured timing. `narrated-audio.mjs` is unused optional tooling; see the audio document before using it.
- `narrated-compose.mjs`: HyperFrames/GSAP framing, timed captions, and FFmpeg music/narration mix. It requires matching narration and capture evidence and rejects substantial missing footage.
- `narrated-render.mjs`: composition checks, snapshots, rendering, delivery encoding, format inspection, and decoded AAC loudness measurements. These checks do not replace watching and listening.
- `<id>/index.html`, `<id>/clips/`, `<id>/soundtrack.wav`: editable composition and local production media. Regeneration replaces the composition from its manifests. Working clips and audio are excluded from deployment.
- `output/narrated-previews/<id>/`: original browser recording, scene screenshots, capture evidence, edit timeline, render logs/master, and delivery measurements when each step completes.
- `narrated/music/LICENSE.md` and `fonts/`: music attribution and the site's licensed Manrope/Instrument Serif fonts.
- `public/media/demo-previews/`: public MP4, poster JPEG, and WebVTT for each of eleven IDs. Files here can still be legacy or in-progress outputs until the validation record says otherwise.

Capture performs no real outreach, customer upload, or live image generation. Prepared studies, illustrative prices, entered measurements, fictional records, and unsent requests remain visible in the films. The recorded interface remains central; captions carry the explanation with sound off, while narration and restrained licensed music support sound-on viewing.

Run `node scripts/test-contractor-gallery.mjs` against the exact local or deployed gallery (`BASE_URL` selects it). It records decoded playback, displayed/runtime agreement, initial MP4 requests, modal/keyboard behavior, and touch navigation. Also complete the sound-on, mute, single-player, caption, and phone-readability checks in the validation record. Measured lab timings are not field Core Web Vitals. Buyer comprehension needs actual participants.

## Local production archive

Use the allowlisted handoff helper to inspect the current inventory without creating an archive:

```sh
node videos/contractor-previews/narrated-package.mjs --plan
```

Only after capture, composition, rendering, and QA have finished, create the local archive:

```sh
node videos/contractor-previews/narrated-package.mjs --archive
```

Packaging uses Python 3's standard-library `tarfile` module, with an explicit relative path for each archive member so behavior is consistent on macOS and Linux. Set `PYTHON` to a Python 3 executable if `python3` is not on PATH. No additional Python package is required.

The archive is written to a new timestamped directory under `output/narrated-handoffs/`, together with `HANDOFF.json`, `HANDOFF.md`, and an archive SHA-256 checksum. It retains all eleven public films, posters and captions; editable compositions and clips; original narration, measured timing and PCM edits; music attribution; and the recorded validation evidence. It includes the final player revision, per-demo player layout checks, encoded visual review, and public live QA folders when present. Before packaging, it checks that each delivered film contains audio and video, follows the current timeline, and has the expected composition and delivery records. These file checks do not establish a passed subjective listening review, buyer validation, or deployment.

Keep scripts, JSON/TXT timing and provenance, and retained original MP3 takes under Git review. Generated scene WAVs, paced WAVs, soundtracks, capture clips, and temporary caches stay outside Git; the archive carries the needed local media. Do not remove those ignored production files until the handoff archive and its checksum have been verified. The helper excludes `.demo-preview.local`, environment and credential files, authentication/browser storage state, dependency installations, ASR models, raw full-page browser recordings, and duplicate rendered masters.

Extract the archive into a dedicated folder and preserve relative paths. Included compositions already have local edited clips, soundtrack, fonts, and GSAP. Install the pinned dependencies and FFmpeg separately if further composition or rendering is needed. Historical provenance can retain the original machine's absolute source paths; re-importing a take requires relinking `sourceFile` to its retained original. Interactive recapture requires the application repository and a separately authorized local access grant, which is deliberately excluded from the handoff.

## Legacy baseline retained

`pilot.mjs`, `scenarios.mjs`, `capture.mjs`, `compose.mjs`, and `render.mjs` belong to the original 36-second silent pipeline. `DESIGN.md`, `SCRIPT.md`, and `STORYBOARD.md` document that superseded brief; the [historical audit](../../docs/demos/contractor-preview-audit.md) records its previous results. `output/contractor-previews/` was the original capture-evidence path, but those ignored artifacts are not all present in this checkout. This folder's older `npm run capture`, `compose`, and `render` aliases still point to those legacy commands; use the explicit `narrated-*` commands above for current work. Do not treat old gallery copy or old films as the product specification.
