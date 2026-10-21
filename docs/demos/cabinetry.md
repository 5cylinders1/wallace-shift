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

- `/` home: the kitchen build film (`components/BuildFilm.tsx`), brand
  statement, kitchens/baths/built-ins chapters (the bath and built-ins frames
  build in place as they scroll, `components/FrameBuild.tsx`), the tambour
  door, workshop strip, material library with a sample box, process, planning
  prices, FAQ, consultation CTA.
- `/kitchens`, `/baths`, `/built-ins`: one template (`pages/RoomPage.tsx`,
  copy in `content.ts`). Baths and built-ins open with their own build film
  (a primary bath; a library wall). Kitchens keeps a photo hero and adds an
  eight-point anatomy on a real photo and the appliance-garage tambour.
- `/workshop`, `/investment` (planner), `/consultation` (four-step request,
  samples and planning range attached, unsent preview), `/photography`.

Motion across the site follows `docs/demos/cabinetry-motion.md` (reel study,
easing curves from cabinet hardware, motion map, measurements).

`brief.ts` carries the samples and planning range between pages in
sessionStorage. Nothing is sent anywhere.

## Build films

- Three rooms, configured in `builds.ts` (stages, wipe positions, chapters and
  their stills): kitchen on the home page (560vh, 470vh stacked), bath and
  library on their room pages (460vh, 400vh stacked). One pinned film per page.
- The stage is `position: sticky` under the header. One GSAP timeline, scrubbed
  by ScrollTrigger (`scrub: 0.8`), laid out on 0–1 against the config.
- Layers sit in one 3:2 box sized like `object-fit: cover` with container
  queries. Each later stage is revealed by a feathered diagonal mask (`--w`);
  the wireframe (`mix-blend-mode: screen`) draws upward with a scan line (`--d`,
  moved with a transform); the blueprint is a 3D card that tweens from held to
  full frame and fades. Bath and library end on an evening "lights on" frame,
  as the reel's rooms do. Mask variables are tweened as plain numbers and
  written in `onUpdate`, so a revert or refresh never leaves a stage unmasked.
- Chapter titles are split into lines once and rise each time a chapter
  becomes active.
- Stacked layout (phones, portrait tablets up to 1100px): film on top, words
  below. `STACKED` in BuildFilm.tsx and the media query in `tambour.css` must
  match.
- Reduced motion: no timeline; the finished room with the intro, then every
  chapter as a still with its text, and the generated-imagery note.
- Development only: `window.tambourBuilds.<id>` is each timeline, so frames can
  be checked with `.scrollTrigger.disable(false); .progress(p)`.

## Generated imagery

The three build films are generated, not photographs, and say so (a line
under each film's progress bar, the home room frames, the footer and
`/photography`).

- `scripts/cabinetry/generate_hero.py` calls `gpt-image-2` (1536x1024, high)
  with the key in `.env.local`. For each room, `finished` is generated and each
  earlier stage is an edit of the stage after it (kitchen: cabinetry, drywall,
  roughin, framing; bath: vanity, drywall, roughin, framing; library:
  cabinetry, boxes, drywall, framing). `blueprint`, `wireframe` and `evening`
  are edits of `finished`. Prompts, token usage and cost for every call are in
  `output/cabinetry/hero/ledger.json`.
- Approved budget $5 (Matthew, 2026-10-19). Spent: **$4.59** over 26 calls:
  kitchen 7 ($1.23), bath 8 ($1.41), library 11 ($1.94). The library's
  framing, drywall and casework stages were generated twice: the first chain
  drifted to a taller room with a smaller window, which would have reshaped
  the wall mid-wipe. The prompts now pin the window, niche and wall
  (`KEEP_WINDOW`); the first versions are kept as `*.v1.png`.
- `scripts/cabinetry/align_check.py` matches each stage to `finished` (or
  `--to` a neighbour) on SIFT features inside the window area that every stage
  shares, and with `--fix` warps a stage more than 2 px out onto that frame
  (`<stage>.aligned.png`). Kitchen: within 1.5 px, no warps. Bath: roughin,
  drywall and framing warped (framing from its window box, since SIFT found
  too little in common with bare studs). Library: boxes and drywall warped to
  `cabinetry`, framing to the aligned drywall; afterwards the window frame
  measures 222 px wide, centred within 1 px, in every stage.
- `scripts/cabinetry/hero_assets.py` writes `public/demos/cabinetry/hero/*.webp`
  (kitchen) and `hero/bath/`, `hero/library/` (about 1.2, 0.9 and 1.2 MB), using
  the aligned version where there is one, and the lander `preview.jpg`.

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

Last run 2026-10-21, after the library stages were regenerated.

- `npm run build` (`tsc -b`, both Vite builds, `verify-demo-build.mjs`: 19
  documents) and `npm run lint` (no errors; the 4 warnings are in other
  projects' files) pass; `test-demo-access.mjs` (33/33) and
  `test-demo-preview.mjs` pass.
- `scripts/cabinetry/motion-check.mjs` (headless Chrome over the DevTools
  protocol; run with `node --experimental-websocket` on Node 20) scrolls six
  pages at desktop 1x, desktop 4x CPU and phone 4x: no frame over 50 ms and no
  long animation frame during any scroll; CLS 0 everywhere except
  `/tambour/baths` at 0.0023; INP 32 ms desktop, phone 32 ms in isolation with
  one 192 ms outlier in a full run (three repeats of the same sequence stayed
  under 40 ms). Long frames remain at load: about 120 to 200 ms at 4x, the
  first React render. Reduced motion emulated: the same text on every page,
  and the build films' step buttons are replaced by the static chapter list.
  Page transitions run and focus moves to the new page's heading on desktop
  and phone (through the menu).
- Screenshots by timeline position: every chapter and mid-wipe frame of the
  three films at 1440x900 and 390x844, and the home room frames mid-wipe.
- `NAV=1` / `NAV=full` time the phone menu navigation alone; `SHOTS=` takes
  positioned screenshots (see the script header).

Not checked: real phones and tablets (only emulation), Safari and Firefox
(Chrome only; where View Transitions are missing, pages swap instantly), and
how the motion reads to someone seeing the site cold.
