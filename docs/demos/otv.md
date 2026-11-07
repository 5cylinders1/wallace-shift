# OTV | Open Television: home page concept

A redesign of the home page of a **real** prospect, OTV | Open Television, the
Chicago nonprofit streaming platform and media incubator at weareo.tv. Built
2026-11-06. Like the other real-business concepts, every fact is sourced and
nothing about the organisation is invented.

- Local: `/demo/otv` or `/demos/otv/` on the dev server (launch config
  `otv-demo-preview`, port 5187; no cookie needed).
- Production: `https://wallaceshift.com/demo/otv` (any host on the project
  serves it), **public** and unindexed: `noindex` meta plus an `X-Robots-Tag`
  header on `/demo/otv` and `/demos/otv`.
- Document `demos/otv/index.html` (public build pass), code `src/demos/otv/`,
  media `public/demos/otv/`. `otv` is in `PUBLIC_DEMO_DIRS`; there is no gate
  key and no API. It is not on the contractors lander (OTV is not a trade).

## Design

OTV's whole identity is "open television", and its current site already uses
a test-card palette. The concept makes the page a channel that is always on:

- **Hero**: a full-bleed television cycling seven real titles from the OTV
  catalog. Changing channel cuts through a burst of canvas static and a short
  vertical roll; a broadcast lower third shows the channel, title, collection,
  a running timecode and channel controls (pause included, arrow keys work).
  Power-on line on first load. "intersectional." is set in the seven test-card
  bars. On wide screens the picture sits right of the copy, with a separate
  `focusWide` crop per title so faces stay clear of the headline.
- **Three ways in**: watch it / make it / keep it on air, one door per
  audience (viewers, artists, supporters). Heading is OTV's own line.
- **Now streaming**: the catalog's own three shelves (New and Upcoming,
  Queer Love, #OTVAtlas ambassadors) as tabs over a scrolling rail.
- **Program guide**: printed TV listings replacing the 23-item hashtag menu.
  Status per program; a monitor previews the hovered row on desktop.
- **Ten years**: on desktop the section pins and scrolling drags a playhead
  across an editing timeline of program tracks; the monitor cuts between
  milestones. Phones, tablets and reduced motion get a plain list.
- **Studio**: a call sheet beside the soft-launch director's-chair portraits.
- **Credits**: proof set as end credits. **Station ID**: closing CTAs over a
  full CSS test card.

Type: Big Shoulders Display (titles), Instrument Sans (body), DM Mono
(broadcast labels). Reduced motion removes the power-on, channel surfing,
pinning, reveals and color drift.

## Sources of fact (read 2026-11-06)

Everything the page says is in `src/demos/otv/content.ts`.

- weareo.tv home: tagline, "award-winning nonprofit platform", program
  launch years (app end of 2020, Fellows 2019, Study Hall 2020, Brave Futures
  2019), "over 500 original digital series, pilots, short-films and video art
  concepts", 2015 start as a Northwestern research project, the communities
  served, app store links, newsletter and support links.
- /vision: mission and vision wording, "hundreds of" titles, Emmy / Webby /
  Gotham / Streamy wins and nominations, development deals with HBO,
  Lionsgate, Hulu and Red Arrow Entertainment, press list, social handles.
- /otvstudio: formerly Reunion Chicago, Humboldt Park at North and Rockwell,
  3,000 sq ft, rooms and uses, ~12 bookings a quarter by lottery, priority
  order, two-week replies, studio@weareo.tv, the booking form.
- /fellows: on hiatus; six cohorts, two dozen-plus storytellers; alumni
  opportunities; 10th anniversary pause of marquee programs.
- /pitchplease (2024 with SeriesFest, up to $30,000), /activations/tablereadclub
  (live; London, Johannesburg, Chicago, Guadalajara, Mexico City),
  beyondthescreen.live (audio series and book on a decade), otvatlas.com
  (Atlas fund concluded; otvatlas.info resource hub), /submit (non-exclusive
  distribution via the 2025 Submittable form), /donate (501(c)(3), Givebutter).
- watch.weareo.tv/browse: the three shelves and their titles.

No street number, phone, staff names, prices, ratings or audience figures are
published on the page.

## Imagery provenance

All images are OTV's own, downloaded 2026-11-06 from the public catalog
(vhx.imgix key art and posters) and weareo.tv (Squarespace CDN). The
soft-launch portraits' filenames credit Felton Edward Kizer; the caption says
so. Originals stayed in the session scratchpad; production WebP copies are in
`public/demos/otv/` (about 2.6 MB in total, only the first hero frame is
preloaded). The footer states the page is a Wallace Shift concept and that the
work belongs to OTV and its artists.

## Confirm before showing OTV

- Which programs are running now (Brave Futures and Study Hall are shown as
  streaming, Table Read Club as live, Fellows as on hiatus).
- Whether "Start a free trial" is still the right primary action, and the
  current submission form (its name says 2025).
- Which contact address to show: the footer of /vision lists
  developer@weareopen.tv, the studio page studio@weareo.tv.
