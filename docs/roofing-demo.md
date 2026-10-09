# Roofing demo lander

A sales demo for roofing contractors, served at **roofers.wallaceshift.com**
(and at `wallaceshift.com/demos/roofers`). It is a separate Vite entry with
its own bundle and styles: `demos/roofers/index.html` → `src/demos/roofers/`.
Nothing from the studio site loads on it, and it ships nothing to the studio
site.

## What it shows a prospect

1. **Timelapse hero.** As the visitor scrolls, the camera rises and a crew
   inspects, tears off, re-decks, dries in, shingles and cleans up a house
   over two days, with a night in between. Seven captions explain each step;
   callouts label drip edge, ice & water shield, underlayment, flashing,
   pipe boots and ridge vent.
2. **The short version.** Eight one-line answers linking to the detail.
3. **Insurance.** Covered vs not, the deductible, RCV / ACV / roof schedules,
   how the money moves on a claim, and the claim timeline.
4. **Cost.** A roof estimator built on the visitor's own house (below), then
   the price table, what every quote includes, and priced-if-needed extras.
5. **Financing.** Ways to pay and a payment calculator with example terms.
6. **Staying home**, **warranty layers**, and an **FAQ**.
7. **Qualifying form.** Four short steps (problem, insurance and payment,
   timing, contact). Submitting shows the scored lead the contractor would
   receive, including the roof they priced and the payment they saw. The
   street and ZIP are pre-filled from the address they looked up.

## Personalizing a link

Add the prospect's details to the URL:

```
https://roofers.wallaceshift.com/?company=Acme%20Roofing&city=Overland%20Park&phone=9135550199
```

`company` changes the header, truck door, yard sign, warranty and lead
preview; `city` the service area; `phone` every call link. Values are
length-capped and rendered as text. Without them the sample brand is
Northvane Roofing with a 555-01xx number reserved for fiction.

## Where things live

| Change | File |
| --- | --- |
| Any copy, prices in the table, FAQ | `src/demos/roofers/content.ts` |
| Roof price rates and finance math | `src/demos/roofers/pricing.ts` |
| Pitch range, bands and house styles | `src/demos/roofers/roof/pitch.ts` |
| Roof estimator UI | `src/demos/roofers/roof/` |
| Address, outline and imagery providers | `api/_lib/roof/` |
| Form questions and lead scoring | `src/demos/roofers/lead.ts` |
| Where leads are sent | `src/demos/roofers/leadAdapter.ts` |
| Sample brand and URL personalization | `src/demos/roofers/brand.ts` |
| Timelapse phases and clock | `src/demos/roofers/timelapse/timeline.ts` |
| Camera shots, crew choreography | `src/demos/roofers/timelapse/director.ts` |
| The drawing | `src/demos/roofers/timelapse/Scene*.tsx`, `geometry.ts` |

The scene is SVG generated in code — no raster assets. `renderScene()` turns
one scroll progress value (0–100) into every attribute, so it scrubs both
ways exactly. In dev, `?p=42` freezes it at a given progress for review.

## The roof estimator

The visitor types an address, picks it from our own suggestion list, and
sees an aerial photo of the property with the nearby building outlines
numbered on it. With a measuring service connected (below), they tap the
middle of their roof (or pick their house from the list), press **Measure
my roof**, and about 20 seconds later the price is built on their roof as
measured: footprint, pitch and complexity. Without one, or when the service
can't measure that roof, they choose buildings and set the pitch on the
gable drawing, and the price comes from the public outline, labelled as a
rough estimate.

### Measured roofs (Instant Roofer)

Free building outlines turned out too rough to price from: outlines several
metres off the house, simplified shapes, and address points that land in
the street. So the tool buys one measurement per roof from
[Instant Roofer](https://www.instantroofer.com/instant-roofer-api/), the
service a large regional contractor's own estimator appears to use. Its AI
measures the roof from aerial imagery (and height data where it has it)
and returns the
pitch-adjusted roof area, footprint, predominant pitch, complexity and a
confidence score (`api/_lib/roof/measurement.ts`; endpoint
`GET /api/roof-measure?lat=&lng=`).

- **It needs a point on the roof**, not an address ("404 — Roof not
  found"), which is why the homeowner places a crosshair on the photo (or
  picks their house from the list). Nothing is bought until they press
  Measure, and the page says the location goes to Instant Roofer.
- **A roof is bought once per visit.** Once measured, the map stops taking
  taps until the homeowner chooses "Measure a different building"; going
  back to a building already measured shows its result again without a
  call. A crosshair the service rejected ("no roof here") can't be sent
  again until it moves. With no photo showing, only taps on an outline
  count, so nobody pays to measure a spot they can't see.
- **Price:** $3 per measurement for the first 199 a month, $2 up to 999,
  $1 beyond (vendor's published tiers); 10 free measurements on signup.
  Account defaults: 5 requests a minute, 100 a day.
- **Guards against a surprise bill:**
  - Only our own page can spend: a request from another site (an `<img>`
    or cross-site fetch, which browsers mark with `Sec-Fetch-Site`) is
    refused before anything is counted or bought.
  - 6 measurements per visitor per hour (`ROOF_MEASURE_PER_HOUR`), 20 a day
    for the whole site (`ROOF_MEASURE_DAILY_CAP`) and 300 a month
    (`ROOF_MEASURE_MONTHLY_CAP`). Past a cap the page falls back to the
    outline estimate. **Set any of them to `0` to pause measuring**; a
    value that isn't a whole number also pauses it (and logs why), rather
    than quietly using the default.
  - Measuring stays off on every deployment, preview and production alike,
    unless the Upstash store behind those limits is configured. If the
    store can't be reached, measurements are refused, not waved through.
    For local development only, `ROOF_MEASURE_UNMETERED=1` allows measuring
    without the store; it is ignored on any Vercel deployment.
  - The call gets the function's whole time budget (55 s). If it still
    runs out, the page shows the outline estimate and doesn't offer an
    instant retry, since the abandoned request may have been billed.
    Instant Roofer's own "busy" answers can be retried.
  - The page sends the point rounded to 5 decimals (about a metre), the same
    point the server buys, and a success is cached at the edge for a week
    with no background refresh. The same pin asked again is usually served
    from that cache; it is not a guarantee per roof, so the caps above are
    what bound spend.
  - Before launch, also add a bot check (Vercel BotID or Cloudflare
    Turnstile) on the Measure button: the per-visitor limit counts IP
    addresses, and a determined scraper has many.
- **Credit:** its terms require "Powered by Instant Roofer" on the page;
  the page shows exactly that, linked, beside the Measure button and the
  result (and with the fallback if measuring fails).
- **Not used:** its outline picture (Google imagery) and raw lidar points.

**Signing up** (for the key): create the API account at
`api-dashboard.instantroofer.com` (not the contractor dashboard, which has no
API key). It asks for a phone login, a service agreement and a card on
file; regenerate the key before first use, then set `INSTANT_ROOFER_API_KEY`.
Before launch, confirm with Instant Roofer in writing: that a custom page
counts as permitted use (their terms forbid "rebranding"), the exact credit
wording and whether it must show before a lookup, whether failed "roof not
found" calls and requests we stopped waiting for are billed, and that
results may be kept in lead records.

**How the number is made.** The outline comes from open building-footprint
data, never from the photo. Its ground area is computed on our server
(not from the map's Web Mercator pixels, which overstate area about 1.6×
in the Midwest). Roof surface = outline area × √(1 + (pitch/12)²); the
pitch band adds labor for steep roofs, and the outline's corner count
suggests a waste allowance. Roof surface is shown to the nearest 50 sq ft,
each outline lists the year of the imagery it was traced from when the
dataset records it, and the disclaimer says the final measurement happens
at the inspection.

**Which building is the house.** Only when the address point is on a
building (a rooftop or parcel match) and within 15 m of an outline does the
tool pre-select that outline as the house. Otherwise the view widens to
show every nearby outline and the homeowner taps theirs. If a dataset has
only the neighbours around a building-level point, the next dataset is
asked before settling.

**Where the data comes from**, each behind a small adapter in
`api/_lib/roof/` so a paid source can replace it without touching the page:

| Piece | Default | Fallbacks |
| --- | --- | --- |
| Address suggestions and lookup | Geoapify (needs a key) | — |
| Building outlines | FEMA / ORNL USA Structures (keyless) | Microsoft footprints via Esri; OpenStreetMap via your own Overpass server |
| Aerial photo | Mapbox satellite (needs a public token) | USDA NAIP via USGS (keyless, public domain, softer); or none, which draws the outlines on a plan grid |

Google is not used: its Solar API may only be used for solar projects, and
its map terms restrict using Google imagery with or near non-Google map
data, which open outlines drawn on top would put at risk. Another
measurement service (EagleView, Nearmap and the like) can replace Instant
Roofer behind the `MeasurementProvider` interface in
`api/_lib/roof/measurement.ts`.

**Endpoints** (Vercel functions, Node runtime): `GET /api/roof-suggest?q=`
and `GET /api/roof-lookup?id=` or `?address=`. A lookup's outbound calls
share one 15-second budget, inside the function's 20-second limit, so the
page always gets a real answer ("busy, try again" at worst). Successful
answers are cached at Vercel's edge for a day, or five minutes when a
fallback dataset answered because the first one failed; errors are never
cached. Both endpoints answer `not_configured` until a Geoapify key is set,
and also when no footprint source in `ROOF_FOOTPRINT_SOURCES` is usable
(e.g. `osm` without `OVERPASS_URL`) or `ROOF_PROVIDER` isn't `open-data`.
The page then says live lookup isn't connected and offers the sample house
or the home-size estimate.

**Environment variables** (Vercel → Settings → Environment Variables; for
local dev put them in `.env.local`, which is git-ignored):

| Variable | Needed | What it is |
| --- | --- | --- |
| `GEOAPIFY_API_KEY` | Yes | Server-side key from myprojects.geoapify.com. Never prefix it with `VITE_`. |
| `MAPBOX_ACCESS_TOKEN` | For the sharp photo | A public `pk.` token with the `styles:tiles` scope, URL-restricted to `roofers.wallaceshift.com`, `wallaceshift.com` and any preview domains. Without it the keyless NAIP photo is used. |
| `ROOF_SEARCH_BIAS` | Optional | `lng,lat` of the contractor's service area, e.g. `-94.58,39.05`. Ranks nearby addresses first. |
| `ROOF_IMAGERY` | Optional | `mapbox`, `naip` or `none`. |
| `ROOF_FOOTPRINT_SOURCES` | Optional | Default `usa-structures,microsoft`; add `osm` with `OVERPASS_URL`. |
| `ROOF_PROVIDER` | Optional | Default `open-data`, the only one implemented. Any other value turns lookup off until that provider exists. |
| `INSTANT_ROOFER_API_KEY` | For measured roofs | Server-side key from the Instant Roofer API dashboard. Without it, the outline estimate is used. Scope it to exactly the same environments as the two Upstash variables below (or to Production only). |
| `RATE_LIMIT_REDIS_URL`, `RATE_LIMIT_REDIS_TOKEN` | Required for measuring, everywhere | The same Upstash limiter as the site audit: 300 suggestions, 40 lookups and 6 measurements per IP per hour, plus the daily and monthly measurement counts. Without them measuring stays off. |
| `ROOF_MEASURE_PER_HOUR`, `ROOF_MEASURE_DAILY_CAP`, `ROOF_MEASURE_MONTHLY_CAP` | Optional | Measurements per visitor per hour (default 6), and for the whole site per UTC day (default 20) and month (default 300). `0` pauses measuring. |
| `ROOF_MEASURE_UNMETERED` | Local development only | `1` lets your own machine measure without Upstash. Ignored on Vercel deployments. Each measurement is still billed. |

**Credits the page shows**, linked, under the map and in the suggestion
list: "Powered by Geoapify" and its data source (© OpenStreetMap
contributors or © OpenAddresses contributors), the outline dataset, and
the imagery provider. Mapbox also prints its logo and credits into the
photo's bottom corners; nothing on the page is drawn over that strip.

**Rules that keep it within the providers' terms:**

- The photo loads straight from the provider in the visitor's browser. It
  is never fetched, cached, stored or emailed by us.
- Nobody draws on the photo. Outlines come only from the footprint data.
- Leads carry the address, outline area, pitch and squares, never imagery.

**Before a contractor goes live:**

1. Check 25–50 real addresses in their service area: how often Geoapify
   places the pin on the house, and how often the outline matches.
2. Read Geoapify's formal terms (or get written confirmation) on storing
   and caching results; the endpoints cache answers at the edge for a day.
   Our research could only reach its FAQ and product pages.
3. Confirm with Mapbox in writing that a homeowner-facing roofing estimator
   does not fall under a category that needs its separate commercial
   licence.
4. Compare a few outlines with measured roof reports, and tune the rates in
   `pricing.ts` and the bands in `roof/pitch.ts` to the contractor's own.

**The sample house** (`public/demos/roofers/sample-roof.svg` and
`roof/sampleLookup.json`) is generated by `node scripts/roof-sample/generate.ts`.
It is an illustration, labelled as one, so the tool can be shown without
any keys.

## Honesty rules this demo keeps

- `LEAD_ENDPOINT` is `null`, so the form never sends anything and never
  shows a fake success; it shows the lead marked "Demo mode · nothing was
  sent".
- Prices, warranty lengths and finance terms are realistic examples and
  carry visible demo notes. Insurance and timing statements are written as
  typical ranges with a not-advice note.
- There are no reviews, ratings, license numbers or client logos, because
  the brand is fictional. A live build adds the contractor's real ones.
- The page is `noindex, nofollow`; the header and footer say it is a
  Wallace Shift concept.

## Deploying the subdomain

`vercel.json` rewrites `/` on host `roofers.wallaceshift.com` to
`/demos/roofers`. To go live:

1. Merge this branch so production builds the demo entry.
2. In Vercel → the `wallace-shift` project → Settings → Domains, add
   `roofers.wallaceshift.com`.
3. If `wallaceshift.com` DNS is not on Vercel, add the CNAME record Vercel
   shows for `roofers` (typically `cname.vercel-dns.com`).

Local review: `npm run dev`, then open `http://localhost:5173/demos/roofers/`.
The roof endpoints run inside `vite dev` too, using keys from `.env.local`.
