# Business dashboard evidence and data definitions

Reviewed against the local implementation on November 16, 2026. This document describes code and mocked provider responses, not a live account connection or a production deployment. No credentials, customer records, mail content or private provider responses were used in the fixture checks.

## Capability boundary

| Area | Implemented source and access | Actual capability | Important limitation |
| --- | --- | --- | --- |
| Dashboard | Owner session and existing portal ledger | Recorded payments, current invoice balances and counts; reporting source summaries | Payments are not recognized revenue, bank deposits or profit. There is no cross platform sales attribution. |
| Website Analytics | GA4 Data API, configured numeric property and Google reporting credentials | Period active users, sessions, views, key events, provider session key event rate; daily sessions, top pages and separate realtime users | Consent, measurement configuration and provider processing affect coverage. Key events need not be qualified leads or sales. |
| SEO Analytics | Search Console API, verified property | Finalized web search clicks, impressions, click through rate, average position; daily series and top 20 queries | Average position is impression based, not a live or fixed keyword rank. Anonymized queries are omitted from query detail. |
| Email | Separate Wallace Shift Mail session | Summary of up to 50 retained outgoing records with a route to the existing mail workspace | This dashboard does not receive messages or provide inbox, delivery, open or reply tracking. Provider acceptance does not prove delivery. |
| Clients | Existing portal agreement records | Existing client portal provides client and agreement access | Dashboard active agreement count is not a distinct client count. Agreements must not be presented as an independent CRM contact database. |
| Paid Ads | Google Ads, Meta Ads and LinkedIn reporting adapters | One configured reporting account per provider, account totals and provider detail | Reporting access does not grant a dashboard campaign editor. No supported create account or budget management action. |
| Social Media | Facebook Page and Instagram professional account Insights | Views and interactions for one configured asset per provider | Insight eligibility and token permissions vary. LinkedIn organic social reporting is not implemented here. |
| Social Media Posting | Separate owner only `LinkedInPublisher` and `/api/business-publishing` flow for the fixed Wallace Shift LinkedIn company Page | Text posts with an optional image or video, saved drafts, review, explicit publication and this workspace's attempt history | No account discovery or OAuth onboarding, additional Page selection, scheduled posting, Facebook or Instagram publishing, or import of existing LinkedIn posts. Page role verification does not prove permission to publish; live publication was not tested. |
| Agent Briefing | Deterministic rules in `dashboardBrief` | Summarizes overdue invoices, unavailable reports, missing setup and sends needing review | No AI model, autonomous agent, campaign changes or automatic outreach. |

All dashboard aggregate reporting is owner only. Ordinary client sessions and scoped purchase sessions cannot read it. Provider tokens stay on the server. The account label is an asset type plus a verified identifier, not an invented business name. Each adapter currently supports one configured account, not a selectable portfolio of customer accounts.

Aggregate reporting adapters are read only; the separate LinkedIn publisher implements deliberate write actions after review and explicit publication. Reporting authorization does not imply publishing authorization. The existing publisher and its fixed Page boundary are documented in [the dashboard operations audit](./dashboard-operations-audit.md). No publisher code or real post was changed as part of these reporting updates.

## Metric contract

Metric IDs are stable machine identifiers. Percent values in the dashboard contract are 0 to 100. Currency values are major units; `currency` carries the original account ISO currency. Portal amounts are USD. Existing non USD advertising metrics retain `decimal` formatting plus a currency label for compatibility. Consumers may format using the explicit currency. No foreign exchange conversion is performed and mixed currencies must never be added.

| Source / metric IDs | Meaning and denominator | Time scope and unit | Available visualization |
| --- | --- | --- | --- |
| `portal.collected` | Sum of paid invoice amount plus recorded fee minus currently recorded refunds, floored at zero per invoice. Draft invoices excluded; archived payment records retained. | Payment date inside the selected complete Chicago dates; USD. This can restate an older payment day after a refund. | Daily recorded payments from the same ledger definition. Zero means no recorded ledger payment that day, not proof of zero business revenue. |
| `portal.outstanding` | Open or processing invoice principal. Future card fees excluded. | Current snapshot across all dates; USD. | KPI; no invented historical balances. |
| `portal.activeEngagements`, `openInvoices`, `overdueInvoices` | Current issued non archived agreements, open or processing invoices, and those due before today. Issued agreements can await signatures. | Current snapshot; counts. | KPIs; not a historical funnel. |
| `ga4.activeUsers`, `sessions`, `pageViews`, `keyEvents` | GA4 active users; sessions begun; screen and page views including repeats; all configured key events. | Selected dates in GA4 property reporting timezone; counts. | Daily sessions only, plus the provider top page table. Period active users are never summed from daily users. |
| `ga4.sessionKeyEventRate` | GA4 `sessionKeyEventRate`: sessions with at least one configured key event divided by all sessions. It is not total key events divided by sessions. | Selected dates; provider fraction multiplied by 100. Omitted when no sessions or the metric is unavailable. | KPI with explicit definition. No fabricated historical rate. |
| `ga4.realtimeUsers` | Active users reported by the realtime API in the preceding 30 minutes. | Rolling 30 minute window, independent of the date selector; count. | Separate live KPI. |
| `search-console.clicks`, `impressions` | Google web search clicks and appearances for the property. | Selected finalized Pacific dates; counts. | Daily series and top query table. |
| `search-console.ctr` | Provider click through rate, clicks divided by impressions. | Selected dates; fraction multiplied by 100. Omitted when impressions are zero. | Daily rate only on observed days with impressions; query table. Never sum daily percentages. |
| `search-console.position` | Average position of the topmost property result across impressions. Lower is better. | Selected dates; decimal position, omitted without impressions. | Daily observed average position and query table. It is not an unweighted average of query positions. |
| `mail.sent`, `needsReview` | Retained outgoing records accepted for sending, or pending, failed or uncertain. | Created within selected Chicago dates, within the latest 50 retained records; counts. | Status KPIs. Not delivery or response rates. |
| `google-ads.spend`, `impressions`, `clicks`, `conversions` | Account cost micros divided by 1,000,000; impressions; clicks; conversion action attribution, potentially fractional. | Selected provider account dates; currency, counts, decimal conversions. | Daily series for all four using already returned report rows. No campaign breakdown is currently requested. |
| `meta-ads.spend`, `impressions`, `clicks`, `link-clicks` | Account spend; Facebook and Instagram ad impressions; all ad clicks; reported link clicks. | Selected ad account dates; currency and counts. | Period KPIs only. No daily breakdown, unique visitors or conversion total requested. |
| `facebook.page_media_view`, `page_post_engagements` | Sum of returned daily Page content views and engagements; may include paid content. | Pacific reporting days, using each bucket's exclusive end boundary and DST; counts. | Daily returned series. Missing days remain absent. |
| `instagram.views`, `total_interactions` | Additive Insights totals across nonoverlapping chunks of at most 30 days. Interactions can include boosted content. | Selected UTC dates; counts. | Period KPIs only. Chunks are not presented as daily data. Unique reach is not summed across chunks. |
| `linkedin-ads.spend`, `impressions`, `clicks`, `conversions` | Local account cost, impressions, chargeable clicks, attributed website conversions. | Selected UTC dates; currency, counts, decimal conversions. | Period KPIs only. Account access is verified separately because an empty analytics response can also signal missing access. |

## Dates, freshness and missing data

The selector requests 7, 30 or 90 complete calendar days ending yesterday in Chicago. The same date strings are sent to providers; each source explicitly identifies its reporting timezone. These are not identical UTC windows across providers. Current balances and realtime users retain their own scope.

`checkedAt` is retrieval time. `dataThrough` is the latest returned date or retained record, not a guarantee that the provider has finalized all data through that date. Instagram totals have no completeness timestamp and keep `dataThrough: null`. Refreshing every minute does not make finalized daily sources realtime.

`seriesList` supplies optional selectable trends with `id`, `label`, `format`, `currency` and observed `points`; legacy `series` remains the primary trend. Providers with period totals only have no synthetic time series. Missing provider dates are not filled with zero. There is no previous period comparison in this API, so the interface must not invent percentage changes or arrows.

Authenticated valid empty GA4 and Search Console reports can produce zero count totals. Undefined rates and position are omitted. Empty ad reports retain their explicit no reporting rows state instead of inventing zero metrics. Invalid payloads and failed sources are unavailable rather than zero. Report consumers should keep zero, unavailable, partial and stale states distinct.

The documented GA4 session rate is added to the existing summary query. If Google returns a specific `INVALID_ARGUMENT` naming that optional metric, the summary retries once without it to preserve existing totals. Authentication, permission, quota and unrelated report errors are not retried. Missing or invalid rate values in otherwise valid reports omit that rate and expose a partial availability note. No other provider calls were added for these charts.

## Official definition references

* [GA4 API dimensions and metrics](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema): sessions, active users, views, key events and session key event rate.
* [Google Analytics dimensions and metrics](https://support.google.com/analytics/table/13948007?hl=en): session key event rate denominator.
* [Search Console Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query): date scope, aggregation and reporting fields.

## Local verification and unresolved evidence

`node scripts/test-business-dashboard.mjs` mocks storage and Google requests and checks authorization before reads, date ranges, ledger definitions, optional rate fallback, provider error isolation and mail content exclusion. `node scripts/test-business-dashboard-channels.mjs` mocks every channel and checks currency, report shapes, DST, chunk boundaries, asset access and secret exclusion. Their normal operation does not use real provider credentials or send messages.

Real account authorization, provider agreement with the corresponding native reports, conversion event quality, production freshness and physical device behavior remain unverified by those tests. Verify those separately with authorized read access before treating this as a validated business reporting system. No statistical claim about sales or conversion lift follows from a UI or fixture test.
