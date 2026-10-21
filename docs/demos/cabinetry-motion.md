# Tambour motion: reel study, hardware curves and motion map

## 1. The reference reel, beat by beat

`example-contractor-website.mov` (root, untracked): 23.3 s, 60 fps, a laptop
filmed while someone scrolls one site. Beats were timed from a frame-difference
series at 10 fps (`|frame − previous|`, laptop screen only) and contact sheets
at 0.2 s. Hard cuts at 4.0 s, 8.9 s, 13.1 s and 17.7 s split it into five rooms.

| Room | Time | Beats (hold times in brackets) | Differs from the room before |
| --- | --- | --- | --- |
| Kitchen | 0.0–4.0 | blueprint held, flattens and fades (0.2) · wireframe over insulated framing (hold 0.5) · wireframe out, rough-in (hold 0.4) · drywall + cabinet boxes burst 1.7–2.2 · navy island, raw hood, ladder (hold 0.8) · hood, lanterns, stools 3.0–3.5 · finished (hold 0.4) | first room: blueprint dissolves into the wireframe |
| Bedroom | 4.0–8.9 | blueprint held (0.2) and **lowered out of frame** 4.2–4.6 · wireframe of bed and closet 4.8–5.2 · drywall 5.4–5.8 · navy panel wall 6.0–6.4 (hold 0.7, ladder) · closet lights on, chandelier 7.3–7.7 · bed and furniture 8.2 · finished (hold 0.5) | blueprint exits downward; last beat is **lights on** |
| Bath | 8.9–13.1 | blueprint held, lowered 9.3–9.5 · wireframe tub, shower, vanity 9.7–10.3 (hold 0.4) · framing 10.5 · drywall burst 10.8–11.1 · tile and vanities, slow 11.1–11.9 · tub, glass, fixtures, mirrors 12.1–12.9 | slowest build; the window stays the anchor |
| Basement | 13.1–17.7 | blueprint lowered · wireframe incl. coffered ceiling 13.5–13.9 · drywall 14.1–14.5 · paint and floors 14.7–14.9 · millwork, screen enclosure 15.1–15.5 (hold 1.0) · **screen lights up** 16.9 · stools 17.1 | longest hold before the lights-on beat |
| Pool | 17.7–23.3 | **title card** ("The backyard", a paragraph and a spec table) · plan-view blueprint held 0.6 · lowered, excavation · wireframe pool and pergola 18.9–19.1 · shell 20.1–20.3 · tile and water 21.1–21.3 · hardscape, pergola, planting 21.5 · water lights 22.4 (hold to end) | exterior; a title card introduces it |

Constants across rooms: one fixed camera per room; a possessive opening title
("Your retreat.", "Your own spa.", "Game on.", "Make a splash.") and a short
emotional closing line ("Rest easy.", "Your clubhouse.", "Summer, every day.");
bursts of change separated by holds of 0.3–1.0 s; and a "lights on" final beat.

## 2. Curves from cabinet hardware

`scripts/cabinetry/easing.py`, output in `output/cabinetry/hardware/` (`curves.json`, `curves.png`).

| Token | Source | cubic-bezier | Fit RMSE | Character |
| --- | --- | --- | --- | --- |
| `drawer` | **measured**: Pexels video 6631284 (kaboompics), a drawer pushed shut on its slides. Front edge tracked at 25 fps relative to the cabinet face (phase-correlation camera compensation); onset 2.24 s, flush 5.12 s | `0.604, 0.326, 0.836, 1` | 0.005 | slow build, steady travel, short damped stop |
| `hinge` | **modelled**: door pushed from 95°, free swing with hinge friction, soft-close damper engaging at 35° (spring + viscous damping) | `0.192, 1, 0, 0.743` | 0.008 | fast swing, long settle |
| `tambour` | **modelled**: slats pushed from rest for the first third of the track, then coasting against Coulomb friction, doubled on the curve | `0.379, 0, 0.524, 0.968` | 0.003 | rolls up from rest, coasts to a stop |

No licensed footage of a soft-close hinge or a tambour door was findable
(Pexels searches for cabinet doors closing and roll-top desks returned none),
and hinge makers do not publish engagement angles, so the hinge and tambour
parameters are stated assumptions, not measurements.

Durations are real time scaled for a screen: the measured drawer travel took
2.9 s; UI motion runs at about a third of that.

| Duration token | Value | Used for |
| --- | --- | --- |
| `quick` | 0.32 s, hinge | hover and press feedback |
| `rise` | 0.9 s, drawer | text lines and items settling into place |
| `reveal` | 1.2 s, hinge | image clip and mask reveals |
| `roll` | 1.4 s, tambour | wipes, the tambour door, page transitions |
| stagger | 0.08 s lines, 0.12 s items | |

## 3. Motion map

Rules: animate only transform, opacity, clip-path and masks. One pinned
sequence per page at most. Every section has one move; quiet sections are quiet
on purpose. Reduced motion shows everything in its final state.

### Home

| Section | What moves | Why | Trigger | Timing |
| --- | --- | --- | --- | --- |
| Header | divider and background only | orientation, not show | scroll position | 0.3 s |
| Build hero (kitchen) | blueprint, wireframe draw, stage wipes (existing); intro headline lines rise on load; each chapter title's lines rise when it becomes active | the reel's core: the room builds as you scroll | scrubbed (pinned) · load · chapter change | wipes `tambour`, blueprint `hinge`, lines `rise` |
| Statement | headline lines rise; the rule above the pillars draws left to right | a quiet breath after the hero | in view, once | `rise`, `roll` |
| *Quiet* | statement body and pillar text do not move | | | |
| Rooms (kitchen, bath, built-ins) | kitchen: the real photo uncovers and drifts (the hero already built a kitchen). Bath and built-ins build inside their frames as they cross the screen (bath: membrane → stone and vanity → finished; library: raw casework → painted → finished); numbers and headlines rise | the build idea carried down the page without another pin | scrubbed by the block's own travel (no pin) | wipes `tambour`, lines `rise` |
| Tambour door | the door rolls up | the brand's namesake, moving like the real thing | in view, once; button | `roll` |
| Workshop strip | photos uncover from the bottom; inside each frame the photo drifts | craft, shown in sequence | in view, staggered; drift scrubbed | `reveal`, 0.12 s stagger |
| Material library | tab change reflows the swatches (Flip); adding a sample flies its swatch into the sample box; swatches lift on hover like a drawer pull | tactile, cause and effect | click, hover | `rise`, `quick` |
| Process | a gold line runs across the five steps; each step's number turns gold as the line reaches it | sequence made visible | scrubbed | linear with scroll |
| Investment | each range rolls up digit by digit, like slats | numbers arriving, not appearing | in view, once | `roll`, 0.06 s per digit |
| *Quiet* | FAQ: answers fade in when opened, nothing else | reading space | click | `quick` |
| Closing | the photo eases from 1.12× to 1× as it arrives; headline lines rise | the last frame settles | scrubbed; in view | `rise` |
| Footer | nothing | | | |

### Room pages (kitchens, baths, built-ins)

| Section | What moves | Trigger | Timing |
| --- | --- | --- | --- |
| Hero, kitchens | photo settles from 1.1× on load, then drifts with scroll; title lines rise | load; scrubbed | `reveal`, `rise` |
| Hero, baths and built-ins | their own build film (pinned, 460vh): blueprint, wireframe, five wipes ending on an evening lights-on frame; chapter titles rise | scrubbed (pinned) | wipes `tambour`, blueprint `hinge`, lines `rise` |
| Intro | big copy lines rise; facts rows rise in sequence | in view | `rise`, 0.12 s |
| Lookbook | each photo uncovers; opening one morphs it into the viewer | in view; click (View Transition) | `reveal`; `roll` |
| Anatomy (kitchens) | hotspots appear in sequence, like a survey; the detail panel's text rises on change | in view; click | `quick` per spot, `rise` |
| Features | photos uncover, text rises | in view | `reveal`, `rise` |
| Next cards | lift on hover | hover | `quick` |

### Between pages

A View Transition: the new page rolls up over the old one from the bottom
edge, like a tambour (`roll`). Skipped under reduced motion and where the API
is missing.

## 4. How it is checked

- Chrome DevTools Protocol, headless Chrome: a scripted scroll through every
  page with CPU throttled 4× and at a 390×844 phone viewport, recording long
  animation frames, layout shifts (CLS) and interaction latency (INP).
- Reduced motion emulated through the protocol (`prefers-reduced-motion:
  reduce`); content and controls compared with and without.
- A screen recording of a scroll through the home page, placed next to the reel
  at the same scroll pace.
