# Dopps Chiropractic: immersive 3D website concept

A one-page concept for a **real** prospect, Dopps Chiropractic (Dr. Rory Dopps,
D.C.), 7811 W 151st St, Overland Park, KS. Built 2026-11-11 from Matthew's brief:
make a spine in Blender, build an immersive 3D site around it, use the practice's
reviews and business information, and add a booking form and an interactive
symptoms/cause section with mobility advice.

- Local: `/demo/dopps` or `/demos/dopps/` (launch config `dopps-demo-preview`,
  port 5190; no cookie needed).
- Production (once deployed): `https://wallaceshift.com/demo/dopps`, public and
  unindexed (`noindex` meta plus `X-Robots-Tag` on `/demo/dopps` and `/demos/dopps`).
- Document `demos/dopps/index.html`, code `src/demos/dopps/`, model pipeline
  `scripts/dopps/`, media `public/demos/dopps/`. `dopps` is in `PUBLIC_DEMO_DIRS`
  and the authenticated demo directory. No Wallace Shift branding on the page.

## The spine

`scripts/dopps/build_spine.py` builds it in background Blender (5.1) from code,
so nothing is downloaded or licensed and a rebuild is one command:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/dopps/build_spine.py -- \
  glb=public/demos/dopps/spine.glb renders=<scratch dir> samples=32
```

- 24 presacral vertebrae with their own proportions: the atlas ring, the axis
  with its dens, bifid cervical spinous processes, C7's long spine, long
  downward-sloping thoracic spines, hatchet-shaped lumbar spines and long lumbar
  transverse processes. Each is built from simple primitives (kidney-shaped body,
  pedicles, plate-like laminae, processes), fused with a voxel remesh, smoothed
  and decimated to a web budget (1,400–2,400 triangles).
- 23 discs, a sacrum lofted as a curved shield with four pairs of foramina
  drilled through, and the coccyx. Everything sits on a sagittal profile with
  cervical lordosis, thoracic kyphosis and lumbar lordosis (75 cm total).
- The spinal cord (tapering at the conus, then the cauda equina), a pair of nerve
  roots at every level and both sciatic nerves, hidden on the page until a
  nerve-related view switches to X-ray.
- Ambient occlusion is baked into vertex colours with Cycles. Export is a
  428 KB Draco GLB with 108 named objects; each carries `label`, `region` and
  `kind` extras so the site can pick and tint it. The Draco decoder is copied
  from three.js into `public/demos/dopps/draco/`.
- The renders flag lets you check the model from five cameras before exporting.
  `spine-poster.webp` (shown while loading and without WebGL) and `preview.jpg`
  come from those renders.

It is a clean, readable teaching model rather than a medical-grade scan: no ribs,
skull or pelvis, and simplified facets.

## The page

- **Stage** (`StageProvider.tsx`, `engine/SpineStage.ts`): one fixed, full-screen
  three.js canvas behind the hero, the tour and the symptom guide. Sections claim
  the camera as they cross the middle of the screen (`useStageSection`), and the
  stage eases toward each section's shot (`shots.ts`): framing, angle, which bones
  glow (Dopps blue for regions, coral for pain) and X-ray mode for nerves. Hover
  labels a vertebra; clicking one opens the matching symptom; drag rotates. The
  loop stops when the solid sections cover the stage or the tab is hidden.
  `window.dopps.step(dt)` advances it by hand for headless checks.
- **Hero**, then a six-chapter tour: overview, cervical, thoracic, lumbar,
  sacrum and the nerves (X-ray with the L4–S1 roots and sciatic nerves lit).
- **Symptom guide**: nine symptoms. Each sets the camera on its levels and shows
  common causes, three mobility moves (held stretches have a timer), "get checked
  now if" warnings, how the practice helps, a matching patient quote and "Book a
  visit for this", which prefills the form.
- Care (services and the first-visit steps), Dr. Rory, reviews with topic
  filters, the booking form, visit details with live open/closed status in
  Central time, footer.
- Phones: the spine sits in the upper part of the screen with copy below; in the
  guide a transparent window between the intro and the symptom chips shows it.
- Reduced motion: camera moves snap, no sway, no reveals or pulses.

## Booking

`submit.ts` has `REQUEST_ENDPOINT = null`, so the form validates and then says the
request was not sent and links to the practice's real Square scheduler and phone.
Days offered are the open days (Monday, Wednesday, Friday) over the next three
weeks; times are windows, and the office is said to confirm.

## Sources of fact (read 2026-11-11)

All copy facts are in `src/demos/dopps/content.ts`.

- **Google Business Profile**: 5.0 from 59 reviews (all 5 stars, 53 with text),
  7811 W 151st St in Stanley Square Shopping Center, (913) 608-5441, hours Monday,
  Wednesday and Friday 9 a.m. to 7 p.m. (closed the other days), Square booking
  link, wheelchair-accessible entrance, parking and restroom, owner post about
  runners. Reviews were read through Google Search's review panel because the
  signed-out Maps view shows only five.
- **Practice site** (doppskc.com redirects to doppschiropracticop.com): Parker
  University 2004, University of Kansas biology and anatomy, started in Wichita,
  official chiropractor for the Wichita Thunder, Wingnuts and Junior Thunder,
  sixteen chiropractors in the family, patients from newborns to athletes,
  services list, first-visit steps, paper-lite forms, email dopps@doppskc.com,
  social links, auto-accident offer, Dr. Rory's portrait (the seated blue
  portrait used here).

Reviews: 22 are shown verbatim, long ones shortened with "…" and marked
"excerpt". Two of the 59 were left out on purpose: one is about falafel, and one
is a long, generic letter about hiccups. There is no review schema (Google
does not allow marking up reviews copied from Google).

## Confirm with Dr. Dopps before showing it as his

- **The symptom guide is Claude-authored general education.** Causes, moves,
  doses and red-flag lists follow common conservative guidance, but he should
  review every word, especially the warnings, the nerve glide and anything
  pregnancy-related.
- The site's years-in-practice wording conflicts ("since 2004", "since 2017" in
  Overland Park, "over 40 years"); the page says only Parker 2004 and Wichita.
- The auto-accident offer reads "$ Out of Pocket" on his site (the figure is
  missing), so the page only says to ask about out-of-pocket costs.
- Where visit requests should go (Square already handles his bookings).
- Headline, chapter copy and service one-liners are Claude's wording.
