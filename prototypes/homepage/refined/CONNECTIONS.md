# Reporting connections and setup scope

Audit date: November 15, 2026. This describes the current local implementation and current official provider documentation. It does not certify deployed credentials, provider approval, or real customer onboarding. No secret values or real customer accounts were inspected.

## Packaging decision

Do not include this reporting dashboard as a customer ready CRM or promise that buyers can connect their accounts themselves today. The adapters are reusable reporting software, but the deployed product model still needs work before customer access is safe and supportable.

The dashboard endpoint accepts only the Wallace Shift portal owner. It rejects ordinary customer and purchase sessions, aggregates the environment's portal records, and reads one configured account per provider from server environment variables. The Connections screen displays instructions and provider links; it has no OAuth consent flow, account picker, credential entry, or disconnect button. Giving an ordinary client owner access would expose a broader owner workspace rather than create an isolated customer workspace.

Evidence: [dashboard handler](/Users/matthewwallace/Repos/WallaceShiftLogoSite/api/_lib/business-dashboard-handler.ts), [connection UI](/Users/matthewwallace/Repos/WallaceShiftLogoSite/src/business-dashboard/BusinessDashboard.tsx), [Google adapters](/Users/matthewwallace/Repos/WallaceShiftLogoSite/api/_lib/business-dashboard-google.ts), [channel adapters](/Users/matthewwallace/Repos/WallaceShiftLogoSite/api/_lib/business-dashboard-channels.ts), and [existing operator guide](/Users/matthewwallace/Repos/WallaceShiftLogoSite/docs/business-dashboard.md).

Customer guides could help buyers prepare their accounts and grant access. They cannot remove the required operator configuration, provider approvals, environment deployment, account separation, and verification work. Neither a guide nor a one time setup fee fixes the missing product boundary.

## Supported channels

Every row below is implemented reporting code for one configured account. None provides campaign creation, budget changes, optimization, ad creative management, or synchronization of provider lead forms into a customer CRM.

| Channel | Current useful output | Required access and setup | Important limit |
| --- | --- | --- | --- |
| GA4 | Visitors, sessions, page reporting, a separate limited realtime active user report | Numeric property ID; enabled Analytics Data API; an OAuth authorizer with property access and `analytics.readonly`; server client ID, secret and offline refresh token | Cloud project ownership does not grant Analytics property access. Installing measurement and defining conversions are separate work. The realtime count does not make all reports realtime. |
| Google Ads | Account spend, impressions, clicks, attributed conversions and daily clicks | Enabled advertiser account; Cloud project production API access; authorizer with advertiser access and `adwords`; account ID; optional manager account ID; server refresh credentials or access token | The OAuth scope permits more than reporting, but this implementation only reads. Attribution totals are not unique CRM leads. Direct access tokens take priority over configured refresh credentials. |
| Meta advertising, including Facebook and Instagram ads | Combined ad account spend, impressions, clicks and link clicks | Ad account access; `ads_read`; suitable Meta app access, review and verification; server account ID and access token | No Facebook versus Instagram breakdown, campaign drilldown, or Meta conversion totals in this implementation. Connecting an Instagram profile is not equivalent to connecting its advertising account. |
| Facebook Page | Page content views and post engagement | Page ID; Page token issued by someone with the ANALYZE task; `read_insights` and `pages_read_engagement`; applicable app access | Page eligibility and metric availability apply. Meta currently documents a 100 Page likes threshold for Page Insights. These content metrics can include paid content and cannot be called purely organic. |
| Instagram professional account | Account views and total interactions | Business or Creator account; numeric account ID; appropriate token and scopes for the selected login mode | Personal accounts are unsupported. These content metrics can include boosted content. No advertising spend or campaign management is supplied here. |
| LinkedIn advertising | Account spend, impressions, chargeable clicks and attributed website conversions | Approved Advertising API product access; a member with access to the ad account; `r_ads` and `r_ads_reporting`; server account ID and token | Provider reporting access does not grant Page publishing or lead form access. The app verifies the account separately because an empty report can mean either no activity or no access. |
| Search Console | Search queries, clicks, impressions and average position | Authorizer with access to the exact verified site property; enabled API and `webmasters.readonly` | Existing additional adapter, not a fixed location ranking tool. It does not report every query. |

GA4 requirements are documented in the [Analytics API quickstart](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart) and [property access management](https://support.google.com/analytics/answer/9305587). Google Ads now uses [Cloud project access levels](https://developers.google.com/google-ads/api/docs/api-policy/access-levels); [developer tokens were retired in September 2026](https://developers.google.com/google-ads/api/docs/api-policy/developer-token). An enabled production account remains a separate requirement.

Meta distinguishes permission access levels from Marketing API access tiers. Other businesses require the appropriate approved permissions; current documentation describes Limited access as development access and Full access as the production tier following review. Account owner consent alone does not prove the app is eligible. See [Meta authorization](https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/authorization), [advertising insights](https://developers.facebook.com/documentation/ads-commerce/marketing-api/insights), and [Page Insights requirements](https://developers.facebook.com/docs/graph-api/reference/insights/).

Instagram modes already recognized by the reporting code:

| Mode | Token and permissions | Account prerequisites |
| --- | --- | --- |
| `unified` | Business Integration System User token; `instagram_basic`, `instagram_manage_insights`; Facebook Graph host | Business portfolio and professional Instagram account; linked Facebook Page is not required |
| `instagram`, current default | Instagram User token; `instagram_business_basic`, `instagram_business_manage_insights`; Instagram Graph host | Professional Instagram account |
| `facebook`, legacy | Facebook User token and required Instagram/Page permissions; Facebook Graph host | Professional Instagram account linked to a Facebook Page; additional business role requirements can apply |

Changing the mode only changes the adapter route. It does not implement any of these login flows. See [Unified Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login), [its permissions](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/permissions), and [Instagram account insights](https://developers.facebook.com/documentation/instagram-platform/api-reference/instagram-user/insights).

LinkedIn app entitlement, member consent, and account role are separate prerequisites. Its Development tier supports reading administered advertising accounts; a broader management tier is not a requirement invented by this read only app. See [LinkedIn API access](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access) and [ad reporting](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting). The separate existing LinkedIn publisher targets Wallace Shift's fixed company Page and must not be presented as general customer social publishing.

## Ownership, renewal and ongoing costs

Customers should retain ownership of their analytics properties, domains, Pages, portfolios and ad accounts. Access should be delegated by role and explicit authorization, with a documented revocation route. Guides should never request passwords or suggest placing tokens in public source, browser storage, or ordinary inquiry forms.

Google refresh credentials are exchanged on the server. Refresh tokens can still be revoked or expire; an external Google consent screen left in Testing can create short lived refresh authorization for these scopes. See [Google OAuth token expiration](https://developers.google.com/identity/protocols/oauth2#expiration). Other adapters receive direct tokens; this repository has no general renewal or reauthorization flow. LinkedIn documents default access tokens of 60 days and conditional programmatic refresh access, which is not implemented here. See [LinkedIn refresh tokens](https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens).

Software reuse saves implementation time. Per customer work remains: asset and role checks, authorization, environment isolation, deployment configuration, data reconciliation, training and renewal support. Recurring cost drivers include hosting, storage, request quotas, version migrations, token failures and support. No metered per customer cost or support time study was available. Existing code is not evidence that each added customer costs nothing. Advertising spend remains the customer's separate platform expense.

## Proposed setup boundary

For the two entry offers, include only the documented customer deliverables that are ready. Do not promise this connected dashboard as an included benefit yet. A reporting setup service can be quoted separately after customer separation and access have been implemented and verified, or after a genuinely isolated deployment has been scoped and proven. That work is outside this homepage preview.

The included guide can explain how to find account IDs, confirm ownership and reporting access, choose an eligible account, and use the provider's own reports. The customer controls provider consent. Operator installation is still required for this application.

A future optional setup statement should specify the named accounts and include:

1. Confirm ownership, account eligibility, app approval and desired reporting period.
2. Obtain appropriate reporting access through the provider's supported authorization process.
3. Configure isolated server credentials and the agreed account IDs, then deploy that isolated configuration.
4. Compare returned figures against native reports using matching dates, timezone, currency and attribution settings.
5. Verify customer access boundaries, failed authorization handling, revocation and token replacement procedures.
6. Deliver account inventory, connection status, responsibilities and a handover guide without secret values.

Exclude campaign management, ad spend, new integrations, historical data imports, account ownership recovery, provider review appeals, tracking implementation and conversion strategy unless separately scoped. Define the duration of setup correction support. Ongoing renewals and provider changes cannot be funded indefinitely by an unspecified one time fee.

Do not publish a flat setup price yet. Quote estimated operator hours for access checks, configuration, verification and handover at the chosen service rate, plus disclosed third party charges and an allowance for identified complexity. Record actual minutes and follow up support on initial installations before standardizing the fee. The missing evidence is account condition, provider approval, client isolation effort, renewal burden and repeatable setup duration.

## What can be rehearsed now

The existing API fixture tests create synthetic owner, customer and purchase sessions; mock providers; and check absent configuration, malformed identifiers, denied access, partial metrics and expired authorization. They contain no proof of real provider approval or live customer isolation. Relevant files are [dashboard tests](/Users/matthewwallace/Repos/WallaceShiftLogoSite/scripts/test-business-dashboard.mjs) and [channel tests](/Users/matthewwallace/Repos/WallaceShiftLogoSite/scripts/test-business-dashboard-channels.mjs). This connection audit reviewed these test cases; execution belongs to the overall implementation verification.

A fresh ordinary customer session is expected to receive a 403 from the business dashboard. That is evidence that the current owner boundary works, and also evidence that customer dashboard onboarding is not shipped. On the Connections screen there is no account authorization action to rehearse. Static inspection therefore identifies an incomplete customer flow before any real credentials are needed.

Real consent, production API entitlement, a customer's role assignments, actual metric parity, token renewal and revocation cannot be verified through fabricated responses. Those require a separately authorized pilot with provider access. Do not connect customer assets or change live advertising to make this preview look complete.

Reconsider bundling when isolated customer access passes, customer onboarding completes without secret handling in the browser, account revocation works, every advertised source is provider verified, and measured setup plus support cost fits the package margin. Until then, show this as an existing Wallace Shift reporting demonstration or a separately scoped system, not an included customer CRM.
