# Roofing demo 05 — Velar

The final collection slot is an independent luxury roofing experience at
`/demos/roofers-5/`, with the branded alias `/velar`. It has its own React
entry, styles, favicon, copy and imagery. This revision is local and has
not been deployed.

## Experience

Velar uses Sora and DM Sans, warm white, midnight blue and bronze. Oversized
sans-serif typography, a new roofline mark, four material studies and a
horizontal private project room distinguish it from the other demos.

- The three-scene Seedance 2.5 film has pause, offscreen suspension,
  remembered manual pause, reduced-motion support and a poster fallback.
- The AI photo studio immediately follows the hero. Visitors upload a JPG,
  PNG or WebP, choose a finish, consent to the OpenAI upload, then explicitly
  generate. No roof tracing or texture overlays remain.
- Original/Preview/Compare and JPEG download describe the actual rendered
  finish, even if a different choice is selected during generation.
- The photo stays sticky beside the controls, including a smaller pinned
  image on mobile. Quality and planning inputs are compact disclosures.
- Four prepared medium-quality studies require no API call. New finishes
  or uploaded photos require explicit generation; completed choices are
  cached in the session. Swatch changes alone never make paid calls.
- Planning allowances use measured total sloped roof area and complexity.
  Illustrative rates: slate $24–42/sq ft, metal $18–31, cedar $19–32 and
  clay $23–39. These are demonstration assumptions, not market quotes.
- The ownership explorer shows sourced JLC report snapshots, service-life
  guidance and climate-dependent performance considerations. It does not
  forecast one luxury home's appreciation. See [the evidence notes](roofers-5-research.md).
- Cedar Cove's fictional project room has keyboard-accessible tabs, site
  notes, photo enlargement, simulated approval and document previews.
  It has no authentication, live project feed or saved approval.
- The consultation form creates an explicitly unsent brief and TXT download.
  Editing preserves fields and restores focus.

## Exclusive media

Every displayed Velar image and video is under `public/demos/roofers-5/`.
SHA-256 comparison found zero exact duplicates against the 25 media files
in other demo directories. There are no image paths or component imports
from roofing demos 01–04. The audit receipt is in ignored
`output/roofers-5/ai-review/asset-audit.json`; hashes and origins are recorded
in `public/demos/roofers-5/media-manifest.json`.

The 15.041667-second hero was created exclusively for Velar in Higgsfield
with **Seedance 2.5**, confirmed in the signed-in result. Hard cuts show a
French slate estate, coastal metal-roof residence and Mediterranean clay
villa. It remains because it was already unique to this demo.

Generation conversation:
<https://higgsfield.ai/supercomputer/799c9d9d-f6d4-4fae-97f9-865bf10fe16f>

- `estate-film.mp4`: H.264, 1920×1080, 24 fps, silent, 6,888,075 bytes.
- `estate-film-mobile.mp4`: H.264, 1280×720, silent, 2,129,229 bytes.
- `hero-poster.jpg`: matching GPT Image 2.5 poster generated in Higgsfield.
- `residence-original.jpg`: a new Pacific Northwest waterfront stone-and-
  cedar residence created with built-in ImageGen, exclusive to Velar.
- `residence-{slate,metal,cedar,clay}.jpg`: actual GPT Image 2 edits through
  this app's endpoint, medium quality, 1536×1024, each from the same original.
- `material-*.jpg`: the corresponding residence studies in Velar's library.
  Their reuse is limited to this demo's own surfaces.
- `project-progress.jpg`: a new ImageGen copper valley inspection concept.
- `favicon.svg`: the new Velar roofline mark.

These are AI concepts, not completed customer projects. The prompt preserves
roof pitch, planes, ridges, dormers and occlusion, and excludes terraces,
deck floors and flat canopies. AI can still alter geometry and other details.
The original remains available; there is no promise of pixel-perfect
preservation or manufacturer-approved installation details.

## OpenAI endpoint

`api/roof-render.ts` uses direct Images edits with fixed `gpt-image-2`, one
JPEG and allowlisted materials, finishes and low/medium quality. Visitors
cannot supply a prompt, model or remote image URL. Native server-side fetch
keeps the key out of the client bundle.

Development reads `OPENAI_API_KEY` from ignored `.env.local`. GET reports
availability without generating; unavailable live requests are disabled
while prepared samples remain usable. The client prepares photos locally
before consent: maximum 25 MB input, resized to at most 1536 pixels on the
long edge and JPEG under 1.5 MB. The server validates image signatures,
dimensions, aspect ratio and its 2 MB decoded-photo limit independently.

Local access requires a loopback connection and matching local host.
Non-local generation defaults to disabled. Public server configuration:

```text
OPENAI_API_KEY=<server-only key>
ROOF_RENDER_ENABLED=true
ROOF_RENDER_ORIGIN=https://<exact deployed host>
RATE_LIMIT_REDIS_URL=<Upstash HTTPS REST endpoint>
RATE_LIMIT_REDIS_TOKEN=<standard write token>
```

The existing `KV_REST_API_*` or `UPSTASH_REDIS_REST_*` pairs also work.
Never use a `VITE_` prefix for the OpenAI key. Public origin and host must
match exactly; usage-limit failures stop paid calls. Defaults are 10
studies per visitor per hour and 20 globally per UTC day. Optional
`ROOF_RENDER_PER_HOUR` and `ROOF_RENDER_DAILY_CAP` settings have ceilings of
20/hour and 100/day. Failed provider attempts consume a reservation.
Local counters reset when the server restarts.

The endpoint limits concurrency to two per process, deduplicates identical
in-flight requests and caches exact-photo results by visitor for 30 minutes,
bounded to 12 MB. The original upload is not stored. Uncertain provider
failures impose a five-minute cooldown; there are no automatic paid retries.
Provider errors are sanitized.

## Cost and validation

Live requests with the configured key returned usable JPEGs and token usage.
On the tested 1536×1024 sample, calculated cost was about **$0.019 low** and
**$0.055 medium**, including photo and prompt input. These are usage-rate
estimates, not invoice amounts or a flat price promise. Input size and
current rates can change cost. The calculation uses $8/M image-input,
$5/M text-input and $30/M image-output tokens. Official references:
[image guide](https://developers.openai.com/api/docs/guides/image-generation),
[pricing](https://developers.openai.com/api/docs/pricing).

Six initial live requests (two quality checks and four final prompt-v2
samples) totaled approximately $0.295 in calculated token cost. Responses
and images are retained in ignored `output/roofers-5/ai-review/`. The first
prompt changed a flat entry canopy; v2 was tightened and the final samples
were inspected for that failure.

`node --test scripts/test-roof-render.mjs` passes all 15 mocked checks for
input validation, access, limits, provider errors, pricing, cache reuse and
in-flight deduplication. Mocked checks do not prove provider availability;
the separate live edits do. The final full TypeScript/Vite build, scoped
ESLint and whitespace checks pass. The build retains the repository's
existing warning about a large React Three Fiber chunk.

A seventh live request tested the actual browser upload, consent and medium
Zinc generation. Selecting Bronze during generation did not mislabel the
Zinc result; returning to Zinc used the saved preview without another call.
The original/compare slider and correct finish metadata were verified.
The rendered JPEG and screenshot are retained as `uploaded-zinc-browser.jpg`
and `uploaded-zinc-browser-proof.jpg` in the ignored review directory.

Combined browser QA covers 320- and 390-pixel mobile layouts, sticky-photo
controls, mobile navigation, portal approval, keyboard tabs, document
disclosures and photo-dialog focus return. The mobile pinned-photo inset
was reduced to 12px after finding it could cover a material button.
Chrome's sample JPEG download was verified on disk at
`~/Downloads/velar-slate-blue-gray-concept.jpg` (478,703 bytes). An in-app
browser download-event wait timed out, so it is not used as evidence of
download completion.

Portal authentication, real project data, consultation delivery and public
AI activation remain separate integrations. No new deployment is asserted.

Commit message: `feat: rebuild Velar with exclusive media and OpenAI roof previews`
