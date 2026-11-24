# Trim carpentry demo: LP Construction

A website concept for a **real** finish carpentry business, LP Construction
(Instagram `@lp_construction913`), built 2026-11-24. The first half of this file
is how the demo is built; the second half is the fact log: every claim the page
makes, where it came from, and what is still missing. Anything not confirmed
stays off the page or is `null` in `src/demos/lp-construction/content.ts`.

Owner material goes in `lp-source/` at the repo root (git-ignored except its two
notes). The questions for the owner, his answers, and the status of each are
tracked in `lp-source/owner-intake.md`.

## Where it lives

- Route: `/demo/lp-construction` (20 pages: 10 English and 10 Spanish), public and unindexed: `noindex`
  meta on every page (the plugin refuses to render without it) plus an
  `X-Robots-Tag` header in `vercel.json` and in dev. `lp-construction` is in
  `PUBLIC_DEMO_DIRS`; no Wallace Shift branding on the page.
- `lp-construction/vite-plugin.ts` server-renders every page at build time into
  `dist/demo/lp-construction/**/index.html` and writes
  `dist/demo/lp-construction/sitemap.xml`, modelled on the American Mechanical
  plugin. The client hydrates the same tree (`main.tsx`).
- Code: `src/demos/lp-construction/`. `content.ts` holds every fact, page and
  service; `serviceAreaZips.ts` is generated; `i18n.ts` has the English and
  Spanish interface text for the entire site. Localized service and photo copy lives in `content.ts`.
- API: `api/_lib/trim/render.ts` and `api/_lib/trim/request.ts`, served by the
  shared `api/lawn.ts` dispatcher (`/api/trim-render`, `/api/trim-request`)
  because the project is at Vercel's 12-function limit.
- Local preview: launch config `lp-construction-demo-preview` (port 5192);
  `lp-construction-prod-preview` (port 5193) serves the last build. In dev,
  `?hero=0.4` holds a moment of the hero.
- Admin catalog: `src/demo-access/catalog.ts`. Not on the contractors lander.

## Pages

Home; `/services`; `/services/staircases`, `/wall-paneling`,
`/crown-ceilings`, `/trim-doors`, `/built-ins`; `/service-area`; `/our-work`;
`/request`. Every inner page has visible breadcrumbs and a matching
`BreadcrumbList`. JSON-LD per page: `HomeAndConstructionBusiness` (city and
state only, `areaServed` from the confirmed city list, `knowsLanguage` en and
es, Instagram as `sameAs`), `WebSite`, the page type, and `Service` on service
pages. No review, rating, price or founding-date markup.

## Hero

One two-story foyer, five generated frames from one camera (before, torn out,
built, caulked and primed, finished), where the stair, the paneled wall and the
crown all change. It is CSS-sticky below the sticky header inside a track 300svh
taller than itself; GSAP ScrollTrigger maps that scroll to a canvas, where each
step reveals the next frame with a soft edge moving the way the work goes.
Frame 1 is a real `<img>` with `fetchpriority="high"`; the rest load after it.
Reduced motion gets still frames and stage buttons. Labelled "Illustrated
foyer" in the hero and in the footer.

## Room ideas

Sample room (generated, labelled an illustration) with a before/after slider,
or the visitor's own photo, resized and re-encoded on their device (drops
EXIF/GPS). Five styles from his Instagram work (picture-frame, board and batten
grid, slats, wainscoting, geometric) and four finishes. Live concepts use the
paint studio's access model: always on in local dev; in production only with
`TRIM_RENDER_ENABLED=true`, `TRIM_RENDER_ORIGIN`, the Upstash limiter and
`OPENAI_API_KEY`, with per-visitor (`TRIM_RENDER_PER_HOUR`, default 4) and daily
(`TRIM_RENDER_DAILY_CAP`, default 25) caps. With live concepts off, the photo
still goes with the request. **No prices anywhere:** the tool says jobs are
priced at a free estimate visit, no trip charge, jobs from $500.

All five sample styles are available. The four additional looks come from
`lp-source/renders/` and are exported to 1536 px and 960 px WebP assets.
`export.sh` prefers these supplied renders over the earlier generated originals.

## Service area

`scripts/lp-construction/service-area.py` (Python 3.12) takes the Census 2024
ZCTA centroids within 70 miles of Kansas City, MO City Hall, asks the public
OSRM router for free-flow drive times, and writes `serviceAreaZips.ts`: 133 ZIPs
within 45 minutes, 23 more between 45 and 55 minutes ("call or text to
confirm"). The check runs on the device; nothing is sent. Metro ZIPs missing
from the Census list (P.O. boxes) get "call or text". The city list on
`/service-area` comes from one representative ZIP per city in `content.ts`. The
owner still approves the center point and the list.

## Requests

One form, English or Spanish (site language switch, or `/es/request`), prefilled from `?zip=`,
`?job=` and any room idea. It asks homeowner or builder, the work, details,
rough size, timing, up to three photos (resized on the device), name, phone,
optional email and the preferred contact. `api/_lib/trim/request.ts` emails it
through Resend with the photos attached once `RESEND_API_KEY`,
`LP_REQUEST_TO_EMAIL` and a sender (`LP_REQUEST_FROM_EMAIL`, else
`CONTACT_FROM_EMAIL`) are set; Spanish requests are flagged in the subject.
Unset, the page says plainly that nothing was sent and offers call and text.
"Text us" buttons open the visitor's own Messages app (`sms:`) to his number: no
sending number, no A2P registration.

## Media and spend

- Generated (gpt-image-2): five hero frames, the sample room and one look; 7
  calls, $1.63 of the $5 Matthew approved, ledger in
  `output/lp-construction/ledger.json`. `scripts/lp-construction/export.sh`
  writes the WebP copies.
- His photos: 15 images from his Instagram posts (the owner says all are his
  work; Matthew is getting his OK to use them), captured at Instagram's served
  size into `lp-source/media/instagram/` and converted by
  `scripts/lp-construction/gallery.sh`. Reel covers are only 574 px wide.

## Verified on 2026-11-24

- `npm run build` passes, including `test-lawn-api` (new LP endpoint test),
  `verify-demo-build`, `verify-seo-build`; `test-demo-access` (49) and
  `test-demo-preview` pass; types and lint are clean for the new code.
- Browser: 1440 and 390 px; the hero stays under the header and steps through
  all five stages; the ZIP check (inside, hand-off to the form); the mobile
  menu (focus in, Escape out); the Spanish form, its errors and the honest
  "not sent" result; no horizontal overflow on the area page.
- An in-page audit of 7 pages: one h1 each, no heading skips, every image has
  alt, every control a label, no duplicate ids, JSON-LD parses. All 15 color
  pairs meet WCAG AA contrast.
- Production preview: CLS 0; first hero frame 33 KB, CSS 5 KB.

Not measured: LCP and INP (the browser pane reports no paint timings, and
Lighthouse, WebPageTest and axe are not installed), a screen-reader pass, the
live room concept (no OpenAI credit), and a real email send (no inbox).

## Sources

| Source | Date | How it was read |
| --- | --- | --- |
| Instagram `@lp_construction913` | 2026-11-24 | Matthew's logged-in Chrome: bio, grid, one post opened |
| Angi profile (`/companylist/us/mo/kansas-city/lp-construction-reviews-1.htm`) | 2026-11-24 | Matthew's Chrome (automated fetch gets 403) |
| HomeAdvisor | 2026-11-24 | Search-engine snippets only; not opened |
| Web search: name + trim / stairs / Kansas City, and the handle | 2026-11-24 | No website, Google profile, Facebook page or reviews found |
| Owner's answers to the intake, round 1 | 2026-11-24 | Passed on by Matthew |

## Confirmed

From his public profiles:

- **Name:** "LP Construction" (Instagram display name and bio). Angi writes
  "LP construction". The legal entity is still unknown.
- **What they call themselves:** "Finish Trim Specialists" (Instagram bio).
- **Services, Instagram bio:** custom trim, stairs, doors, built-ins.
- **Services, Angi categories:** interior trim and decorative moldings (install
  and repair), exterior trim (install, replace, repair), handyman for multiple
  small projects, and "+2 more" that the page doesn't list. Angi's own label is
  "Carpentry Specialist".
- **Location:** "Kansas City, MO" (Instagram bio); posts are tagged Kansas City,
  Missouri.
- **Phone:** 913-717-2787 (Instagram bio). This is a Kansas area code, though
  the business is listed in Missouri.
- **Spanish:** Angi's highlights show "Se habla español".
- **Payment:** Angi says he accepts credit cards.

From the owner (round 1):

- **Customers:** both builders and homeowners. He wants more work of any kind,
  with no preference between wall paneling and stairs.
- **Service area:** about a 45-minute drive from Kansas City, MO, so both
  states.
- **Smallest job:** $500.
- **Estimates:** free, with no travel charge. (Angi also says free estimates.)
- **Finishing:** he does everything himself, including caulk, fill and paint;
  no painter.
- **What changes the price:** material cost and the condition of the area;
  ceiling height only for ceiling work.
- **Photos:** every photo on his Instagram is his own work.
- **Reviews:** none anywhere, and no Google Business Profile. Past clients
  would write reviews.
- **License:** licensed with Kansas City, MO. Insurer not known yet.
- **Spanish:** customers can send requests in Spanish; he answers them himself.
- **Requests:** by email and text, but no new phone number and no A2P texting
  registration for now.

## Unverified or still missing

- **Legal name and years in business:** unanswered. Angi says 10 years; a search
  snippet of HomeAdvisor said 9. Use neither until he confirms.
- **License and insurance proof:** no license number, no insurer. The site
  repeats only his own bio wording, "Licensed & Insured", and names no license
  number, licensing body or insurer.
- **Prices:** no invoices, no rate card.
- **Email for requests:** not given.
- **Texts:** whether 913-717-2787 takes texts is unconfirmed.
- **Angi status:** "New on Angi" and "Not Angi Approved". A search snippet
  called the HomeAdvisor listing "Approved Pro". Don't claim either.

## Not to publish

- The street address on Angi, a Kansas City, MO address in 64124 (the city's
  northeast side). The page names "Kansas City" only, as the Lareau and Complete
  Painting demos do.
- Angi's "About us" paragraph. It is generic directory boilerplate, not their
  voice.

## Reviews

**None exist,** and the owner confirms it. The demo has no reviews section,
testimonials, star rating or review schema. Setting up a Google Business Profile
and asking the past clients who offered to write reviews is a separate job, and
the biggest single gap in his local search presence.

## Instagram media audit (from thumbnails; nothing downloaded)

- 32 posts, 50 followers. The oldest post seen is May 28, 2025 ("Custom panels",
  shown as 77 weeks old); the pinned post is May 17, 2026. Most posts are reels.
  Captions are one or two words, so they say nothing about the jobs.
- By my count from the thumbnails, about a third are **staircases** (box newels,
  iron and wood balusters, closed and open stringers, one curved stair), about a
  third are **built-ins and mantels** (bookcases, mudroom lockers, bunk beds, a
  vanity, arched niches, fireplace surrounds), and the rest are **wall panels**
  (picture-frame molding, diagonal geometric panels, vertical slats) and
  **ceilings** (coffered beams, tray ceilings with grids, beams with cove
  lighting, a diagonal plank ceiling), plus an arched cased opening.
- **Nearly all of it is new construction:** raw subfloors, unpainted drywall,
  bare framing, unfinished MDF and pine. One reel shows a lived-in home
  (a carpeted stair with iron balusters and a baby gate), which may be a
  remodel "before".
- **No clear before/after pairs** appear in the grid.
- The owner says every image is his own work. That includes the "Custom panels"
  carousel, which looked as if it mixed in other houses.
- His original photos and video come only if he becomes a client. The demo uses
  15 copies of his Instagram photos (compressed but real); Matthew is getting
  his OK.

## Decisions from the owner's answers (built)

1. **Audience: both.** The page speaks to homeowners first. The request form
   asks "Homeowner, or builder or contractor?" so builders have a path too, and
   no job type gets top billing over the others.
2. **Hero.** He gave no preference, so the choice is ours. There are no real
   before/after pairs, so the hero timelapse will be generated photoreal frames,
   disclosed as an illustration, with the image spend approved first.
3. **Service area.** Compute a 45-minute drive-time area once from downtown
   Kansas City, MO, then freeze it as a ZIP list in config, so the check is
   instant and he can approve the list. ZIPs on the edge say "call or text to
   confirm". The $500 minimum appears in the request flow.
4. **No prices yet.** The photo tool can show ideas but no cost range until the
   rate card exists. It says "Free estimate, no trip charge" instead, which is
   true now.
5. **Requests.** Form requests go by email through the existing Resend pipeline
   once he gives an address. Texting a form to his phone needs a sending number
   and A2P 10DLC registration, which he declined for now. Instead, a "Text us"
   button opens the visitor's own Messages app addressed to his number, which
   needs no new number and no registration.
6. **Spanish.** The entire site has English and Spanish routes, including
   navigation, services, gallery captions, room viewer, forms and metadata.
   The language switch preserves the page, query parameters and fragment.
7. **Copy he has earned:** one person does the whole job, from install to
   caulk, fill and paint; free estimates; no trip charge; Spanish spoken.

## Open items

The live list, with status, is in `lp-source/owner-intake.md`: invoices or a
rate card; original media (after signing) and his OK to use Instagram copies;
legal name and years in business; license number and insurer; email for
requests and whether his number takes texts; homeowners' first questions and
why jobs fall through; confirming the center point and the ZIP list of the
service area; his review of the Spanish text and the service copy.
