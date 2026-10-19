# Roofing website + CRM collection and offer

The offer is **Motion website + roofing CRM included with a 12-month managed
automation plan**. Managed automation starts at **$750/month**, a **$9,000 minimum
service commitment** over the initial year, before separate vendor costs. The
website build and CRM setup are included at no additional charge. The final fee
depends on workflow complexity, integrations and support needs, with the initial
implementation and ongoing scope agreed in writing before commitment.

The collection currently has six available demo designs and five client places.
Demo 06 (Stratum) was added without changing the number of client places;
that is an offer term, so change it only if the offer itself changes.
An inquiry does not reserve a place, create a contract or collect payment.
The offer index identifies Wallace Shift with the existing white WS logo and
company name in both the header and footer, linked to the studio homepage.

The index uses the studio's Manrope / Instrument Serif typography and production
ink, pearl and azure palette from `docs/brand-palette.md`. Its capsule navigation,
underlined header action, cool hero glow, diagonal transition and editorial rules
carry Wallace Shift's style through the offer, collection, CRM and inquiry form.
Light surfaces use deep azure for readable accent text. The separate demo brands
keep their own styling. The offer entry point has scoped styles rather than
importing the main site's layout stylesheet.

## Positioning and automation education

The previous $5,000 website-value badge is removed. The studio's Motion starting
price is $5,000, but there is no established standalone price for this combined
roofing package. Do not invent a higher bundle valuation or add the custom-app
price to the reusable CRM offering.

The page keeps the website collection first, followed by included CRM tools,
six practical automation starting points and service terms. A hero link jumps
directly to the automation examples. Featured workflows cover
lead response, estimates, inspections, customer progress, reviews and storm
outreach. Each explains a qualitative time benefit and financial upside; none
claims measured savings, guaranteed revenue or unsupported popularity.

`src/demos/roofers-offer/automationMenu.ts` contains the six featured examples and
the full 24-item menu, grouped into sales, operations and growth. One native
`details` disclosure keeps the full menu collapsed until requested and supports
keyboard operation. The menu offers workflow choices; it does not promise all
24 workflows at the starting price.

The CRM scope includes customer/property records, severe-weather/customer maps
and outreach tools, a customer progress portal, lead/review follow-up, and paid
ads/social media management tools. Done-for-you campaigns and content management
are separately scoped services. Ad spend, platform subscriptions and third-party
usage are separate. The dashboard preview remains labeled as sample data and
illustrates part of the CRM; it is not proof of deployed customer integrations.

This roofing promotion includes an agreed initial implementation and has a
12-month commitment. It is distinct from the general studio rolling maintenance
offer. New workflows and substantial changes after the agreed launch scope are
quoted separately.

## URL map

| Public URL | Build document / original local entry |
| --- | --- |
| `https://roofers.wallaceshift.com/` | `/demos/roofers-offer/` |
| `https://roofers.wallaceshift.com/northvane` | `/demos/roofers/` |
| `https://roofers.wallaceshift.com/northvane/insurance` | `/demos/roofers/insurance/` |
| `https://roofers.wallaceshift.com/northvane/prices` | `/demos/roofers/prices/` |
| `https://roofers.wallaceshift.com/northvane/warranty` | `/demos/roofers/warranty/` |
| `https://roofers.wallaceshift.com/northvane/faq` | `/demos/roofers/faq/` |
| `https://roofers.wallaceshift.com/alder-stone` | `/demos/roofers-2/` |
| `https://roofers.wallaceshift.com/alder-stone/process` | `/demos/roofers-2/process/` |
| `https://roofers.wallaceshift.com/alder-stone/insurance` | `/demos/roofers-2/insurance/` |
| `https://roofers.wallaceshift.com/alder-stone/cost` | `/demos/roofers-2/cost/` |
| `https://roofers.wallaceshift.com/alder-stone/estimate` | `/demos/roofers-2/estimate/` |

Only the roofing hostname's root is rewritten to the gallery. Root-level Vercel
Routing Middleware (`middleware.ts`, matched only to `/`) makes this selection
before the static root HTML file is served. The host rewrite in `vercel.json`
alone cannot override that file's filesystem precedence. The studio root
continues serving Wallace Shift. Explicit branded demo rewrites also apply on
preview domains. They retain query strings, including Northvane's `company`,
`city` and `phone` personalization parameters. Existing local entries remain
available; no broad rewrite captures the demos' media or `/api` requests.

Each fictional demo document remains `noindex, nofollow`, with canonical and
Open Graph URLs identifying its public branded path. Alder & Stone navigation
uses `src/demos/roofers-2/routes.ts` to stay within the public or local entry
being viewed; Northvane's uses `src/demos/roofers/routes.ts`, which also carries
the `company`, `city` and `phone` parameters from page to page. Its footer links separately to the studio and the offer gallery.

## Catalog and availability

`src/demos/roofers-offer/catalog.ts` is the manual source of truth for all five
tiles and their `available`, `claimed` or `coming-soon` status. All five currently
have demo links. The upcoming-design grid is hidden when no designs are marked
coming soon.

An inquiry does not reserve a design or change the catalog. Confirm availability
and the agreement personally, then mark the appropriate catalog entry `claimed`
and release the update. There is no automatic inventory lock or checkout.

The gallery inquiry uses the studio's contact adapter. Its selected design and
offer context accompany the business inquiry; success must depend on the actual
adapter result. The fictional contractors' estimate forms retain their existing
demo behavior and are not the place to claim a design.

## Release checks

These notes document configuration, not a completed deployment. Before announcing
the release:

- Build the gallery and all demo documents, and inspect the published metadata.
- On the deployed roofing hostname, check root, all five demo homepages and every
  Alder & Stone guide with a direct refresh. Confirm studio root still serves
  Wallace Shift; local Vite paths do not establish production host routing.
- Check gallery tiles and links, mobile navigation, poster/video loads, and
  Northvane's query personalization. Verify media and `/api` requests are not
  rewritten into HTML.
- Verify the contact endpoint configuration and honest success/failure behavior.
  Do not represent a local mocked response as email delivery.
- Check the manually maintained availability status before sharing the offer.
- Check the six featured workflows and the full 24-item disclosure on desktop and
  mobile, including keyboard expand/collapse and the design-to-inquiry selection.
- Confirm website + CRM wording and the monthly/12-month terms match in the hero,
  offer details, form acknowledgment, inquiry payload and metadata.

## Local verification — 2026-10-13

- Production build, scoped ESLint and whitespace checks passed. Vite reported
  its large-chunk advisory and plugin timing advisory.
- Browser checks at 1440×1000, 768×1024, 390×844 and 320×740 found no horizontal
  overflow. Desktop and mobile screenshots were visually reviewed.
- Confirmed six featured examples, all 24 expanded ideas, collapsed-by-default
  behavior, pointer opening, Enter/Space closing and mobile single-column layout.
- Requesting Velar selected it in the inquiry form and focused the name field.
  No inquiry was submitted; email delivery and live CRM integrations were not
  tested. No production deployment was performed.

### Brand alignment pass

- Compared the local studio pricing page and production palette with the offer.
  Reviewed the restyled hero, collection, automation examples and inquiry form in
  the browser. The CRM switches to a stacked panel at 900px to keep tablet copy
  readable.
- Checked 1440px, 1050px, 900px, 768px, 760px, 390px and 320px viewport widths;
  no page overflow or overflowing text controls were found. Mobile inputs remain
  16px, with dark/light focus colors and reduced-motion support preserved.
- Rechecked the six featured workflows, pointer expansion of all 24 ideas,
  keyboard collapse and Velar-to-form selection/focus. No form was submitted.
