# AI opportunity funnel: operational handoff

Qualified visitors book their free 45 minute consultation through Calendly. After the embed confirms their appointment, the funnel scrolls to the 15 second Wallace Shift film **Put AI to work**. Finishing the film reveals the package offers. Public purchases use the portal for agreement, signature, and Stripe payment.

## Offer and route

The review page is `/offers/ai-business-integration`. Start the development server with `npm run dev`, then open that path on the local URL printed by Vite. The page is prerendered for review, has `noindex, nofollow`, and is absent from navigation and the sitemap. An unlisted URL is still public if deployed; it is not an access control.

[Shared offer content](../src/content/aiOffer.ts) contains version `2026-11-02-3`, the $2,500 minimum project fee, website scope, package catalog, question options, and routing rules. AI Inquiry Assistant costs $2,500 and connects one website inquiry form to one team email address with a draft reply. AI Notes and Updates costs $3,500 and connects one internal written notes form to one team email address with a summary and action list. Both include a one page business website, one inquiry form, and one consolidated revision round. Applicable service taxes are included. Domain, hosting, and AI usage costs are separate and need the client's approval before activation. Custom CRM connections and other exclusions are explicit; these purchases do not require an undefined integration compatibility review. Issued agreements retain the purchased scope and price even when the catalog changes. The separate roofing CRM promotion is unchanged.

## Qualification, booking, walkthrough, and purchase

**Paid ad → qualification quiz → Calendly booking → film → package purchase.** Matthew receives the quiz answers when a qualified visitor submits the final answer.

The seven steps cover:

1. **Bottlenecks:** select all applicable issues across inquiry response, administration, handoffs, dependence on the owner, capacity, demand, or another issue. Uncertainty is exclusive; visitors do not need to rank their issues.
2. **Business:** approximate revenue over the past 12 months, including not yet trading and **I don't know**.
3. **Impact:** weekly team time followed by up to two consequences. Both questions offer **I don't know**, exclusive of specific consequences. Choosing **other** reveals a required explanation with a 1,500 character limit. Deselecting other clears its explanation.
4. **AI experience:** new to AI, considered it, individual tools, a disappointing implementation, or existing adoption. All except new users then see a separate question to select up to two barriers; new users have no hidden barrier answers.
5. **Context:** optional task context. The tools question has been removed.
6. **Authority:** **Are you authorized to approve a purchase for this business?** The choices retain owner authorized to buy, other authorized buyer, joint decision maker, and researcher. This question sits immediately before investment readiness. The approver participation follow up is retired because it cannot qualify the other roles for booking.
7. **Readiness:** investment readiness followed by **Now**, **Within the next month**, **Within 3 months**, or **Just researching**.

Direct booking requires all three conditions: authority is **I own the business and can approve the purchase** or **I am authorized to approve the purchase** (`role: owner | decision_maker`), investment is **Yes, I can approve that investment** (`budget: ready`), and timing is **Now** or **Within the next month** (`timing: now | soon`). Joint decision makers and researchers do not qualify even if they select the investment and timing answers. Revenue, impact, and AI experience provide project context without adding booking exclusions. Revenue of $250,000 or more remains an internal `established` priority signal. The existing `fit_call`, `manual_review`, and `resource` classifications remain contextual guidance, separate from booking eligibility. The other consequence explanation is included in the quiz email, intake, checkout, and project summaries; older records without this field remain readable.

Other visitors see a short planning result with options to edit their answers or learn about AI services. They do not see immediate packages or the booking conversion screen. No email is required to take the quiz or see that result. Unqualified submissions do not email Matthew.

Once a qualified visitor submits the final answer, the site emails the validated quiz answers and completion time to `matthew@wallaceshift.com`. A booking may not exist yet. Its confirmation and Meet details arrive separately through the scheduling provider.

The booking page describes the free **45 minute Google Meet consultation**, the business website included with a **paid project of $2,500 or more**, and the phone alternative. Visitors select a time and enter their contact details in the Calendly embed. The site does not request a second booking email or send the quiz answers to the scheduler. [Booking and notification setup](ai-booking-setup.md)

Phone callbacks use a separate request with a required phone number and optional email. Wallace Shift arranges the time afterward.

The film first appears when the active Calendly embed confirms a completed booking. The page scrolls to the player automatically. Its English captions describe an incoming roof inquiry, a drafted reply and a person approving it. Changing dates, picking a time or leaving the scheduler does not reveal it. Packages appear when the film ends. A missing video source shows the coming soon placeholder and keeps offers locked.

After the video, the visitor may buy AI Inquiry Assistant for $2,500 or AI Notes and Updates for $3,500 without a consultation or owner quote. Each package retains its defined scope, price, exclusions, and website bonus. Existing checkout collects buyer details and purchase authority, verifies the buyer email, creates a server priced agreement, and opens the client portal for signature and Stripe payment. A verified successful payment creates the paid project handoff with quiz answers and triggers the existing internal owner notification. Booking confirmation is not purchase, signature, or payment authorization.

A purchase leaves the appointment in place. A buyer who no longer needs the consultation can cancel it through their booking confirmation.

Quiz and contact screens use a compact header and an independently scrollable question area. Back and the primary action remain visible. Every quiz step with multiple questions reveals one question at a time and shows the current part. A radio selection advances applicable follow ups; arrow keys remain inside the group until Enter, Space, or Next question confirms. Text and multiple choice questions use the navigation button. Back preserves applicable answers, while changing a branch clears obsolete details. New questions reset the answer area's scroll position, and validation errors receive focus. Step completion measurement fires only when the complete step validates.

Booking, walkthrough, and planning results use normal page scrolling. Editing the quiz clears the later conversion state. Unsent answers and presentation progress remain in this browser tab; closing or refreshing can discard that progress. Quiz notification receipts, legacy verified bookings and paid projects are separate records. Business type stays optional context and does not add a qualification requirement.

## Configuration

The [scheduler configuration](../src/lib/calendlyEventUrl.ts) reads the public Calendly event link. Configure the 45 minute event with Google Meet and connect the intended calendar in Calendly. The owner’s [public consultation event](https://calendly.com/matthew-wallaceshift/consultation) is the default. An empty or invalid environment override falls back to the existing Google schedule. A phone request is available on either path. Bookings through that fallback cannot open the film. The optional owner portal Google OAuth connection is separate.

The server action `POST /api/ai-booking` with `action: quiz-summary` validates the quiz, enforces qualification and rate limits, and sends the summary to Matthew using Redis and Resend. It records an idempotent receipt for each attempt. If email is unavailable, the calendar remains usable. The booking page offers a retry with the same attempt.

The separate phone intake is enabled only when the server variable `AI_OPPORTUNITY_ENABLED` is exactly `true`. A disabled intake endpoint returns `503` with `not_configured`. Owner read/retry access stays available. Checkout requires the existing portal's durable storage, owner identity, email and Stripe configuration.

| Setting | Purpose |
| --- | --- |
| `VITE_CALENDLY_EVENT_URL` | Reusable public Calendly consultation event URL. Restart Vite locally or redeploy on Vercel after changing it. |
| `AI_OPPORTUNITY_ENABLED` | Public phone intake switch; absent or any other value keeps phone intake disabled |
| `DEMO_AUDIT_REDIS_URL`, `DEMO_AUDIT_REDIS_TOKEN` | Preferred durable Redis REST connection, shared with existing portal infrastructure |
| `RATE_LIMIT_REDIS_URL` / `RATE_LIMIT_REDIS_TOKEN`, `KV_REST_API_URL` / `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Existing store fallbacks, in that order, when the dedicated pair is absent |
| `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` | Verified sender for quiz summaries, checkout verification, paid project notices and phone request notifications |
| `AI_OPPORTUNITY_TO_EMAIL` | Optional recipient override for contact intake, including phone requests. Qualified quiz summaries always go to `matthew@wallaceshift.com`. |
| `PORTAL_ADMIN_EMAIL` | Existing portal owner identity; falls back to existing demo-admin/contact-owner configuration |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | Matching Stripe test or live keys for the intended environment |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the deployed `/api/client-portal?action=webhook` endpoint, or the separate local listener in development |
| `CRON_SECRET` | Existing protected billing cron also retries eligible paid project notifications |

Use a writable HTTPS Redis REST endpoint. A partially configured dedicated pair fails closed. The database must provide persistence, backups, and no eviction for application records. Use separate storage and recipients for local tests. Only the public Calendly link has a `VITE_` prefix. Keep server credentials out of the browser build.

`GET /api/ai-checkout` returns `{ ok: true, ready: boolean }` without disclosing configuration values. Readiness checks configuration presence and structure only; it does not prove Stripe account compatibility, webhook delivery, email delivery, or a real payment. Set production variables on the hosting project and redeploy; local `.env.local` does not configure production. Follow the [portal configuration and Stripe verification guide](client-portal/README.md) for the webhook events, cron, key separation, and provider checks.

## Public package checkout

`POST /api/ai-checkout` with `action: send-code` accepts only a UUID `submissionId`, current `offerVersion`, catalog `packageId`, buyer name, business name, email, valid quiz `answers`, `authorityConfirmed: true`, and an empty `company` honeypot. Client prices, scope, roles, or payment status are never accepted. Verification email is an operational message, not a marketing subscription. Limits apply per IP, recipient, hour, and day.

The requested six digit code and an HttpOnly challenge cookie are required for `action: verify-code`. Code consumption and a short lived verification proof are committed together in Redis. A retry after a storage, session, or network failure can finish the same checkout. Each order UUID and normalized payload fingerprint creates only one issued agreement and invoice. Different purchase details cannot reuse it. Terms and price come from the current server catalog; stale offers require refresh. New purchase records include quiz answers and catalog provenance without changing existing portal records.

After verification, the server creates an eight hour session restricted to that engagement and returns `/client-portal?engagement=<id>`. Even the owner email receives client access for this flow. Verification is neither a signature nor payment authorization. The portal presents the exact immutable agreement, stores the explicit signature, uses hosted Stripe card setup, and then requires approval of the exact total before charging. Successful payment is confirmed by Stripe API state or a verified webhook, never a browser redirect.

The paid engagement is the durable project record. Its owner notification contains the scope, signed purchase reference, price, and quiz answers. Notification failures do not reverse payment or create another charge. The existing protected cron retries eligible notices with the original payload and provider idempotency key. Uncertain messages older than 23 hours require provider history review instead of automatic resend. The application uses the existing `/api/demo-admin?offer=checkout` function rewrite and does not add a serverless function.

## Submission and notification behavior

`POST /api/ai-opportunity` accepts the exact [shared payload](../src/content/aiOffer.ts). The backend rejects unknown fields, invalid option values, stale offer versions, oversized data, missing acknowledgments, and cross-origin submissions. The `workflows` array accepts all applicable business challenges, with “not sure” exclusive. Impact and AI barrier selections remain bounded to two values. All multi-select fields are unique and normalized into a stable order. Branch-inapplicable approver and AI-barrier answers are rejected. Contact consent is required; website-offer acknowledgment is required for non-resource routes and must be false for a resource route. It uses a honeypot and shared limits of eight submissions per IP/hour and 200/day. No advertising IDs, marketing subscription consent, client-supplied qualification result, or tracking fields are accepted in this version.

The legacy intake schema still supports `nextStep: 'package' | 'consultation'`, `packageId: 'inquiry' | 'notes' | ''`, and email answer handoffs for older applications. The current UI uses this endpoint only for `nextStep: consultation`, empty `packageId`, and `contactMethod: call`. Email is optional for that phone request. The phone notification states that a time must be arranged; saving it does not confirm a booking or unlock the walkthrough. A phone request without email omits the notification's `reply_to` field. Qualified quiz summaries use the separate booking API action described above.

The public endpoint rewrites to `/api/demo-admin?offer=ai`, sharing an existing deployed function to remain within the 12-function deployment limit. Its implementation lives in [ai-opportunity-handler.ts](../api/_lib/ai-opportunity-handler.ts); Vite mounts that same handler directly at the public path. The handler retains its own validation, feature flag, and owner authorization. The client portal dispatch remains separate.

Each browser submission has a UUID. Repeating the same UUID with the same normalized answers and conversion selection returns the existing application. Changing its answers or selected package produces `409 submission_conflict`; the client uses a new UUID after details or the selected path change. A stale offer version produces `409 offer_changed` and requires refreshing the offer before resubmission.

On an explicit contact request, the server validates answers and independently computes a qualification snapshot containing the route, rationale, priority, package candidate, and barrier guidance. The application, snapshot, and index are saved before any email request. This snapshot records the rules at submission rather than reclassifying history later. Storage failure returns an error, never a saved-application confirmation. A successful response contains only `ok`, `applicationId`, `route`, and `notification`.

- `notification: sent`: Resend accepted the internal message. This does not establish inbox delivery.
- `notification: queued`: the application is safely stored, but notification was not confirmed. There is no background worker in this version; the owner must inspect and recover pending work.
- `route: fit_call`, `manual_review`, or `resource`: a provisional routing recommendation, not an eligibility decision.

The intake API sends no confirmation or marketing email to the applicant. Scheduling confirmations and invitations arrive through the booking provider.

## Owner review and recovery

Sign into `/client-portal` as the configured owner. Use the **same origin** for the portal and application API because the session cookie is host-specific. Ordinary client sessions, engagement-scoped sessions, and demo-admin cookies cannot read application records. The legacy Google Calendar panel manages the optional owner connection and shows previously verified consultations with their saved quiz answers. New quiz summaries arrive in Matthew's inbox. These records are confirmation snapshots; check Google Calendar for later changes and cancellations. Owner only `GET /api/ai-booking?action=bookings` returns the latest 100 records. See [Google booking setup](ai-booking-setup.md) for the Calendar configuration and connection workflow.

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

Quiz notices keep a pending email payload in Redis until Resend accepts it. A successful send replaces the payload with a receipt and fingerprint. Attempts with an uncertain send beyond the retry window need provider review. These receipts are independent of the phone application list and its recovery endpoint.

Phone application records and the sorted index have **no TTL**. Rate-limit keys expire separately. Before enabling production capture, establish an appropriate retention period and owner review routine, and ensure the privacy notice accurately describes saved application details and internal email handling.

Legacy verified booking records under `portal:booking:record:<id>` and their `portal:booking:records` index also have no TTL. Their quiz answers are separate from Google event data and phone request records. Owner OAuth credentials are stored encrypted until replaced or invalidated; verification challenges and booking sessions expire separately. Include these records and the encrypted connection in the retention and access review described in [Google booking setup](ai-booking-setup.md).

There is no deletion API or scheduled purge in this version. An authorized store administrator must handle an approved deletion by removing the exact `ai-opportunity:application:<UUID>` record and its member in `ai-opportunity:index`. Avoid broad key deletion, which could affect other applications or the shared portal. Internal notification email, provider history, exports, and backups have separate retention and deletion handling.

Deleting a record also removes its submission-idempotency history; a later replay can create it again. If durable suppression after deletion is required, implement a minimal non-PII tombstone policy before enabling automated deletion. Do not treat removing a Redis record as deleting all copies.

## Checks before enabling capture or advertising

1. Confirm the $2,500 threshold, qualifying project scope, bonus limits, exclusions, payments, available capacity, and approved offer wording. Update the offer version when acknowledgment terms change.
2. Verify the durable store, intended internal recipient, sender, portal owner identity, and owner access to the application list. Verify the retention and notification-review routine.
3. Run `npm run test:ai-offer`, `npm run test:ai-booking`, `npm run test:ai-checkout`, `npm run test:portal`, `npm run test:analytics`, and `npm run build`. Provider tests isolate Google, Stripe, Redis, and email; they do not read local environment files, send real messages, create appointments, or charge cards. The checkout integration test goes from a new public buyer through verification, signature, card setup, explicit authorization, successful payment, and owner notification without an owner action.
4. With isolated storage and mock providers, verify qualification and quiz email delivery, retry, and the phone alternative. On the configured booking page, check that the film is hidden while choosing a slot and is revealed only by a successful booking message from the active Calendly iframe. Without a valid event link, confirm the Google fallback cannot reveal the film.
5. Check desktop and mobile, keyboard focus, reduced motion and error recovery. Confirm the newly revealed player scrolls into view on confirmation, that the film and captions load, and that packages appear only after playback ends. Check package checkout through signature and explicit test payment authorization.
6. Confirm consent-based analytics behavior. Funnel events contain fixed step and broad result-type labels only; quiz answers, revenue, authority, barriers, private records, contact details, and identifiers must stay out of analytics. A recommendation view is not a submitted application or acquired customer. This implementation adds no ad pixel, offline conversion upload, or ad consent flow.
7. Before sending paid traffic, check quiz email delivery, a confirmed appointment through the actual embedded Calendly event, the Google calendar entry and Meet link, the automatic scroll and playback, and the booking notification in the intended inbox. Verify any Gmail filter against a new confirmation from the configured event.

Backend tests cover persistence before notification, idempotency including selection order and chosen package, notification failure/recovery, stale uncertain attempts, storage failures, bounded and conditional validation, rate limits, qualification gates, revenue priority, old-record compatibility, owner access, catalog validation, and phone consultations without email. Client tests cover step validation, normalization after branch and conversion-path changes, deterministic qualification, email requirements, payload construction/response handling, and recovery contracts. See [backend tests](../scripts/test-ai-opportunity.mjs), [client tests](../scripts/test-ai-opportunity-client.mjs), and [analytics guidance](analytics.md).

Checkout tests also cover trusted catalog pricing, unknown field rejection, email verification, authority confirmation, same email engagement isolation, owner email role isolation, concurrent duplicate verification, ledger/session write recovery, expired proof, sender failure, and unsigned payment rejection. See [public checkout tests](../scripts/test-ai-checkout.mjs). The tests model Redis operations; they do not establish live Redis Lua execution or provider behavior.

[Booking tests](../scripts/test-ai-booking.mjs) cover qualified quiz summary validation, fixed recipient, delivery failures and duplicate attempts. Tests for the legacy verified booking path cover owner and purchase session isolation, OAuth state binding and expiry, encrypted refresh credentials, required scopes and readable calendars, OTP limits and retry recovery, exact qualification, appointment matching and ambiguity, polling limits, provider failures, and revoked access. Matching fixtures are representative test data; they do not establish the actual title format of a live Google appointment schedule event.
