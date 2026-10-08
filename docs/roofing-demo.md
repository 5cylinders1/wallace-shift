# Roofing demo lander

A sales demo for roofing contractors, served at **roofers.wallaceshift.com**
(and at `wallaceshift.com/demos/roofers`). It is a separate Vite entry with
its own bundle and styles: `demos/roofers/index.html` → `src/demos/roofers/`.
Nothing from the studio site loads on it, and it ships nothing to the studio
site.

## What it shows a prospect

1. **Timelapse hero.** As the visitor scrolls, the camera rises and a crew
   inspects, tears off, re-decks, dries in, shingles and cleans up a house
   over two days, with a night in between. Seven captions explain each step;
   callouts label drip edge, ice & water shield, underlayment, flashing,
   pipe boots and ridge vent.
2. **The short version.** Eight one-line answers linking to the detail.
3. **Insurance.** Covered vs not, the deductible, RCV / ACV / roof schedules,
   how the money moves on a claim, and the claim timeline.
4. **Cost.** Price table, what every quote includes, priced-if-needed extras,
   and a ballpark estimator.
5. **Financing.** Ways to pay and a payment calculator with example terms.
6. **Staying home**, **warranty layers**, and an **FAQ**.
7. **Qualifying form.** Four short steps (problem, insurance and payment,
   timing, contact). Submitting shows the scored lead the contractor would
   receive, including the ballpark and payment the visitor already saw.

## Personalizing a link

Add the prospect's details to the URL:

```
https://roofers.wallaceshift.com/?company=Acme%20Roofing&city=Overland%20Park&phone=9135550199
```

`company` changes the header, truck door, yard sign, warranty and lead
preview; `city` the service area; `phone` every call link. Values are
length-capped and rendered as text. Without them the sample brand is
Northvane Roofing with a 555-01xx number reserved for fiction.

## Where things live

| Change | File |
| --- | --- |
| Any copy, prices in the table, FAQ | `src/demos/roofers/content.ts` |
| Estimator rates and finance math | `src/demos/roofers/pricing.ts` |
| Form questions and lead scoring | `src/demos/roofers/lead.ts` |
| Where leads are sent | `src/demos/roofers/leadAdapter.ts` |
| Sample brand and URL personalization | `src/demos/roofers/brand.ts` |
| Timelapse phases and clock | `src/demos/roofers/timelapse/timeline.ts` |
| Camera shots, crew choreography | `src/demos/roofers/timelapse/director.ts` |
| The drawing | `src/demos/roofers/timelapse/Scene*.tsx`, `geometry.ts` |

The scene is SVG generated in code — no raster assets. `renderScene()` turns
one scroll progress value (0–100) into every attribute, so it scrubs both
ways exactly. In dev, `?p=42` freezes it at a given progress for review.

## Honesty rules this demo keeps

- `LEAD_ENDPOINT` is `null`, so the form never sends anything and never
  shows a fake success; it shows the lead marked "Demo mode · nothing was
  sent".
- Prices, warranty lengths and finance terms are realistic examples and
  carry visible demo notes. Insurance and timing statements are written as
  typical ranges with a not-advice note.
- There are no reviews, ratings, license numbers or client logos, because
  the brand is fictional. A live build adds the contractor's real ones.
- The page is `noindex, nofollow`; the header and footer say it is a
  Wallace Shift concept.

## Deploying the subdomain

`vercel.json` rewrites `/` on host `roofers.wallaceshift.com` to
`/demos/roofers`. To go live:

1. Merge this branch so production builds the demo entry.
2. In Vercel → the `wallace-shift` project → Settings → Domains, add
   `roofers.wallaceshift.com`.
3. If `wallaceshift.com` DNS is not on Vercel, add the CNAME record Vercel
   shows for `roofers` (typically `cname.vercel-dns.com`).

Local review: `npm run dev`, then open `http://localhost:5173/demos/roofers/`.
