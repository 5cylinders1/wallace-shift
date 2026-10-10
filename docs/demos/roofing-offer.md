# Roofing website collection and offer

The offer is **Free website valued at $5000 with 1 year commitment to managed automation**.
The collection has five client places: two published demo designs and three
designs marked coming soon. Paid automation scope and pricing are agreed in
writing before commitment; this page does not invent a monthly price or collect
payment.

## URL map

| Public URL | Build document / original local entry |
| --- | --- |
| `https://roofers.wallaceshift.com/` | `/demos/roofers-offer/` |
| `https://roofers.wallaceshift.com/northvane` | `/demos/roofers/` |
| `https://roofers.wallaceshift.com/alder-stone` | `/demos/roofers-2/` |
| `https://roofers.wallaceshift.com/alder-stone/process` | `/demos/roofers-2/process/` |
| `https://roofers.wallaceshift.com/alder-stone/insurance` | `/demos/roofers-2/insurance/` |
| `https://roofers.wallaceshift.com/alder-stone/cost` | `/demos/roofers-2/cost/` |
| `https://roofers.wallaceshift.com/alder-stone/estimate` | `/demos/roofers-2/estimate/` |

Only the roofing hostname's root is rewritten to the gallery. The studio root
continues serving Wallace Shift. Explicit branded demo rewrites also apply on
preview domains. They retain query strings, including Northvane's `company`,
`city` and `phone` personalization parameters. Existing local entries remain
available; no broad rewrite captures the demos' media or `/api` requests.

Each fictional demo document remains `noindex, nofollow`, with canonical and
Open Graph URLs identifying its public branded path. Alder & Stone navigation
uses `src/demos/roofers-2/routes.ts` to stay within the public or local entry
being viewed. Its footer links separately to the studio and the offer gallery.

## Catalog and availability

`src/demos/roofers-offer/catalog.ts` is the manual source of truth for all five
tiles and their `available`, `claimed` or `coming-soon` status. Only the first
two slots have actual demo links. The remaining tiles represent future designs,
not additional completed websites.

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
- On the deployed roofing hostname, check root, both demo homepages and every
  Alder & Stone guide with a direct refresh. Confirm studio root still serves
  Wallace Shift; local Vite paths do not establish production host routing.
- Check gallery tiles and links, mobile navigation, poster/video loads, and
  Northvane's query personalization. Verify media and `/api` requests are not
  rewritten into HTML.
- Verify the contact endpoint configuration and honest success/failure behavior.
  Do not represent a local mocked response as email delivery.
- Check the manually maintained availability status before sharing the offer.
