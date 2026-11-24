# American Mechanical KC concept

Target URL: `https://wallaceshift.com/demo/american-mechanical`

A 20-page website concept for American Mechanical KC (HVAC, water heaters and related services, Kansas City). It was built in Base44 and delivered as `american-mechanical-pro.zip` (repository root, 2026-11-23). This copy ports that build into the site's own demo pipeline. The design, copy and business facts are the Base44 build's, unchanged.

## Pages

| Path below `/demo/american-mechanical` | Source route |
| --- | --- |
| (home) | `src/routes/index.jsx` |
| `/heating-and-cooling`, `/water-heater-installation` | service detail pages |
| `/services/appliance-sales-service`, `/services/interior-remodels`, `/services/exterior-remodels` | service detail pages |
| `/locations/kansas-city-mo`, `/locations/merriam-ks` | area pages |
| `/blog` | article list with category, page-size and pagination controls in the query string |
| `/blog/<slug>` (11 articles) | `src/lib/blog/*.js` |

`/water-heater-installation-merriam-ks` was a 301 in the Base44 build. It stays a 301 to `/locations/merriam-ks` (in `vercel.json` for production and in the plugin for dev).

## How it is built

- `american-mechanical/vite-plugin.ts` server-renders every page at build time into `dist/demo/american-mechanical/**/index.html`, and serves them the same way in `vite dev`. It is modelled on the Deer Creek Site B plugin.
- `src/demos/american-mechanical/` holds the React port: `content.ts` (facts, services, detail-page copy, page list), `blog/` (the articles, copied as data), `HomePage`, `DetailPage`, `BlogPages`, `QuoteForm`, `ServiceAreaMap` and `site.css`.
- `site.css` is the Base44 `site.css` unchanged, preceded by the Tailwind preflight rules it relied on (scoped, zero specificity) and followed by plain CSS for the Tailwind utility classes the components used. The site does not use Tailwind.
- Icons are the same Lucide icons, inlined in `icons.tsx`.
- Every page is `noindex, nofollow` (meta tag, `X-Robots-Tag` header and plugin assertion), with no sitemap entry. The demo is public: `american-mechanical` is in `PUBLIC_DEMO_DIRS`.
- Local preview: launch config `american-mechanical-demo-preview` (port 5191).

## What was left out

The Base44 platform pieces are not part of this copy: TanStack Start server functions, the Base44 SDK and `QuoteRequest` entity, sign-in and MFA pages, the shadcn component kit, the AI gateway and the Cloudflare Worker setup. None of them showed on the public pages.

## Quote form

`submit.ts` keeps `QUOTE_ENDPOINT = null`, so the form validates as before and then says plainly: "Website preview: this request was not sent", with the phone number. Nothing leaves the browser. Set the endpoint to an HTTPS URL that accepts the JSON `QuoteRequest` to make it live; the form only reports "received" when that endpoint answers OK.

## External assets

- Hero image: the Base44 build's generated illustration, loaded from `media.base44.com` through its resize path (640 and 1024 px, AVIF/WebP). It breaks if that Base44 project's media is deleted. Self-hosting it under `public/demos/american-mechanical/` would remove the dependency.
- Lennox, Carrier, YORK and Rheem logos on `/heating-and-cooling` load from each manufacturer's own site, as in the Base44 build.
- Fonts: Inter and Space Grotesk from Google Fonts.

## Confirm before showing it as the owner's site

These facts come from the Base44 build and were not re-checked for this port:

- Phone (913) 725-8376, email info@amechkc.com, 1025 Winchester Ave address and Mon–Fri 9–5 hours.
- "4.6 from 37 Google reviews" and the two review excerpts (Jen Sol, Evan Johnson). The rating and count will drift.
- Which services are actually offered (filtration, appliances and remodels are framed as "ask about availability").
- The service-area list and map are approximate, as the page itself says.
- Where quote requests should go.
