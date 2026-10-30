# Bucyrus Auto & Drivetrain: public, unlisted demo

Production URL after deployment: **https://wallaceshift.com/bucyrus-auto**

Local preview: `http://127.0.0.1:5173/bucyrus-auto`

The former `https://contractors.wallaceshift.com/bucyrus-auto` alias redirects permanently to the new URL. The contractors host root remains the original demo collection. Bucyrus has no collection tile or catalog entry. Its standalone public HTML entry is `demos/bucyrus-auto/index.html`; Vercel rewrites `/bucyrus-auto` to it. Local preview and the build generate the same initial HTML from the React components.

## Service pages and vehicle guide

The homepage links to four focused service pages and a symptom guide:

- `/bucyrus-auto/services/maintenance`
- `/bucyrus-auto/services/auto-repair`
- `/bucyrus-auto/services/drivetrain`
- `/bucyrus-auto/services/modifications`
- `/bucyrus-auto/vehicle-guide`

Each has a unique title, description, canonical, social metadata, one H1 and readable page content in the initial HTML. The guide and FAQs use native disclosure elements, so their content and controls work without JavaScript. Internal links, breadcrumbs and related services connect the pages. WebSite, WebPage and breadcrumb structured data identify this as a Wallace Shift website concept; no unverified address, hours, reviews, certification or detailed service offers are encoded.

The user reconfirmed that the demo must stay unindexed until owner approval. All six pages retain `noindex, nofollow` in HTML and response headers and remain outside the sitemap. Owner approval, confirmed service scope/address/hours and a working appointment destination are still required before a business launch. Enabling indexing will also require intentionally updating the crawler policy and tests and adding approved canonical URLs to the sitemap.

## Access and indexing

The Bucyrus document, source entry in development, and compiled assets are public. No demo invitation, agreement, session cookie, or password is required by the application. It is deliberately built into the public `/assets/` namespace, so a visitor can load the whole page without private `/demo-assets/` requests. Other demos retain their access gates.

The page contains `meta name="robots" content="noindex, nofollow"`. Vercel adds `X-Robots-Tag: noindex, nofollow` to the clean alias and direct document paths; the local server mirrors the header. The page is not added to the sitemap or gallery. Its canonical and Open Graph URL use the clean production URL. These crawler directives do not make the page private.

A Git push and a production deployment are separate operations. Vercel preview-deployment protection is platform-controlled; share the production custom-domain URL after the branch is deployed there, not an authentication-protected Vercel preview URL.

## Implementation

Source: `src/demos/bucyrus-auto/`.

- `BucyrusAuto.tsx` / `bucyrus.css`: shared branding, homepage, responsive navigation and page styling.
- `serviceContent.ts` / `BucyrusPages.tsx`: service details, FAQs and sourced symptom education with urgent warning signs. It does not diagnose a vehicle or certify that it is safe to drive.
- `render.tsx` / `bucyrus/vite-plugin.ts`: shared rendering for development and six static production documents. React hydrates the rendered page; no serverless function is added. Unknown Bucyrus paths return 404 in local development/preview; production uses the existing static 404 behavior.
- `BucyrusFilm.tsx` / `filmTimeline.ts`: five-shot, 25.6-second cinematic still-image sequence, including an open hood and immaculate V8. Shared playback clock, pan/zoom, edits, exact-frame pause, reduced motion, offscreen suspension, and failed-image fallback.
- `BucyrusAppointment.tsx`: browser-only request preview. It does not send or save details and does not claim to book an appointment. The existing studio contact endpoint is not a verified shop destination.
- `public/media/bucyrus/`: responsive WebP imagery and the supplied official logo. The original `Bucyrus Auto & Drivetrain/logo.jpg` is copied byte for byte to `logo.jpg`, used in the header, footer, and favicon. CSS frames out the square image’s outer whitespace without redrawing or recoloring the mark.

Sources, claim limits, and exact image prompts are documented in [source audit](bucyrus-sources.md) and [imagery](bucyrus-imagery.md). Hours, current street address, and a real appointment destination remain unconfirmed.

## Validation

Run `npm run build`, `node scripts/test-bucyrus-seo.mjs`, `node scripts/test-bucyrus-film.mjs`, `node scripts/test-bucyrus-public.mjs`, and `node scripts/test-demo-preview.mjs`. The SEO and HTTP preview tests start temporary localhost servers.

The public-route regression checks anonymous GET/HEAD access without a configured access secret, continued protection of other demos, canonical/Open Graph/robots metadata, the old-host redirect, noindex response-header rules, gallery exclusion, and the complete compiled JS/CSS dependency graph. See [validation history](bucyrus-validation.md) for the design and form checks.

Commit message: `feat: add Bucyrus service pages and vehicle symptom guide`
