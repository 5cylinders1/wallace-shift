# About page: a continuous studio journey

The About hero uses a film rendered from an editable Blender scene. Two solid fins stand in one dark studio: brushed aluminum and blue optical glass, with a narrow blue light between them. Cycles calculates their lighting, contact shadows, refraction and floor reflections. The camera travels through this scene as the visitor scrolls; the browser displays the resulting film.

The fins have real closed geometry, machined bevels and fixed dimensions. Their final movement combines short lateral travel with restrained rotation. Their geometry does not morph. The graphite floor and curved backdrop are modeled surfaces; materials and light sources remain editable in Blender. No generated image is used as a material, environment or shipped background.

## Three connected camera beats

1. **Two people.** A low, wide three-quarter view places the pair on the right, leaving the left side clear for the opening copy.
2. **A direct line.** The camera tracks closer and across the pair. The objects occupy the left side while the second chapter appears on the right.
3. **One shared standard.** A wider view rises gently while the fins move into alignment, returning the copy to the left.

Camera poses, light settings, materials and rigid-object animation are authored in `scripts/blender/about_studio.py`. Camera keyframes scale with `--frames`. The current delivery target is 144 frames at 1920×1080 and 24 fps: a six-second source film. Scroll timing adds reading holds independently of the film's duration.

`src/components/AboutStudio/studioDirector.ts` maps scroll progress to the film position and chapter opacity. The two camera transitions happen between deliberate reading holds. `AboutStudio.tsx` requests the latest desired seek after decoding completes, rather than queuing every intermediate scroll position. The video is muted and scroll-controlled.

## Source and delivery files

| File | Purpose |
| --- | --- |
| `scripts/blender/about_studio.py` | Reproducible scene authoring and Cycles rendering. |
| `scripts/blender/encode_about_studio.sh` | Packages a completed PNG sequence into website media. |
| `review-assets/about-studio/about-studio.blend` | Editable generated scene, saved before rendering. |
| `review-assets/about-studio/sequence/frame_0001.png` through `frame_0144.png` | Full-resolution rendered frames. |
| `public/media/about/studio-journey.mp4` | H.264 source film for scroll seeking. |
| `public/media/about/studio-world.webp` | Full opening frame for initial display and desktop fallback. |
| `public/media/about/studio-world-mobile.webp` | 720×960 portrait crop centered on the opening pair. |

`review-assets/` is excluded from Git. Preserve or share the `.blend` and PNGs separately when they are needed; the tracked authoring script can regenerate the scene. The files in `public/media/about/` are the website delivery assets.

## Author, preview, render and encode

Run these commands from the repository root. The script was written for Blender 5.x. It selects a Metal GPU when one is available and otherwise uses the CPU. The scene uses Cycles, adaptive sampling, denoising and AgX color management. It creates a new scene without deleting existing scene objects.

Build and save an editable scene without rendering:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python scripts/blender/about_studio.py -- \
  --output review-assets/about-studio \
  --width 1920 --height 1080 --samples 48 --frames 144 --save-only
```

Render representative previews in one process. Use a separate preview directory so lower-sample frames cannot overwrite the final sequence:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python scripts/blender/about_studio.py -- \
  --output review-assets/about-studio-preview-hd \
  --width 1920 --height 1080 --samples 32 --frames 144 \
  --render-frames 1,72,144
```

Render the complete sequence after reviewing those compositions:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python scripts/blender/about_studio.py -- \
  --output review-assets/about-studio \
  --width 1920 --height 1080 --samples 48 --frames 144 \
  --render-animation
```

The default is save only. `--render-frame N` renders one preview; `--render-frames` renders several in the same process; `--save-only` suppresses rendering. The complete render also uses sequential still calls in one process, preserving Cycles data between frames. A prior animation-operator attempt failed during Metal pipeline compilation; the cause has not been established.

For manual art direction, open the generated `.blend`, select the `WALLACE SHIFT / About studio film` scene, and edit its objects, lights, materials or camera timeline. Render numbered PNGs into the same sequence directory. Re-running the Python authoring script reconstructs its programmed scene, so retain a separate copy of any manually edited `.blend`.

Package the completed sequence with FFmpeg containing `libx264`, plus `ffprobe` and `cwebp` for the posters:

```sh
bash scripts/blender/encode_about_studio.sh \
  review-assets/about-studio/sequence public/media/about 144
```

The encoder checks for every expected numbered frame before changing delivery assets. The MP4 uses H.264, CRF 18, 24 fps, `yuv420p`, fast-start metadata, a six-frame keyframe interval and no B frames. Both stills come from frame 1. The mobile still crops a 3:4 region centered at approximately 72% of the source width before resizing to 720×960. Update this crop if the opening camera composition changes.

## Responsive behavior and fallback

The cinematic enhancement uses the homepage's eligibility query: at least 1024px wide, hover support, a fine primary pointer, and no reduced-motion preference. The stage remains sticky across the desktop scroll journey. Smaller screens, touch-first devices and reduced-motion settings use the opening still and a shorter introduction. Below 700px, the portrait still sits beneath the opening copy in normal document flow.

The opening still is present before video decoding completes. Media errors or sustained loading/seeking failures switch to the static presentation. Hidden and offscreen states pause seek work. Inactive visual chapters are hidden from assistive technology and made inert; essential studio information remains in the page content below the hero.

`src/pages/AboutPage.tsx` and `AboutPage.css` own the editorial profiles, studio story, practical answers and closing contact links. Studio facts stay in `src/content/about.ts`. Profiles use names and biographies; no portrait or monogram tiles are fabricated. Practical answers retain native disclosure controls.

## Review before shipping

Inspect the completed film at normal speed as well as representative stills. Check forward and reverse scrolling, rapid scroll changes, the chapter reading holds and the transition into the people section. Confirm desktop, wide, short-height, tablet and phone framing; keyboard navigation; reduced motion; and failed-media fallback. Verify encoded dimensions, duration, frame count and seek behavior. Static checks and a successful build alone do not establish these browser or visual results.

### Local verification, September 14, 2026

The complete 144-frame sequence rendered successfully in Cycles on the Apple M2 Max Metal GPU at 1920×1080, 48 samples. The encoded H.264 file is six seconds, 24 fps, 2,893,236 bytes, with no B frames. Both WebP posters were generated from that final sequence.

Local browser review covered 1440×900, 1920×1080, 1024×900, 1440×650, and 390×844. The short layout was corrected to separate the copy from the bottom rail; the narrow layout was corrected to fade the film's edges into the page. A fresh mobile visit loaded the 720×960 poster without requesting the MP4 and had no horizontal overflow. Desktop reduced motion removed the video and extra chapters. A simulated video error restored the single static introduction.

An eight-second forward scroll followed by a six-second reverse scroll presented 411 decoded video frames. Maximum observed difference between requested and current film time was approximately 43 ms on this local run; this is a local measurement, not a guarantee for other devices. Both endpoints settled exactly at their intended media timestamps. Direct jumps restored all three reading holds, and fully faded chapters had no active links. The Meet your people anchor landed at the profile section below the fixed header. The ownership disclosure opened with Enter.

`node scripts/verify-about-studio.mjs` passes all six choreography contracts. The production build passes; lint has no errors and retains the existing `PitStopScene.tsx` fast-refresh warning. The existing large-chunk build warning remains. Review screenshots and the browser exercise script are in `review-assets/about-studio/`. Safari and Firefox have not been independently checked, and no production deployment was performed.

Suggested commit message: `Rebuild About as a cinematic Blender studio journey`
