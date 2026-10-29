# Lawn demo 01: Trawsome Lawn Care

A website concept for a **real** local business, Trawsome Lawn Care (Ben Traw,
Stilwell/Bucyrus, Kansas), which has a Nextdoor page but no website. Unlike the
other trade demos, the brand, story and contact details are real; nothing else
about the business is invented.

- Local entry: `/trawsome` or `/demos/lawn/` on the dev server.
- Production route: `https://contractors.wallaceshift.com/trawsome`, **public**
  (no access request, email code or agreement) and unindexed: `noindex` meta plus
  an `X-Robots-Tag` header on `/trawsome` and `/demos/lawn`. Send Ben that link.
- Document `demos/lawn/index.html` (built in the public pass, like Bucyrus), code
  `src/demos/lawn/`, media `public/demos/lawn/`, function `api/lawn.ts` (shared dispatcher), handlers `api/_lib/lawn/handlers/`, and
  `api/_lib/lawn/`. There is no gate key; `lawn` is in `PUBLIC_DEMO_DIRS`.
- The estimator APIs are public too, behind per-IP limits: 300 suggestions,
  40 lookups and 6 requests an hour.
- Local preview: launch config `trawsome-demo-preview` (port 5182); no cookie needed.
- Lander: an open tile in the "Lawn & yard care" row of the contractors gallery
  (`kind: 'open'` in `src/demos/contractors/catalog.ts`). It has no preview film;
  the tile opens the demo. Add a film later by making it a `film` entry.

## Sources of fact

Everything the page says about the business lives in `src/demos/lawn/content.ts`
and comes from the public Nextdoor page: Ben's story and guarantee (quoted in his
own words), the services he lists, phone, email, and Neighborhood Favorite
2022–2025. The "What neighbors say" themes paraphrase Nextdoor's AI summary of
recommendations and are labelled as such; no individual reviews, ratings, counts,
prices or years in business are shown. (That summary calls him "Joseph"; the page
uses Benjamin, from his own story.)

No street address is published. The page names Stilwell, Kansas and a list of
nearby towns (`serviceTowns`), chosen as the towns whose centers fall inside the
default 15-mile radius. The business coordinates exist only in the environment.

## Hero

A pinned scroll story on one canvas (`Hero.tsx`): the overgrown yard, mown pass
by pass along the lawn's own stripe direction (alternating like a mower), then
the beds, shrubs and drive swept clean from left to right. Desktop puts the copy
on deep green at the left and the yard full height at the right, so nothing
covers the house; at 1020 px and below the copy sits above the yard. Reduced
motion shows a still with stage buttons. In dev, `?hero=0.3` holds a moment for
review, since a hidden browser pane doesn't repaint on scroll.

### Imagery provenance

All yard photographs are generated illustrations, disclosed in the hero ("Illustrated
yard") and the footer. Made with gpt-image-2 by `scripts/lawn/generate.py` under an
approved $4 cap (Matthew, 2026-10-29); **$1.03 spent over 6 calls**, logged with
prompts in `output/lawn/ledger.json` (ignored). `finished` was generated first;
`overgrown` is an edit of it; `mowed` is an edit given both (overgrown beds and
debris with the finished stripes), so each transition changes one thing. SIFT
alignment of the house between stages: 0.31 px and 0.17 px maximum corner shift,
so no warping was applied. `scripts/lawn/export.py` writes the WebP set and
`preview.jpg`.

## Instant estimate

1. **Address**: Geoapify suggestions through `/api/lawn-suggest` (the roof
   estimator's geocoder, ranked around the business). Pressing Enter on a typed
   address works too, which matters because Geoapify can take 3–7 s on an
   uncached query against the 4 s suggestion timeout.
2. **Lookup** (`/api/lawn-lookup`): building outlines from USA Structures (then
   Microsoft), a square frame sized to the nearest neighbouring house (70–160 m),
   two USDA NAIP exports (natural color to show, near-infrared/red/green to
   measure), the distance from the business, and the rates.
3. **Measuring happens in the browser** (`estimate/measure.ts`): the lot is every
   pixel nearer the house than any other house (sheds and garages don't count),
   grass is found by a vegetation index on the infrared band, tree canopy is set
   apart by being darker and more textured, and only patches that reach within
   14 m of the house are kept. Tested on a Stilwell acreage lot: about 22–36k sq ft,
   with the pool, trees and drive excluded. NAIP is public domain, which is why
   it is analysed and Mapbox/Google imagery is not (their terms forbid deriving
   data from imagery).
   **New builds** are often missing from both outline datasets (found 2026-10-29
   on a new south Overland Park street: the page picked the house next door and
   the real one couldn't be tapped). Now, when a rooftop/parcel address has no
   outline within 15 m, the server samples NAIP at the point (`getSamples`); on
   roof (NDVI < 0.1) it frames the address, not the neighbour. The page makes the
   same check on its infrared (`autoHome`) and marks the house with a dashed
   stand-in square the size of the neighbours' median outline. On grass (a big
   lot's parcel point) the nearest outlined house is still chosen.
4. **Adjust**: tap your house to pick it: an outline (taps within 3 m snap to it),
   or anywhere else to mark an unmapped house; paint or erase lawn; Reset; or type
   a size. Keyboard users can use the typed size.
5. **Price** (`estimate/pricing.ts`, shared with the server): base + rate per
   1,000 sq ft, times a frequency factor, never under the minimum, shown as a ±
   spread. Until the rates are set the page says "Sample rates for this concept."
6. **Request** (`/api/lawn-request`): validates, re-resolves the address on the
   server and refuses it if outside the radius, recomputes the price from the
   deployment's rates, then emails via Resend. Without Resend configured it answers
   `not_configured` and the page says **nothing was sent** and offers call/text.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `LAWN_PRICE_BASE` | 25 | Flat dollars per visit |
| `LAWN_PRICE_PER_1000_SQFT` | 3.25 | Dollars per 1,000 sq ft of lawn |
| `LAWN_PRICE_MINIMUM` | 35 | Lowest visit price |
| `LAWN_BIWEEKLY_FACTOR` | 1.2 | Every-two-weeks multiplier |
| `LAWN_ONE_TIME_FACTOR` | 1.5 | One-time mow multiplier |
| `LAWN_PRICE_SPREAD` | 0.1 | Range shown, ± share |
| `LAWN_SERVICE_ORIGIN` | unset | `lat,lng` of the business; unset accepts every address |
| `LAWN_SERVICE_RADIUS_MILES` | 15 | Straight-line service radius |
| `LAWN_REQUEST_TO_EMAIL` | unset | Where requests are sent |
| `LAWN_REQUEST_FROM_EMAIL` | `CONTACT_FROM_EMAIL` | Verified Resend sender |
| `RESEND_API_KEY` | shared | Resend key |
| `GEOAPIFY_API_KEY` | shared | Address search (already used by the roof tools) |

`.env.local` has the origin rounded to about 100 m and the 15-mile radius. The
default rates are placeholders, not Ben's prices.

## SEO

Title, description, Open Graph, `HomeAndConstructionBusiness` JSON-LD (no street
address, `areaServed` towns, awards, founder, services) and FAQPage JSON-LD built
from the visible answers. One `h1`, ordered headings, alt text, preloaded hero
frame, lazy section images, `tel:`/`sms:` links. The document is `noindex` and
canonical to the demo URL while it lives on the Wallace Shift host; when it moves
to the business's own domain, drop `noindex`, point canonical/og:url there, and
consider prerendering the body (it is client-rendered today).

## Not done

- Ben's real prices, service radius, inbox and logo/photo.

## Verification (2026-10-29)

In an isolated worktree with only these changes: `npm run build` (TypeScript, both
Vite builds, 20 private documents, blog), `node scripts/test-demo-preview.mjs`
(602 responses), access/admin tests 57/57, `eslint .` 0 errors. The shared
checkout's build failed only on another session's unfinished
`src/demos/contractors/` files. Browser checks at 1440×900 and 375×812: hero
frames at 0.26 and 0.74, lookup and auto-measure of a Stilwell address, erase brush,
form validation, unconfigured submit, out-of-range lookup and request (20.2 mi vs
15), API 403 without demo access, no horizontal overflow on the phone.

## Deployment routing

The three existing `/api/lawn-suggest`, `/api/lawn-lookup` and `/api/lawn-request` URLs rewrite to one `api/lawn.ts` function. Direct dispatch uses `/api/lawn?action=suggest|lookup|request`; legacy pathnames take precedence over query selectors. Vite mounts the same dispatcher locally. Handler validation, provider calls, response caching and per-action rate-limit scopes are unchanged. The shared function allows 20 seconds, matching the previous longest handler. This keeps the project within the existing function limit without a plan change.
