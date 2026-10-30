# Painting demo 01: Complete Painting LLC

A website concept for a **real** painting company, Complete Painting LLC of
Bonner Springs, Kansas, (913) 742-1506. As with Trawsome, the business facts
are real and sourced; nothing else about the business is invented.

- Local entry: `/complete-painting` or `/demos/painting/` on the dev server
  (launch config `complete-painting-demo-preview`, port 5183; no cookie needed).
- Production route: `https://contractors.wallaceshift.com/complete-painting`,
  **public** and unindexed: `noindex` meta plus an `X-Robots-Tag` header on
  `/complete-painting` and `/demos/painting`.
- Document `demos/painting/index.html` (public build pass), code
  `src/demos/painting/`, media `public/demos/painting/`, handlers
  `api/_lib/paint/`. `painting` is in `PUBLIC_DEMO_DIRS`; there is no gate key.
- Lander: an open tile in a new "House painting" row (`kind: 'open'` in
  `src/demos/contractors/catalog.ts`), with `preview.jpg` (the house split
  before/complete) as its poster. Painting left `nextTrades`.

## Sources of fact

Everything the page says about the business is in `src/demos/painting/content.ts`.
Checked 2026-10-29:

- The business's own site, completepaintingllc.net, was already offline (its
  domain has nameservers but no address record), so it was read from
  search-engine copies: services (interior, exterior, commercial painting,
  cabinet refinishing, rotten wood replacement and how rot is handled: assess,
  remove, install new wood), Bonner Springs, the phone, the email, hours
  (Mon–Fri 8–5, Sat–Sun 8–noon), "25 years of experience" and a mission
  statement, which the page paraphrases rather than quotes.
- Facebook page "Complete Painting, LLC | Kansas City KS".
- Yelp and Manta list "Complete Painting" with the same phone at a Kansas City,
  KS street address (and an older domain, completepaintingks.com, also dead).
  The address is **not** published; the page names Bonner Springs and the
  Kansas City area only.
- The 2023 LLC registration came from Matthew.

No owner name, reviews, ratings, prices, warranties or licences were found, so
none are shown. The email's local part suggests a name; it is not used as the
owner's name. The process section is the standard sequence of an exterior
repaint (it mirrors the hero) and is flagged in `content.ts` to confirm with
the business before launch, as are generic service bullets such as "Furniture
and floors covered".

## Hero timelapse

`Hero.tsx` repaints one house from one camera across five frames on a canvas:
before, wash & scrape, repair & prime, paint, complete. Each transition reveals
the next frame the way the work happens: a soft edge sweeps down the house
(washing), primer appears in short strokes along the boards, the new color
goes on course by course from the eaves down with alternating directions and a
feathered wet edge, then the masking fades off.

Scrolling drives it. The hero is full bleed and pins for about 4.9 screens:
the title lifts toward the viewer as the camera pulls back (0.55 screens), the
repaint plays (2.8), the finished house holds under a close-out offer (0.55),
then the statement section slides up over it like a sheet while the house tips
back into the dark (1). A caption and a five-part stage rail track progress;
each stage button scrolls to that stage's hold. Wide screens open slightly
close and settle on the whole house; tall screens open on the porch, filling
the screen, then pull back to a full-width band with the caption above and the
rail below. Reduced motion shows stills with stage buttons and no pinning. In
dev, `?hero=0.66` jumps to that moment.

### Imagery provenance

All house, room and storefront photographs are generated illustrations,
disclosed in the footer. Made with gpt-image-2 by `scripts/painting/generate.py`
under an approved **$5** cap (Matthew, 2026-10-29), logged with prompts in
`output/painting/ledger.json` (ignored). **$2.02 spent over 15 calls**: 5 hero
frames plus one regenerated `painted` frame (v1 drifted to navy), 4 section
photos, 4 prepared studio looks and 1 browser test render.

The finished house was generated first; `weathered` is an edit of it,
`prepped` of `weathered`, `primed` of `prepped`, and `painted` adds the
masking back onto the finished house. `scripts/painting/composite.py` then
aligns each stage to the finished frame (SIFT + RANSAC; at most 0.57 px of
drift) and pastes only real changes inside the house and drop-cloth area onto
the finished frame, so sky, trees and lawn are pixel-identical in every stage
and no reveal can show a seam. `painted` is also colour-matched to the finished
siding (median residual ΔE 2.3) so the last fade has no hue jump. Composite
needs numpy, Pillow and opencv-python-headless in a scratch virtualenv;
`scripts/painting/export.py` writes the WebP set, `studio/sample.jpg` and
`preview.jpg` (run with `PAINTING_PYTHON=<venv>/bin/python`).

## Scroll choreography

The page is meant to feel like walking through a space. CSS 3D transforms
with GSAP ScrollTrigger; no WebGL.

- **Statement sheet** (`Statement` in `CompleteApp.tsx`): overlaps the hero's
  last screen (`.cp-is-staged .cp-sheet` pulls it up by one hero height) and
  its title lines arrive out of the depth.
- **Services hall** (`Services.tsx`): the dark section opens out of a door-sized
  clip-path. At 900×600 and up it pins for about 4.5 screens and the camera
  walks down a hall: the title, then each board swings in from alternating
  walls, holds square to the viewer (`stepped()` in `motion.ts`) and passes by.
  The floorboards are drawn on a 2D canvas in matching perspective. A real 3D
  floor plane was tried and dropped: its layer was thousands of pixels deep and
  made the browser drop other layers.
- **Color studio, estimate form**: tip up off the floor as they arrive.
- **Process wall** (`Process.tsx`): at 900×600 and up the steps stand on the
  inside of a curved wall that swings in, then pins for about 3 screens while
  the view pans one step at a time.
- **About** photo turns as you pass it, FAQ answers unfold, and the closing
  photo eases back from the front door. Headings and short copy arrive out of
  the depth (`data-near`).
- Narrower screens get per-item tilts instead of pinned scenes; reduced
  motion gets plain lists. The header stays light over the hero until the
  sheet passes under it.

## Color studio

`visualizer/ColorStudio.tsx`: upload a house photo (resized and compressed in
the browser; HEIC is refused with export advice), pick siding (11 named colors
or any custom color), trim (incl. match body / keep) and door, choose quick or
detailed, agree to send the photo to OpenAI, and compare before/after with a
draggable, keyboard-operable divider. Results can be downloaded or carried into
the estimate form ("Use these colors in my estimate").

The sample house is the weathered plate. Five looks are prepared and instant:
the timelapse's own colors plus four made through the live endpoint by
`scripts/painting/prepare-samples.mjs` (about $0.055 and 27 s each). So the
studio demonstrates itself even while live previews are off.

`POST /api/paint-render` builds the prompt only from allowlisted palette ids
in `visualizer/palette.ts` (plus a validated hex), validates the photo with
the roof studios' header checks, and calls the shared `renderRoof` image edit
(gpt-image-2, framing preserved). Results are cached per visitor for 30
minutes; a failed or timed-out call cools down for five minutes so a retry
can't pay twice; at most two run at once. Uploads are never stored.

**Live previews are off in production until configured:**

| Variable | Default | Purpose |
| --- | --- | --- |
| `PAINT_RENDER_ENABLED` | unset | `true` to allow live previews outside local dev |
| `PAINT_RENDER_ORIGIN` | unset | Exact page origin, e.g. `https://contractors.wallaceshift.com` |
| `PAINT_RENDER_PER_HOUR` | 4 (max 12) | Previews per visitor per hour |
| `PAINT_RENDER_DAILY_CAP` | 25 (max 100) | Previews per day, site-wide |
| `OPENAI_API_KEY` | shared | Image key (already used by the roof studios) |
| Upstash limiter | shared | Required; without it live previews stay off |

Each slot is reserved before the paid call, so a refused request costs
nothing. Worst case at the default cap is about 25 × $0.055 ≈ $1.40 a day. In
local dev the limits are in memory per server process.

## Estimate request

`POST /api/paint-request` validates, rate-limits (6 an hour per IP), and emails
the request through Resend once `RESEND_API_KEY`, `PAINT_REQUEST_TO_EMAIL` and a
verified sender (`PAINT_REQUEST_FROM_EMAIL`, else `CONTACT_FROM_EMAIL`) are set.
Until then it answers `not_configured` and the page says **nothing was sent**
and offers call/text. A honeypot field answers bots with a fake success.

## Deployment routing

The project is at Vercel's 12-function limit (11 API entries plus Node
middleware, enforced by `scripts/test-lawn-api.mjs`), so the paint endpoints
share `api/lawn.ts` like the lawn ones: `/api/paint-render` and
`/api/paint-request` rewrite to `/api/lawn?action=paint-render|paint-request`,
and Vite mounts the same dispatcher locally. That function's `maxDuration`
rose from 20 to 180 seconds for the image call; lawn handlers keep their own
short timeouts.

## SEO

Title, description, Open Graph with the split before/after image,
`HousePainter` JSON-LD (no street address; Bonner Springs locality, hours,
services, Facebook) and FAQPage JSON-LD built from the visible answers. One
`h1`, ordered headings, labelled form controls, preloaded first hero frame,
lazy section images, `tel:`/`sms:` links. `noindex` and canonical to the demo
URL while on the Wallace Shift host; when it moves to the business's own
domain, drop `noindex` and point canonical/og:url there.

## Not done

- Confirm with the business: owner name to show (if any), the process wording,
  the service bullets, service area, and whether estimates are free.
- Their logo, if one exists; the fan-deck chip mark is a placeholder.
- Production settings for live previews and the estimate inbox (above).

## Verification (2026-10-29)

`npm run build` (deployment checks, TypeScript, both Vite builds, 19 private
documents, blog), `node scripts/test-demo-preview.mjs` (599 responses),
`node --test scripts/test-demo-access.mjs` (36/36, incl. the new public-demo
test), `scripts/test-lawn-api.mjs` (7/7, incl. paint dispatch, previews-off,
origin and limiter refusals, request validation and a mocked Resend send),
`eslint .` 0 errors. Browser at 1440×900 and 390×844: hero frames at 0.38,
0.66, 0.7 and 1; every section; no horizontal overflow on the phone; a live
olive repaint of the sample house through the UI; the hourly cap refusing a
fifth preview before any paid call; colors carried into the form; the
unconfigured request showing "nothing was sent"; the lander tile. The hidden
browser pane freezes animation frames, so autoplay itself was checked by held
moments rather than watched.
