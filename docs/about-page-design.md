# About page: enter the identity

The About hero is a scroll-controlled film rendered from an editable Blender scene. The camera approaches two monumental material surfaces, enters the space between them, travels through their shared passage, then cranes upward. The final view reveals that the architecture's ground plan is the Wallace Shift mark.

Both structures use the literal closed paths in `public/brand/wallace-shift-logo-white.svg`: the left outline has 11 corners and the right outline has four. Their combined footprint is 30 metres wide and approximately 16.42 metres deep, extruded to 7.2 metres with machined bevels. They remain fixed throughout the film. The reveal changes the camera's perspective and the lighting; it does not introduce a separate logo or slide props into a new arrangement.

The left structure is brushed aluminum, and the right is solid blue optical glass. Cycles calculates their surface reflections, transmission, absorption, lighting and contact with the graphite ground. Physical light inlays trace the passage, and broad lights reveal the whole structure during the crane. The ground and distant cyclorama are modeled surfaces. No generated image supplies the materials or environment.

## Camera and page choreography

The camera uses a continuous interpolated path with frame-by-frame position, quaternion and focal-length keys. It enters at low height, follows the negative space between the two original brand outlines, then rises beyond the walls into a wide view. The source script checks sampled camera positions against the solid footprints and requires at least 0.18 metres of wall clearance below the roofline. This geometric check does not replace inspection of rendered compositions or motion.

The delivered film contains **240 frames at 1920×1080 and 24 fps**, producing a ten-second source film (7,944,050 bytes). The page adds reading holds independently of the film's runtime:

| Normalized page progress | Film and copy |
| --- | --- |
| 0–0.06 | Opening frame holds with “Two people. One shared standard.” |
| 0.06–0.40 | Camera approaches and enters the shared passage; film advances from 0% to 50%. |
| 0.40–0.48 | Interior view holds with “Connected by the work.” near the bottom center. |
| 0.48–0.90 | Camera continues through the passage and cranes upward; film advances from 50% to 100%. |
| 0.91–1 | Final composition holds with “One shared standard.” on the left, followed by the people section. |

Copy fades leave the scene unobstructed at progress 0.15–0.35 and 0.57–0.84. The rail's chapters are “A closer look,” “Inside the connection,” and “The whole picture.” These timings live in `src/components/AboutStudio/studioDirector.ts`; `AboutStudio.tsx` applies their opacity values and requests the newest desired media time after the previous seek completes.

## Source and delivery files

| File | Purpose |
| --- | --- |
| `scripts/blender/about_studio.py` | Reproducible geometry, materials, lights, camera animation and Cycles rendering. |
| `scripts/blender/encode_about_studio.sh` | Encodes a completed PNG sequence and prepares both website posters. |
| `review-assets/about-identity-final/about-studio.blend` | Editable final scene, generated and rendered locally. |
| `review-assets/about-identity-final/sequence/frame_0001.png` through `frame_0240.png` | Complete full-resolution render sequence, rendered at 32 Cycles samples. |
| `review-assets/about-identity-preview/sequence/` | Preview frames for composition review. |
| `public/media/about/studio-journey.mp4` | H.264 film used for desktop scroll seeking. |
| `public/media/about/studio-world.webp` | Full opening frame for initial display and desktop fallback. |
| `public/media/about/studio-world-mobile.webp` | 720×720 square showing the complete mark from the final crane view. |

`review-assets/` is excluded from Git. Preserve or share the `.blend` and rendered frames separately when needed; the tracked authoring script can regenerate the scene. Only the media under `public/media/about/` is intended for website delivery.

## Author and render

Run from the repository root with Blender 5.x. The script selects a Metal GPU when available and otherwise uses the CPU. It uses Cycles, adaptive sampling, denoising and AgX color management. It creates a new scene without deleting existing scene objects.

Save an editable scene without rendering:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python-exit-code 1 --python scripts/blender/about_studio.py -- \
  --output review-assets/about-identity-final \
  --width 1920 --height 1080 --samples 32 --frames 240 --save-only
```

Render selected compositions into a separate preview directory so they cannot overwrite final frames:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python-exit-code 1 --python scripts/blender/about_studio.py -- \
  --output review-assets/about-identity-preview \
  --width 960 --height 540 --samples 16 --frames 240 \
  --render-frames 1,54,120,173,240
```

Render every final frame after reviewing the camera path and materials:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python-exit-code 1 --python scripts/blender/about_studio.py -- \
  --output review-assets/about-identity-final \
  --width 1920 --height 1080 --samples 32 --frames 240 \
  --render-animation
```

The default is save only. `--render-frame N` selects one preview, `--render-frames` selects several, and `--save-only` suppresses rendering. `--render-step N` can create a sparse animation preview, but the website encoder requires every numbered frame. The full render uses sequential still calls in one process to retain Cycles data. A prior animation-operator attempt failed during Metal pipeline compilation; its cause has not been established.

For manual art direction, open the `.blend`, select `WALLACE SHIFT / About studio film`, and edit the scene or camera timeline. Render numbered PNGs into the sequence directory. Keep a separate copy of manual edits: rerunning the authoring script reconstructs its programmed scene.

## Encode and publish the local media

The packaging script requires FFmpeg with `libx264`, `ffprobe`, and `cwebp`. Its defaults are the final directory above, `public/media/about`, 240 frames, and the last frame for the mobile poster:

```sh
bash scripts/blender/encode_about_studio.sh \
  review-assets/about-identity-final/sequence public/media/about 240
```

An optional fourth argument selects another mobile poster frame within the sequence:

```sh
bash scripts/blender/encode_about_studio.sh \
  review-assets/about-identity-final/sequence public/media/about 240 240
```

All expected PNGs must exist before encoding starts. The script encodes all three outputs into a temporary directory on the destination filesystem, then renames each completed file into place after all encodes succeed. Each rename is atomic; the three-file set is not a single transactional filesystem operation. Failed encoding leaves the previous delivery files intact.

The MP4 uses H.264, CRF 18, 24 fps, `yuv420p`, fast-start metadata, fixed six-frame keyframe intervals and no B frames. The desktop poster uses frame 1. The mobile poster defaults to the last frame so both brand structures remain visible; the opening's close architecture does not make a useful narrow crop.

The mobile crop is square, sized to 58% of the source width and limited to the source height. It centers at 68% across and 48% down, then clamps to the image bounds and resizes to 720×720. At 1920×1080 this produces a 1080×1080 crop beginning at approximately x=765, y=0. Review the complete mark and its surrounding space after any final-camera change, and adjust the crop if necessary.

## Responsive presentation and fallback

The cinematic enhancement uses the homepage's eligibility query: at least 1024px wide, hover support, a fine primary pointer, and no reduced-motion preference. The stage remains sticky across a five-viewport section. Media seeks stop while the stage is offscreen or the document is hidden. Media errors or sustained loading/seeking failure restore the shorter static introduction.

Below 700px, the `<picture>` source uses the square mobile poster. Other static layouts use the opening poster. Mobile and reduced-motion visitors do not load the video or the additional film chapters. Inactive cinematic chapters are hidden from assistive technology and made inert; essential studio information remains in the native content below the hero.

`src/pages/AboutPage.tsx` and `AboutPage.css` own the profiles, studio story, practical answers and closing contact links. Studio facts remain in `src/content/about.ts`. The cinematic architecture is an abstract expression of the brand, not a photograph or representation of a physical office.

## Verification status for this revision

Local verification completed September 15, 2026. All 240 full-HD frames rendered successfully on the Apple M2 Max Metal GPU. The tracked script and frozen render source have the same SHA-256 hash. FFprobe confirms H.264, 1920×1080, 24 fps, 240 frames, ten seconds, no B frames, and a 7,944,050-byte file. The desktop poster is 1920×1080; the final-view mobile poster is 720×720.

The seven pure choreography contracts pass with `node scripts/verify-about-studio.mjs`. They cover bounded endpoints, reading holds, sustained forward travel, continuous film/immersion/opacity channels, copy separation, unobstructed forward/reverse passages and deterministic jumps. Production build and lint complete successfully. Existing warnings remain for the large homepage material bundle and the React Fast Refresh export in `PitStopScene.tsx`.

Rendered review includes opening, passage, crane and final full-resolution frames, plus the encoded sequence sampled every quarter second. The same scene was reviewed in the page at 1920×1080, 1440×900, 1024×900 and 1440×650. The close passage fills tall or wide viewports; its framing returns to contain before the final copy appears so the whole mark stays visible. The final headline and mark remain separated, and the interior caption clears the forward view.

The delivered HD film was exercised in Chromium at 1920×1080 with an eight-second forward scroll and six-second reverse scroll. The browser presented 555 decoded-frame callbacks; the largest observed difference between requested and current media time was 0.061 seconds. Forward travel settled at 9.958333 seconds (the final frame), reverse travel returned to zero, and opening/interior/final holds exposed only their active copy. These are local run measurements, not cross-device performance guarantees. Evidence is in `review-assets/about-identity/final-scroll-verification.json`.

The final people link landed with the section at y=107 below the header at y=83 on the wide viewport. A deliberately invalid video source triggered the static fallback: video removed, opening fully visible, section reduced to one viewport, no horizontal overflow. Independent final delivery checks used fresh mobile 390×844 and reduced-motion 1440×900 loads with no DOM substitutions: the correct 720×720 and 1920×1080 posters loaded, neither layout created a video or requested the film, and neither overflowed. The complete mobile mark was visually inspected. Earlier fallback checks also verified keyboard disclosure operation and native contact navigation. Evidence: `review-assets/about-identity-final-fallback-verification.json` and `review-assets/about-identity-fallback-verification.json`. The final desktop browser error log was empty.

The encoder also passed a three-frame fixture and rejected incomplete input or an out-of-range poster frame without replacing existing fixture outputs. Shell syntax and whitespace checks pass. This revision is verified locally; it has not been deployed.

Suggested commit message: `Turn the About film into a journey through the Wallace Shift identity`
