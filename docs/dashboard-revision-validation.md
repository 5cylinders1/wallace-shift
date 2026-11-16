# Dashboard revision and local validation

November 16, 2026. Implemented in the local working tree only. Nothing deployed, committed or pushed. Existing staged work was preserved.

## Preview and evidence

Open `http://127.0.0.1:5184/prototypes/business-dashboard/index.html` while the existing Vite server is running. This renders the real dashboard component with clearly labeled synthetic fixtures. It blocks all mutation requests and external navigation. It does not bypass authentication on the owner portal. Its session storage is isolated from remembered owner posting drafts.

The actual owner entry remains `/client-portal?view=business`. Its session was expired during inspection, so authenticated live provider comparisons and real client record navigation were not performed. Local code, mocked API tests and the isolated preview establish the scope of this validation.

Detailed evidence:

* [Capabilities and metric definitions](dashboard-data-definitions.md)
* [Email, clients and posting audit](dashboard-operations-audit.md)
* [Official Google reporting references](dashboard-reference-notes.md)
* [Preview scenarios and safety boundary](../prototypes/business-dashboard/README.md)
* [Desktop overview capture](../prototypes/business-dashboard/review/desktop-overview-full.jpg)
* [Mobile SEO capture](../prototypes/business-dashboard/review/mobile-seo.jpg)

## Revised structure

| Destination | Main content and next step |
| --- | --- |
| Dashboard | Four important measures, website and search trends, individual ad spend, current receivables, then evidence linked checks. Each summary opens its report or existing billing workspace. |
| Website Analytics | Visitors, sessions, views, configured key events and provider session rate; daily sessions; separate realtime users; exact top pages with proportional bars. |
| SEO Analytics | Clicks, impressions, CTR and average position; selectable observed daily trends; query table and explicit coverage limitations. |
| Email | Outgoing activity and a route to the existing composer. Receiving, inbox synchronization and threading are explicitly unavailable. |
| Clients | Authorized agreement contacts grouped by billing email, project search, archive filter and exact agreement callbacks. Drafts are labeled and this is not an independent CRM database. |
| Paid Ads | Account summaries for Google, Meta and LinkedIn, followed by individual account reports. No mixed currency or overlapping conversion totals. |
| Social Media | Facebook and Instagram reporting with individual account views. Metrics retain their platform meaning and reporting does not imply publishing access. |
| Social Media Posting | The fixed Wallace Shift LinkedIn Page, connection check and existing reviewed publishing workflow. Add account explains the exact unsupported scope. |
| Business briefing | Renamed rules based observations, evidence links and JSON snapshot download. No implied AI or autonomous actions. |
| Connections | Source status, setup instructions, source timestamps and reporting requirements. |

The shared toolbar contains the period selector and manual refresh, with automatic refresh in a small disclosure. It does not occupy a separate settings block. Automatic polling runs only while a reporting page and browser tab are visible. It does not refresh or publish a draft. Date changes clear the old range before loading the new one. Current client records and posting have no misleading reporting period selector.

The implementation adds no chart dependency. SVG line charts display exact observed dates with gaps and an accessible daily table. Page and query tables use small bars where comparison is meaningful. Plain values remain for totals without a real daily series.

## Validation record

| Check | Observed result |
| --- | --- |
| Build | `npm run build` passed server compilation, frontend compilation, both Vite builds and existing demo, blog, SEO and marketing entry checks. Existing large demo bundle warning remains unrelated to this change. |
| Types and lint | Frontend project TypeScript and changed component ESLint passed. API TypeScript passed. |
| Dashboard APIs | 15 aggregate and 17 channel mocked tests passed, including authorization, ledger dates, metric fallback, currencies, timezone boundaries, malformed responses and secret exclusion. |
| Operational APIs | 18 mail and 13 LinkedIn publishing mocked tests passed. No real mail or publishing request was sent. |
| Fixture reconciliation | Nine combinations of 7/30/90 days and connected/partial/zero scenarios passed series totals, date boundaries and rate denominator checks. |
| Desktop walkthrough | Overview, separate reports, period changes, daily data, refresh disclosure, Google Ads and Facebook detail/back navigation, client search and exact selected client callback, Email capability explanation, posting account boundary, briefing evidence. |
| Period reconciliation | GA4 preview changed from 2,165 sessions over 30 days to 461 over 7 days and 6,407 over 90 days; matching daily chart and page table updated. Seven daily values were 52, 69, 86, 51, 68, 85 and 50, totaling 461. Session rates displayed 5.17%, 4.99% and 5.2% respectively, using fixture sessions containing events. |
| Mobile walkthrough | 390 pixel viewport: all destinations stayed within page width, navigation used the Page selector, controls remained usable, reports retained exact data tables and wide query tables scrolled independently. Chart labels were enlarged for narrow displays. Browser emulation only, not a physical phone test. |
| Partial and stale data | Unavailable Meta Ads showed an error instead of zero. Refresh failure retained the previous snapshot with an explicit timestamp and retry route. |
| Initial aggregate failure | Reporting showed a recoverable error; independently authorized client records remained searchable. |
| Expired access | A fixture 401 removed metrics and client records and presented the owner sign in route. |
| Zero observations | Count values showed zero, undefined SEO rates and position were omitted, selecting an empty rate series kept the selector usable for returning to clicks. |
| Draft preservation | A local fixture post remained in the existing composer after visiting Business briefing and returning. Review and publication were not submitted. |
| Browser regression script | Updated existing assertions for current navigation and states; syntax checked. The Playwright script was not executed. Interactive browser checks used the computer use tool. |

Independent review identified and resolved duplicate rounded count axis labels, a midpoint date label that could misalign with missing dates, and unnecessary client dependence on the reporting snapshot. The empty chart selector recovery issue was also corrected.

## Remaining boundaries and smallest next steps

* Incoming email requires a receiving or mailbox synchronization integration, with message storage, identity and threading rules. Existing send history cannot provide it.
* Additional publishing accounts require account authorization and selection, secure account scoped credentials, provider permissions and publishing adapters. This task does not build them. The current LinkedIn capability is a fixed company Page, not general social account management.
* Website acquisition source and medium, campaign breakdowns, previous period comparisons and daily histories for Meta Ads, Instagram and LinkedIn Ads are not returned by the existing reporting requests. Add a specifically scoped report only when it answers a concrete owner question and its provider requirements are verified.
* Portal payments are not profit, recognized revenue or bank reconciliation. A profit measure needs costs, settlement and accounting definitions first.
* Live provider reconciliation still needs matching account, dates, timezone, attribution settings and source processing status. Quality of configured key events, production authorization and provider behavior remain unverified.

## Acceptance criteria

1. The owner can identify the reporting period, metric meaning, unit and source without opening settings. Current balances and realtime windows remain visibly distinct.
2. Available charts and precise tables agree with the corresponding API values. Missing data never becomes a zero, fabricated trend or invented comparison.
3. Each ad and social account opens the correct report. Reporting controls do not alter campaigns or publishing drafts.
4. Client search opens the exact authorized agreement, including archived records when explicitly included. Ordinary reporting failure does not block it; confirmed access expiry hides data.
5. Email and publishing actions describe their real capability and current limitations. No decorative account connection or fake inbox is presented as functional.
6. Every requested destination is reachable on desktop and mobile, with usable controls, readable chart labels and no page width overflow.
7. The briefing distinguishes reported evidence from suggested checks. Its export contains reporting context, not provider credentials or private mail content.

Passing these checks supports accuracy and usability. It does not establish increased revenue or conversion. Subsequent owner use should track task completion and reporting discrepancies before broader product claims are made.

Proposed commit message: `Refine owner dashboard reports, account views and operational navigation`
