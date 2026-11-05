# Anthony demo: copy of anthonyphc.com

A static copy of the home page of Anthony Plumbing, Heating, Cooling & Electric
(https://anthonyphc.com/), made so a chat widget can be shown on their own page.

- Route: `https://wallaceshift.com/demo/anthony`, public and unindexed (`noindex`
  meta plus `X-Robots-Tag` on `/demo/anthony/:path*` in `vercel.json`).
- Files: `public/demo/anthony/` (served as-is, outside the Vite bundle). The
  WordPress folder layout is kept under `wp-content/` and `wp-includes/` so the
  site's relative CSS urls still resolve.
- Regenerate: `node scripts/anthony/mirror.mjs` (add `--no-map` to keep the map
  capture). It needs network access, the installed Chrome and `cwebp`.
- Local preview: launch config `anthony-demo-preview` (port 5185), then open
  `/demo/anthony`.

## Adding the chat widget

Put the widget's tag in `BODY_END` in `scripts/anthony/mirror.mjs`; it is injected
before `</body>` and survives a re-mirror. Editing `public/demo/anthony/index.html`
directly also works, but the next mirror run overwrites it.

## What differs from the live page

| Live site | Copy | Why |
| --- | --- | --- |
| CallRail swaps in tracking numbers | Shows the number in their HTML, (913) 298-0444 | CallRail is their account |
| Google Map from their API key | Static capture of that map (`media/service-area-map.webp`) | Their key, billed to them. On phones the copy shows the desktop view scaled down |
| UserWay accessibility button | Removed | Their account |
| ServiceTitan scheduler, reCAPTCHA | Removed | Booking from the demo would reach their real systems |
| GTM, Clarity, Meta, Bing, Amazon and other pixels | Removed | Tracking for their marketing |
| Rank Math SEO tags and LocalBusiness JSON-LD | Removed, page is `noindex` | The copy must never compete with or pose as the business |
| A footer script that throws `AOS is not defined` | Removed | It fails on its first line live too, so behaviour is unchanged |

Kept as they are: the Elfsight review widgets (they load live from Anthony's
Elfsight account and work off-domain), jQuery, Flickity carousels, Alpine
navigation, mega menu and accordion.

Every page link, the search form, "Schedule Online" and "Save Now" go to
anthonyphc.com. The logo links back to `/demo/anthony`.

Checked 2026-11-05: full-page screenshots at 1440 and 390 match the live site
pixel for pixel apart from the phone number, the UserWay button and the map. No
console errors, no broken images, no relative links left.
