# Water demo: Riffle Water Co.

A concept site for a whole-house water filtration company. The brand is fictional
(no business found using it when it was checked; 555-01xx phone, `.example` email).
Every outside fact on the page is real and sourced; product sizes, prices, service
intervals and the process are samples, and the footer says so.

- Local entry: `/riffle` or `/demos/water/` on the dev server (launch config
  `riffle-demo-preview`, port 5184).
- Production route: `https://contractors.wallaceshift.com/riffle`, **public** and
  unindexed (`noindex` meta plus `X-Robots-Tag` on `/riffle` and `/demos/water`).
  `water` is in `PUBLIC_DEMO_DIRS` and built in the public Vite pass, like Trawsome.
- Document `demos/water/index.html`, code `src/demos/water/`, media `public/demos/water/`,
  model pipeline `scripts/water/`.
- Lander: an open tile in a "Water treatment" row (`kind: 'open'` in
  `src/demos/contractors/catalog.ts`). No preview film.

## What the visitor does

One 3D house, one camera, one continuous visit.

| Chapter | Interaction | Point it makes |
| --- | --- | --- |
| Hero | Watches clean water race through the pipes on load; drags to look around | The idea, before reading anything |
| Why whole-house | No filter / under-sink / whole-house; live "n of 8 fixtures" count | One tap versus every tap |
| Inside the system | Tank shells lift off; picks a contaminant and follows it | What each stage does, and what gets through |
| At home | As it arrives / through Riffle, in kitchen, shower and machines | What changes day to day |
| Time-lapse | Years, hardness and hot water sliders; pipes cut lengthwise | What scale does over 15 years |
| At true scale | People slider; a block of water at model scale | Why one faucet is not much |
| What it costs | Home size and people sliders; a to-scale drawing of the tanks | One installed price, yearly filter care and a ten-year total |
| Schedule an installation | Form carries the price over and asks for a preferred day | The next step |

Lead and germs deliberately pass through the tracer and say so. That candor is the
sales pitch, and it is also just accurate.

## How the model is made

Background Blender builds the house from code and bakes its light, so nothing downloaded
needs licensing and a rebuild is one command.

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/water/bake.py -- --samples 320 --size 2048
```

- `src/demos/water/engine/layout.json` is shared by the Blender build and the live engine.
  Change a fixture there and both move.
- `scripts/water/build_house.py` models six zones (shell and each room group), each baked to
  its own texture. Faces must point at the room: bakes shoot from the side a face points at,
  so a flipped wall bakes black. Faces that coincide trap light and also bake black.
- `scripts/water/bake.py` bakes diffuse light only and writes colour through the scene's view
  transform, so baked texels match a Cycles render. Output: `public/demos/water/baked/` and
  `house.glb`. Raw PNGs go to `output/water/baked/`.
- `scripts/water/preview.py` renders look-dev frames from fixed cameras in seconds.
- `scripts/water/stills.mjs` captures the poster stills and lander preview from the live page.
- `scripts/water/walkthrough.mjs` walks every chapter at four viewports plus reduced motion and no WebGL, checking states, overflow and console errors. Screenshots go to `output/water/shots/`. Both need the dev server and use the installed Chrome.

The engine (`src/demos/water/engine/`) draws the baked house unlit, then everything that has
to react live: pipes and flow (`plumbing.ts`, from the graph in `network.ts`), tanks and
tracers (`system.ts`), taps, shower and steam (`fixtures.ts`), the scale study (`study.ts`)
and the water block (`volume.ts`). `stage/director.ts` maps scroll position to camera and state.

Small textures load first, then full-size ones replace them on capable devices. In a hidden
Browser pane requestAnimationFrame drops to about 2 fps, so drive `window.riffle.step(0.1)`
in a loop to settle state before judging a frame.

## Pricing

`quote()` and `systemSizes` in `content.ts`. The system size is the larger of what the home
and the household call for, and the price belongs to the size, so it moves in steps. Filter
care adds a charge per person, so the yearly and ten-year figures move with every person.
Home size stands in for peak flow and people for yearly gallons (using the same end-use
figure as the water block).

All prices are invented samples, set inside the roughly $850 to $5,400 installed range that
2026 cost guides quote. Those guides are low authority, so the page doesn't cite them. A real
company's price sheet replaces `systemSizes` and `CARE_PER_PERSON`.

## Sources

Listed on the page (`sources` in `content.ts`). Notes on using them:

- Battelle tested softened water against hard water, not TAC. The efficiency figure is shown as
  the cost of untreated hard water, and the TAC benefit is shown separately from the WateReuse
  / Arizona State study (over 88% less scale). They are never combined into one number.
- The WQA hardness bands vary between sources at the soft end; the page uses the 1.0 / 3.5 / 7 /
  10.5 grains-per-gallon version.

Before showing a real company: replace the fictional brand, phone, email and prices, and use
its real product certifications. The PFOA/PFOS and VOC tracer copy depends on what a system is actually
listed for. The form says nothing is sent; route it before launch.
