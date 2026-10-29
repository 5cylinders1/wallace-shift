# contractors.wallaceshift.com: trade demo collection

A public lander listing Wallace Shift's working demos by trade, one or more per
trade. It uses the studio's Manrope / Instrument Serif type and ink, pearl and
azure palette (`docs/brand-palette.md`), scoped to `src/demos/contractors/`.
It makes no pricing or offer claims; the roofing offer and its terms stay on
`roofers.wallaceshift.com`.

## URL map

| Public URL | Build document |
| --- | --- |
| `https://contractors.wallaceshift.com/` | `/demos/contractors/` (public) |
| `https://contractors.wallaceshift.com/datum` and `/datum/*` | `/demos/foundation/` (gated) |
| `https://contractors.wallaceshift.com/tambour` and `/tambour/*` | `/demos/cabinetry/` (gated) |

Root-level `middleware.ts` rewrites the contractors host's `/` to the lander,
as it does for the roofing host; `vercel.json` carries the same host rewrite
plus the `/datum` and `/tambour` rewrites. Sub-paths of each are client-side
pages of one document.

## Catalog

`src/demos/contractors/catalog.ts` is the source of truth. A trade moves into
`trades` only when its demo exists; `featured` picks the demo in the hero
(otherwise the first `isNew` one), currently Tambour; `nextTrades` is the planned list shown as
"Next in the collection" and can be edited or emptied freely. Cards link to the
demo on the contractors host (local entries elsewhere) and to
`/request-demo/?demo=<key>`.

Entries are `kind: 'film'` (a gated demo with a public preview film, watched in
the modal) or `kind: 'open'` (a public demo with no film: the tile links straight
to it and shows its disclosure on the card). Trawsome Lawn Care, a concept for a
real business, is the only open tile; the gallery test lists it in
`contractorOpenDemoIds` in `scripts/contractor-preview-contract.mjs`.

## Access

The lander is public. `/demos/contractors` and `/src/demos/contractors` are
excluded from the gate alongside the roofing gallery; `/demos/foundation/preview.jpg`
and `/demos/cabinetry/preview.jpg` are the only public Datum and Tambour files. `https://contractors.wallaceshift.com` is a
known origin for the request, agreement and admin APIs, so the whole access
flow works on that host.

Invitation emails still use `DEMO_ACCESS_ORIGIN` (the roofing host by default),
so an approved foundation prospect currently lands on
`roofers.wallaceshift.com/datum`. It works, but the hostname says roofing.

## Before release

- Add `contractors.wallaceshift.com` to the Vercel project and create its DNS
  record. Local Vite paths do not prove production host routing.
- On the deployed host, check `/`, `/datum`, a `/datum/cracks/<slug>` refresh,
  `/request-demo/?demo=foundation`, the poster and preview images, and that the
  studio and roofing roots are unchanged.
- Decide how invitations should pick their host before sending foundation
  invites.
