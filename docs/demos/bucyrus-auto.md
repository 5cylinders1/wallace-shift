# Bucyrus Auto & Drivetrain: public, unlisted demo

Production URL after deployment: **https://contractors.wallaceshift.com/bucyrus-auto**

Local preview: `http://127.0.0.1:5173/bucyrus-auto`

The contractors host root remains the original demo collection. Bucyrus has no collection tile or catalog entry. Its standalone public HTML entry is `demos/bucyrus-auto/index.html`; Vercel and local preview rewrite `/bucyrus-auto` to it.

## Access and indexing

The Bucyrus document, source entry in development, and compiled assets are public. No demo invitation, agreement, session cookie, or password is required by the application. It is deliberately built into the public `/assets/` namespace, so a visitor can load the whole page without private `/demo-assets/` requests. Other demos retain their access gates.

The page contains `meta name="robots" content="noindex, nofollow"`. Vercel adds `X-Robots-Tag: noindex, nofollow` to the clean alias and direct document paths; the local server mirrors the header. The page is not added to the sitemap or gallery. Its canonical and Open Graph URL use the clean production URL. These crawler directives do not make the page private.

A Git push and a production deployment are separate operations. Vercel preview-deployment protection is platform-controlled; share the production custom-domain URL after the branch is deployed there, not an authentication-protected Vercel preview URL.

## Implementation

Source: `src/demos/bucyrus-auto/`.

- `BucyrusAuto.tsx` / `bucyrus.css`: one-page responsive demo.
- `BucyrusFilm.tsx` / `filmTimeline.ts`: five-shot, 25.6-second cinematic still-image sequence, including an open hood and immaculate V8. Shared playback clock, pan/zoom, edits, exact-frame pause, reduced motion, offscreen suspension, and failed-image fallback.
- `BucyrusAppointment.tsx`: browser-only request preview. It does not send or save details and does not claim to book an appointment. The existing studio contact endpoint is not a verified shop destination.
- `public/media/bucyrus/`: responsive WebP imagery and concept favicon.

Sources, claim limits, and exact image prompts are documented in [source audit](bucyrus-sources.md) and [imagery](bucyrus-imagery.md). Hours, current street address, and a real appointment destination remain unconfirmed.

## Validation

Run `npm run build`, `node scripts/test-bucyrus-film.mjs`, `node scripts/test-bucyrus-public.mjs`, and `node scripts/test-demo-preview.mjs`.

The public-route regression checks anonymous GET/HEAD access without a configured access secret, continued protection of other demos, canonical/robots metadata, noindex response-header rules, gallery exclusion, and the complete compiled JS/CSS dependency graph. See [validation history](bucyrus-validation.md) for the design and form checks.

Commit message: `feat: add public unlisted Bucyrus Auto demo`
