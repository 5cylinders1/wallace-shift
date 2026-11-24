# Landscape demo: Lareau Landscape & Design

A website concept for a **real** Kansas City landscape design and installation
company, Lareau Landscape & Design LLC (Lenexa, Kansas; Bob Lareau and his sons
Taylor and Hunter). It replaced the earlier lawn concept on this route on
2026-11-23 and reuses its code: the `lawn` key, directory names and API.

- Local entry: `/lareau` or `/demos/lawn/` on the dev server.
- Production route: `https://contractors.wallaceshift.com/lareau`, **public**
  (no access request, email code or agreement) and unindexed: `noindex` meta plus
  an `X-Robots-Tag` header on `/lareau` and `/demos/lawn`.
- Document `demos/lawn/index.html` (built in the public pass), code
  `src/demos/lawn/`, media `public/demos/lawn/`, function `api/lawn.ts` (shared
  dispatcher), handlers `api/_lib/lawn/handlers/`, and `api/_lib/lawn/`. There is
  no gate key; `lawn` is in `PUBLIC_DEMO_DIRS`.
- The planner APIs are public too, behind per-IP limits: 300 suggestions,
  40 lookups and 6 requests an hour.
- Local preview: launch config `lareau-demo-preview` (port 5182); no cookie needed.
- Lander: an open tile in the "Landscape design" row of the contractors gallery
  (`kind: 'open'`, id `lareau`, in `src/demos/contractors/catalog.ts`).

## Sources of fact

Everything the page says about the business lives in `src/demos/lawn/content.ts`,
read on 2026-11-23 from:

- **lareaulandscape.com** (home, About, Services, Our Work, Contact): the story
  (founded 1996; Bob's 1978 K-State horticulture degree and 19 years in the
  industry; Taylor and Hunter full time since 2009 and 2012), combined 55+ years
  of experience, ICPI and NCMA certification, the service descriptions, the
  warranties (hardscape 5 years, drainage 2, plants 1 with full replacement;
  lighting fixtures up to a lifetime), "any size budget", the no-cost
  consultation, phone and email, and the Rich Zak testimonial.
- **Google Business Profile**: Landscaper in Lenexa, Kansas; 5.0 from 8 reviews;
  hours Monday to Friday 8 AM to 5 PM. The six reviews with text are quoted
  verbatim, spelling included; the other two are ratings only. "Read every review"
  links to a Google Maps search for the business.
- **Instagram bio** (@lareaulandscape): family owned, started in '96, serving the
  residential KC metro.

Not shown on purpose: the street address on the Google profile (it looks
residential; the page and JSON-LD name Lenexa only), the P.O. Box, prices, review
schema (self-serving review markup), and any founder claim (the site says the
company is "operated by" Bob and his sons, not who founded it). No Wallace Shift
branding or credit appears on the page.

## Media

The hero's scroll timelapse frames are **generated illustrations** from the
earlier concept on this route (gpt-image-2 via `scripts/lawn/generate.py`, one
camera, disclosed as "Illustrated yard" in the hero and in the footer). Every
other image and the project film are the company's own, from its website uploads.
`scripts/lawn/export.py` writes the web set: the three timelapse frames from
`output/lawn/<stage>.png`; and, from the originals it downloads into
`output/lawn/source/` (ignored), the 2023 project film (11.3 s, 1920x1080, audio
removed, full length, no fades) as H.264 at 1080p and 720p plus VP9 WebM, its
first frame as the poster, four service photos, eight gallery photos, a crew frame
from the 2019 About film, the closing photo, `preview.jpg`, the white logo and
favicons. Most source photos are 1000 px wide; the script never upscales.

## Hero

The original scroll timelapse, unchanged apart from the copy and palette
(`Hero.tsx`): a pinned scroll story on one canvas in which the overgrown yard is
mown pass by pass along the lawn's own stripe direction, then the beds, shrubs and
drive are swept clean from left to right. Stages: Overgrown, Mowed & striped,
Landscaped (`stages` in `content.ts`). Desktop puts the copy on charcoal at the
left and the yard full height at the right, so nothing covers the house; at
1020 px and below the copy sits above the yard. Reduced motion shows a still with
stage buttons. In dev, `?hero=0.3` holds a moment for review, since a hidden
browser pane doesn't repaint on scroll.

## Project film

Lareau's own film plays muted and looping at the top of "Our work"
(`ProjectFilm.tsx`). Nothing loads until it nears the screen; it fades in over the
poster once actually playing, pauses off screen, and reduced motion shows the
poster only.

## Yard planner

The lawn estimator, rebuilt for a design-build company: nothing is priced.

1. **Address**: Geoapify suggestions through `/api/lawn-suggest`, ranked around a
   rounded Lenexa city point (`api/_lib/lawn/config.ts`). There is no service
   radius: every address is accepted.
2. **Lookup** (`/api/lawn-lookup`): building outlines, a square frame, and the two
   USDA NAIP exports, as before (see the measuring notes below).
3. **Measure** in the browser (`estimate/measure.ts`), unchanged: the homeowner
   can pick the house, paint or erase lawn, or reset. The size is shown as context
   for sprinklers, planting and layout; if the aerial can't be read, the page says
   the yard will be seen at the consultation.
4. **Projects**: chips for Lareau's own services (`estimate/labels.ts`).
5. **Request** (`/api/lawn-request`): name, phone, email, preferred contact,
   timing and a project note (required when no project is picked). The server
   re-resolves the address, validates the projects and the optional lawn size,
   and emails via Resend. Without `LAREAU_REQUEST_TO_EMAIL` it answers
   `not_configured` and the page says **nothing was sent** and offers call/email.

### Measuring notes (unchanged from the lawn estimator)

The lot is every pixel nearer the house than any other house (sheds and garages
don't count), grass is found by a vegetation index on NAIP's infrared band, tree
canopy is set apart by being darker and more textured, and only patches within
14 m of the house are kept. NAIP is public domain, which is why it is analysed and
Mapbox/Google imagery is not. New builds missing from the outline datasets are
handled by an NAIP roof check at the address and a dashed stand-in square.

**Imagery detail differs by state.** NAIP on the Kansas side is 2023 at 0.3 m; on
the Missouri side the service only has 2022 at 0.6 m, and it looks closer to 1 m.
A tight 70 m lot frame enlarges Missouri pixels about 11x, and the service's
default nearest-neighbour resampling made that look blocky (seen 2026-11-23), so
the displayed photo asks for `interpolation=RSP_BilinearInterpolation`. The
infrared image is only measured and keeps the default. Missouri yards will still
look softer than Kansas ones; the USGS basemap (`USGSImageryOnly`) was checked and
is worse there.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `LAREAU_REQUEST_TO_EMAIL` | unset | Where consultation requests are sent |
| `LAREAU_REQUEST_FROM_EMAIL` | `CONTACT_FROM_EMAIL` | Verified Resend sender |
| `RESEND_API_KEY` | shared | Resend key |
| `GEOAPIFY_API_KEY` | shared | Address search (shared with the roof tools) |

The earlier concept's `LAWN_*` variables (prices, service origin and radius,
request inbox) are no longer read; delete them from Vercel and `.env.local`.

## SEO

Title, description, Open Graph, `HomeAndConstructionBusiness` JSON-LD (Lenexa,
no street address, KC metro, hours, services, website and Instagram) and FAQPage
JSON-LD built from the visible answers. The document is `noindex` and canonical
to the demo URL while it lives on the Wallace Shift host; when it moves to the
business's own domain, drop `noindex` and point canonical/og:url there.

## Not done

- Lareau's inbox for requests (`LAREAU_REQUEST_TO_EMAIL`), and whether they want
  text as a contact option (the main number's texting isn't confirmed).
- The business's own review of the copy and the quoted reviews.
