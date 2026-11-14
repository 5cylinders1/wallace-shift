# Wallace Shift business dashboard

Open `/client-portal?view=business` and sign in with the portal owner email. The Business dashboard button in the owner workspace opens the same view. Client accounts continue to see only their own agreements and invoices.

## What this implementation does

- Retrieves authenticated, read-only snapshots at `/api/business-dashboard?days=7`, `30`, or `90`.
- Summarizes existing Wallace Shift portal records. Portal balances are ledger records, not a bank balance, Stripe payout reconciliation, or accounting profit.
- Reads the signed-in Wallace Shift Mail user's recent sending history after separate mail authentication. This is a bounded history of messages submitted through this app, not an inbox, marketing campaign report, or proof of delivery.
- Reads configured external reporting APIs and keeps individual source failures isolated. A configured account identifier alone does not count as a connection.
- Presents metric definitions, source status, reporting dates, and freshness limitations alongside the data. Missing values are not converted into successful zero reports.
- Generates a deterministic business briefing and exports the same normalized JSON snapshot for agent context. No language model runs in this version, and no autonomous actions execute.

The reporting range covers complete calendar days ending yesterday in America/Chicago. Source notes identify different account timezones or current-state metrics. Retrieval time is not the time every underlying event became available. Provider reports may be delayed, preliminary, thresholded, or subject to later attribution changes.

## Access and deployment

The endpoint reuses portal owner authentication and production/preview ledger namespaces. It rejects customer and purchase-only sessions. Responses are private and noncacheable. No secrets, mailbox bodies, recipients, agreement text, or client identities belong in exported snapshots.

The production alias routes through the existing `api/demo-admin.ts` function to preserve the current serverless function count. Vite mounts the same handler for local development. The UI stays under the existing private, noindex, analytics-excluded portal document.

All reporting credentials are server-only variables beginning `DASHBOARD_`. Never prefix them `VITE_`, paste them into source files, or expose them in browser storage. Configure them in the deployment environment or ignored `.env.local`; restart the local server after changing them. This initial connection flow is operator-configured. It does not provide browser OAuth onboarding, account discovery, or automatic token renewal for every provider.

## Google Analytics and Search Console

Use a dedicated Google OAuth client and a refresh token granted the required reporting scopes. Existing Google Calendar authorization does not grant analytics access.

| Variable | Purpose |
| --- | --- |
| `DASHBOARD_GOOGLE_CLIENT_ID` | Dedicated Google OAuth client ID. |
| `DASHBOARD_GOOGLE_CLIENT_SECRET` | Matching client secret. |
| `DASHBOARD_GOOGLE_REFRESH_TOKEN` | Offline authorization for the reporting account. |
| `DASHBOARD_GA4_PROPERTY_ID` | Numeric GA4 property ID. The recorded Wallace Shift property is `561794453`; verify access before use. |
| `DASHBOARD_SEARCH_CONSOLE_SITE_URL` | Exact verified property identifier, such as `sc-domain:wallaceshift.com`. |

Enable the Google Analytics Data API and Search Console API in the corresponding Cloud project. Grant `https://www.googleapis.com/auth/analytics.readonly` and `https://www.googleapis.com/auth/webmasters.readonly`. The authorizing account must have access to the selected properties. Keep tokens on the server.

GA4 core reporting and its limited realtime report are different datasets. The realtime active-user window does not make historical page, campaign, or conversion metrics realtime. Search Console reports search queries and average position; it is not a fixed-location keyword rank tracker and does not return every query. A dedicated rank-tracking provider would be a separate integration.

References: [GA4 realtime reporting](https://developers.google.com/analytics/devguides/reporting/data/v1/realtime-basics), [GA4 data freshness](https://support.google.com/analytics/answer/11198161), [Search Console query API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

## Social and advertising accounts

These are direct API adapters, not connections through an external CRM. They return account-level reporting for one configured account per provider. Campaign drilldowns, creative management, posting, and ad mutations are not implemented. All settings are server-only.

| Provider | Required settings | Current report |
| --- | --- | --- |
| Google Ads | `DASHBOARD_GOOGLE_ADS_CUSTOMER_ID` (10 digits, no hyphens); either `DASHBOARD_GOOGLE_ADS_ACCESS_TOKEN` or all of `DASHBOARD_GOOGLE_ADS_CLIENT_ID`, `DASHBOARD_GOOGLE_ADS_CLIENT_SECRET`, `DASHBOARD_GOOGLE_ADS_REFRESH_TOKEN` | Spend, impressions, clicks, attributed conversions, daily clicks. |
| Meta Ads | `DASHBOARD_META_AD_ACCOUNT_ID` (digits or `act_` plus digits), `DASHBOARD_META_ADS_ACCESS_TOKEN` | Spend, impressions, all clicks, link clicks across Facebook and Instagram advertising. |
| Facebook | `DASHBOARD_FACEBOOK_PAGE_ID`, `DASHBOARD_FACEBOOK_PAGE_ACCESS_TOKEN` | Page content views and post engagements from returned daily buckets. |
| Instagram | `DASHBOARD_INSTAGRAM_ACCOUNT_ID`, `DASHBOARD_INSTAGRAM_ACCESS_TOKEN` | Professional account views and interactions. |
| LinkedIn Ads | `DASHBOARD_LINKEDIN_AD_ACCOUNT_ID`, `DASHBOARD_LINKEDIN_ACCESS_TOKEN` | Spend, impressions, chargeable clicks, attributed website conversions. |

Optional settings: `DASHBOARD_GOOGLE_ADS_LOGIN_CUSTOMER_ID` for a Google Ads manager account; `DASHBOARD_GOOGLE_ADS_API_VERSION` defaults to `v26`; `DASHBOARD_META_API_VERSION` defaults to `v27.0`; `DASHBOARD_INSTAGRAM_LOGIN_TYPE` is `instagram` by default or `facebook` for the Facebook Login authorization flow; `DASHBOARD_LINKEDIN_API_VERSION` defaults to `202610`. API versions are explicit because providers retire versions and metrics.

- **Google Ads:** enable the API, obtain production access for the Google Cloud project, and authorize `https://www.googleapis.com/auth/adwords`. The implementation calls reporting endpoints only, because the OAuth scope itself is broader than read-only. Current Google documentation says developer tokens were retired in September 2026; this adapter uses project-based access. [Access levels](https://developers.google.com/google-ads/api/docs/api-policy/access-levels), [developer-token retirement](https://developers.google.com/google-ads/api/docs/api-policy/developer-token).
- **Meta Ads:** authorize `ads_read` and account reporting access. **Facebook:** use a Page token with `read_insights` and `pages_read_engagement`, authorized by a user with the ANALYZE Page task. Missing eligibility, deprecated metrics, and missing permission must be investigated at Meta; the dashboard does not fill unavailable metrics with zero. [Marketing insights](https://developers.facebook.com/docs/marketing-api/insights/), [Page insights](https://developers.facebook.com/docs/graph-api/reference/insights/).
- **Instagram:** requires a business or creator account. Instagram Login uses `instagram_business_basic` and `instagram_business_manage_insights`; Facebook Login uses its own account/Page linkage and permissions. Other businesses' accounts can require Advanced Access. The adapter splits long ranges into nonoverlapping chunks and sums additive metrics only. [Instagram insights](https://developers.facebook.com/documentation/instagram-platform/insights).
- **LinkedIn:** obtain Advertising API product access and authorize `r_ads` plus `r_ads_reporting`. The member must have access to the selected ad account. The adapter verifies account access separately because empty analytics can otherwise mean either no activity or no access. [Access requirements](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access), [ad reporting](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting).

Google refresh-token credentials are exchanged server-side on each refresh. Direct access tokens for the other integrations must be maintained externally until OAuth connection and renewal flows are added. Expired or rejected authorization is displayed as a source failure or sign-in requirement; it is not silently considered connected.

Spend stays in each provider account's currency. Non-USD amounts are labeled with their currency and are never added to USD portal totals. Click and conversion definitions differ across platforms. Do not sum platform-attributed conversions as unique business leads. Facebook and Instagram daily insights can be delayed; the latest returned bucket is not proof that the requested period is complete.

## Agent boundary

The snapshot includes source IDs, range, timestamps, metric definitions, and `agentPolicy`. The briefing is identified as rules-based observations. Downloading the snapshot supplies context to an agent; it does not schedule an agent or give one authority to act.

This endpoint accepts reporting requests only. An agent cannot send email, publish content, edit CRM records, or alter advertising budgets through it. Such capabilities should be implemented as separate authenticated tools with narrow scopes, explicit action details, idempotency, and durable audit logs. Third-party text must remain untrusted data when supplied to a model.

Further work for unattended operation includes secure OAuth onboarding and revocation, durable scheduled ingestion, provider-aware retry/backoff, quota controls, webhook reconciliation, historical storage, freshness alerts, and a model/tool runner with auditable approval policies. Current optional browser refresh works only while the dashboard is open; it is not a background sync service.

## Verification

Run `npm run test:dashboard`, `npm run test:dashboard-browser` with the local server on port 5184 (or set `DASHBOARD_TEST_URL`), and `npm run build`. Owner snapshot reads are limited to 12 per minute before provider calls; automatic UI refresh is optional and runs once per minute only while the tab is visible.

API and browser tests use intercepted provider responses and clearly labeled test fixtures. They do not prove access to real accounts. Live verification requires configured credentials, owner login, and comparison against the corresponding provider report using the same period, timezone, attribution setting, and currency.

Deployment and account authorization are separate from building and testing this code. Neither is implied by a successful local build.
