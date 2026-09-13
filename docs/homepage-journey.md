# Homepage logo sequence

The production homepage uses pearl, graphite, ice blue and deep petrol. The
existing black-to-pearl statement wipe now uses petrol for “unforgettable.”
Shared palette values and measured solid-color contrast are documented in
`brand-palette.md`.

## Sequence

- The original opening copy and enquiry card remain over the glass water
  hero. Touch-first/mobile visitors retain the existing MP4 hero.
- The actual two-part `ws_logo.glb` enters from beyond the right edge alongside
  the services heading. Its upper edge pins directly beneath navigation first;
  the next 360–720px of scroll brings the model into place, with no timed entrance
  or fade. Stopping or reversing scroll stops or reverses the same pose.
  The services mark is 160–240px wide and rests 75px beyond the measured
  headline's right edge. Its bottom follows the last line's measured baseline,
  using the actual GLB height to position the model. The services pose faces
  straight forward with a pale silver finish, subdued bevels, and a faint
  broad reflection. The heading band is borderless graphite with pearl type
  and ice-blue supporting text. The heading's sticky containing block ends at
  the last service row. When that row's bottom reaches the heading's bottom,
  the heading releases; the detail/pricing links sit outside the pin. The logo
  locks at its original vertical center and moves right under scroll control.
  As the departing dark header crosses it, the same boundary reveals white
  faces and black GLB contour lines. The logo stays in one visual container.
- Service bars retain the original diagonal video reveals, oversized TRUST,
  FLOW and TIME words, and their individual line animations. The homepage
  uses separately graded ice-blue/graphite versions of the original films;
  other callers keep the original assets. Scroll selection follows the visible
  area below the pinned heading, with hover and keyboard focus overrides.
  Inactive/offscreen videos pause. Mobile reserves space for all three panels
  to prevent layout jumps; reduced motion shows the matching still posters.
- The process precedes the quiz and uses four stacked, pinned panels:
  white drafting paper for “A clear shift, from first idea to launch,” ice blue
  for “Find the friction,” deep petrol for “Make the shift,” and violet ink
  for “Launch with momentum.” Each new panel slides upward over the previous
  one. Physical-canvas Y masks use the same boundaries, changing the GLB from
  blueprint to satin graphite, polished silver, and softly iridescent pearl.
- During Make, the authored halves separate slightly, grow by 12%, and rotate
  independently in opposite upright directions with staggered timing, inside a
  field of slipped drafting rules and off-register colour plates that resolve
  onto the mark as the turns finish. Launch brings the halves back together,
  then grows and lifts the assembled mark through a horizon while a single
  diagonal shimmer crosses it. Each chapter has a scroll interval to rest.
  Stopping scroll stops the choreography; reverse scrolling reconstructs the
  same sequence. The Transform and Resolve art direction is detailed at the
  end of this document.
- Find includes a procedural friction study around the stationary logo:
  small particles drift, hesitate and deflect around a hollow geodesic frame,
  while packets of cool light travel along its edges. The frame owns its slow
  ambient rotation, independent of the logo. It uses the same Find/Make screen
  boundaries as the panel wipes and is absent from the other chapters.
- The quiz retains its questions, recommendations, keyboard behavior and
  contact handoff. Its retired spotlight is replaced by the shared logo.
- The closing form and footer share a quieter logo and water composition.
  The water samples the actual posed logo; the old horizon video is omitted
  only for this homepage composition. Copy and form controls remain above
  the decorative render layer.

The panel timing lives in `PROCESS_TIMING` in `journeyDirector.ts`, expressed
in viewport heights below the navigation. The sticky process lasts 6.95 such
heights, followed by its normal one-viewport exit. `anchorScale` keeps the
logo's center separate from material blending and per-piece growth. Blueprint
ink uses crease geometry from the authored GLB, not a replacement SVG or a
triangle wireframe.

## Implementation boundaries

`HomeJourney` owns the semantic layout and a mutable pose ref. Native sticky
positioning holds the stage; `journeyDirector` samples absolute scroll position
for reversible transforms, including restored scroll positions. Resize and
upstream hero refresh events rebase its measurements.

`LogoJourneyScene` is loaded only near the desktop sequence. It owns one
transparent Canvas, a private parse of the existing GLB, and its own materials
and reflection target. DPR is capped at 1.4 and the closing reflection at
512px. Frame scheduling stops outside the visible sequence and in a hidden
tab. The loading silhouette follows the same pose until the first successful
frame. Model/load/context failures use static content without disabling the
desktop services heading's pin. The HTML Canvas fallback is inert because
React Three Fiber mounts it even when WebGL succeeds; only real rendering
failures activate the fallback layout.

Mobile, coarse-pointer, reduced-motion and failed-WebGL modes retain all copy,
quiz controls, enquiry fields and links without this Canvas. The process uses
shorter ordinary-flow steps in those modes. No new logo export is required.

## Preserved work

- `/experiments/water-hero` retains all of its material options and original
  reveal, controls and scene choreography.
- `/experiments/pit-stop` preserves the previous pit-stop presentation,
  isolated from the production palette and marked noindex/nofollow.
- `archive/homepage-2026-09-10/README.md` documents the retired media and
  source archives, their original paths and checksums. Copies are saved
  outside `public`; originals still referenced by other pages/experiments
  remain in place. The archive is excluded from deployment.
- `archive/homepage-2026-09-10/journey-before-process-wipes.tar.gz` preserves
  the previous journey source, service animation component, and documentation
  before this process rewrite. No public media was removed for these wipes.
- Restored services media lives in `public/media/services/`. The additive
  `archive/homepage-2026-09-10/service-media-ice-grade/` directory records
  the LUT, reproduction commands, metadata and original/derivative checksums.
  These are local color grades of existing Runway films, not new generations.

## Verification and remaining visual review

The existing checks cover the opening hero, material contracts, statement
wipe, forms and experiment behavior. New checks cover scroll coordinates,
reverse seeking, process phases, static/server markup, lazy dependencies,
GLB vertices/normals/reassembly, disposal, and reflection renderer state.
These checks and a production build do not establish browser/GPU appearance.

Browser access was authorized again on September 10. The services correction
was visually verified locally at 1280×720 and 1728×960: the GLB stays loaded,
enters from offscreen right after the heading pins, rests when scrolling stops,
and reverses with scrolling. The heading remains at the navigation's measured
bottom (83px at those sizes), the rows pass underneath, and it releases only
after the rows and links clear. The previously broken state was reproduced at
1280×720 before the correction: the model silently fell back and the heading
scrolled away. At 390×844, mobile retains ordinary flow, no entrance runway,
and no journey Canvas, with no horizontal overflow.

All 252 automated checks and the production build pass. Lint has no errors;
the existing pit-stop Fast Refresh warning and large shared 3D chunk build
warning remain. A healthy-Canvas regression check mounts its HTML fallback
and verifies that doing so does not report a renderer failure.

The full process choreography, quiz-to-contact handoff, final water reflection,
reduced-motion appearance and deliberately failed GLB load remain outside this
focused visual review; their automated checks are separate from browser evidence.
The subsequent services spacing adjustment was checked at the same desktop
sizes: about 40% smaller than before and a 75px gap from the headline.
All 16 journey/renderer checks, build and lint pass for that adjustment.
The follow-up baseline/black-finish adjustment was also visually checked at
1280×720 and 1728×960, with no browser rendering errors. Its 17 focused checks
include material restoration for the later scenes; build and lint pass with
the existing warnings noted above.
No commit or deployment is performed by this change.

The service-media restoration was visually checked at 1280×720, 1728×960
and 390×844. The diagonal panels, oversized words and videos render; video
playback advances while active and pauses after another panel takes over.
Forward/reverse scrolling and keyboard focus switch panels. The heading
remains at 83px on desktop, and its text/GLB cover the passing rows correctly.
Mobile retains all three panels without horizontal overflow or a journey
Canvas. There were no browser errors; the existing Three.Clock deprecation
warning remains. Reduced-motion playback is verified separately by automated
checks, not by changing the browser's motion preference.
For this restoration, the full existing suite passed 254 checks; four additional
playback lifecycle checks passed separately (258 total). Build and lint passed
with the existing warnings described above. Original public and archive media
checksums remain unchanged.

The subsequent services header inversion uses graphite with pearl type and a
pale silver GLB, with neither a top nor bottom section border. Desktop and
mobile appearance were verified at 1280×720 and 390×844; the sticky position,
baseline alignment and restored videos remain intact. Switching back from
mobile also clears the panels' temporary height and obsolete reveal animations.

## Process panel revision verification — September 10

This revision supersedes the earlier rows-and-links release timing above. The
heading now releases at the final row, before the links. At 1280×720, browser
inspection confirmed the release, fixed vertical logo center, rightward travel,
exact header-to-blueprint boundary, and the subsequent upward Find wipe through
the model. Independent half-turn poses, reassembly, launch highlight and reverse
scrolling were inspected. At 1728×960, the blueprint and final launch composition
were also inspected. The corrected blueprint has closed black contours at
1.4 CSS pixels, including on high-density screens; the initial shallow-bevel
extraction bug that produced only corner dots was reproduced and corrected.

At 390×844 the process renders all four panels in ordinary flow, with no journey
Canvas, no animated transforms and no horizontal overflow. Reduced-motion and
failure behavior remain covered by automated checks; the browser's motion
preference was not changed and a GLB load failure was not deliberately induced.

All 263 automated checks pass, including real GLB contour closure, independent
rotations, no extra turns during the quiz handoff, resource cleanup, native pin
boundaries and shared DOM/GPU wipe coordinates. The production build and lint
pass with the existing large shared 3D chunk and pit-stop Fast Refresh warnings.
A development dependency refresh briefly mixed cached React bundles during HMR;
a clean reload confirmed the final scene loads and renders without new browser
errors. The existing Three.Clock deprecation warning remains. These browser
checks are local, not deployment or contact-submission verification.

### Process alignment follow-up

Process titles now use measured final-line baselines to align with the logo's
locked bottom edge. The logo's shared horizontal position is measured from the
widest process heading plus 100px, with a right-edge guard, rather than a fixed
percentage of the viewport. This keeps each chapter aligned while preserving
the vertical lock, independent turns and reversible wipes. The desktop-only
padding adapts to font metrics and title wrapping; mobile retains its original
ordinary-flow spacing.

The intro and next panel were visually checked at 1280×720 and 1728×960; the
measured title/GLB baselines match. At 390×844, panel heights remain unchanged,
with no horizontal overflow. All 23 focused journey/renderer checks pass; the
production build and lint pass with the existing warnings above.

### Friction field follow-up

Find now surrounds the stationary GLB with a slowly rotating hollow geodesic
frame. Fine petrol edges carry turquoise trails and small cool-white pulse
heads. Eight hundred seeded particles hesitate and deflect around the frame,
with a sparse foreground over the logo. The effect uses two draw calls, shares
the existing scene loop, and releases its geometry and materials on unmount.
No external assets or dependencies were added or retired.

Local browser inspection at 1280×720 and 1728×960 confirmed the centered logo,
independent frame rotation, visible particles/light trails, and clearance from
the copy. Incoming and outgoing panel wipes clip the effect at the same boundary
as the logo skin, including in reverse. The adjacent blueprint and Make panels
remain free of the field. At 390×844, the ordinary-flow mobile layout retains no
journey Canvas and has no horizontal overflow. Reduced-motion behavior is
covered by automated checks; its browser preference was not changed.

All 269 automated checks pass, including deterministic particle buffers,
independent transforms, shared panel masks, hidden-stage resource reuse and
idempotent disposal. The production build and lint pass with the existing
large-chunk and pit-stop Fast Refresh warnings. A clean browser reload after
development edits showed no new rendering errors; the existing Three.Clock
deprecation warning remains. No commit or deployment was performed.

### Friction field expansion and captured handoff

The expanded Find treatment supersedes the stationary, 800-particle study above.
It uses 5,200 particles across the viewport, with pointer repulsion and a pressure
rim/wake around the moving assembly. The particles stay in world space as the
cage and actual GLB bounce through the right and lower portions of the stage.
Viewport bounds include the cage radius; the measured copy area acts as an
obstacle. The upper-left field is quieter so the text remains readable.

The Find logo now has a dark polished surface, broad soft reflection, darker
side planes and cyan edge reflections. Foreground cage strands render across
the face, while rear strands are dimmer and occluded by the GLB. This gives the
logo a readable position inside the hollow frame rather than in front of it.

The Make wipe captures the logo's current position when it first reaches the
logo's bottom edge. That position holds until the wipe finishes. Scroll then
moves the assembled logo to the vertical center of the available stage, leaving
8vw (at least 64px) beyond its right edge. Splitting, scaling and independent
rotations start after docking. Reverse docking returns to the captured point;
reversing Find into the blueprint blends back to the measured heading anchor.
The quiz and closing scene retain their existing poses.

The first-pass source files are retained in
`archive/homepage-2026-09-10/friction-first-pass/`. No media was retired, and the
portfolio experiments are unchanged by this revision.

Local browser checks at 1280×720 and 1728×960 confirmed the new depth, dense
particle coverage, pointer clearing, moving assembly, captured position during
the Make wipe and centered right-side destination. At 390×844 the existing
static mobile panels remain readable, with no Canvas or horizontal overflow.
All 275 automated checks pass, including bounds/copy avoidance, frozen forward
and reverse wipes, reverse docking, smooth blueprint return and delayed part
transforms. Build, lint and whitespace checks pass with the existing warnings
listed above. Browser reduced-motion preference and deployed performance were
not tested; motion fallback behavior remains covered by automated checks.

### Blueprint contour drawing after the swipe

The services-to-intro wipe now leaves a white GLB before any black ink appears.
Once the dark boundary clears the logo's full height by 12 CSS pixels, the next
160 pixels of scrolling trace both halves' actual contours. Connected cap paths
use normalized arc length; finished strokes stay dark while their tips advance.
Reverse scrolling erases the contours before the dark band reaches the logo.
The existing white face, stroke weight, framing and later material wipes remain.

Local browser inspection at 1280×720 compared the same mid-swipe position before
and after, then checked partial and completed tracing in both directions.
Inspection at 1728×960 confirmed the larger composition and transition into
the particle scene. Mobile at 390×844 retains its static layout with no journey
Canvas or horizontal overflow. Reduced-motion routing is covered by automated
checks; its browser preference was not changed. No new browser errors appeared.

All 279 automated checks pass, including whole-logo clearance and connected,
length-weighted GLB contours. Build and lint pass with the existing shared 3D
chunk and pit-stop Fast Refresh warnings. Portfolio experiments and existing
assets are preserved. No commit or deployment was performed.

### Iridescent glass during the independent Make turns

Each half now becomes the approved iridescent Glass look on its first edge-on
quarter turn. Selection follows that half's own absolute scroll-driven angle,
so the second half changes independently and reverse scrolling restores silver
at the same orientation. The spin timing, scale, separation and position stay
unchanged. This revision initially kept Glass in Make only; the subsequent
Launch finish below extends that same material through the final assembly.

The production instance reuses the hero's Glass material and rounded geometry
builder without editing either experiment. Parallel viewing/refraction rays suit
the orthographic stage camera, and the existing soft lighting card is aimed to
keep a restrained spectral reflection on the settled face. Since Make is a flat
DOM background and its wipe completes before spinning begins, an owned one-pixel
linear backdrop supplies transmission; it does not capture or refract DOM text.
Complementary material masks retain the single visible surface at panel wipes.
Owned glass resources are released on unmount and partial preparation failure.

Local browser inspection at 1280×720 compared the original silver and new glass
at a matching rotation, then checked independent changes, reverse restoration,
settled faces and the partial/full Launch wipe. Inspection at 1728×960 confirmed
the wider framing and reflected highlights. At 390×844, the static Make section
remains readable with no journey Canvas or horizontal overflow. Reduced-motion
routing remains covered by automated checks. All 283 checks,
production build and lint pass, with the existing shared 3D chunk size and
pit-stop Fast Refresh warnings. A transient development reload error occurred
while the new import was being added; clean reloads rendered the final shaders.
No assets were retired, and no commit or deployment was performed.

### Launch finish: assembled glass and a cool light pass

Launch now retains the approved iridescent Glass after the independent Make
turns. Its transmitted backdrop follows the purple panel's exact wipe. Once
that wipe and assembly finish, the complete mark grows 18% over the next .4
stage heights of scrolling. The common rig scales, preserving the central cut
and the dock's vertical center and 8vw right inset (at least 64px).

A broad cyan-to-lavender reflection crosses both halves in shared logo
coordinates during the existing shimmer interval. It finishes once, then
rests with separate soft face reflections and a restrained backlight. Every
part of this finish follows scroll position and reverses with it. The halo
clips to both the leading and trailing edges of Launch, including when the
stage leaves the viewport. Glass fades continuously over the existing quiz
surface on exit; its depth writes remain enabled during the opaque independent
turns and disable only for that exit blend.

Local browser inspection compared the original and finished Launch at
1280×720 and the same scroll position, then checked the incoming panel,
light pass, settled pose, reverse motion and quiz exit. At 1728×960 the larger
composition retains its spacing and readable reflections. At 390×844 the
existing static Launch section remains readable with no journey Canvas or
horizontal overflow. Reduced-motion routing remains covered by automated
checks; its browser preference was not changed. All 287 automated checks,
production build and lint pass with the existing shared 3D chunk size and
pit-stop Fast Refresh warnings. No shared experiment sources or assets were
changed by this finish, and nothing was committed or deployed.

## Transform and Resolve art direction — September 11

Find, Make and Launch now each use the same idea — offset — for a different
purpose, so the three chapters read as one argument rather than three effects.
Find is uncontrolled offset (the bouncing cage). Make resolves offset into
register. Launch turns offset into forward momentum.

### Make: misregistration resolving into register

Three off-register colour plates (`journeyPlates.ts`) sit beneath each authored
half. They share that half's own geometry buffer and its real pivot, so they
inherit the independent turns exactly; only a clip-space slip separates them.
The slip is proportional to the mark's width and square on screen at any
aspect. `register` closes them onto the mark across the same scroll interval
that finishes the second half's turn, and a plate fades out slightly ahead of
full alignment so nothing lingers over the finish.

Behind them, `journeyShiftRules.ts` draws a drafting field on the mark's own
cut angle: long rules broken into laterally slipped segments with open butt
joints. `rules` closes the joints and zeroes the slip, leaving straight
continuous lines by the time Launch begins covering them. The field gathers
around the mark, thins toward the panel edges, fades before the copy column,
and brightens under a damped pointer reading light. The same quad draws the
horizontal datum through the mark's centre and the crop marks, which stand off
the mark while the plates are slipped and close onto its frame on register.
The crop frame is clamped to the horizontal room the dock actually leaves and
opens the rest of its travel vertically, so it never crosses the stage edge at
any viewport width.

### Launch: the ascent

The assembled mark now grows by `ASCENT_GROWTH` (1.2, so 2.2x its docked
width) and climbs `ASCENT_RISE` (.22) of the open stage, replacing the earlier
18% growth that was not legible. Growth re-solves the dock every frame, so the
enlarged mark keeps its measured 8vw right inset; the climb is clamped so a
large mark on a shallow stage never passes under navigation. The motion
controller reports the climb it applied, which is exactly the distance back
down to the horizon the mark left.

`journeyAscent.ts` supplies the chapter's environment in one quad: a floor
that deepens with the climb, one horizon rule the mark rises through (brighter
during the existing light pass, so the two Launch events read as one moment),
three parallax layers of long sparse streaks, and a tapering wake beneath the
mark that records the climb as a single long exposure. Scroll supplies the
travel distance; a slow clock only keeps the field from freezing solid when
the reader pauses. The pointer moves the near layers further than the far
ones, and also gives the assembled glass a few degrees of damped tilt so the
reflections move under the cursor. This is the only chapter the reader can
touch.

### Compositing constraint

The journey canvas is transparent over solid DOM panels, so **additive
blending cannot be used for any of these effects**. Additive blending drives
the canvas alpha to 1, and the panel behind it is then replaced by the layer's
raw colour rather than added to. Every new layer is premultiplied normal
blending; where a layer needs to read as added light, it carries the panel's
own colour and blends over it, which composites to exactly
`panel + tint * strength`. The first registration-plate pass got this wrong and
rendered as dark navy blocks before the correction.

### Verification

`scripts/verify-journey-panel-fields.mjs` covers the plates (shared geometry,
shared live panel uniforms, one material per separation, screen-square slip,
every hidden state, finite guards, idempotent disposal that leaves the authored
buffer intact), both panel environments (stage coverage, depth order behind the
existing backlight, panel clipping, premultiplied compositing, pointer fade,
broken-frame guards, disposal) and the climb's clamp, reversibility and
reported horizon. `verify-home-journey.mjs` gains a chapter test asserting that
register finishes before the Launch wipe, that all three new values are
monotonic and bounded, and that they retire with the surface into the quiz.
Its renderer fallback harness now stubs the two new modules, and its Launch
test covers growth and climb together.

All 294 automated checks, the production build and lint pass, with the existing
large shared 3D chunk and pit-stop Fast Refresh warnings.

Local browser inspection at 1440x900, 1280x720 and 1728x960 confirmed the
plate convergence, the closing crop marks, the straightening rules, the real
growth and climb, the horizon crossing, the streak parallax and the pointer
tilt, plus forward and reverse scrolling through the whole process with no
console errors. At 375x812 the static mobile panels are unchanged, with no
journey Canvas and no horizontal overflow. Reduced-motion routing remains
covered by automated checks; the browser preference was not changed. No assets
were added or retired, no dependency was introduced, and nothing was committed
or deployed.

## The quiz mark — September 11

The Shift Finder's retired pointer lamp is replaced by the journey mark
itself, which the reader can both charge and handle.

### Powering up

`ShiftQuiz` reports how many questions have been committed to through an
`onProgress` callback; `HomeJourney` eases that fraction and feeds it to
`sampleJourneyFrame` as `{ level, surge }`. It is not scene state: the sampler
stays a pure function of scroll plus that charge, so every pose remains
reversible. Each new answer also sets a short `surge` that decays on its own
rAF settle — the one thing on this page that changes the mark without
scrolling.

The arc is accretion, and the field carries it. `journeyGather.ts` samples
4,200 points off the authored halves, area-weighted so the settled skin
describes the real mark rather than its tessellation, and pairs each with a
scattered origin in a surrounding volume. An unanswered quiz is a loose, cold
cloud drifting and orbiting around dark, inert metal. The first answer pulls
the cloud into a tight orbiting shell just clear of the mark and lights the
contour along the cut. The second settles motes onto the authored surface as a
second skin of light and brings the crystal interior up. The third completes
the skin and reaches the live crystal the rest of the page ends on, with
`journeyPower.ts` opening a backlight behind it. Every answer also drives one
shockwave out through the field and one pulse through the cut.

Motes draw after the mark and test against its depth, so the ones settling on
the far side are hidden — that occlusion is what makes the skin read as
wrapped around a solid object. They inherit the rig, so throwing the mark
stirs its whole field. Additive blending is correct for this layer, unlike the
panel backdrops, because it draws over pixels the mark has already composited
rather than over bare transparent canvas.

The first material pass drove only `finish`, `charge` and iridescence and read
as barely any change at all against a near-black panel; the stage values are
now a much wider range, with the fully answered cut reaching the hero's own
seam intensity. The closing water composition always blends back to the
finished mark, so a reader who skipped the quiz never gets a dull one.

### Handling the mark

`journeySpin.ts` is a virtual trackball: pointer positions are projected onto
a unit sphere near the centre and a hyperbolic sheet beyond it, so a flat drag
produces roll as well as yaw and pitch. A plain two-axis mapping cannot turn
the mark about the axis facing the reader; this can. The controller
accumulates only an orientation — the renderer composes it in screen space on
top of the scroll pose, so the mark turns freely but never moves off its
docked position.

Releasing mid-drag throws the mark at the speed of the drag, measured from the
recent average rather than the final frame so one jittery sample cannot fling
it. The throw is capped, damped to rest, and damped harder once the section
leaves. `presence` slerps the reader's rotation away as the quiz scrolls off
and finds it again on the way back, so the mark remembers how they left it.

The hit test lives in the renderer, against the mark's real screen box.
`.home-journey__grip` is a cursor affordance only, positioned from the same
CSS custom properties and only accepting the pointer while `data-grip="true"`
— which the frame loop sets once the quiz chapter genuinely owns the mark, so
it can never sit over the answers or the footer. The whole interaction is
gated behind the existing desktop query, which already requires a fine pointer
and `prefers-reduced-motion: no-preference`.

### Verification

`scripts/verify-journey-quiz-mark.mjs` covers the surface sampler (points
landing on the real mesh through a non-identity world matrix, area weighting
rather than triangle count, determinism across loads, and a hard failure
instead of a silent empty field), the loose cloud's extent, the field's depth
ordering, blending and disposal, three-axis rotation (including
that an off-centre drag really produces roll), throw speed tracking drag
speed, a still release not throwing, capped violent throws, damping to a true
rest, retirement and recall with the section, non-finite guards, the
unit-length invariant that keeps the controller from ever producing a
translation, the three charge steps, the surge, the charge's absence outside
the quiz, the restored closing finish, and the backlight's placement and
disposal. `verify-home-journey.mjs`'s renderer fallback harness stubs the new
charge and runs the real spin controller, proving it constructs and takes its
listeners with no GPU context.

All 303 automated checks, the production build and lint pass, with the
existing large shared 3D chunk and pit-stop Fast Refresh warnings.

**Not yet visually verified.** Every browser surface available in the session
reported `document.hidden` with rAF suspended, which parks the scene's own
frame loop by design and leaves the hero at its loading state. The powering-up
appearance, the feel of the drag and throw, and the cursor affordance still
need a look in a visible browser.

## The closing composition — September 11

The closing section was two screens of content in one screen's worth of
composition: the enquiry card held the first, and once it scrolled away the
sticky canvas left the mark alone in an empty viewport until the footer
arrived. The canvas is `position: sticky`, so the mark does not scroll with
the section — a section taller than the composition is guaranteed dead space.
The section is now one screen (`96svh`, no bottom padding), so the footer
arrives as the card leaves and sits straight on the waterline.

The other half of the problem was that nothing spanned the frame. The closing
water now carries a dawn on the same plane: a cool sky above the waterline, a
low sun sitting on it, and its reflected column widening and breaking up with
distance. Because the shader derives the horizon, the mark's feet and the
column from the one `uBase` it already had, all three share a line by
construction — there is nothing to align by hand at any viewport size.

The sun follows the mark rather than sitting at a fixed position. From 900px
up the enquiry card takes the right half of the contact grid, so a fixed sun
would sit behind it; anchoring it `SUN_OFFSET` right of the mark lands it in
the gap between the two and keeps it inside the frame at any width. The mark
itself was lifted (closing `y` from `-.1` to `.04` on tall viewports) so the
water and the dawn have a band to occupy instead of being clipped by the
footer.

Two corrections came with it. The water plane now declares
`premultipliedAlpha`, because every term in it was already accumulated against
its own coverage — under straight alpha the fog and reflection were being
squared against their own weights and losing most of their strength. And the
plane is masked to the closing section's top edge in the same top-origin
canvas coordinates the panel wipes use, without which the dawn would paint
over the quiz chapter above it, since the canvas spans the whole journey.

The existing `/media/generated/contact-horizon.mp4` sunrise loop is unchanged
and still used by `/contact` and by any `ContactCta` without `sceneBackground`.
The homepage dawn is procedural rather than that video so it can share the
mark's waterline; no media was added or retired.

**Palette note:** the dawn introduces warm tones (`DAWN_WARM`, `DAWN_CORE` in
`journeyWater.ts`) into a page that `brand-palette.md` otherwise keeps to ice
and petrol. This was an explicit request, and the warmth is confined to a
narrow band at the horizon and its reflection; both constants are single
values if it should read cooler.

All 304 automated checks, the production build and lint pass. **Not visually
verified** — every browser surface in the session reported `document.hidden`
with rAF suspended, so the composition, the dawn's strength and the new
section height still need a look.

### Closing composition, second pass

The first pass trimmed the section but left the real problem: the frame above
the waterline was still black, so the composition read as an empty screen with
a bright strip lying in it. Height was never the whole story — the upper frame
had nothing in it.

The sky now carries that frame. It is a graded surface from a cool dark top
stop to a lighter stop at the waterline, present all the way to the top of the
section rather than only near the horizon. The sun was also restyled to match
the existing `/contact` sunset it sits beside: a thin, bright line spread along
the waterline with a tight core, instead of the bloom dome the first pass
produced. The near water keeps a cool sheen so the lower frame is a surface
rather than more black, and both the reflected ripple and its long horizontal
breaks now fade out with depth, where fine detail was only aliasing into
stripes across the footer.

The section came down again to `88svh`, and the footer went to 93% ink: at 72%
the reflected banding read straight through it as stripes behind the type.

### Closing composition, third pass

Four corrections, one of which was a real bug.

**The copy sits at the bottom of its row.** The enquiry card is far taller than
the copy beside it, so top-aligned copy scrolled away above the closing
composition and left the whole upper left empty at the end of the page.
`align-self: end` puts it where it is still on screen at the very bottom.

**The mark is centred, smaller, and placed from measurement.** `closingScale`
drops to `.15`, and the closing `x` is 0. Its vertical position is no longer a
guessed fraction of the viewport: `HomeJourney` measures the enquiry block's
bottom and the footer's top, and the mark's feet sit at 62% of the band
between them. That is what keeps a centred mark from sitting behind the card
or being clipped by the footer at any viewport, and it is asserted directly
rather than through a proxy.

**The sun stopped travelling.** Anchoring it to the mark meant it slid in from
the right across the whole handoff as the mark moved to its closing position,
which read as an effect rather than a place. It is a fixed point in the frame
now, and the mark settles centred in front of it. The dawn also runs on its
own faster ramp (`dawn`) so it is at full strength for most of the handoff
instead of fading up across all of it.

**The clamp was dimming the sun by about 40%.** The previous pass scaled colour
and coverage together to keep alpha in range. The sun's core is exactly where
the most terms overlap, so it took the largest reduction — the one place in the
frame that must not be reduced. Only coverage is clamped now. Premultiplied
colour is allowed past its own coverage, which is what an emissive highlight
is; the framebuffer clips it where it belongs.

**Water resolution.** The reflection capture went from 512px to 1024px, which
is what the water's sharpness was limited by. A third ripple octave was added,
restricted to the near field where the sharper capture can hold it, and the
reflection blur now grows with the square of depth so the near water stays
close to a mirror instead of being blurred flat from the waterline down.

### Closing composition, fourth pass

The whole enquiry block now sits at the bottom of the section rather than the
top: the section is a flex column with `justify-content: flex-end` and a bottom
padding that reserves the band for the mark and its water. Its distance from
the footer is therefore fixed, so at the very end of the page the copy and the
card are both still on screen. Reserving the band in CSS rather than pushing
the block down with top padding is what makes this independent of section
height — the block's position relative to the footer no longer depends on it.

The mark is now sized to that band as well as placed in it
(`band * .55 / (w * .549)`), so moving the enquiry block down shrinks the mark
instead of pushing it through the footer. The homepage footer also gave back
some padding, because the card cannot sit lower without that room coming from
somewhere, and the alternative was the card losing its head behind navigation
at the bottom of the page.

### Closing composition, fifth pass

The closing is now exactly one screen. Rather than a guessed `svh` fraction,
the section takes `calc(100svh - var(--journey-footer-height))`, with that
custom property published from the same measurement pass that already reads
the footer's position. There is therefore nothing to scroll past the closing,
and no state where the card has left but the footer has not arrived. The
footer's own height does not depend on the section's, so the measurement
settles in one pass rather than looping.

Fitting the card's head below navigation at the bottom of the page is an
arithmetic problem — header, card, mark band and footer have to share one
viewport — so height was reclaimed from all of them at once: the reserved
band, the card's padding, the form's field gaps, the message box, and the
footer's padding and inner gap. All of it is scoped to
`.home-journey__closing`, so `/contact` and every other page are unchanged.

The enquiry card was restyled as frosted glass over the dawn instead of a dark
plate on top of it: a low-opacity ground so the sky reads through, a
light-catching top edge, a hairline rim, heavier backdrop blur with a little
saturation, and a soft cast shadow lifting it off the water. `CLAUDE.md` warns
against the site becoming a glassmorphism template and against repeated
translucent cards; this is deliberately the single treated surface on the page,
and the card already carried a translucent ground and a backdrop blur before
this pass.

### The closing water, rebuilt

The surface was banded in screen space: every ripple and fog term used screen
distance below the waterline directly, so the wave frequency was constant down
the frame. That is why it read as horizontal stripes rather than as water —
the one cue a receding plane cannot do without is that its detail compresses
toward the horizon.

It is now built in ground distance. Screen distance below the horizon is
inversely proportional to distance across a flat plane under a camera slightly
above it (`ground = .075 / depth`), and the swell is a four-octave sum in that
space. Wavelength therefore compresses toward the horizon on its own, and the
lateral coordinate widens with distance the way a real plane does. Each octave
fades with a `detail` term that dies before the horizon, where one pixel covers
unbounded ground and any high frequency becomes moire — which is also how real
water reads at range.

The rest follows from having a real surface:

- The swell is returned with its own along-view slope, and that single slope
  displaces the mark's reflection, so the reflection lies on the surface
  instead of carrying a separate ripple of its own.
- A Fresnel term makes the water its own dark body underfoot and a mirror of
  the sky at grazing range, rather than one flat colour throughout.
- The sun's track is the crests of that swell catching the light, so it holds
  together as a bright line at range and breaks into a shimmering path as it
  widens toward the reader. It was a smooth cone before.
- Sparser glitter away from the track keeps the rest of the surface alive,
  which is most of what separates water from a gradient.
- The old `farFog`/`nearFog` screen-space bands are gone, replaced by a thin
  mist on the line where the plane meets the sky.

### Closing alignment

The mark was tucking under the enquiry card's bottom-left corner with about
fourteen pixels between them, which reads as a collision rather than a
composition. A centred mark can never be horizontally clear of a card that
occupies the right half of the grid, so the clearance has to be vertical and
it has to be deliberate.

The band between the enquiry block and the footer now has a stated rhythm in
`CLOSING_BAND`: a quarter of it is clearance, the mark takes 42%, and a third
is open water. It was taking 55% and standing at 62%, which left almost
nothing at either end. The band itself was widened by trimming the footer
again, so the smaller share still gives a mark of reasonable size.

The verification changed with it. The previous checks only asserted that the
mark did not overlap the card or the footer, which a one-pixel gap satisfies —
they would have passed on the exact composition being complained about. They
now assert that each part of the rhythm is visibly present, and that the mark
stands on its stated line.

The left column was given one measure: the supporting line is set narrower
than the headline above it and both are balanced, so the block reads as a
single shape with one right edge rather than a wide line hanging off a short
one, and the last line no longer breaks to an orphan.

The mark settles at `x = 0` and the sun is fixed at `.5` of the frame — the
same vertical axis, now asserted rather than left to two unrelated constants
to agree on.

## The closing, rebuilt again — September 11

### Light and water

Every warm term in the dawn was cut to roughly a quarter of its former
strength: the horizon band, the halo, the disc and the reflected track. The
sky gradient was reduced less, because it is what fills the upper frame and
cutting it returns the composition to a void.

The sun now has an elevation of its own rather than sitting on the waterline.
It descends across four minutes and returns over the next four, on a cosine so
there is no snap at the turn, and it dims as it goes. Because it carries a real
elevation it genuinely sinks behind the horizon instead of only fading out
where it stands.

Three of the four swell octaves were rolling the wrong way. A crest sits where
the phase is constant, so a `-ground` term makes crests travel *away* from the
reader; only the first octave had the sign that brings them in. Every octave
now advances with `+ground` and `+time`, and their lateral coefficients
alternate sign so the crests are not all parallel.

Definition came from shading rather than from more sparkle: crests catch the
sky mirror and troughs fall back into the water's own body colour, driven by
the same slope the reflection uses, with a separate highlight on the leading
edge of each crest. That is what makes a roll read as a roll instead of as a
gradient sliding down the screen.

### Layout and the left column

The copy block is top-aligned with the card rather than bottom-aligned, so the
two columns share a top line. Under the supporting sentence it now carries a
real alternative for a reader who will not fill in a form: the direct email
address, gated on `business.email` as every contact detail on this site is, and
a link to pricing. Nothing there promises a response time or anything else that
is not already published. The enquiry column also takes the larger share of the
grid, since it is the substantial half of the section.

### A fuller enquiry

The form asks for current website (with a checkbox for not having one yet),
preferred service, package of interest and budget, alongside the existing name,
email and message. Options are derived from `siteConfig` and `pricing` rather
than restated, so a rename cannot leave the form offering something that no
longer exists, and the budget bands are cut at the published starting prices.
Every new question is optional, opens unanswered, and is carried to the
endpoint as the label the reader actually read.

`api/contact.ts` adds each answered field as its own labelled line and omits
the rest. The new fields are length-capped like the originals, and line breaks
are collapsed out of them: they are single-line choices rendered into a
labelled plain-text body, where a newline would forge another labelled line.
Only name, email and message remain required, so a skipped question can never
turn a real enquiry into a validation failure. The short form is untouched and
remains the default; `/contact` is unchanged.

### Closing composition — the correction

Three passes of this section put the heading and the card above the viewport
at full scroll. The cause was the same each time: the enquiry block was
anchored to the BOTTOM of the section and pushed up off a reserved band, so
its top edge was `section - reserve - itsOwnHeight`. Every change to the form
moved it, and each fix was a guess at the reserve.

The block is now anchored to the TOP, directly under navigation
(`justify-content: flex-start` with a `padding-top` built from
`--journey-header-offset`). Its top edge is fixed by construction and cannot
move when the form grows. The band the mark stands in is whatever is left
between the block and the footer — which the renderer already measures, and
which the mark is already sized against.

The sun belongs behind the enquiry card, not in a band below it: the card's
glass carries no light unless something is lit behind it. `SUN_POSITION` moved
to `.66`, inside the enquiry column. That has one consequence worth stating
plainly: a centred mark cannot survive it. The card owns the right of the grid
from 900px up, so a mark on the centre line would sit behind it. The mark
stands at `CLOSING_MARK_X` instead, clear to the left along the same
waterline, and is free to rise past the band's top edge because it no longer
shares any horizontal space with the card. Only the footer below is still a
hard boundary.

The detailed form pairs its short fields — name with email, website with
package, service with budget — because seven stacked fields make a card taller
than the screen it has to share with a heading, a mark, water and a footer.

The light was cut again, to roughly a fifth of where it started, and it now
begins the descent already dim rather than at full strength.

### Centre line and the closing entrance

The mark settles on the centre line again. The enquiry card overlaps it from
900px up and the sun stands behind that card, so part of the mark reads
through the frosted glass rather than in front of it. That is the intent, not
a collision to design around, and the band checks no longer treat the overlap
as a fault.

`Reveal` gained an `xPercent` offset: a sliding reveal starts off the page by
a percentage of its own width and lands on its place, instead of rising from
below it. The distance is relative to the element so the start is always
outside itself whatever column it sits in. Sliding reveals also start at a
zero threshold with a small bottom margin — a tall enquiry card would
otherwise have to be a fifth on screen before it began, by which point the
reader has already seen the gap it should have arrived into.

In the closing section the three copy blocks come in from the left and the
enquiry card from the right, staggered, and only when `sceneBackground` is
set: `/contact` and any other caller keep the original rise. Two things the
checks cover because they are the ways this breaks silently — reduced motion
clears the horizontal offset as well as the vertical one, or the content stays
parked off the page permanently; and the section clips, or an element sitting
a full width outside itself gives the page a horizontal scrollbar until the
animation lands.

### The entrance deadlock

The first version of the slide made the heading, the copy and the enquiry card
disappear entirely.

`IntersectionObserver` clips against ancestor `overflow`, and a sliding reveal
starts fully outside a section that has to clip — otherwise the off-page start
becomes a horizontal scrollbar. Watching the element itself therefore reported
it as never intersecting: it could not come into view because it was off the
page, and it was never animated in because it was not in view. The two
requirements are individually correct and jointly fatal.

A sliding reveal now watches its untransformed parent, which is exactly as
visible as the place the element is travelling to. The check for it asserts
the invariant rather than the fix: the element being moved is never the
element being observed.

### Grading the dawn against /contact

The two closing compositions were not reading as the same place. Side by side:
the `/contact` sunset is a near-black sky, one thin saturated line, and dark
water carrying lighter bands — high contrast, one bright thing. The homepage
dawn was a pale blue-grey wash with a diffuse glow in it — low contrast, no
line at all.

The sky stops moved well below the section's own ink, so raising the sky's
coverage now darkens the upper frame instead of lifting it. `.home-journey__closing`
also lost the radial gradient it used to carry: it was lightening the upper
left, which is exactly where the reference is darkest, and the dawn cannot
read against a ground that is already lit.

The light was concentrated rather than increased. The horizon band is a third
of its former thickness and much tighter across, the diffuse halo that was
making it hazy is roughly halved, and the core is sharper — so total output
falls again while the line finally reads as a line. The palette moved toward
the reference's orange-red.

The water body was darkened, its sky mirroring reduced, and its shading range
widened, so the swell reads as bands on dark water rather than as an evenly
lit surface. The reflected track was strengthened to match the warm column in
the reference.

One property is pinned by check rather than left to the constants: both sky
stops must be darker in luminance than the ink they composite over, and the
water body darker still. Get that backwards and the section returns to a pale
wash with a glow in it, which is the state this was correcting.

The two are still not identical, and one difference is structural rather than
graded: `/contact` puts its horizon near the top third with water filling most
of the frame, while the homepage horizon sits where the mark's feet are, which
the layout places lower. The button colours match already — the orange in the
older `/contact` capture predates the ice/petrol grade, and `--color-ember`
now resolves to ice everywhere outside `.pit-stop-experiment`.

### The mark fills the enquiry card

The closing mark is now centred on the enquiry card and grown until it spans
`CLOSING_CARD_FILL` of whichever axis binds first — so one axis lands exactly
on the fill and the other is short of it. Position and size both come from the
card's measured place in the grid, which ends a run of passes that each
re-guessed a fraction of the viewport and each broke when the form changed
shape.

The card is the element that slides in, so its own rect is wrong while the
entrance runs — and worse, Reveal sets that offset in an effect that runs
before the parent's measurement, so the card would be measured mid-flight on
first paint. It is measured from `.contact-cta__form-slot` instead: the place
the card occupies in the grid, which never moves.

The band the mark used to stand in is gone with it, along with
`closingContentBottom`. The footer's top is still measured, since the section
still sizes itself against it.

The footer lost its ground. The composition now runs behind it to the bottom
of the page, which the water can carry because it is the darkest thing in the
frame. The hairline above it stays, as the line the composition ends on.

## The approach panels without the scene — September 12

Where the live scene runs, the three approach panels share one travelling
object and the copy is written against it. Everywhere else — touch, narrow,
reduced motion, a WebGL failure — `data-live="false"` leaves them as copy on a
colour field with space underneath, which is what a phone showed. Two things
were added there, both scoped to that state and neither reaching the running
scene.

### The mark, in the state each stage leaves it in

`JourneyStageArt` fills the panel below the copy. It is the finalized mark and
nothing else: the shape comes from `/brand/wallace-shift-logo-black.svg` used
as a CSS mask, so no second description of the geometry exists to drift from
the first. What changes between stages is the light on it and the ground
behind it.

- **01 Identify** — the object surveyed. The mark is read back as fine measure
  lines, on a horizon and one diagonal at the brand angle.
- **02 Transform** — the shift crossing the object. One diagonal seam with the
  old light behind it and azure ahead of it, placed to cross the middle of the
  mark rather than clip its leading edge. The mark stays whole; only what falls
  on it changes.
- **03 Resolve** — the object settled and lit, on a horizon. The same language
  as the closing section without repeating its water.

Each carries one very slow loop — 13s, 17s and 15s, all `alternate` — under
`prefers-reduced-motion: no-preference`. The panel's own arrival is the motion
that carries the section; this sits under it.

The art is rendered unconditionally and hidden in CSS rather than gated on
`live`. The page is prerendered with the scene absent, so gating the markup
would serve one tree and hydrate a different one. The existing
`.journey-static-mark` in the services header already works this way.

### The panels stack

Below 1024px the panels do what the pricing packages do: each fills the frame,
holds once its own end reaches the bottom of it, and the next rides up over it.
The z-order and the opaque grounds are the live scene's own, unchanged — this
is the same layered look, driven by scroll position instead of by the director.

The hold is `frame - the panel's own height`, measured per panel into
`--journey-panel-height`, with `min()` keeping the intro — only as tall as its
heading — against the header rather than pushing it down the screen. The
measuring effect returns immediately when the scene is live, and clears the
variable on the way out.

**`inset: 0` is two sticky constraints, not one.** The live stage gives every
panel `inset: 0` so it fills one frame. Left in place, the `bottom: 0` inside
that shorthand pins each panel's bottom edge to the bottom of the frame, and
all four were dragged up onto each other from the moment the section appeared —
they rendered at identical coordinates while their flow positions were 790px
apart. It has to be cleared before the one edge this needs is set.

**And the edge goes with the hold.** The last panel is `position: relative`
because nothing follows it inside the section to ride over it. Leaving the
`top` behind displaced it down the page by the height of the header, which also
delayed its arrival and left a sliver of the panel beneath it showing.

### Verified in the browser

At 400x867, `--journey-header-offset` 77, so the frame is 790 tall. The intro
measures 317 and the three steps 790 each; panel flow tops are 3821, 4138, 4928
and 5718. Walking down (panel tops, then the quiz below):

| scroll | intro | find | make | launch | quiz |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 3400 | 421 | 738 | 1528 | 2318 | 3108 |
| 3760 | **77** | 378 | 1168 | 1958 | 2748 |
| 4100 | **77** | **77** | 828 | 1618 | 2408 |
| 4500 | **77** | **77** | 428 | 1218 | 2008 |
| 4900 | **77** | **77** | **77** | 818 | 1608 |
| 5300 | **77** | **77** | **77** | 418 | 1208 |
| 5641 | **77** | **77** | **77** | **77** | 867 |
| 5900 | **77** | -182 | -182 | -182 | 608 |
| 6300 | -109 | -582 | -582 | -582 | 208 |

Three covering transitions, and the release is exact: find and make let go at
5641, the same scroll position at which launch reaches the header and fills the
frame, so nothing is ever seen uncovered. Computed positions are sticky,
sticky, sticky, relative, with hold edges of 77px on the first three.

The three stage treatments were checked by eye at 400x867 and the covering
moment between panels 1 and 2 with them. What could not be checked here is the
live path: the browser pane available is 400px wide, so the scene's own
breakpoint cannot be reached. That rests on the scoping, which is asserted in
`verify-journey-stack.mjs` line by line across the mobile block.

## The canvas and its container — September 13

A hard vertical line down the right of the lander was reported on desktop. The
work below is a real defect found while chasing it and is worth keeping, but it
was **not** the cause — the line was still there afterwards. What it is remains
open; see "Still open" at the end.

`.home-journey__visual` is `width: 100%` of the layout viewport and `100svh`
tall. The canvas has to be the size of that box, and a window resize is not the
only thing that changes it: the document's scrollbar arriving or leaving
resizes it silently, and so does a resize that happened while the tab was in
the background, where no frames ran to deliver the observation. `frameloop
="never"` means nothing re-measures on its own either.

Left behind, the renderer keeps the older size — and `WebGLRenderer.setSize`
writes that size onto the element as inline pixels, which overrides the
`width: 100%` the `<Canvas>` style prop asks for. Measured here at a 2000x1108
container: the canvas carried `width: 1600px; height: 900px`, so the scene
covered the top-left 80% of the section and the section's own gradient showed
beside it, with a hard edge at both boundaries.

Two changes, because one of them is insurance and the other is the fix.

The stylesheet holds the canvas at 100% of its container with `!important`,
which is what beats three's inline size. A renderer that is behind its box for
a frame now scales instead of exposing an edge — the failure mode becomes
invisible rather than obvious.

The scene observes its container and applies the box to the renderer, then asks
for a frame, since with `frameloop="never"` a new buffer that is never drawn
stays the colour it was cleared to. The comparison is against the size last
applied, not against the canvas's own box: the stylesheet now holds that box at
100% of the container, so the canvas agrees with the container even while the
renderer does not, and a check against it would never fire.

### What was and was not verified

The stylesheet rule was verified directly in the browser: a canvas carrying
`width: 900px; height: 500px` inline, inside the real container, renders at
1400x900 — the container's full box.

The runtime half was not exercised. The scene mounts behind an
IntersectionObserver, and the browser available here keeps its pane hidden, so
no frames run, no observations are delivered and the scene never mounts. Both
browser surfaces reachable from this session are also fixed at 400px wide, so
the desktop rendering could not be looked at either; the geometry above was
measured with an emulated viewport, where the same frozen frames are what left
the canvas stale in the first place.

### Still open: the reported edge

The canvas work above did not resolve it. What has been ruled out, measured at
a 2000x1118 viewport on the quiz section:

- No DOM element makes the seam. Every painted box in that viewport — body,
  `.home-journey`, `.shift-quiz`, `.home-journey__closing` — spans 0 to 2000.
  Nothing in the journey, quiz or header stylesheets draws a vertical rule, and
  there is no custom scrollbar styling anywhere in the project.
- The scene's own full-screen quads cannot leave a strip. They are scaled
  `2 * aspect` against an orthographic frustum of `+/-aspect`, and both take
  that aspect from the same `size`, so they cover it exactly.
- `body { overflow-x: hidden }` does make body a scroll container, which would
  narrow every section inside it by the width of a space-taking scrollbar. In
  this environment `innerWidth - documentElement.clientWidth` is 0 and every
  section measures the full 2000, so it is not happening here — but it would on
  a machine with classic scrollbars, and it would look exactly like the report.
  That is the leading candidate and it is not reproducible from here.

Why it could not be looked at: the browser pane in this session stays hidden,
so no frames run — the scene mounts behind an IntersectionObserver that never
fires, and screenshots come back blank. Both browser surfaces reachable from
the session are also fixed at 400px wide. Headless Chrome renders the top of
the page correctly, but the journey's on-demand render loop re-requests a frame
for as long as the scene is on screen, so under `--virtual-time-budget` the
page never goes idle and every capture below the hero came back unpainted.
