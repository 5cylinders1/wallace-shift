# Roofing client dashboard demo

An independent sales demo for Northvane, built around this workflow:

**Choose weather → review nearby properties → build a follow-up list → schedule a sample inspection.**

The weather, customers, properties, contact information, follow-ups, and inspections
are fictional. Event overlays are illustrative. A geographic match does not
establish roof damage. The only live map content is the configured basemap.
No messages are sent, appointments booked externally, or homeowner records
purchased. Enrichment and customer import are deliberately sample-only.

## Local review

Run `npm install`, then `npm run dev -- --host 127.0.0.1`. Open the port printed
by Vite (normally 5173):

- `http://127.0.0.1:5173/roofing-dashboard` — Northvane.
- `http://127.0.0.1:5173/demos/roofers-dashboard/` — direct document entry.
- `http://127.0.0.1:5173/roofing-dashboard?brand=coastal` — second company and territory.

Internal views use URL hashes, so copying a view link or refreshing does not
require server routing for each screen. The alias preserves query parameters.
Both Vite dev and preview support the alias; `vercel.json` contains its equivalent
rewrite. This is configuration for a future deployment, not a deployment record.
The document includes `noindex, nofollow` and is not added to the site sitemap.

`npm run build` runs TypeScript and builds the independent entry. Use
`npm run preview -- --host 127.0.0.1` to review built assets at the printed preview
port. The studio, Northvane website, Alder & Stone website, offer gallery, and
dashboard are separate entry documents; the dashboard does not import their
styles, GSAP setup, forms, or application routers.

## Application and data contract

`src/roofing-dashboard/DashboardApp.tsx` exports the portable React component:

```tsx
<DashboardApp config={config} dataSource={dataSource} />
```

Use the authoritative `DashboardConfig` and `DashboardDataSource` interfaces from
`src/roofing-dashboard/types.ts`. The demo bootstrap lives in
`src/roofing-dashboard/demo/main.tsx`; it creates the adapter once before React
renders and mounts the app in `StrictMode`.

Configuration supplies:

- `company`, `initials`, `accent`, and `contactEmail` for company presentation.
- `scenarios` and `defaultScenarioId` for territory, service boundary, map view,
  timezone, and the fixed `referenceDate` used as the sample clock.
- `map.tileUrl`, `map.attribution`, and `map.maxZoom` for the basemap; optional
  `map.attributionUrl` supplies its provider's HTTP(S) attribution link, otherwise the attribution renders as plain text.
- `features.enrichment`, `features.sampleImport`, and `features.websiteLeads` for
  optional capabilities.

Coordinates use `[longitude, latitude]`; polygon arrays use the same order.
Convert at the Leaflet boundary because Leaflet expects latitude first.
Weather timestamps are ISO strings. Inspection `date` and `time` are local
calendar strings in the scenario timezone, not the browser's timezone.

The asynchronous `DashboardDataSource` seam is the sole data access boundary:

| Method | Behavior |
| --- | --- |
| `load(scenarioId)` | Get events, properties, follow-ups, inspections, connections, and sample-import state. |
| `addToWorklist(scenarioId, propertyIds, eventIds, radiusMiles?)` | Add properties, preserve only matching event associations, and prevent duplicate property work items. The optional report radius defaults to 3 miles. |
| `updateFollowUp(scenarioId, propertyId, status, note)` | Record an outcome, including suppression, and its activity. |
| `scheduleInspection(scenarioId, propertyId, inspection)` | Record a date, time, and assignee for a fictional inspection. |
| `enrichProperty(scenarioId, propertyId)` | Demonstrate optional contact enrichment using fictional contact details. |
| `importSampleCsv(scenarioId)` | Demonstrate onboarding from the bundled sample; accepts no user-uploaded file. |
| `reset()` | Clear all adapter state and restore the original demo fixtures. |

All record methods return a `Promise<DashboardSnapshot>`; `reset` returns
`Promise<void>`. Components never import vendor clients. The fixture adapter owns
private, in-memory state, so reload and Reset demo restore the original records.
The fixed scenario clock makes date filters and sample scheduling reproducible
regardless of the actual date of the demonstration. No local storage, account,
database, or real scheduling service is involved.

The included scenario IDs are `midwest` and `coastal`. Both use
`2026-10-10T20:00:00Z` as their reference instant, displayed in their configured
timezones. Customer onboarding reads the bundled
`demo/sample-customers.csv` or `demo/sample-customers-coastal.csv`; it adds the
sample once per scenario. The adapter rejects unknown scenario IDs. To exercise
loading failure and retry, inject a `DashboardDataSource` whose `load` initially
rejects and then resolves; the fixture adapter has no artificial failure toggle.

The domain layer exposes independently testable filtering, geographic matching,
derived counts, and worklist logic. Report points use a selectable 1-, 3-, or
5-mile radius, defaulting to 3 miles. Estimated footprints and warning areas are
separate evidence types; labels retain that distinction. Properties can match
multiple events but have one follow-up record. Missing email, phone, roof age,
and contact identity remain unavailable rather than being inferred from nearby
records.

Warnings are visible on the map but do not create property matches or weather
associations in the worklist. Bulk worklist additions evaluate each property
against the selected events and radius individually.

## Adapting for a client

1. Copy `src/roofing-dashboard/` into a React/TypeScript project and install the
   repository's matching React dependencies plus Leaflet **1.9.4** and
   `@types/leaflet`. Keep `dashboard.css` and Leaflet's stylesheet available to the
   new entry.
2. Create an entry document with a root element and a bootstrap like the demo's.
   Keep it separate from the client's public website entry so their website does
   not download dashboard code. Preserve hash navigation or supply equivalent
   server fallback rules if replacing it.
3. Supply a `DashboardConfig`. The included second configuration demonstrates
   company, color, timezone, and territory changes without editing the core
   components. Set the company's own contact address and actual service boundary.
4. Replace `createFixtureDataSource(config)` with a server-backed implementation
   of `DashboardDataSource` once the live services are ready. Preserve the component
   interface; do not put database or provider access directly in view components.
5. Configure and test the deployment route and authentication before connecting
   real records. The sample `noindex` tag is search metadata, not access control.

Live activation is a separate project: authentication and authorization, persistent
tenant-scoped records, validated CSV upload, duplicate resolution, geocoding,
website lead delivery, weather ingestion, and provider failure handling must be
implemented against the roofing company's own accounts. Provider keys and
service credentials belong on the server, never in this configuration, browser
code, or a `VITE_` environment variable.

The existing website lead adapter describes `LeadSubmission` as `answers`,
`context`, `score`, and `submittedAt`. A future ingestion adapter maps contact and
property fields from `answers`, retains the submitted project context and original
source, and uses `submittedAt` for the intake activity. Preserve communication
preferences and the actual consent text collected by that website. Dashboard
fixtures demonstrate the information; they do not wire or modify the public
forms or receive their submissions. Optional enrichment does not establish
permission to contact a homeowner. Keep “Do not contact” and “Not interested”
outcomes effective across future imports, weather matches, and outreach systems.

## Map and provider boundaries

The demo uses Leaflet 1.9.4 with standard browser requests to OpenStreetMap tiles,
visible attribution, and normal caching. It performs no bulk download,
prefetching, or offline tile storage. The list and its actions remain usable
when tiles fail. Use an appropriate configurable production basemap provider
for the client's intended usage and preserve its required attribution.

Tile images explicitly use `referrerPolicy: 'strict-origin'`. The private demo
document uses `no-referrer`, but OpenStreetMap requires a valid `Referer` on tile
requests. The image-specific policy sends only the site origin, never the private
demo path or query, without relaxing the document's policy for other requests.

- [Leaflet documentation](https://leafletjs.com/reference-1.9.4.html).
- [OpenStreetMap standard tile policy](https://operations.osmfoundation.org/policies/tiles/).
- [NOAA/SPC storm reports](https://www.spc.noaa.gov/climo/reports/) are a future
  source option for reported weather; they do not power these fixtures.
- Detailed weather footprints require a separately chosen provider and account.
- [BatchData contact enrichment](https://batchdata.io/contact-enrichment) is an
  example of a separate optional homeowner-data service; no subscription or API
  connection exists in this demo.

Do not replace “near reported weather” or “within estimated weather area” with
an assertion of roof damage. Preserve original source, time, evidence type, and
any future provider's qualification or uncertainty. A warning is distinct from
an observed event.

## Review checklist

- Walk through storm selection, matching properties, deduplicated follow-ups,
  invitation preview/copy, contact outcome, and sample inspection scheduling.
- Check all scenario types, 1/3/5-mile radii, date boundaries, overlapping events,
  empty results, and consistent list/map/count changes.
- Check missing contacts, optional enrichment, sample CSV onboarding, repeated
  selections, “Not interested,” “Do not contact,” and reset/reload.
- Open the coastal brand configuration and confirm branding, timezone, and
  territory change without core edits.
- Test keyboard access through the results list, desktop/mobile layouts, hash
  navigation, direct-entry refresh, loading failure/retry, and failed basemap
  requests while the property list remains usable.
- Run the domain/adapter checks and `npm run build`; review the existing roofing
  entries and confirm their entry bundles do not load dashboard code.

Run the focused domain and adapter checks with
`node scripts/test-roofing-dashboard.mjs`. The script uses the installed
TypeScript/Vite toolchain and bundled fixtures; no provider credentials are needed.

Record actual check results separately from this checklist. Local fixture checks
do not prove production deployment, data-provider accuracy, message delivery,
authentication, or external booking behavior.

Planned commit message: `feat: add reusable roofing client dashboard demo`

## Local verification (2026-10-11)

- Production build passed; the dashboard has its own entry and assets. Existing studio, roofing, and offer entrypoints do not import the dashboard bundle.
- Domain/adapter tests cover dates and timezones, polygon edges and proximity, per-property event attribution, duplicate worklists, suppression, appointment changes, enrichment, imports, configuration isolation, and reset.
- Browser checks covered selecting a hail footprint, adding a property, copying an invitation, saving a contact outcome, scheduling an inspection, and disabling contact/scheduling after Do not contact.
- Sample CSV import, contact enrichment, empty results, Midwest/coastal switching, the second brand configuration, 390px mobile layout, and keyboard Enter/Escape with focus restoration were checked locally.
- An ignored QA harness supplied rejected data loads and unavailable basemap tiles. Retry and Reset recovered data; the property list and keyboard detail workflow remained usable without tiles. The harness is excluded from the production build.
- Northvane and Alder & Stone still rendered in the browser; the existing estimator handoff tests passed.

These checks establish demo behavior only. No provider account, real weather feed, customer database, message delivery, live booking, authentication, or production deployment was tested or enabled. Local screenshots are retained under the ignored `review-assets/roofing-dashboard/` folder.
