# Business dashboard reporting references

Reviewed November 16, 2026. These are public Google product conventions and metric definitions, not claims that Wallace Shift has equivalent account access, datasets or features. The authenticated owner session was unavailable during review; live provider behavior is not verified by local fixtures.

| Primary reference | Observed convention | Application to this dashboard |
| --- | --- | --- |
| [GA4 overview reports](https://support.google.com/analytics/answer/13818312?hl=en) | A topic overview summarizes information and links to detailed reports. | Show a concise owner overview with named links to Website Analytics, SEO Analytics and individual reporting accounts. Keep connection diagnostics in their own destination. |
| [GA4 date ranges](https://support.google.com/analytics/answer/13412290?hl=en) | The date control is at the upper right and a selected period applies across reports. Realtime uses a separate immediate window. | Place period and refresh controls beside the report heading, wrapping compactly on mobile. Keep the 30 minute live count explicitly separate from historical totals. |
| [Google Ads tables and charts](https://support.google.com/google-ads/answer/6306916?hl=en) | Changing the reporting period updates both the chart and table. Chart metric controls allow users to choose which measurement to inspect. | Keep totals, trend labels, selected series and table dates synchronized. Only offer chart metrics for which daily observations are actually returned. Do not fabricate a daily series from an aggregate total. |
| [Search Console report structure](https://support.google.com/webmasters/answer/7576553?hl=en) | Metric selection sits above a chart, with a dimension table below. The report exposes clicks, impressions, CTR and average position. | Put key search metrics and an optional matching series first, then the actual query breakdown. Clarify incomplete query coverage rather than presenting a top query table as exhaustive. |
| [Search Console metric definitions](https://support.google.com/webmasters/answer/7042828?hl=en) | CTR is clicks divided by impressions. Position describes the topmost result's relative position and is affected by search context. | Label average position accurately and do not call it a fixed rank, rank tracker or guaranteed visibility. Use the provider's period metric, not an unweighted average of daily positions. |

## Scope of the implementation

These conventions do not require a new integration. Existing adapters already supply selected period metrics, source status, retrieval time, provider reporting time zone where available, and some daily series. The revision can expose additional fields already present in the existing provider responses and add a documented GA4 session key event rate to the existing reporting request. It must retain the source distinctions below.

| Data | Correct visual use | Boundary |
| --- | --- | --- |
| Portal paid invoices | Daily recorded payment chart and current balances | Recorded payments are not recognized revenue, settlement reconciliation, profit or attribution. Current outstanding principal is not restricted to the report period. |
| GA4 | Sessions over time; page view ranking; period visitors and configured key events | Distinct users are not additive across days. Key event counts are not qualified leads. A true session rate needs the provider's session key event rate, not events divided by sessions. |
| Search Console | Clicks, impressions, CTR and average position trends; query table | Respect available finalized dates, property aggregation and omitted queries. No synthetic rank improvement, previous period or comparison badge. |
| Google Ads | Available observed daily account spend, impressions, clicks and attributed conversions | Preserve currency, fractional attribution and account identity. Missing dates are not automatically zero. |
| Meta Ads and LinkedIn Ads | Account totals and separate account detail routes | Current adapters return totals without daily histories. Explain the absence of a trend instead of drawing invented lines. Cross platform conversions cannot be summed as unique customers. |
| Facebook | Available observed daily content views and engagement | Page reporting and paid Meta Ads are separate sources. Returned metric availability varies by Page. |
| Instagram | Account content views and interaction totals | Current adapter does not provide a daily series. Account reporting does not imply publishing support. |
| Mail | Retained send history counts and explicit workspace link | Provider acceptance does not prove delivery. A chart or mailbox count cannot invent incoming email data. |

## Independent correctness checks

Use deterministic fixture values to verify that counts and currency series reconcile with their selected period totals, while ratio metrics use the correct numerator and denominator. Verify that range changes update date labels and all corresponding views, and that failures remain unavailable rather than becoming zeros. Compare fixture expectations with raw table values and downloadable snapshots. Check line charts for readable axes, units, dates, gaps, keyboard reachable metric selection and a readable data table alternative.

For live validation, compare the same account, dates, time zone and metric definition with each provider report after owner access is restored. Differences in source processing times and attribution should be explained before interpreting them as application errors. These checks establish data integrity and usability, not improved commercial performance.
