# Deer Creek Plumbing: lead-generation site concept

A full website concept for a **real** prospect: Deer Creek Plumbing Inc, a family-owned plumber in Olathe, KS (owner Beau, (913) 440-9102, deercreekplumbing.com). Built 2026-11-10. Every fact is sourced below; nothing about the business is invented.

- Local: `/demo/deercreek` on the dev server (launch config `deercreek-demo-preview`, port 5188; no cookie needed).
- Production: `https://wallaceshift.com/demo/deercreek` and 17 sub-pages. **Public and unindexed**: `noindex, nofollow` in every document plus an `X-Robots-Tag` header on `/demo/deercreek/*` and `/demos/deercreek/*`. It must not compete with deercreekplumbing.com in search.
- Template `demos/deercreek/index.html` (public build pass), code `src/demos/deercreek/`, plugin `deercreek/vite-plugin.ts`, media `public/demos/deercreek/`. `deercreek` is in `PUBLIC_DEMO_DIRS`; no gate key, no API, no serverless function.
- Tests: `npm run test:deercreek` (after a build) checks every built page's metadata, JSON-LD, heading order, alt text, internal links, palette contrast and the area lookup, plus the booking prefill rules, the agency handoff and the contact endpoint's demo source (with a mocked send). The demo access, preview and build verifiers cover it too.

## Wallace Shift handoff (added 2026-11-10)

The demo's first job is to sell Wallace Shift's work, so the agency has its own layer, styled in Wallace Shift's bone and ink rather than Deer Creek's navy and copper:

- **Agency bar** above the Deer Creek header on every page: "A website and booking-flow concept by Wallace Shift" (shortened to "Concept by Wallace Shift" on phones), a **What it shows** disclosure (problem finder, carried-over booking details, accommodation preferences, and that nothing is sent), and **Discuss my website**. It scrolls away with the page, so it never stacks with the fixed Call / Text / Request bar on phones.
- **Discuss my website** and the footer credit link to `/contact?demo=deercreek` (`src/lib/demoHandoff.ts`, copy in `src/content/demoHandoff.ts`). The contact page then opens on "Let’s plan a website for your business." with website-specific message wording, a note naming the demo and a link back. Other visitors see the page unchanged.
- The enquiry carries `source: "deercreek"`. `api/contact.ts` keeps its own allowlist, adds `Source: Deer Creek Plumbing website demo` to the email and "(Deer Creek demo)" to the subject, and drops any unknown value.
- **Analytics** (existing GA4 bootstrap, consent rules unchanged): `demo_handoff_viewed` with `demo_id: deercreek` when someone lands on /contact from the demo, and `demo_id` on the `generate_lead` / `enquiry_failed` events for those enquiries. The demo pages themselves still load no analytics, so the bar's click is measured by the arrival.

## Pages (18, each server-rendered with its own title, description, canonical and JSON-LD)

| Path | Page | Primary search target |
| --- | --- | --- |
| `/demo/deercreek` | Home | plumber olathe ks · plumbing olathe ks · plumbers kansas city residential |
| `/services` | All services | plumbing services olathe / kansas city |
| `/services/water-heaters` | Water heaters | water heater replacement olathe · water heater leaking from bottom · no hot water |
| `/services/drain-cleaning` | Drain cleaning | drain cleaning olathe ks |
| `/services/sewer-line-repair` | Sewer lines | sewer line repair/replacement kansas city · trenchless sewer line repair kansas city |
| `/services/sump-pumps` | Sump pumps | sump pump repair kansas city · sump pump backup battery |
| `/services/leak-repair` | Leaks, faucets & fixtures | leak repair olathe · faucet repair · frozen pipes |
| `/services/toilet-repair` | Toilets | toilet repair/replacement olathe |
| `/services/gas-lines` | Gas lines | gas line repair olathe · gas line inspection |
| `/services/radiant-heat-boilers` | Radiant heat & boilers | radiant floor heating kansas city · boiler repair |
| `/services/remodels-new-construction` | Remodels & new construction | remodel / new construction plumbing |
| `/services/commercial-plumbing` | Commercial | commercial plumbers kansas city |
| `/service-area` | Service area + checker | plumber overland park / lenexa / shawnee / lee's summit … |
| `/reviews` | Reviews | deer creek plumbing reviews · best plumber overland park |
| `/about` | About | family owned plumber olathe |
| `/schedule` | Booking form | book a plumber olathe |
| `/faq` | FAQ | how much does a plumber cost · emergency plumber olathe questions |
| `/accessibility` | Accessibility statement | — |

Keyword phrasing came from Google autocomplete for 36 seed queries (2026-11-10): Olathe, Overland Park, Lenexa, Shawnee, Gardner, Spring Hill, Paola, Louisburg, De Soto, Leawood and Lee's Summit "plumber" queries, plus water heater, drain, sewer, sump, radiant, cost and symptom queries. Notable: "plumber kansas city reddit" (a reviewer found Deer Creek through Reddit), "trenchless sewer line repair kansas city", "sump pump backup battery", "water heater leaking from bottom", "how much does a plumber cost to…". No search-volume tool was used; volumes need Keyword Planner or Search Console once the site is live.

Each page has one H1, headings in order (checked by the test), breadcrumbs, related-service links and FAQs where useful.

## Structured data

One `@graph` per page: `WebSite`, a `Plumber` (LocalBusiness) entity with NAP, geo, hours, payment, `areaServed` (KC metro + 21 named communities), `sameAs` (Facebook, Google Maps) and an `OfferCatalog` of the 10 services; the page's `WebPage`/`AboutPage`/`ContactPage`/`CollectionPage`; `BreadcrumbList`; and per service page a `Service` plus an `FAQPage`. The FAQ page carries every Q&A.

**No `aggregateRating` or `Review` markup.** The reviews come from Google and Facebook, and Google's review-snippet guidelines forbid marking up reviews copied from another site; doing so risks a manual action. The test fails if any page adds them. When Deer Creek collects reviews on its own site, those can be marked up.

## Conversion tools

- **"What's going on?" triage** (home): nine situations, from "I smell gas" to "Planning a project", each with safety steps and a pre-filled booking link. Gas sends people outside first and never offers "book" as the first action. Steps are standard safety guidance; the frozen-pipe steps are Beau's own from his Facebook post.
- **Request form** (`/schedule`, labelled "Request a visit" everywhere because the office confirms the time): six steps (problem, urgency, ZIP + property type, preferred weekday and time window, contact + visit accommodations, review). Pre-fills from `?service=`, `?issue=`, `?zip=` (`booking.ts`); a visitor who arrives with a valid service sees it as a summary with **Change** instead of the whole catalog, and the problem-finder choice travels as its own `issue` field. Live service-area check on the ZIP. An "Interactive demo" notice sits directly above the form. **Nothing is sent**: `REQUEST_ENDPOINT` in `requestAdapter.ts` is `null`, and the finish screen says so. Set an HTTPS endpoint to go live.
- **Service-area checker**: ZIP, town name or the browser's location (computed on the device, never sent). Census 2024 Gazetteer ZIP and place points within 50 miles (`areaData.ts`, public domain). Bands: within 30 miles "yes", 30–45 "call to confirm", farther "outside". The schematic map shows the rings, State Line and the pin.
- **Office open/closed status** in Olathe time, sticky Call / Text / Book bar on phones, click-to-call everywhere.

## Accessibility (target WCAG 2.2 AA)

Atkinson Hyperlegible Next (Braille Institute) for text; contrast checked in the test (body text 7:1 or better); skip link, landmarks, ordered headings; visible two-tone focus ring; 44px+ targets; native `<details>` FAQs; form errors in words, linked from a summary that takes focus only after a failed Continue; focus moves to each new step heading; mobile menu with Escape and focus return; reduced-motion honoured. **Display settings** (every page) offers text size, higher contrast, reduce motion, underline links and extra spacing (WCAG 1.4.12), saved in localStorage and applied before first paint by the inline script in the template. The booking form asks what makes a visit easier (deaf/hard of hearing, mobility aid, extra time at the door, noise sensitivity, pets).

Verified in the Browser pane on 2026-11-10 at 1440, 1280 and 390 px: triage, area lookups, the full booking flow with validation, mobile menu, display settings persistence, no horizontal overflow (also at the largest text size). Not yet run: a real screen-reader pass (VoiceOver/NVDA) and an automated axe scan.

## Motion (CSS only)

Hero headline lines rise in, the photo unveils, stars pop, the creek wave settles under the hero (all under 5 seconds, then still); scroll-linked section reveals and a process "pipe" that fills, where `animation-timeline: view()` is supported (content is visible without it); service-row wipes and icon drips on hover; map rings draw and the pin drops; booking progress fills. All of it stops under `prefers-reduced-motion` or the Reduce motion setting.

## Sources of fact (read 2026-11-10)

- **deercreekplumbing.com** (Hibu, 16 pages): services and full residential/commercial lists, 1-year parts and labor warranty, manufacturer warranties honoured, same-day water heater service, same-day estimates, service typically within 24 hours, certified/licensed/insured, continuing education, techs wear booties, work with insurance companies, 100+ years combined experience, family and locally owned since 2017, brands (Delta, Moen, A. O. Smith, American Standard), payments, hours, radiant-heat FAQs, "contact you by the following business day" (quote form), schema address and email.
- **Google Business Profile** (Maps CID 6948310473349042081): 19968 W 162nd St, Olathe KS 66062; category Plumber; Mon–Fri 8–4:30, Sat–Sun closed; online estimates, onsite services; **5.0 from 286 reviews** (282 five, 2 four, 2 one); Google's topic tags (fair pricing 23, punctuality 15, problem resolution 12, courteous staff 12, thorough job 5, leak repair 5). All 286 reviews were read; staff named: Ryan 62, Mark 29, Beau 12, Laura 3, Matt 2, Colby 1.
- **Facebook** (facebook.com/DeerCreekPlumbing): 2 recommendations (Noemi H., Jerry F.), 136 followers, email deercreekplumbinginc@gmail.com; Beau's posts: the April 2025 "official page" post (quoted on About), the freeze-tips list (used for frozen-pipe steps) and the Moen Flo giveaway with installation.

The 46 quoted reviews in `content.ts` are verbatim (trimmed only at "…", one missing space fixed). Names are shortened to first name and last initial. Dates are years, derived from Google's relative dates.

## Imagery

All photos are Deer Creek's own, from their website gallery (`deer-creek-plumbing-gallery-004…011`, `Deer Creek Gallery.1/.3`), re-encoded to WebP. The logo is their white lockup; `logo-ink.png` is the same artwork filled with the site ink (their Facebook avatar uses it in black), `mark-*.png` crops the antler mark only. Nothing generated, nothing redrawn. The photos don't say who the plumber is, so alt text doesn't name him.

## Home page edits (2026-11-10)

Headline "Plumbing fixed. Price agreed first." with Olathe and Kansas City kept in the eyebrow; on phones the copy, action and rating come before the photo, which is cropped square to keep the face, logo and phone number. The proof band and the four review themes (both repeated the rating, the review count and how the reviews were read) became two featured reviews, quoted whole with one line highlighted: Elizabeth M. on pricing, Jennifer K. on care and reliability. The review total now appears once on the home page. Team entries show roles, not review-mention counts. The WCAG detail lives on the accessibility statement; the home page keeps the accommodation promise, a pointer to Display settings and the statement link.

## Confirm with Beau before showing as his

1. Owner's surname spelling ("Baily" per Matthew; no public listing shows it). The site only says "Beau".
2. The person in the photos (alt text is generic until confirmed).
3. Team roles: Laura in the office; Ryan, Mark, Matt in the field (from reviews).
4. Service-area radii (30 / 45 miles) and the community list.
5. After-hours policy. The old site claims 24/7 emergency sewer repair, the hours say Mon–Fri; reviews mention Sunday and after-hours help. The concept says "for an emergency outside those hours, call".
6. Visit accommodations he's willing to offer (the form asks; the home page and statement say "we'll plan around it"), and the statement's "reply within two business days".
7. Whether he still installs Moen Flo (from his 2025 giveaway post).
8. A booking destination for `REQUEST_ENDPOINT` (inbox, CRM, Housecall Pro/ServiceTitan).
9. "Price agreed first" as a policy. His site promises same-day estimates; reviews say the phone quote matched the bill (Elizabeth M., Dave A.), but no source states that every job is priced before work starts.
10. That the office confirms requests "by the next business day" (from his old quote form) and that service is "typically within 24 hours"; neither is promised for emergencies or weekends.

## Launching on deercreekplumbing.com

Change `SITE.origin`/`SITE.base` in `content.ts`, set `robots` to `index, follow` (and the plugin's guard), add a sitemap and robots.txt, point the Google Business Profile website link at the new home page, keep the old URLs (e.g. `/water-heaters`, `/sewer-line-repair`) as 301 redirects to the new service pages, connect `REQUEST_ENDPOINT`, and add Search Console + analytics with consent.
