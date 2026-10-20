# Cabinetry demo 01: Tambour Cabinetry, Kitchens & Baths

Local entry: `/demos/cabinetry/` or `/tambour` on the running Vite development
server. Production path: `https://contractors.wallaceshift.com/tambour`. Gated
like the other demos (`cabinetry` in `DEMO_PATHS`); only `preview.jpg` is
public, for the contractors lander. Tambour is a fictional cabinetmaker; the
document is `noindex, nofollow`. These notes do not assert a deployment.

Built for a prospective client: a custom cabinet contractor that specializes
in kitchen and bath remodels.

## Idea

The hero builds a kitchen as the visitor scrolls, after a reference reel
Matthew supplied (`example-contractor-website.mov`, root, untracked): a
blueprint held over bare studs flattens into the frame and becomes a glowing
wireframe of the finished room, then rough-in, drywall, cabinetry and the
finished kitchen wipe in from the same camera, with chapter titles and a gold
progress line. The rest of the site carries the real-photography story:
lookbooks, the workshop, a material library and planning prices.

An earlier "Finish Studio" (repainting one photograph with hand-traced masks)
was removed on 2026-10-19 at Matthew's request: the masks leaked and he judged
the tool pointless. Its page, home sections, recolored hardware swatches,
palette brief and scripts are gone.

## Pages

All one document (`routes.ts`), on `/tambour` or `/demos/cabinetry`:

- `/` home: the build hero (`components/BuildHero.tsx`), brand statement,
  kitchens/baths/built-ins chapters, the tambour door, workshop strip, material
  library with a sample box, process, planning prices, FAQ, consultation CTA.
- `/kitchens`, `/baths`, `/built-ins`: one template (`pages/RoomPage.tsx`,
  copy in `content.ts`). Kitchens adds an eight-point anatomy on a real photo
  and the appliance-garage tambour.
- `/workshop`, `/investment` (planner), `/consultation` (four-step request,
  samples and planning range attached, unsent preview), `/photography`.

`brief.ts` carries the samples and planning range between pages in
sessionStorage. Nothing is sent anywhere.

## Build hero

- Section 560vh tall (470vh stacked), stage `position: sticky` under the
  header. One GSAP timeline, scrubbed by ScrollTrigger (`scrub: 0.8`), laid out
  on 0–1; `buildChapters` in `content.ts` gives each chapter's start.
- Layers in one 3:2 box sized like `object-fit: cover` with container
  queries: framing, then roughin, drywall, cabinetry, finished, each revealed
  by a feathered diagonal mask (`--w`); the wireframe (`mix-blend-mode:
  screen`) draws upward with a scan line (`--d`); the blueprint is a 3D card
  that tweens from held to full frame and fades. The mask variables are
  tweened as plain numbers and written in `onUpdate`, because GSAP did not
  keep them through StrictMode revert and refresh.
- Stacked layout (phones, portrait tablets up to 1100px): film on top, words
  below. `STACKED` in BuildHero.tsx and the media query in `tambour.css` must
  match.
- Reduced motion: no pinning or timeline; the finished kitchen with the intro,
  and a row of the five stages beneath.
- Development only: `window.tambourBuild` is the timeline, so frames can be
  checked with `tambourBuild.scrollTrigger.disable(false); tambourBuild.progress(p)`
  (the hidden browser pane throttles the scrub).

## Generated imagery

The hero's seven images are generated, not photographs, and say so (a line
under the progress bar, the footer and `/photography`).

- `scripts/cabinetry/generate_hero.py` calls `gpt-image-2` (1536x1024, high)
  with the key in `.env.local`. `finished` is generated; `cabinetry`,
  `drywall`, `roughin` and `framing` are each an edit of the stage after it;
  `blueprint` and `wireframe` are edits of `finished`. Prompts, token usage
  and cost for every call are in `output/cabinetry/hero/ledger.json`.
- Approved budget $5 (Matthew, 2026-10-19). Spent: **$1.23**, seven calls, no
  retries.
- Alignment was measured with SIFT and affine fits: neighbouring stages agree
  within about 1.5 px, so no warping is applied.
- `scripts/cabinetry/hero_assets.py` writes `public/demos/cabinetry/hero/*.webp`
  (about 1.2 MB in all) and the lander `preview.jpg`.

## Photography and licensing

Apart from the hero, every photograph is a real photograph from Pexels, used
under the Pexels license (commercial use and modification allowed, attribution
not required; credited anyway on `/photography` and in `photos.ts`). They stand
in for a cabinetmaker's own project photography. Wood swatches are Poly Haven
CC0 veneer scans with a simulated finish; stone swatches are crops of the
photographs. Unsplash and the Pexels website itself sit behind bot challenges,
which were not worked around: photo IDs came from web search, images from the
open Pexels image CDN, photographer names from each photo page.

## Rebuilding the assets

Sources and working files live in ignored `output/cabinetry/` (`orig/`, `dl/`,
`ph/`, `hero/`). Python 3 with NumPy and OpenCV (the ignored
`output/roofers-2/repair-python` works), plus `cwebp`:

```
export PYTHONPATH=output/roofers-2/repair-python
python3 scripts/cabinetry/hero_assets.py
python3 scripts/cabinetry/photos.py
python3 scripts/cabinetry/swatches.py
python3 scripts/cabinetry/extras.py
```

`generate_hero.py <step>` regenerates a hero image (paid; it keeps the old
version as `<step>.vN.png`). Set `CABINETRY_PUBLIC` to write a rebuild elsewhere.

## Content rules

Prices are illustrative planning ranges, labelled wherever they appear and set
against public 2025 data (Angi and HomeAdvisor custom-cabinet ranges;
Remodeling's 2025 Cost vs. Value via NerdWallet). The phone is a 555-01xx
number and the email an `.example` address. No reviews, awards, licences,
warranty terms, project names or statistics are claimed. The build sequence is
an illustration of the process, not a documented project.

## Before adapting for a real cabinetmaker

Replace the photography with their projects (ideally including a real
before/during/after series for the hero, or regenerate it from their own
finished kitchen), brand, contact, service area, specs, process times and
prices, and connect the consultation request (the state in
`pages/ConsultationPage.tsx` is the integration boundary).

## Verification

`npm run lint` (no new warnings), `tsc -b`, both Vite builds and
`scripts/verify-demo-build.mjs` pass; `test-demo-access.mjs` (33),
`test-demo-preview.mjs` and `test-demo-admin.mjs` (22) pass. Browser checks:
every hero chapter at 1440x900 and 390x844 by timeline position, a mid-wipe
frame, the kitchens anatomy and consultation brief, and no horizontal overflow
on any page at 390 or 360. Not checked in a browser: the reduced-motion
layout (CSS and JS paths reviewed only) and the scrub's feel at full frame rate
(the browser pane was hidden, which throttles animation frames).
