# Sue’s Tailor Shop website demo

The active tailor demo is Sue’s Tailor Shop in Overland Park. The current revision brings a more feminine focus to dresses, special occasions, and wedding dress inquiries, with an interactive fitting story and a local appointment request preview. Visible Wallace Shift concept attribution was removed at the user’s explicit request; the illustrative photography credit remains in the footer.

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

The hero now presents three generated dress stages: “The first fitting,” “The small details,” and “The final try-on.” The images illustrate a fitting sequence and do not document Sue’s owner, premises, or completed work. A caption and footer identify illustrative imagery. The original sewing-machine image remains an unused retained asset. Libre Caslon Display and DM Sans are self-hosted under the retained public font directory.

## Generated dress media

One image was generated through the Higgsfield browser interface using **GPT Image 2**, **2K**, **High**, and **16:9**. The generation used **6.5 credits**, approximately **$0.39 of credit value** at the displayed $6-per-100-credit rate, within the user’s $5 limit. No top-up or new plan was purchased.

The 1920 × 1086 triptych was split into three 640 × 1086 WebP panels: `first-fitting.webp`, `small-details.webp`, and `final-fitting.webp`, under `public/demos/best-tailor/media/`. DressStory uses manual stage controls with crossfades and a small settling scale. It does not auto-advance. Reduced-motion preferences remove the transitions.

## Appointment request preview

The user selected a demonstration form, with no messages sent. `AppointmentRequest` uses React state only: no network calls, browser storage, uploads, delivery backend, or reservation. It collects a name, phone/email reply preference and matching contact field, garment/service, optional event and fitting dates, and optional notes.

Submission validates the required details, future dates, weekday fittings, and a fitting date on or before the event. It then shows an editable summary with **“Nothing has been sent or booked”** and a call link to Sue. Edit preserves the entered details; Clear removes them. Required fields, inline errors, a focused error summary, labelled contact choices, and focus transitions support keyboard and screen-reader use.

The page retains the service accordion, manual review selector, mobile menu, direct phone links, and Google Maps directions. The mobile quick-contact navigation now offers Request a fitting and Call Sue.

## Current validation status

The bridal revision was verified through computer-use browser inspection at 320, 390, 768, 1024, 1440, and 1920 pixels. Every width had no horizontal overflow and all dress images loaded. No console errors were observed.

- The new appointment component passed TypeScript, targeted ESLint, and whitespace checks before integration.
- Rendered checks passed for keyboard dress-stage changes, mobile menu Escape and focus return, and both review pages.
- Form checks passed for blank-submit error focus, phone and email review flows, pointer selection of Email, rejection of past dates, weekend fittings and fittings after the event, valid-date summaries, and Edit/Clear focus and retained or cleared values.
- The final full production build passed after the CSS and copy changes. Built HTTP integration passed all 735 route/asset responses with mocked services and no external provider calls. The HTTP test required permission to bind a localhost server outside the sandbox.
- `scripts/test-best-tailor-browser.mjs` now checks the current hero/service/navigation selectors, all three dress images and keyboard stages, reduced motion, form validation/review/edit/clear, both contact methods, and absence of form POST requests or storage writes. The updated browser script has **not been executed** in this revision.
- Current CUA evidence is recorded in `docs/review/sues-tailor/bridal/browser-results.json`. Future script captures use the same bridal review directory to preserve the earlier identity-rebrand results.
- Automated axe accessibility scanning was not rerun for this revision; the completed browser inspection is not represented as an axe pass.

The work has not been deployed or committed.

Proposed commit message: `Add an interactive dress fitting story and appointment preview for Sue’s Tailor Shop`.

### Historical identity-rebrand verification, November 17, 2026

The full production build passed. Demo access tests passed 47/47, and built HTTP integration passed 735 route/asset responses. The rebranded page was inspected in the in-app browser at 320, 390, 768, 1024, 1440, and 1920 pixels with no horizontal overflow. Sue’s longer wordmark fits, old business/Wallace Shift text is absent, every phone link uses the verified number, the mobile menu opens and closes with Escape, and both review pages display the correct customers. The new alias is open in the user’s preview. Evidence is recorded in `docs/review/sues-tailor/browser-results.json`; screenshots were inspected inline. Automated accessibility was not rerun for this content rebrand. No production deployment or commit was made.
