# AI opportunity funnel: operational handoff

Status: local implementation, November 2, 2026. Qualified visitors now proceed directly to booking. A verified Google booking opens an educational walkthrough; instant purchase offers appear after the configured video finishes. The video asset is not supplied yet, so the current walkthrough displays a truthful placeholder and keeps offers hidden. Public purchases still use the existing portal for agreement, signature, and Stripe payment without an owner approval step. This implementation does not establish deployment, connected Google authorization, live email delivery, a real booking, or payment. Provider tests use isolated mocks.

## Offer and route

The review page is `/offers/ai-business-integration`. Start the development server with `npm run dev`, then open that path on the local URL printed by Vite. The page is prerendered for review, has `noindex, nofollow`, and is absent from navigation and the sitemap. An unlisted URL is still public if deployed; it is not an access control.

[Shared offer content](../src/content/aiOffer.ts) contains version `2026-11-02-2`, the $2,500 minimum project fee, website scope, package catalog, question options, and routing rules. AI Inquiry Assistant costs $2,500 and connects one website inquiry form to one team email address with a draft reply. AI Notes and Updates costs $3,500 and connects one internal written notes form to one team email address with a summary and action list. Both include a one page business website, one inquiry form, and one consolidated revision round. Applicable service taxes are included. Domain, hosting, and AI usage costs are separate and need the client's approval before activation. Custom CRM connections and other exclusions are explicit; these purchases do not require an undefined integration compatibility review. Issued agreements retain the purchased scope and price even when the catalog changes. The separate roofing CRM promotion is unchanged.

## Qualification, booking, walkthrough, and purchase

The entry point is the quiz. The approved flow is:

**Paid ad → seven qualification steps → qualified visitor books → Google booking verified → educational video → optional instant package purchase.**

The seven steps cover:

1. **Bottlenecks:** select all applicable issues across inquiry response, administration, handoffs, dependence on the owner, capacity, demand, or another issue. Uncertainty is exclusive; visitors do not need to rank their issues.
2. **Authority:** owner authorized to buy, other authorized buyer, joint decision maker, or researcher. Joint decision makers and researchers then see a separate question about whether the approver can join a conversation.
3. **Business:** approximate revenue over the past 12 months, including not yet trading and prefer to discuss.
4. **Impact:** weekly team time followed by up to two consequences, with uncertainty exclusive.
5. **AI experience:** new to AI, considered it, individual tools, a disappointing implementation, or existing adoption. All except new users then see a separate question to select up to two barriers; new users have no hidden barrier answers.
6. **Tools:** current software or process, then optional task context. Both may be skipped.
7. **Readiness:** investment readiness followed by **Now**, **Within the next month**, **Within 3 months**, or **Just researching**.

Direct booking qualification has exactly two conditions: investment is **Yes, I can approve that investment** (`budget: ready`) and timing is **Now** or **Within the next month** (`timing: now | soon`). Both must be true. Authority, revenue, impact, tools, and AI experience provide project context and recommendations; they do not add hidden exclusions to this booking rule. Revenue of $250,000 or more remains an internal `established` priority signal. The existing `fit_call`, `manual_review`, and `resource` classifications remain contextual guidance, separate from booking eligibility.

Other visitors see a short planning result with options to edit their answers or learn about AI services. They do not see immediate packages or the booking conversion screen. No email is required to take the quiz or see that result. Completing the quiz alone does not send email, save an appointment, or create a paid project.

The qualified visitor lands directly on the booking screen for a free **45 minute Google Meet consultation**. Before the calendar, the page explains that a free business website is included with a **paid project of $2,500 or more**, and presents the phone call alternative. The meeting alone does not earn a free website. The visitor verifies their booking email first, then chooses a time. Only after email verification does the Google calendar load, with a direct link to the same schedule available as a fallback. If automatic confirmation is unavailable, the calendar and direct schedule link remain hidden; the phone request remains available.

For automatic confirmation, the visitor verifies the same email they will use in Google Calendar with a six digit code. The server ties that verified email to the validated quiz answers and a booking attempt. An owner authorized, read only Calendar connection then checks the actual Google event. Only a single matching future, confirmed, 45 minute consultation with the verified attendee, configured title, organizer, and creation window can unlock the walkthrough. Unknown, ambiguous, cancelled, unrelated, or unverified events do not qualify. Loading an iframe, clicking a button, sending a code, or saving a phone request never confirms a Google booking. The actual Google appointment event title format remains a provider verification item.

The confirmed appointment and quiz answers are saved for the owner and visible in the client portal's Google Calendar section. They are **not written into the Google Calendar event** because the connection has read only access. Google collects booking details and sends its own confirmation independently. Quiz answers and identifiers are not appended to the public schedule URL. [Google connection setup](ai-booking-setup.md) covers credentials, OAuth authorization, matching, and provider verification.

Phone remains an alternative request form with a required phone number and optional email. Its time must be arranged afterward. It does not create a Google appointment or bypass the booking confirmation and video conditions. The current UI uses the existing intake endpoint only for this phone request; optional Google quiz answer submission is superseded by the verified booking record.

After a verified booking, the walkthrough introduces a planned 3 to 10 minute video about common business bottlenecks, practical AI workflows, and illustrative time and cost calculations. The asset is intentionally unset in `src/content/aiConsultation.ts`. Until an approved video is supplied, the page displays a coming soon message and no purchase offers. A configured native video reveals packages only after its valid `ended` event. There is no timer, fake completion button, or fallback that treats missing or failed media as watched. This is a presentation sequence, not a security boundary or proof that every second was watched.

After the video, the visitor may buy AI Inquiry Assistant for $2,500 or AI Notes and Updates for $3,500 without a consultation or owner quote. Each package retains its defined scope, price, exclusions, and website bonus. Existing checkout collects buyer details and purchase authority, verifies the buyer email, creates a server priced agreement, and opens the client portal for signature and Stripe payment. A verified successful payment creates the paid project handoff with quiz answers and triggers the existing internal owner notification. Booking confirmation is not purchase, signature, or payment authorization.

Purchasing a package does not cancel the appointment. If the buyer no longer needs the meeting, the page directs them to cancel through Google's confirmation email. The read only Calendar connection does not cancel or modify events.

Quiz and contact screens use a compact header and an independently scrollable question area. Back and the primary action remain visible. Every quiz step with multiple questions reveals one question at a time and shows the current part. A radio selection advances applicable follow ups; arrow keys remain inside the group until Enter, Space, or Next question confirms. Text and multiple choice questions use the navigation button. Back preserves applicable answers, while changing a branch clears obsolete details. New questions reset the answer area's scroll position, and validation errors receive focus. Step completion measurement fires only when the complete step validates.

Booking, walkthrough, and planning results use normal page scrolling. Editing the quiz clears the later conversion state. Unsent answers and presentation progress remain in this browser tab; closing or refreshing can discard that progress. Saved server booking records and paid projects remain separate durable records. Business type stays optional context and does not add a qualification requirement.

## Configuration

[Consultation configuration](../src/content/aiConsultation.ts) owns `durationMinutes: 45`, the supplied public `bookingUrl`, and the same URL with `?gv=true` for embedding. The existing schedule displayed 45 minute appointments and the owner explicitly confirmed retaining that duration. The public embed itself needs no API credentials. Automatic booking verification additionally requires the owner Calendar OAuth connection described in [Google booking setup](ai-booking-setup.md). This is local funnel configuration only; the sitewide `business.bookingUrl` remains unchanged. Booking availability and Google confirmation are controlled in the owner's Google Calendar schedule. The walkthrough configuration keeps its video and captions URLs unset until approved assets are available.

Consultation intake submissions are disabled unless the **server-only** variable `AI_OPPORTUNITY_ENABLED` is exactly `true`. A disabled intake endpoint returns `503` with `not_configured`. Owner read/retry access stays available. This switch controls phone request capture, not Google booking verification or package checkout. Booking verification requires its separate Calendar connection, durable store, owner identity, and operational email configuration. Checkout requires the existing portal's durable storage, owner identity, email, and Stripe configuration.

| Setting | Purpose |
| --- | --- |
| `AI_OPPORTUNITY_ENABLED` | Explicit public capture switch; absent or any other value keeps capture disabled |
| `DEMO_AUDIT_REDIS_URL`, `DEMO_AUDIT_REDIS_TOKEN` | Preferred durable Redis REST connection, shared with existing portal infrastructure |
| `RATE_LIMIT_REDIS_URL` / `RATE_LIMIT_REDIS_TOKEN`, `KV_REST_API_URL` / `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Existing store fallbacks, in that order, when the dedicated pair is absent |
| `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` | Verified sender for booking and checkout verification codes, paid project notices, and phone request notifications |
| `AI_OPPORTUNITY_TO_EMAIL` | Optional internal recipient override; otherwise uses `CONTACT_TO_EMAIL` |
| `PORTAL_ADMIN_EMAIL` | Existing portal owner identity; falls back to existing demo-admin/contact-owner configuration |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | Matching Stripe test or live keys for the intended environment |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the deployed `/api/client-portal?action=webhook` endpoint, or the separate local listener in development |
| `CRON_SECRET` | Existing protected billing cron also retries eligible paid project notifications |

Use a writable HTTPS Redis REST endpoint. A partially configured dedicated pair fails closed. The database must provide persistence, backups, and no eviction for application records. Do not point a local trial at the production database or recipient. Vite forwards these settings to server handlers; they are not browser configuration and must not receive a `VITE_` prefix.

`GET /api/ai-checkout` returns `{ ok: true, ready: boolean }` without disclosing configuration values. Readiness checks configuration presence and structure only; it does not prove Stripe account compatibility, webhook delivery, email delivery, or a real payment. Set production variables on the hosting project and redeploy; local `.env.local` does not configure production. Follow the [portal configuration and Stripe verification guide](client-portal/README.md) for the webhook events, cron, key separation, and provider checks.

## Public package checkout

`POST /api/ai-checkout` with `action: send-code` accepts only a UUID `submissionId`, current `offerVersion`, catalog `packageId`, buyer name, business name, email, valid quiz `answers`, `authorityConfirmed: true`, and an empty `company` honeypot. Client prices, scope, roles, or payment status are never accepted. Verification email is an operational message, not a marketing subscription. Limits apply per IP, recipient, hour, and day.

The requested six digit code and an HttpOnly challenge cookie are required for `action: verify-code`. Code consumption and a short lived verification proof are committed together in Redis. A retry after a storage, session, or network failure can finish the same checkout. Each order UUID and normalized payload fingerprint creates only one issued agreement and invoice. Different purchase details cannot reuse it. Terms and price come from the current server catalog; stale offers require refresh. New purchase records include quiz answers and catalog provenance without changing existing portal records.

After verification, the server creates an eight hour session restricted to that engagement and returns `/client-portal?engagement=<id>`. Even the owner email receives client access for this flow. Verification is neither a signature nor payment authorization. The portal presents the exact immutable agreement, stores the explicit signature, uses hosted Stripe card setup, and then requires approval of the exact total before charging. Successful payment is confirmed by Stripe API state or a verified webhook, never a browser redirect.

The paid engagement is the durable project record. Its owner notification contains the scope, signed purchase reference, price, and quiz answers. Notification failures do not reverse payment or create another charge. The existing protected cron retries eligible notices with the original payload and provider idempotency key. Uncertain messages older than 23 hours require provider history review instead of automatic resend. The application uses the existing `/api/demo-admin?offer=checkout` function rewrite and does not add a serverless function.

## Submission and notification behavior

`POST /api/ai-opportunity` accepts the exact [shared payload](../src/content/aiOffer.ts). The backend rejects unknown fields, invalid option values, stale offer versions, oversized data, missing acknowledgments, and cross-origin submissions. The `workflows` array accepts all applicable business challenges, with “not sure” exclusive. Impact and AI barrier selections remain bounded to two values. All multi-select fields are unique and normalized into a stable order. Branch-inapplicable approver and AI-barrier answers are rejected. Contact consent is required; website-offer acknowledgment is required for non-resource routes and must be false for a resource route. It uses a honeypot and shared limits of eight submissions per IP/hour and 200/day. No advertising IDs, marketing subscription consent, client-supplied qualification result, or tracking fields are accepted in this version.

The legacy intake schema still supports `nextStep: 'package' | 'consultation'`, `packageId: 'inquiry' | 'notes' | ''`, and email answer handoffs for older applications. The current UI uses this endpoint only for `nextStep: consultation`, empty `packageId`, and `contactMethod: call`. Email is optional for that phone request. The phone notification states that a time must be arranged; saving it does not confirm a booking or unlock the walkthrough. A phone request without email omits the notification's `reply_to` field. Current Google booking answers are saved through the separate verified booking flow.

The public endpoint rewrites to `/api/demo-admin?offer=ai`, sharing an existing deployed function to remain within the 12-function deployment limit. Its implementation lives in [ai-opportunity-handler.ts](../api/_lib/ai-opportunity-handler.ts); Vite mounts that same handler directly at the public path. The handler retains its own validation, feature flag, and owner authorization. The client portal dispatch remains separate.

Each browser submission has a UUID. Repeating the same UUID with the same normalized answers and conversion selection returns the existing application. Changing its answers or selected package produces `409 submission_conflict`; the client uses a new UUID after details or the selected path change. A stale offer version produces `409 offer_changed` and requires refreshing the offer before resubmission.

On an explicit contact request, the server validates answers and independently computes a qualification snapshot containing the route, rationale, priority, package candidate, and barrier guidance. The application, snapshot, and index are saved before any email request. This snapshot records the rules at submission rather than reclassifying history later. Storage failure returns an error, never a saved-application confirmation. A successful response contains only `ok`, `applicationId`, `route`, and `notification`.

- `notification: sent`: Resend accepted the internal message. This does not establish inbox delivery.
- `notification: queued`: the application is safely stored, but notification was not confirmed. There is no background worker in this version; the owner must inspect and recover pending work.
- `route: fit_call`, `manual_review`, or `resource`: a provisional routing recommendation, not an eligibility decision.

The intake API sends no confirmation or marketing email to the applicant. Google Calendar handles its own booking messages independently. The existing contact endpoint and demo invitation flow are unchanged.

## Owner review and recovery

Sign into `/client-portal` as the configured owner. Use the **same origin** for the portal and application API because the session cookie is host-specific. Ordinary client sessions, engagement-scoped sessions, and demo-admin cookies cannot read application records. The Google Calendar panel manages the owner connection and shows confirmed consultations with their saved quiz answers. These records are confirmation snapshots; check Google Calendar for later changes and cancellations. Owner only `GET /api/ai-booking?action=bookings` returns the latest 100 records. See [Google booking setup](ai-booking-setup.md) for the Calendar configuration and connection workflow.

Open `/api/ai-opportunity?offset=0` in that authenticated browser. It returns up to 25 applications and a `nextOffset`; request that offset until it is `null`. The response is private and uncached. It includes application details, the saved qualification snapshot, and notification status, but excludes the stored email payload and attempt token. Internal notification emails include the qualification context and submitted answers as plain text. Older records without a snapshot or the new fields remain readable and recoverable; they are not silently reclassified. Do not copy responses into public logs or analytics.

For an explicit retry, use this request in the same authenticated browser context, replacing only the placeholder with an application UUID from the owner list:

```js
const retryResponse = await fetch('/api/ai-opportunity', {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    action: 'retry_notification',
    applicationId: '<application UUID from owner list>',
  }),
})
const retryResult = await retryResponse.json()
```

This retries an **internal** notification and sends no applicant message. Do not run it simply to inspect a record; use GET for inspection.

Notification states are `pending`, `sending`, `sent`, `failed`, and `review_required`. A missing sender/provider setting leaves the record pending with `email_not_configured`. Correct the configuration, then retry. Concurrent retries reuse the original email payload and provider idempotency key; an active sending attempt has a 60-second lease. A lost provider response can therefore be retried without creating another accepted message within the provider's idempotency window.

After 23 hours from the first attempt, an unresolved notification changes to `review_required`; automatic retry stops. Check provider history and delivery status against the application and message ID before any manual resend. The application remains available for personal follow-up even when notification cannot be safely resent. This version has no automated provider-history reconciliation or owner UI for clearing that state.

## Retention and deletion

Application records and the sorted index have **no TTL**. Rate-limit keys expire separately. Before enabling production capture, establish an appropriate retention period and owner review routine, and ensure the privacy notice accurately describes saved application details and internal email handling.

Verified booking records under `portal:booking:record:<id>` and their `portal:booking:records` index also have no TTL. Their quiz answers are separate from Google event data and phone request records. Owner OAuth credentials are stored encrypted until replaced or invalidated; verification challenges and booking sessions expire separately. Include these records and the encrypted connection in the retention and access review described in [Google booking setup](ai-booking-setup.md).

There is no deletion API or scheduled purge in this version. An authorized store administrator must handle an approved deletion by removing the exact `ai-opportunity:application:<UUID>` record and its member in `ai-opportunity:index`. Avoid broad key deletion, which could affect other applications or the shared portal. Internal notification email, provider history, exports, and backups have separate retention and deletion handling.

Deleting a record also removes its submission-idempotency history; a later replay can create it again. If durable suppression after deletion is required, implement a minimal non-PII tombstone policy before enabling automated deletion. Do not treat removing a Redis record as deleting all copies.

## Checks before enabling capture or advertising

1. Confirm the $2,500 threshold, qualifying project scope, bonus limits, exclusions, payments, available capacity, and approved offer wording. Update the offer version when acknowledgment terms change.
2. Verify the durable store, intended internal recipient, sender, portal owner identity, and owner access to the application list. Verify the retention and notification-review routine.
3. Run `npm run test:ai-offer`, `npm run test:ai-booking`, `npm run test:ai-checkout`, `npm run test:portal`, `npm run test:analytics`, and `npm run build`. Provider tests isolate Google, Stripe, Redis, and email; they do not read local environment files, send real messages, create appointments, or charge cards. The checkout integration test goes from a new public buyer through verification, signature, card setup, explicit authorization, successful payment, and owner notification without an owner action.
4. Perform browser flows against isolated test storage and mock providers. Check every investment and timing combination: only ready plus now or soon reaches booking. Check the planning result, retained quiz answers, email code errors and recovery, exact verified booking matching, unrelated and ambiguous events, owner saved answers, and the phone request without email. Confirm that missing or failed video keeps offers hidden and a valid ended event reveals them. Exercise the existing checkout through signature and explicit payment authorization with test providers. No live email, appointment, or payment is needed for these checks.
5. Check keyboard navigation, mobile layout, error recovery, retained answers, the embedded calendar and fallback link, and the distinction between a saved phone request and a provider verified booking. Verify actual Google event matching separately before enabling automatic confirmation. Loading the calendar, verifying an email, or sending answers must not count as booking completion. Purchasing must not be described as automatically cancelling the meeting.
6. Confirm consent-based analytics behavior. Funnel events contain fixed step and broad result-type labels only; quiz answers, revenue, authority, barriers, private records, contact details, and identifiers must stay out of analytics. A recommendation view is not a submitted application or acquired customer. This implementation adds no ad pixel, offline conversion upload, or ad consent flow.
7. Configure and authorize Google Calendar, supply the approved video and captions, and verify provider behavior before enabling this complete flow for advertising. Publishing, enabling phone capture, authorizing Google, and purchasing ads are separate actions; this document does not establish that any occurred.

Backend tests cover persistence before notification, idempotency including selection order and chosen package, notification failure/recovery, stale uncertain attempts, storage failures, bounded and conditional validation, rate limits, qualification gates, revenue priority, old-record compatibility, owner access, catalog validation, and phone consultations without email. Client tests cover step validation, normalization after branch and conversion-path changes, deterministic qualification, email requirements, payload construction/response handling, and recovery contracts. See [backend tests](../scripts/test-ai-opportunity.mjs), [client tests](../scripts/test-ai-opportunity-client.mjs), and [analytics guidance](analytics.md).

Checkout tests also cover trusted catalog pricing, unknown field rejection, email verification, authority confirmation, same email engagement isolation, owner email role isolation, concurrent duplicate verification, ledger/session write recovery, expired proof, sender failure, and unsigned payment rejection. See [public checkout tests](../scripts/test-ai-checkout.mjs). The tests model Redis operations; they do not establish live Redis Lua execution or provider behavior.

[Booking tests](../scripts/test-ai-booking.mjs) cover owner and purchase session isolation, OAuth state binding and expiry, encrypted refresh credentials, required scopes and readable calendars, OTP limits and retry recovery, exact qualification, appointment matching and ambiguity, polling limits, provider failures, and revoked access. Matching fixtures are representative test data; they do not establish the actual title format of a live Google appointment schedule event.
