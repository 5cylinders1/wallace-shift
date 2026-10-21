# Cabinetry demo 02 (working title)

A fictional cabinetmaker (Matthew, 2026-10-20), built after a reference reel.
Phase 1 below is the measured reading of the reel. Phase 2 (the look
development gate) is the kitchen design and the Blender scene; it ends with
two style frames for approval. No site code exists yet.

## The reference

`ScreenRecording_10-20-2026 09-02-52_1.mov` (repo root, untracked) is an
iPhone screen recording of an Instagram post (slide 1 of 5). In it, a phone
camera films an M1 MacBook Air running a fictional kitchen maker's site,
"Hartleigh & Vane, Bespoke Kitchens", on localhost in Safari. The recording is
8.3 s, 1320x2868 HEVC at ~59 fps. The reel inside it is 30 fps (every second
recorded frame repeats), lasts 8.0 s and loops at frame 480. It is not the
reel behind Tambour (`example-contractor-website.mov`).

## Method

Scripts in `scripts/cabinetry-2/`; working files in the ignored
`output/cabinetry-2/ref/`.

1. **Frames.** Every native frame, cropped to the laptop (recording y 1000-1920).
2. **Rectification** (`rectify_reference.py`). The camera is locked (corners
   identical at frames 10, 250 and 470), so one homography covers the clip.
   Screen edges were taken from bezel transitions in a per-pixel max over the
   hero frames and fitted as lines. The screen is rectified to 1440x900, the
   M1 Air's default size in points, so rectified pixels are close to CSS
   pixels. Check: the address pill and the hero headline centre at x 716-720.
   Safari's chrome ends at y 88, so the page viewport is 1440x812.
3. **Scroll position** (`reference_scroll.py`). The macOS overlay scrollbar is
   visible from the first scroll. The thumb is 72 px on an ~808 px track, so the
   document is 11.2 viewports tall and scroll (vh) = (thumb top - 92) / 736 x 10.2.
   Outliers are rejected (the island crossing the right edge fooled it once),
   then the series is made monotone and given a 5-frame mean.
4. **Playhead.** The animation lags the scroll: things keep moving after the
   thumb stops. Raw scroll was passed through ScrollTrigger-style smoothing
   (each scroll change restarts an expo-out catch-up). A **0.8 s** catch-up
   makes the island's position the smoothest function of the playhead
   (polynomial fit RMS 6.4 px, against 20.9 px with no smoothing; 0.6 s gives
   7.1 and 1.0 s gives 8.0). Timeline positions below are in playhead terms;
   raw scroll is in brackets.
5. **Elements** (`measure_reference.py` writes `curves.json`):
   - Base units, upper cabinet and backsplash: edges of change against
     reference plates, corrected for the relight.
   - Island: its left waterfall edge.
   - Pendants: blobs of change against the bare wall.
   - Captions: white-stroke energy inside each glyph mask.
   - Relight: luminance and red/blue ratio of wall, window, floor and
     hood-light patches.
   - Release: the final caption tracked as a template.
6. **Review sheets** (`reading_sheets.py`): `reading-contact-sheet.jpg` and
   `reading-timing.svg`.

**Accuracy.** Scroll is quantised at about 0.014 vh. Element windows are good to
about ±0.03-0.05 vh. Units under the hero copy (U1-U3) could only be read
from frame 103, so their starts are upper bounds. Fade-in ends for captions 1
and 3 come from the frames, because objects moving behind the text skew the
stroke energy.

Rebuild (needs NumPy and OpenCV; the ignored `output/roofers-2/repair-python`
works):

```
export PYTHONPATH=output/roofers-2/repair-python
ffmpeg -i "ScreenRecording_10-20-2026 09-02-52_1.mov" -vf "crop=1320:920:0:1000" -fps_mode passthrough output/cabinetry-2/ref/raw/f_%04d.png
ffprobe -v error -select_streams v -show_entries frame=pts_time -of csv=p=0 "ScreenRecording_10-20-2026 09-02-52_1.mov" | tr -d , > output/cabinetry-2/ref/pts.txt
python3 scripts/cabinetry-2/rectify_reference.py
python3 scripts/cabinetry-2/reference_scroll.py
python3 scripts/cabinetry-2/measure_reference.py
python3 scripts/cabinetry-2/reading_sheets.py
```

## What the reference is

- **A 3D scene from a locked camera, scrubbed by scroll.** Flat layers can't
  explain three things:
  - **The island's end face changes in perspective.** As its left edge moves
    from x 1303 to 1078, the visible end face shrinks from 111 to 73 px. Its
    ratio to the distance from the centre vanishing point holds at 0.19-0.20.
  - **The units' top surfaces change with height.** Rising units show a deep
    top surface while low.
  - **The upper cabinet changes shape.** It grows taller with complete door
    frames.
- **Not generated video.** Static areas are pixel-stable: window mullions, the
  garden outside, the hood edges and the crown all have median optical flow
  under 0.1 px across the clip. A generated video drifts and the foliage
  would move.
- **Frame sequence or real-time render: can't tell from the clip.** A few
  exact repeats of a moving frame hint at a fixed frame sequence.
- **Motion feel.** Along the playhead, elements move linearly or close to it
  (island, units, backsplash and pendant drop all fit `none` or
  `power1.out` best). The softness comes from the ~0.8 s scrub catch-up, not
  from per-element easing.
- **Pin.** The stage stays pinned for 4.66 vh of scroll, which needs a section
  about 566vh tall. Then it releases and scrolls 1:1 with the page, with no
  parallax.

## Timing sheet

Playhead in viewport heights (vh) of scroll. "Rise" means the object moves up
while hidden below a fixed line, so it appears to come up out of the floor or
counter.

| # | Element | Start | End | Motion | Notes |
|---|---|---|---|---|---|
| 0 | Hero holds | 0 | 0.20 | none | Empty room, centred copy |
| 1 | Hero copy out | 0.20 (0.41) | 0.39 (0.55) | opacity 1→0 with blur, in place | No slide, no camera move |
| 2 | Caption 1 in: "Scribed to the wall", 01 — Cabinetry | 0.31 | 0.41 | blur-fade in place | Overlaps the hero fade |
| 3 | Base U7 (right of centre) | ≈0.41 | 0.83 | rises ~150 px (full height) through the floor | Linear; first to move |
| 3 | Base U1, U2, U3 (left end, sink base) | ≤0.45 | 0.83 / 0.78 / 1.19 | same | U3 creeps its last 15 px late |
| 3 | Base U6 | 0.49 | 0.83 | same | |
| 3 | Base U8 (right end) | 0.56 | 0.90 | same | Linear |
| 3 | Base U5, U4 (under the hood) | 0.67 / 0.69 | 1.19 / 1.23 | same | Centre last: an outside-in stagger |
| 4 | Upper cabinet rises | 1.32 | 1.67 | first seen 62 px below its spot; rises into place | power1.out |
| 4 | Upper cabinet reveals and extends | 1.40 | 2.29 | top edge wipes up from the bottom edge to a full cabinet (~1.9), then the cabinet grows ~40 px (18%) taller to the ceiling line | Bottom stays put |
| 5 | Caption 1 out / caption 2 in: "One slab, folded", 02 — The stone | 1.41 / 1.44 | 1.53 / 1.53 | blur crossfade | |
| 6 | Island | 1.61 (1.81) | 3.31 (3.37) | enters at the right edge and slides 1120 px left (left edge x 1440 → 320) | Linear on playhead; true perspective |
| 7 | Relight: window, hood light | 1.32 | 3.31 / 3.39 | dim 4% / 9% | Slow, early |
| 7 | Relight: back wall | 1.97 | 3.31 | dims 9%, cools (red/blue −20%) | Dusk |
| 7 | Relight: left wall | 1.77 | 4.11 | brightens 30% | Warm spill; still finishing during the hold |
| 8 | Caption 2 out / caption 3 in: "Warmed by degrees", 03 — Brass & light | 2.33 / 2.41 | 2.54 / 2.58 | blur crossfade | |
| 9 | Pendants (three globes) | 2.44 | 3.38 | drop ~130 px from under the header; travel left with the island (0.86x the island front's travel, which is depth parallax) | Linear; settle at x 583 / 734 / 890, 155 px apart, centred over the island |
| 9 | Pendant glow | ~3.0 | ~3.6 | filaments brighten, starbursts appear | Lands with the island |
| 10 | Backsplash | 2.58 | 3.38 | marble wipes up from the counter line, y 524 → 422 | Linear |
| 11 | Caption 3 out / caption 4 in: "Supper at eight", 04 — The finished room, plus CTA | 3.54 / 3.70 | 3.70 / 3.91 | blur crossfade; caption moves to the right side | The island now frees the right |
| 12 | Hold | 3.91 | 4.66 | nothing but the last of the left-wall brightening | ~0.75 vh of quiet scroll |
| 13 | Release | 4.66 | n/a | stage scrolls 1:1 into a dark section | Next: bordered statement card, product photo, paragraph, stat row |

Patterns worth keeping:

- **Each chapter's caption changes as its objects start.** Caption 2 arrives
  with the upper cabinet and the island; caption 3 with the pendants and the
  backsplash; caption 4 as everything lands.
- **Objects arrive in installation order:** carcasses, then wall units, island,
  stone, then lighting.
- **The relight is long and staggered across surfaces.** It reads as time
  passing, not a switch.

## Layout and type

Rectified pixels, approximately CSS pixels at 1440 wide; viewport 1440x812.

- **Header.** Transparent over the dark top of the render, about 70 px tall.
  - Wordmark: a serif about 22 px tall ("Hartleigh & Vane") over 9 px spaced
    caps ("BESPOKE KITCHENS"), from x 161.
  - Nav: spaced caps about 11 px (CRAFT, PROCESS, WORK) at x 873-1106,
    with gaps of about 34 px.
  - CTA: an outlined rectangle "GET A QUOTE", 139x35 at x 1142-1281.
  - Side margins are about 160 px, so the content is about 1120 px wide and
    centred.
- **Hero copy** (centred on x ≈ 716-720).
  - Eyebrow: gold spaced caps, cap height 10-11 px, at y 310.
  - Headline: a serif about 120 px (ascender ≈ 92 px, line pitch 108 px, so
    line-height ≈ 0.9), two balanced lines 600 px wide, y 349-551.
  - Support copy: three lines of about 18 px on a 30 px pitch, about 390 px
    wide, y 596-667.
  - "SCROLL" cue: spaced caps about 10 px at y 816.
- **Captions 1-3** (left edge x = 130, in the lower third).
  - Eyebrow: "0N — LABEL" in gold spaced caps, cap height 9 px, 29 px above
    the title.
  - Title: a serif of about 88-90 px (ascender ≈ 68 px) on one line, up to
    830 px wide.
  - Body: two or three lines of 17-18 px on a 30 px pitch, about 330 px wide,
    ending about 94 px above the viewport bottom.
- **Caption 4** (right-aligned at x ≈ 1305, mirroring the 130 px left margin).
  - Eyebrow: right-aligned above a title the same size as captions 1-3.
  - CTA: a sharp-cornered green block about 237x45 at x 1068-1305, y 770-815,
    with white spaced caps "START YOUR KITCHEN →".
- **Room** (camera square to the back wall).
  - Walls: a window wall at left (x 0-135), the back wall at x 150-1330 and a
    pillar at right.
  - Hood: centred at x 648-815, from the ceiling (y 150) to y 390, with an
    under-light.
  - Base run: top y 522, plinth and floor line y 672.
  - Upper cabinet: x 1065-1320, y 223-427.
  - Island: x 320-1150 (centre 735), top y 540, front down to about y 790.
  - Backsplash: y 422-524.
  - Pendant globes: bottoms at y ~290, centred over the island.
- **Phones.** The reel shows desktop only. The phone composition is ours to
  design.
- **Colour.** The phone camera adds a strong magenta cast, so the reel's
  absolute colours are not the site's. Relative changes (the relight) are
  reliable.

## Content to avoid copying

The reference claims "Est. 1987", "fitted in five days", "landed by four
men" and a stat row (38, 900+, 5-day). Wallace Shift demos invent none of
these. The two brand names visible in the reel (Hartleigh & Vane, Blackthorn
Garden Rooms) are someone else's fiction and stay out.

## Phase 2: design and look development

Decisions (Matthew, 2026-10-20): a fictional maker; a Blender-rendered frame
sequence rather than flat layers; $5 cap for any paid generation (none spent).

### Camera solved from the reference

Known heights fix the reference camera: counter tops at two depths (36" at
y 522 and y 540) and the floor line at two depths (y 672 and y 790). A
pinhole model fits all four within 2 px:

- **Camera:** level, 42" off the floor, about 292" from the back wall.
- **Field of view:** about 61 degrees horizontally across the 1440 px
  viewport (a 30.5 mm lens on a 36 mm sensor). The horizon sits at the
  viewport's vertical centre.
- **Room it implies:** a run of about 283", an island of about 120" whose front
  is 117" from the back wall, a ceiling near 125", wall cabinets from 58" and a
  hood bottom near 67".

The demo's camera and room use those numbers, so the frame composes like the
reference.

### Kitchen

`scripts/cabinetry-2/kitchen_spec.py` is the single source of truth for
dimensions, read by both the Blender build and the drawing
(`output/cabinetry-2/plan-elevation.svg`, from `draw_plan.py`). The
configuration matches the reference; every finish differs from it:

| | Reference | Ours |
|---|---|---|
| Base and wall cabinets | painted green shaker | rift white oak, flat inset doors in a face frame |
| Hardware | long brass bar pulls | blackened-bronze knobs (drawers) and short bar pulls (doors) |
| Stone | white Calacatta-type marble | gold-veined quartzite, honed, book-matched on the hood centre line |
| Island | dark shaker doors, white waterfall | fluted front in warm ink, quartzite waterfall ends |
| Pendants | clear globes, exposed filament | opal glass globes, aged brass |
| Hood | plaster | tapered limewash plaster with a lit shadow band |
| Floor | straight oak planks | smoked oak herringbone |
| Wall cabinets | one green unit | two oak boxes with glass-front stackers to 106" |

**Run (left to right, 282").** A 3" scribe filler, then:

- 30" three-drawer base;
- 36" sink base;
- 24" integrated dishwasher;
- 30" two-drawer base;
- 36" cooktop base, under the hood;
- 30" two-drawer base;
- 30" three-drawer base;
- two 30" door bases.

It ends with a 3" scribe filler at the pillar.

**Heights.** 4 1/2" toe kick, 36" counters, 25 1/2" deep. Backsplash to 58".
Wall cabinets 58-94", stackers to 106". Hood bottom 66". Pendant globes from
72". Ceiling 125".

**NKBA checks.** Every figure is computed from the spec, and all pass:

| Check | Ours | Guideline |
|---|---|---|
| Aisle, run to island | 48" | ≥ 42" one cook, ≥ 48" two |
| Cooktop landing | 57" and 123" | ≥ 12" and 15" |
| Sink landing | 36" and 57" | ≥ 24" and 18" |
| Dishwasher | next to the sink base | within 36" |
| Hood | 30" above the cooktop, 42" wide over 36" | 24-36" up, at least cooktop width |
| Wall cabinets | 22" above the counter | ≥ 15-18" |
| Pendants | 36" above the island | 30-36" |
| Work triangle | sink, cooktop and island refrigerator drawers, 20.3 ft in total | each leg 4-9 ft, total ≤ 26 ft |

Full-height fridge and freezer columns stand on the pantry wall right of the
pillar, outside the frame.

### Blender scene

- `fetch_assets.py` downloads the CC0 materials into ignored
  `output/cabinetry-2/assets/`, with sources in `credits.json`:
  - Poly Haven `oak_veneer_05`, `herringbone_parquet`, `beige_wall_001` and the
    `borghese_gardens` HDRI;
  - ambientCG `Marble014`.

  The ambientCG zip also contains a `.blend`, which is never opened.
- `blender_build.py`, run inside Blender, rebuilds the scene from the spec and
  saves `output/cabinetry-2/blender/kitchen.blend`:
  - **Animation pivots.** Every cabinet module, the wall cabinets, stackers,
    island, pendants and backsplash sit under their own empty.
  - **Texturing.** Materials are box-projected at real scale with a random
    grain offset per object. Vertical grain uses a pre-rotated copy of the
    oak, and bump comes from colour, since the boxes have no UVs.
  - **Light.** A low late-afternoon sun comes through the steel window, with
    an off-camera fill panel standing in for the rest of an open-plan room.
  - **Dusk.** `set_state(kitchen, dusk)` cools and dims the daylight and
    turns on the pendants, the under-cabinet light and the stacker light, at
    one fixed exposure.
  - **Compositor.** Light bloom and a soft vignette.
- `blender_render.py` renders a still in a separate background Blender, so long
  renders never block the interactive one:

```
cd output/cabinetry-2
/Applications/Blender.app/Contents/MacOS/Blender -b blender/kitchen.blend \
  -P ../../scripts/cabinetry-2/blender_render.py -- --kitchen 1 --dusk 1 --out renders/style_kitchen_dusk.png
```

Style frames: `output/cabinetry-2/renders/style_empty_day.png` and
`style_kitchen_dusk.png`, compared with the reference in
`style-vs-reference.jpg` (`compare_style_frames.py`).

## Phase 3: animation, sequence and site

### Brand and route

The brand is **Mitre & Rift Cabinetmakers**, a fictional maker. A web search
on 2026-10-20 found no cabinetry business by that name. The demo has:

- **Access key and alias:** `cabinetry-2`, served at `/mitre`
  (`contractors.wallaceshift.com/mitre`).
- **Local entry:** `/demos/cabinetry-2/`.
- **Files:** code in `src/demos/cabinetry-2/`, web assets in
  `public/demos/cabinetry-2/`.

It is registered the same way as Stillwater:

- `DEMO_PATHS` and the public preview in `api/_lib/demo-access.ts`;
- the dev route and demos build input in `vite.config.ts`;
- the rewrite in `vercel.json`;
- the three label maps in `src/demo-access/`;
- the alias lists in `scripts/test-demo-access.mjs` and
  `scripts/test-demo-preview.mjs`;
- the invite help text;
- a card in `src/demos/contractors/catalog.ts` (new, not featured).

### Animation

`blender_animate.py` keys one 128-frame timeline from the timing sheet. The
site maps the scroll playhead to it: playhead 0.40 vh shows frame 0, and
playhead 3.75 vh shows frame 127.

| Element | Playhead (vh) | Motion |
|---|---|---|
| Base units | 0.42-1.22 | rise 38" through the floor, outside-in; the cooktop base under the hood is last |
| Run counter | 1.20-1.50 | laid left to right |
| Wall cabinets | 1.32-1.92 | rise 15" while revealing upward from the bottom edge |
| Glass stackers | 1.92-2.29 | reveal up to the crown |
| Island | 1.52-3.31 | slides in from the right, 210"; it first enters the frame near 1.61, as in the reference |
| Pendants | 2.44-3.38 | ride on the island and drop 35" from above the frame; their cords pay out from the ceiling |
| Backsplash | 2.58-3.38 | rises out of the counter line, hidden behind the cabinets until it emerges |
| Relight | 1.40-3.70, staggered | sun 1.40-3.30, sky 1.97-3.31, fill 1.80-3.40, pendants 3.00-3.60, cabinet lights 3.20-3.70 |

The reveals use Boolean INTERSECT modifiers against hidden cutter boxes
(`setup_cutters`), so unrevealed geometry casts no shadows or reflections. A
shader-transparency clip was tried first and left ghost panels on the wall.
The faucet is a curve, so it appears as the counter wipe passes it.

### Frames

`blender_render.py --anim` renders `kitchen_render.blend`, a frozen copy of the
scene, so editing never disturbs a running render. Renders are resumable.

- **Desktop camera:** 1920x1080.
- **Phone camera:** a portrait 1080x1920 from the same eye, about 43 degrees
  horizontally. It keeps the whole island, with verticals straight.
- **Render cost:** 224 samples, about 35-40 s per frame on the M2 Max.

The stacker glass doors were rebuilt with rails between the stiles: overlapping
pieces had rendered as black squares at each pane corner, so frames 57-127 of
both sequences were re-rendered.

Final weights: desktop sequence 3.3 MB and phone 4.0 MB (18-30 KB a frame).
Each visitor loads one of them, plus about 0.3 MB of stills.

`export_web.py` writes:

- `public/demos/cabinetry-2/seq/{desktop,phone}/f_NNN.webp` (q74);
- `preview.jpg`;
- the close-up stills (`blender_details.py`);
- material swatches cut from the same CC0 scans.

### The page

`SceneHero.tsx` puts a sticky stage inside a 566vh section, so the stage is
pinned for 4.66 vh of scroll, as measured.

- **Timeline.** One GSAP timeline is scrubbed at 0.8 and runs in playhead
  units. Caption crossfades (opacity plus blur) use the measured positions in
  `content.ts`.
- **Frame player.** `sequence.ts` loads frames coarse to fine and blends
  neighbouring frames, so slow scrubbing never steps. Frame 0 is the
  first-paint poster image.
- **Screen sizes.** Portrait screens (aspect at most 4:5) use the phone
  sequence, with the copy in the ceiling and floor bands.
- **Reduced motion.** No pin: the finished room, then the chapters as a list.
- **Text colour, from measured frame luminance.**
  - The hero copy is ink: it sits over the bright day wall (about 0.39
    luminance), where ink gives about 7.7:1.
  - Header and captions are bone-white over dark scrims.
  - Captions sit lower than the reference's, because these base cabinets are
    light oak, not dark green.
- **Development only:** `?playhead=2.5` opens the hero at that position. The
  timeline is `window.mitreHero`.

After the film come a statement, what we make (close-up renders), process,
materials (swatches), a planning call and the footer. The copy claims no
years, counts, reviews or awards. The phone and email are placeholders, and
the film is disclosed as a rendering.

### Verification (2026-10-21)

- `npm run build` passes, and the demo boundary check counts 19 private
  documents.
- `scripts/test-demo-preview.mjs` passes (520 responses), and so does
  `scripts/test-demo-access.mjs` (33 of 33).
- `tsc -b` is clean and ESLint shows no errors (four warnings in older
  files).
- Checked in the browser at 1440x812/900 and 375x812:
  - the hero at playheads 0, 0.9, 2.0, 3.0 and 4.2;
  - the sections, menu and Escape key.

### Local preview

The demo is gated. `.claude/launch.json` → `mitre-demo-preview` (port 5181)
sources `.demo-preview.local`. Sign an admin-session cookie for
`http://localhost:5181` as in the gated-preview note, then open `/mitre`.
