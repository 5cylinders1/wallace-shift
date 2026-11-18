# Sue’s Tailor Shop website demo

The active tailor demo is Sue’s Tailor Shop in Overland Park, with a feminine focus on dresses, special occasions, and wedding dress inquiries, plus a local appointment request preview. **The five-cutout hero was rejected by the user as insufficiently cinematic and is obsolete.** The replacement now uses completed original landscape and portrait garment films delivered as scroll-controlled canvas frames. Local browser results and their limits are recorded in [the final verification](review/sues-tailor/cinematic/README.md). Visible Wallace Shift concept attribution was removed at the user’s explicit request; the illustrative photography credit remains in the footer.

## Preview and implementation

- Primary route: `/demo/sues-tailor`.
- Compatibility route: `/demo/best-tailor` remains available and serves the same page.
- Document route: `/demos/best-tailor/`. Existing `best-tailor` source and asset paths are retained as internal implementation names.
- Local preview: `http://127.0.0.1:5194/demo/sues-tailor` using `npm run dev -- --host 127.0.0.1 --port 5194`.
- HTML entry: `demos/best-tailor/index.html`.
- React entry and page: `src/demos/best-tailor/main.tsx` and `BestTailorApp.tsx`.
- Business data and selected review summaries: `src/demos/best-tailor/data.ts`.
- Dress story: `src/demos/best-tailor/DressStory.tsx` and `bridal.css`.
- Appointment preview: `src/demos/best-tailor/AppointmentRequest.tsx` and `appointment-request.css`.
- Base styles: `src/demos/best-tailor/best-tailor.css`.
- Assets: `public/demos/best-tailor/`; image provenance: `src/demos/best-tailor/assets.md`.
- Scoped design record: `src/demos/best-tailor/DESIGN.md` and `.impeccable/design.json` inside the same demo directory.
- Integration: `vite.config.ts`, `vercel.json`, `api/_lib/demo-access.ts`, and `src/demo-access/catalog.ts`.

Both aliases and the document are public without demo sign-in. HTML metadata and response headers declare `noindex, nofollow`; the page is not added to the public sitemap. The admin directory displays Sue’s Tailor Shop and links to the new alias. Existing protected demos remain gated, and the alias does not open a new source or asset namespace.

## Business information and editorial choices

The directly inspected [Google business profile](https://www.google.com/maps/place/Sue%27s+Tailor+Shop/@38.8588277,-94.66854,17z/data=!4m6!3m5!1s0x87c0c1a4d57811f5:0x80c7dd79af364b9e!8m2!3d38.8588277!4d-94.6659651!16s%2Fg%2F11g1tyh26l) identifies Sue’s Tailor Shop at **14873 Metcalf Avenue, Overland Park, KS 66223**, with phone **(913) 944-1983**. The page’s telephone link is `tel:+19139441983`.

Listed hours are Monday–Thursday **10 AM–6 PM**, Friday **10 AM–4 PM**, and Saturday–Sunday **closed**. Google lists appointments as required. The primary page action opens the fitting request preview; calling Sue remains the way to arrange an actual appointment. The visit panel includes the listed hours, onsite parking, an accessible entrance, and advice to call ahead for appointments and holiday hours. No booking availability or holiday schedule is inferred.

The page emphasizes occasion dresses, everyday dresses and skirts, denim, and garment repairs. Wedding dress copy invites the visitor to discuss their particular gown and proposed adjustments; it does not claim custom gown creation or promise that every bridal alteration is available. Shoe and luggage repair claims from the previous business were removed. The new page does not reuse the previous business’s reviews or contact details. Prices, rush service, guarantees, biography, and current turnaround times were not established.

Google displayed **4.9 from 263 reviews**, checked **November 17, 2026**. This is a dated snapshot, not a live rating feed. Twenty recent review records were collected in `docs/review/sues-tailor/reviews.csv`; that collection is not the full review history. The page shows six attributed editorial summaries, not quotations, each with an individually verified five-star rating. The names are Sophie Oatman, Tiffany Medina, Valeria, Tom Sanders, Megan Simmons, and Scarlett. The page labels summaries and links to the Google originals.

The full source record, directory conflicts, and collection limits are documented in [sues-tailor-research.md](sues-tailor-research.md). The current directly observed Google address takes precedence over older conflicting directory addresses.

The rejected hero attempt used five transparent pieces extracted from one Higgsfield gown image. Although their transforms followed scrolling, the result did not satisfy the user’s cinematic reference. The replacement uses original generated garment films with continuous cloth bending and unfolding, converted to canvas frames and scrubbed with scrolling. A dark-plum hero, amber-lit ivory cloth, and cream Caslon headings accompany the sequence; the rest of the page retains its warm boutique palette. The desktop camera stays locked without an added zoom. The imagery does not document Sue’s actual work or establish custom gown creation. The original triptych and sewing-machine image remain retained source assets.

The verified reference study, rejected storyboard, generation ledger, and historical browser evidence are collected in [the assembly review](review/sues-tailor/assembly/README.md). The creator is Octaboot; the matching reference is https://tailor-by-octaboot.vercel.app/. Its public script uses 535 WebP frames in a canvas. Sue’s replacement uses 180 frames per orientation: 1280 × 720 landscape and a separately generated 720 × 1280 portrait sequence at widths of 600 px and below. Each uses the first 7.5 seconds of its source film, trimmed before reversal and sampled at 24 fps, ending on the completed gown. Static reduced-motion behavior, fitting access, and resilience checks are documented in [the final verification](review/sues-tailor/cinematic/README.md).

## Generated dress media

One image was generated through the Higgsfield browser interface using **GPT Image 2**, **2K**, **High**, and **16:9**. The generation used **6.5 credits**, approximately **$0.39 of credit value** at the displayed $6-per-100-credit rate, within the user’s $5 limit. No top-up or new plan was purchased.

The 1920 × 1086 triptych was split into three 640 × 1086 WebP panels: `first-fitting.webp`, `small-details.webp`, and `final-fitting.webp`, under `public/demos/best-tailor/media/`. The final panel supplied the five lossless transparent layers for the rejected cutout attempt. That extraction required no additional generation; it is historical provenance, not an accepted visual solution.

All four replacement jobs completed: landscape image `bed32843-333b-436c-9029-f676b29fae1b` (2.75 credits), landscape MiniMax H3 video `ae0bf8fc-6c18-4b53-b89f-22dd245819ff` (20), portrait image `ff5323e2-6497-4a0b-ae18-b3178b8a219e` (2.75), and portrait MiniMax H3 video `ba059b17-2628-4253-9902-a36a62840f66` (20). The verified balance moved from 1,193.5 to 1,148, confirming 45.5 replacement credits debited. Including the original 6.5 credits, the total is **52 credits**, approximately **$3.12** at the previously observed $6-per-100-credit rate, leaving **$1.88** of the $5 cap. No credit purchase or new card charge occurred; no further generation is planned.

Landscape frames total **7,664,048 bytes** and portrait frames **7,994,014 bytes**, excluding posters, manifests, and code. Dimensions, frame counts, trim, and source jobs are recorded in the two `public/demos/best-tailor/media/cinematic/` manifests. The [generation record](review/sues-tailor/assembly/cinematic-generation.json) retains the available exact prompts and job IDs. Source contact sheets verify the finished-gown endpoints; generation completion and source inspection do not establish final browser performance or user acceptance.

## Appointment request preview

The user selected a demonstration form, with no messages sent. `AppointmentRequest` uses React state only: no network calls, browser storage, uploads, delivery backend, or reservation. It collects a name, phone/email reply preference and matching contact field, garment/service, optional event and fitting dates, and optional notes.

Submission validates the required details, future dates, weekday fittings, and a fitting date on or before the event. It then shows an editable summary with **“Nothing has been sent or booked”** and a call link to Sue. Edit preserves the entered details; Clear removes them. Required fields, inline errors, a focused error summary, labelled contact choices, and focus transitions support keyboard and screen-reader use.

The page retains the service accordion, manual review selector, mobile menu, direct phone links, and Google Maps directions. The mobile quick-contact navigation now offers Request a fitting and Call Sue.

## Historical fitting-image revision validation

The bridal revision was verified through computer-use browser inspection at 320, 390, 768, 1024, 1440, and 1920 pixels. Every width had no horizontal overflow and all dress images loaded. No console errors were observed.

- The new appointment component passed TypeScript, targeted ESLint, and whitespace checks before integration.
- Rendered checks passed for keyboard dress-stage changes, mobile menu Escape and focus return, and both review pages.
- Form checks passed for blank-submit error focus, phone and email review flows, pointer selection of Email, rejection of past dates, weekend fittings and fittings after the event, valid-date summaries, and Edit/Clear focus and retained or cleared values.
- The final full production build passed after the CSS and copy changes. Built HTTP integration passed all 735 route/asset responses with mocked services and no external provider calls. The HTTP test required permission to bind a localhost server outside the sandbox.
- The browser script at that point covered three images and keyboard stages plus the form. Those stage-specific checks do not validate either the rejected cutout assembly or its cinematic replacement.
- Historical CUA evidence is recorded in `docs/review/sues-tailor/bridal/browser-results.json`; it must remain separate from replacement validation.
- Automated axe accessibility scanning was not rerun for this revision; the completed browser inspection is not represented as an axe pass.

The work has not been deployed or committed.

Proposed commit message: `Add an interactive dress fitting story and appointment preview for Sue’s Tailor Shop`.

### Historical identity-rebrand verification, November 17, 2026

The full production build passed. Demo access tests passed 47/47, and built HTTP integration passed 735 route/asset responses. The rebranded page was inspected in the in-app browser at 320, 390, 768, 1024, 1440, and 1920 pixels with no horizontal overflow. Sue’s longer wordmark fits, old business/Wallace Shift text is absent, every phone link uses the verified number, the mobile menu opens and closes with Escape, and both review pages display the correct customers. The new alias is open in the user’s preview. Evidence is recorded in `docs/review/sues-tailor/browser-results.json`; screenshots were inspected inline. Automated accessibility was not rerun for this content rebrand. No production deployment or commit was made.

## Cinematic assembly replacement verification

See [the assembly review](review/sues-tailor/assembly/README.md) for the verified reference, rejected five-cutout storyboard, completed replacement media, verified cost ledger, and current status. The cutout recordings and checkpoint screenshots are obsolete and do not establish visual quality or user acceptance; that old suite contains an overall failure. The [final verification](review/sues-tailor/cinematic/README.md) records current cinematic browser results, build checks, recordings, and limitations. The current local Chromium report passes all five viewport widths, five reduced-motion runs, and five resilience cases. The opening portrait composition slightly clips the outer fabric; the final gown fits. These local results do not establish physical-phone performance, reference parity, or user acceptance. Earlier checks above describe the previous fitting-image revision only.
