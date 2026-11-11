# SoLara Salon: website concept

A one-page website concept for a **real** prospect, SoLara Salon, Lara Black's
haircolor salon in South Overland Park, KS. Built 2026-11-11 from Matthew's
brief: "a modern clean website that has a beautiful video header with booking
and inquiry forms". Like the other real-business concepts, every fact is
sourced below and nothing about the business is invented.

- Local: `/demo/solara` or `/demos/solara/` on the dev server (launch config
  `solara-demo-preview`, port 5189; no cookie needed).
- Production (once deployed): `https://wallaceshift.com/demo/solara`,
  **public** and unindexed: `noindex` meta plus an `X-Robots-Tag` header on
  `/demo/solara` and `/demos/solara`.
- Document `demos/solara/index.html` (public build pass), code
  `src/demos/solara/`, media `public/demos/solara/`. `solara` is in
  `PUBLIC_DEMO_DIRS` and in the authenticated demo directory
  (`src/demo-access/catalog.ts`). It is not on the contractors lander (a salon
  is not a trade). No Wallace Shift branding on the page, per
  `prospect-demos-no-agency-branding`.

## Design

Warm ink and cream with one copper accent ("sol"), Bodoni Moda for display and
Jost for text: a fashion-editorial pairing that reads as a colorist's salon,
not a chain. The wordmark sets "So" upright and "Lara" in italic, which is how
the name is built.

- **Video header**: a 17.5 s loop that tells a colorist's story in three cuts:
  lightener whisked in a bowl, color brushed through a section, a comb drawn
  through the glossy finished hair. Copy sits left on a dark gradient; the
  booking/question card sits right. On phones the video fills the first screen
  with a separate portrait crop and the card follows on a dark band.
- **Book / Ask card** in the header: tabs (arrow keys work). "Book" takes a
  service, an optional day and time of day, then hands off to the full booking
  form at the first missing step. "Ask" is a short question form.
- Meet Lara, Services (8 rows, each with Book), Work (18 of Lara's photos with
  filters and a keyboard lightbox), Clean color (O&M CØR free-from list, Kevin
  Murphy), Reviews (the five written Google reviews in full), Booking (4 steps:
  services, day and time, details, review), Visit (address, hours with live
  open/closed status in Central time, amenities) beside the full question form
  with optional photo previews, Footer.
- Motion is GSAP: a soft hero entrance and short scroll reveals. Reduced motion
  removes both and stops the video autoplay (the poster shows; the pause/play
  button still works). The video has a pause button for everyone.

## Forms

`src/demos/solara/submit.ts` holds `BOOKING_ENDPOINT` and `INQUIRY_ENDPOINT`,
both `null`. With no endpoint the forms validate, then say plainly: "Preview
only. Your booking request was not sent", with Lara's phone number. Set an
HTTPS endpoint that accepts the JSON shapes in that file to go live. Photos in
the question form stay on the device (object URLs only).

Day choices are the next 14 days (SoLara is open every day); time choices are
windows inside each day's hours, not slots, and the form says Lara confirms the
exact time.

## Sources of fact (read 2026-11-11)

Everything the page says is in `src/demos/solara/content.ts`.

- **Square site** (solara-salon.square.site, the salon's own site): name
  styled "SoLara Salon"; "Lara black at ASPEN SALON"; "Specializing in
  haircolor and customized looks for women of all ages"; "Now offering O&M CØR
  COLOR" and its free-from list (sulfates, parabens, triclosan, propylene
  glycol, phthalates, sodium chloride, animal testing); Kevin Murphy styling,
  finishing and treatment products; gift cards $1 to $100; the gift card shows
  "Lara Black, Colorist/Stylist".
- **Google Business Profile** (the source of the reviews Matthew pasted):
  8025 W 151st St, Overland Park, KS 66223; (913) 579-0178; hours Mon–Fri
  11–8, Sat–Sun 10–5; 4.8 from 6 reviews; the five written reviews (Alissa
  Bender, Janet Heslop, Troy & Patty Nelson, Tina Forir, Cheryl Horton; Kayla
  Loftiss left 4 stars without text); About: wheelchair-accessible entrance,
  restroom and parking, free on-site parking, LGBTQ+ friendly, appointments
  recommended, checks, credit, debit and NFC payments; 32 owner photos.
- **Aspen Salon & Spa Suites** is also at 8025 W 151st St (Google), and one of
  Lara's owner photos is its sign: SoLara is her suite in that building. The
  suite number is not published.
- **Fresha** (an unclaimed listing): same address, phone and hours; one service,
  "Blow Dry".
- **MapQuest** is stale and was not used: it gives 14884 Metcalf Ave (another
  suites building), (913) 416-3606, different hours, and a StyleSeat profile
  that now redirects to a search page.

Services come from the reviews and listings: color, highlights, color
correction, cuts and styling, keratin (Troy & Patty), blow dry (Fresha), plus
vivid color (the owner photos). **No prices or durations are published
anywhere**, so the page says pricing isn't listed online yet. One review
mentions "$40–60" for a haircut; it is not used.

## Imagery and video provenance

- **Work gallery**: 18 of Lara's own owner photos from the Google profile,
  downloaded 2026-11-11 (originals stayed in the session scratchpad). Titles
  and alt text are descriptive. Three images carry Lara's own captions
  ("Brassy to Beauty", "Before and After Paula", "Lara Black"), so the page
  adds no overlay caption on those. Client faces were left out. The Aspen sign
  photo is also hers.
- **Hero video**: three stock clips by **cottonbro studio** on Pexels (free
  under the Pexels license; no attribution required, credited here):
  3996901 "Mixing Hair Coloring Products On A Plastic Bowl With A Stirrer"
  (15.0–21.0 s), 3996900 "Brushing A Woman's Hair With Hair Coloring Products"
  (0.5–7.5 s), 3997028 "Stretching A Woman's Hair With Comb" (5.5–13.0 s).
  These are not Lara or her salon, which is fine for an atmospheric header but
  worth replacing with her own footage if she has any.
- The loop: the first clip's opening 1.2 s is moved to the end and crossfaded
  in, so the last frame runs straight into the first (SSIM across the seam
  0.874 vs 0.887 between ordinary neighbouring frames). 1 s crossfades between
  cuts, no audio, 25 fps. Desktop `hero-1920.mp4` (1920×1012, CRF 28, 4.9 MB)
  and portrait `hero-720.mp4` (720×1280, crops re-aimed per cut, 2.9 MB).
  Posters are the first frames as WebP; only the matching poster is preloaded.

## Confirm with Lara before showing it as hers

- The headline "Haircolor, made for you." and all section copy are
  Claude-authored. The service one-liners and descriptions are Claude's wording
  of what the sources support; "Color consultation" is a proposed service.
- Whether she wants prices shown, and whether "Lara confirms every request"
  matches how she books (text, call, Square Appointments).
- Where booking requests and questions should go (both endpoints are null).
- Permission to use her Google photos on a new site, and whether she has video
  of her own work for the header.
- Spelling preference: "SoLara" (her Square site and Google) vs "Solara".
