# Business workspace pricing

Decision: November 17, 2026. Advertise a **$2,500 one time starter build**, with **optional $500/month care after launch**. These are build and care fees, not two payment plans for the same purchase. The homepage card now describes a service customers can commission, without development-status language.

## Scope that supports the price

The starter covers one business, one owner account, one reporting dashboard, up to two standard reporting account connections, agreed metrics and AI questions/summaries grounded in those reports. It includes testing, one review round and a handoff walkthrough. Standard connections reuse existing integrations, such as Google Analytics and Search Console. Additional integrations, inbox tools, CRM features, migrations and broader custom software require a separate quote.

Care covers checks of the existing connections, a performance review and small report adjustments within **two hours total per month**. Hours do not roll over. Hosting, third-party software/connectors and AI usage remain separate, with costs agreed before work starts. A customer can buy the build without care.

This is narrower than the existing $5,000+ focused system build in `src/content/pricing.ts`, which includes a business workflow, up to five views and two user roles. That broader offer and the other prices are unchanged.

## Market checks

Primary vendor pages checked November 17, 2026:

- [Klipfolio services](https://www.klipfolio.com/services): dashboard/report creation at $220/hour with a five-hour minimum; two monthly expert-service hours and priority support at $379/month. These are useful service-price reference points, not identical deliverables.
- [Klipfolio platform](https://www.klipfolio.com/pricing): Base at $140/month when billed monthly, or $120/month billed annually. Software is a separate cost from implementation.
- [AgencyAnalytics](https://agencyanalytics.com/pricing): $20 per client/month billed annually for its core reporting platform. This demonstrates why a $500 fee needs a defined human service, rather than being justified by dashboard access alone.

The price is a commercial judgment based on bounded delivery and these reference points. No customer willingness-to-pay study or measured Wallace Shift delivery-cost dataset was available.

## Internal cost check — assumptions, not measured margin

At an illustrative loaded labor cost of $75/hour, a repeatable build taking 20–25 hours consumes $1,500–$1,875, leaving $625–$1,000 before overhead, sales time, payment costs and profit. At 30 hours, only $250 remains: that scope should be reduced or quoted higher. Initial reusable platform development cannot be assumed to fit this per-client delivery budget.

Two hours of monthly labor at the same assumed rate consume $150 of the $500 fee, leaving $350 before other operating costs. Track actual support time and integration reliability after the first customers. Avoid unlimited changes or uncapped third-party usage under this fee.

A $500/month plan that also finances the build would recover the $2,500 build price only after five payments, before any ongoing work. An initial commitment could address that exposure, but the implemented offer instead charges for the build and makes care optional.

## Validation and release

Targeted ESLint and whitespace checks passed. Local Chrome checks passed at 1440, 1024, 390 and 320 pixels: both prices and boundaries render, the details disclosure opens with Enter, the contact link targets `/contact`, and there is no horizontal overflow or runtime error. Desktop and mobile screenshots were visually reviewed. Axe was unavailable in the temporary review environment; no automated accessibility-pass claim is made for this change. No new billing product or deployment was created.

Commit message: `Price the business workspace build and optional monthly care`
