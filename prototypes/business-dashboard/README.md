# Isolated business dashboard preview

Run the existing Vite development server and open:

`http://127.0.0.1:5184/prototypes/business-dashboard/index.html`

This document renders the real `BusinessDashboard` component inside the real client portal surface. It is not included in the public or demos build inputs. It does not alter production authentication, configure an account, or bypass the owner portal. All business data, clients, invoices and connection states are synthetic and visibly labeled.

The prototype uses the repository's existing local Manrope font files. It does not load public analytics or consent scripts.

## Data scenarios

Use the header selector or append `?scenario=connected`, `partial`, `empty`, `error` or `expired`.

| Scenario | Purpose |
| --- | --- |
| Connected sample | Reports from all nine source types, plus three invented clients. Only series supported by an actual adapter are provided. |
| Partial data | Meta Ads fails, Facebook needs setup, Mail needs sign in, and GA4 Realtime is unavailable while historical data remains usable. |
| Zero activity | Sources connect but return zero activity. Client and query tables are empty. Search CTR, average position and session key event rate are omitted where their denominator is zero. |
| Initial load error | The dashboard endpoint returns a local 503 response. |
| Expired session | The dashboard endpoint returns a local 401 response. |

The **Fail refresh requests** checkbox preserves the current component and forces subsequent dashboard requests to return 503. Click the dashboard's Refresh button to inspect preservation and labeling of the last successful data. Turn it off to recover. Changing the scenario remounts the dashboard and resets its reporting period.

The report's 7, 30 and 90 day selector changes all selected period totals and trend dates. The fixed fixture ends November 15, 2026. Recorded payments are calculated from the sample engagement invoices in the chosen period. Outstanding invoice balances, active agreements and the live 30 minute visitor count are current snapshot measures and deliberately remain constant across reporting periods.

Count and currency series reconcile with their matching totals. Search CTR uses total clicks divided by total impressions. Average search position uses impression weighting. The GA4 session key event rate uses sessions containing an event rather than the total number of events. Distinct active users are a period metric, not the sum of daily user counts. Query and page tables are subsets and deliberately do not pretend to sum to the complete account totals.

## Isolation and checks

The entry installs a `window.fetch` interceptor before rendering. It returns local responses only for GET requests to `/api/business-dashboard`, `/api/business-publishing`, and `/api/client-portal`. All other fetch requests and all mutations return a rejection response without forwarding to the network. Session storage is isolated in memory so publisher controls cannot read or clear an owner's remembered draft. Saved draft GET requests return `draft_not_found`. Publishing preparation, uploads, finalization and publishing are blocked. Provider links and links to the separate mail/portal workspaces display a preview notice instead of navigating. Local snapshot downloads remain usable.

This is a development fixture harness, not a production sandbox or an alternative authentication mechanism. No access token or real account credential is used. Do not enter real customer information.

Visual verification should cover desktop and mobile, keyboard focus, each scenario, every sidebar destination, report range updates, available chart metric selections, raw table values, unavailable trends, source detail links, client filtering, and the blocked publishing/navigation boundaries. Local fixture verification does not establish live provider permissions, production behavior, native email delivery, actual publishing or sales outcomes.

No browser automation command is required. Use the shared browser control tool for rendered review.
