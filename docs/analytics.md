# Website analytics

The public site uses Google Analytics 4 (GA4), covering visits, traffic sources, campaigns, popular pages, engagement, and enquiry conversions. Google Analytics is the selected provider; Vercel Analytics is not used by the site.

Account: **Wallace Shift**, owned through **matthew.wallaceshift@gmail.com**. Property ID: `561794453`. Web stream: **Wallace Shift Website** (`16246036913`). Measurement ID: `G-05SCBNQLY0`. Open the [Analytics dashboard](https://analytics.google.com/analytics/web/#/a414285894p561794453/reports/intelligenthome) using that Google account.

The account and stream were created on 31 October 2026 with Chicago reporting time, USD currency, and optional account data sharing disabled. Automatic interaction measurement and browser-history pageviews are disabled individually in the stream settings; these settings were confirmed after a full reload. The mandatory Page loads option remains checked in Google's interface, while the site's `send_page_view: false` setting suppresses the default load pageview. `generate_lead` is configured as a key event, with event-scoped custom dimensions for `lead_type`, `form_surface`, and `demo_id`. Collection starts only after this code is deployed and a visitor allows analytics.

## Setup

1. In the Wallace Shift Google account, create or select the property's web data stream for `https://wallaceshift.com`. Use the America/Chicago reporting time zone and USD currency.
2. In the stream's **Enhanced measurement** settings, disable **Scrolls**, **Outbound clicks**, **Site search**, **Video engagement**, **File downloads**, and **Form interactions**. Under **Page views → Show advanced settings**, disable **Page changes based on browser history events**. **Page loads** remains checked in Google's interface; the site's `send_page_view: false` configuration suppresses the default load pageview on each public document. The site sends sanitized page views and interaction events itself. Do not re-enable automatic interactions or history measurement without reviewing URL filtering and duplicate events. `send_page_view: false` alone does not disable automatic history measurement.
3. Put the stream's public `G-…` measurement ID in `public/site-analytics.js`. An empty or invalid ID intentionally loads neither analytics nor the consent prompt.
4. Keep Google signals, advertising personalization, and user-provided data collection off. No user IDs, contact details, or payment information are sent by this implementation.
5. Keep `generate_lead` configured as a **key event** in Admin → Data display → Events. Both successful enquiries and successful demo requests use that event, distinguished by `lead_type`. The event-scoped custom dimensions `lead_type`, `form_surface`, and `demo_id` are already configured. Do not mark clicks or failures as leads.
6. Deploy the change and verify with Realtime. An account setting or a local code change alone does not start collection on the live site.

Setup references: [GA4 setup](https://support.google.com/analytics/answer/14183469), [manual page views](https://developers.google.com/analytics/devguides/collection/ga4/views), [basic consent mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic).

## Consent and coverage

- Google tracking loads only after the visitor allows analytics. Reject and accept options have equal prominence. Analytics preferences can reopen the choice. Do Not Track and Global Privacy Control override a saved allowance.
- The consent preference is stored locally under `ws:analytics-consent:v1`. This preference is separate from private demo and portal authentication.
- Public studio pages, blog, contractor gallery, roofing offer, and demo request page are included. The unlisted `/offers/ai-business-integration` review page is an explicit public draft: it remains `noindex` and absent from navigation and sitemaps while retaining consent-based analytics. This code change does not publish the draft.
- Only `wallaceshift.com`, `www.wallaceshift.com`, `contractors.wallaceshift.com`, and `roofers.wallaceshift.com` collect data. Localhost and Vercel preview hosts do not load Google tracking.
- Client portal, admin, agreement, experimental, and private demo pages are excluded. Navigation between the public SPA and private routes uses a new document so the loaded Google tag cannot follow into the client portal.
- URL fragments and arbitrary query parameters are removed. Only filtered campaign labels remain. Referrers are reduced to their origin. Never put names, email addresses, invitation codes, or other personal information in campaign labels.
- No advertising tags, session recordings, or form values are collected. Missing or blocked analytics never prevents forms, videos, or navigation from working.

Static blog documents include the same bootstrap separately from the React app. Public SPA navigation sends a manual, sanitized page view; hash-only navigation is not another page view.

## Events

| Event | Meaning |
| --- | --- |
| `page_view` | Initial public page view or a distinct public SPA route. |
| `scroll` | The visitor reaches 90% of a scrollable page, once per page view. |
| `generate_lead` | The contact or demo request API acknowledged receipt. This does not prove inbox delivery or a sale. `lead_type` separates enquiries and demo requests. |
| `enquiry_failed` | An enquiry encountered a submission/service failure, excluding field validation. |
| `demo_request_failed` | A demo request encountered a submission/service failure. |
| `quiz_started` / `quiz_completed` | A visitor started or completed a Shift Finder attempt. |
| `demo_preview_played` | A selected preview actually began playing, once per modal opening. |
| `offer_application_start` | The visitor first interacts with the AI opportunity application. |
| `offer_application_step` | A validated quiz screen is completed or the optional contact screen opens; `form_step` is only `bottleneck`, `authority`, `business`, `impact`, `experience`, `tools`, `readiness`, or `contact`. |
| `offer_recommendation_view` | The browser shows a local result; `recommendation_type` is only `package`, `consultation`, or `resource`. This is not a saved lead, confirmed fit, booking, or purchase. |
| `offer_application_submit` | The AI opportunity API confirms durable receipt. This is not human qualification, a booking, or a sale, and is not also emitted as `generate_lead`. |
| `email_clicked` / `phone_clicked` | A visitor clicked an email or phone link. This does not prove a message or call occurred. |
| `resource_download_clicked` | A visitor clicked an approved PDF or spreadsheet resource link. This does not prove a download completed. |

Event labels and demo IDs come from fixed allowlists. Freeform answers, names, email addresses, error messages, and form contents do not enter event parameters. The configured event-scoped custom dimensions `lead_type`, `form_surface`, and `demo_id` support reporting by enquiry type, form, and demo. Do not create user-scoped identifiers. Google may also send its standard session and engagement events after consent; the manual controls above apply to page views and the listed interactions.

AI opportunity events are accepted only on the exact offer route. They carry the fixed `offer_id` value `ai_business_integration` and, for step events, one allowed screen name. They never carry business answers, budgets, email addresses, lead IDs, or advertising click IDs. No new Google account settings, key events, custom dimensions, advertising tags, or offline conversions are configured by this local implementation.

## Using the reports

After enough real traffic accumulates, review:

1. **Reports → Acquisition → Traffic acquisition:** compare session source/medium and campaigns. Look at both traffic and `generate_lead` key events to see which sources produce enquiries.
2. **Engagement → Pages and screens:** find popular landing and service pages. Compare engagement and leads rather than treating a high view count as success.
3. **Tech details:** compare devices and browsers, then test the pages visitors use most on those devices.
4. **Events:** investigate submission failures and compare quiz or preview engagement with leads. Clicks are useful intent signals, not completed sales.

Use consistent public campaign labels on links you share:

```text
https://wallaceshift.com/?utm_source=linkedin&utm_medium=social&utm_campaign=studio_intro
https://wallaceshift.com/?utm_source=instagram&utm_medium=social&utm_campaign=profile_link
```

Do not add UTM tags to internal navigation links; they are intended to identify incoming campaigns. Direct traffic includes visits whose apps or browsers omit referrers, not just people typing the URL. Analytics is approximate: consent choices, blockers, and bots affect counts. It does not reveal visitor names or emails or recover visits from before activation. Search keywords require a separate Search Console connection.

## Verification

Run `npm run test:analytics`, `npm run test:blog`, and `npm run build`. Tests exercise consent, route and host exclusions, URL redaction, and conversion mapping without transmitting data to Google.

After deployment, reject analytics and confirm no request to Google Analytics or Google Tag Manager. Then allow analytics, visit a public page and navigate to another page, and confirm a single sanitized `page_view` per page in Realtime/network requests. Reopen Analytics preferences and reject to confirm tracking stops. Confirm direct portal/private visits do not load the tag. A successful script fetch alone does not prove events reached the property. Normal reports may take longer to populate than Realtime.
