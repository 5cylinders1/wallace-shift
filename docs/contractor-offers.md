# Contractor offer pages

Two distinct landing pages show pricing, demonstrations, included scope, exclusions and common questions before the inquiry form:

| Offer | Path | Advertised price |
| --- | --- | --- |
| Website with hosting, maintenance and basic SEO | `/offers/contractor-websites` | $250/month |
| Lead page plus one agreed automatic follow up workflow | `/offers/lead-page-follow-up` | $1,500 one time |

The website build is included with the monthly package. The lead page can sit alongside an existing website. Ad spend and management are separate. The page identifies any separately scoped hosting, software and message usage costs before the visitor reaches the form. These campaign offers are separate from the broader custom system pricing and the existing AI integration flow.

## Demonstrations and inquiry behavior

The website page reuses public Northvane, Tambour and Stillwater preview videos, posters and English captions. The fictional demo brands and separately scoped advanced features are disclosed. The lead page includes a local interactive illustration of request capture, confirmation, follow up and reply handling. It does not collect project data or send messages.

Only name, email and a short note are required for an inquiry. Information requests are the default. Future plans, shared decisions and research on behalf of a business remain valid inquiries. Optional context helps a conversation; it is not an eligibility gate. A direct email link is available alongside the form. Failed delivery preserves the answers and offers retry or email. API acknowledgement shows a confirmation without implying a purchase or agreement.

The existing `/api/contact` endpoint sends inquiries through the configured contact inbox. Offer IDs are allowlisted, and the server supplies the advertised price and URL rather than trusting a submitted package label. The existing contact configuration is required: `RESEND_API_KEY`, `CONTACT_TO_EMAIL` and `CONTACT_FROM_EMAIL`. No new payment or messaging provider is required for these inquiry pages.

## Commercial details still confirmed in writing

The pages do not invent a minimum commitment. Website page scope, maintenance limits, ownership, minimum term and cancellation terms remain subject to written agreement before a customer commits. Lead workflow compatibility, channel, timing, stop conditions, scope and recurring service costs must also be confirmed before implementation. The public preview is not a checkout and does not start a subscription or authorize outreach to a customer's leads.

## Validation

Run from the repository root:

```sh
node scripts/test-contractor-offers.mjs
node scripts/test-offer-contact.mjs
npm run test:analytics
npm run build
```

The offer integration test renders the actual application routes through Vite SSR and checks prices and demos before intake, public metadata, one main heading, optional qualification, available media and captions, and page/API pricing consistency. Provider calls are replaced with a fake inbox. The contact tests exercise all allowed readiness, timing and decision role combinations and delivery failures. Analytics tests verify route matching, consent and exclusion of personal data.

For a local visual review, run `npm run dev` and open both paths on the port Vite reports. A plain Vite development server does not run the contact serverless function; it should show an honest form failure rather than pretend a message arrived. Mock contact responses when testing success and failure states locally. Never submit test inquiries to the production inbox.

These checks establish local behavior, not production deployment or delivery to a live mailbox. After an authorized deployment, verify both live routes, media loading and production contact configuration. Real submissions count once as `generate_lead`; offer comparison uses `offer_id` and optional `inquiry_intent`. See `docs/analytics.md` for consent behavior and the GA4 reporting dimensions that must be configured separately.

## Design and verification notes

Both pages extend the existing Wallace Shift visual system: ink and pearl surfaces, azure controls, Manrope body text and Instrument Serif display headings. Pricing, demonstrations, scope and common questions precede the open inquiry form. The extension introduces no new brand identity or shared design tokens.

The completed local review covered desktop at 1280px, tablet at 768px, mobile at 390px and narrow mobile at 320px, with no material visual findings. Browser checks confirmed actual preview video playback, every sample workflow step and reset, and mocked inquiry failure, retry and success states for questions, planning, later timing and shared decisions.

Run both offer suites together with `npm run test:contractor-offers`. At completion, all 41 focused tests passed: 11 offer tests and 30 analytics tests. Scoped lint and the full production build also passed. These results cover local behavior; no deployment or live provider delivery was performed.
