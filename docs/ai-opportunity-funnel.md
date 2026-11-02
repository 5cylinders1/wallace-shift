# AI opportunity funnel: operational handoff

Status: local review implementation, November 2, 2026. The owner supplied an existing public Google Calendar schedule and confirmed its 45 minute duration. The funnel now supports that live booking page in an embedded view after the visitor chooses Google Meet. This work did not deploy the site, enable production intake capture, change live Redis records, send real email, book an appointment, or launch advertising.

## Draft offer and route

The review page is `/offers/ai-business-integration`. Start the development server with `npm run dev`, then open that path on the local URL printed by Vite. The page is prerendered for review, has `noindex, nofollow`, and is absent from navigation and the sitemap. An unlisted URL is still public if deployed; it is not an access control.

[Shared offer content](../src/content/aiOffer.ts) contains the current version, `2026-11-01-draft-4`, provisional $2,500 minimum project fee, website scope, package catalog, question options, and routing rules. The proposal is a free one-page business website with a qualifying paid implementation project. The bonus includes one inquiry form and one consolidated revision round. It appears on the next steps page for every route with explicit qualifying-project conditions; viewing it does not establish eligibility. Confirm eligibility, delivery cost, operating costs, dependencies, and written scope before advertising these terms. This draft does not change the separate roofing CRM promotion or promise every project can be delivered at the minimum price.

## Qualification, result, and optional contact

The current entry point is the quiz. It replaces the earlier offer-page-first layout and three-step application. The flow is:

**Paid ad → seven qualification steps → choose a package request or a free 45 minute consultation.** Google Meet proceeds directly to the embedded Google booking page; phone consultations continue through the request form.

The seven steps cover:

1. **Bottlenecks:** select all applicable issues across inquiry response, administration, handoffs, dependence on the owner, capacity, demand, or another issue. Uncertainty is exclusive; visitors do not need to rank their issues.
2. **Authority:** owner authorized to buy, other authorized buyer, joint decision maker, or researcher. Joint decision makers and researchers then see a separate question about whether the approver can join a conversation.
3. **Business:** approximate revenue over the past 12 months, including not yet trading and prefer to discuss.
4. **Impact:** two sequential parts inside step 4. The time estimate appears first; choosing it reveals the consequences question with a short transition. Part 2 accepts up to two consequences, with uncertainty exclusive. Back returns to the estimate without clearing answers. Arrow keys can explore estimates; clicking, Enter, Space, or Next question confirms. The impact completion event fires only after both parts pass validation.
5. **AI experience:** new to AI, considered it, individual tools, a disappointing implementation, or existing adoption. All except new users then see a separate question to select up to two barriers; new users have no hidden barrier answers.
6. **Tools:** current software or process first, then optional task context in a separate question. Both may be skipped. An unanswered tools field requires further review.
7. **Readiness:** investment readiness first, then timing in a separate question.

Answers and the rule-based recommendation remain in the current browser tab. Completing the quiz does not send an application, contact an AI provider, reserve an appointment, or create a project. No email is required to view the next steps. Both paths are visible for every route:

- **Start with a package:** choose AI Inquiry Assistant at a proposed $2,500 or AI Notes and Updates at a proposed $3,500. The shared `aiPackages` catalog owns the names, prices, scopes, and exclusions. The result suggests a package when the routing rules identify a possible fit. **Continue with this package** carries the selection and answers into the contact form; **Request this package** submits them. Email is required. Compatibility, scope, delivery timing, the agreement, and separate costs still need confirmation before payment.
- **Plan a free consultation:** choose a free 45 minute Google Meet conversation or phone call. Google Meet opens the supplied public Google Calendar booking page within the funnel. The visitor selects availability and enters their name and email directly in Google. An external link to the same schedule remains available if the embedded page cannot be used. Phone requires a phone number and permits an empty email address; a supplied email must still be valid. Phone consultations continue through the request form, and a time is arranged afterward.

Sending quiz answers before a Google Meet consultation is optional. That action opens the existing intake form; a successful save returns the visitor to the calendar view with a saved answers message. Google booking and intake submission remain separate. No quiz answers, contact details, submission identifiers, or recommendation data are appended to the booking URL or automatically filled into Google. The embed loads only after the visitor chooses booking, rather than on arrival at the quiz or result page.

The visitor can return to the next steps or edit quiz answers. Review and copy controls are subordinate to the two conversion paths. Refreshing or closing the tab can discard unsent answers; this is not saved account progress.

Business type is optional context in the contact form. It does not affect qualification or the recommendation, and it is not required to complete the quiz or submit a request.

Quiz and contact screens use a compact header and an independently scrollable question area. Back and the primary action remain visible beneath that area. New questions reset its scroll position; validation and submission errors receive focus. The next steps page keeps normal scrolling, replaces the quiz introduction, and returns to the top on entry. The two paths appear beside each other on desktop and stack on smaller screens, with direct links to either path near the mobile introduction.

Every quiz step with multiple questions uses sequential panels and a part indicator. A radio selection opens the next part when that answer has a follow up; arrow keys stay in the radio group until Enter, Space, or Next question confirms. Text and multiple choice questions use the navigation button. Back returns through applicable questions while preserving answers. Confirming an unchanged role or AI experience preserves its follow up response; changing the branch clears obsolete details. Validation applies to the current question before advancing, with a complete step check before its completion event. The separate contact form remains a single form after the recommendation.

Routing uses explicit conditions rather than a points score:

- **Preparation or alternative (`resource`):** no current path to an approver, investment outside budget, no revenue yet, customer demand as the only selected issue, or exploration for later. This routing signal is preserved for owner review. The page now keeps both next steps available and recommends a conversation with contextual guidance, rather than ending with a copy-summary action. The conditional website offer does not imply the bonus applies.
- **Consultation (`manual_review`, or `fit_call` for a plausible custom workflow):** multiple business challenges or unresolved value, approval, impact, task, or tool details need a conversation. Selecting demand alongside an operational challenge does not trigger the demand-only preparation route. A joint decision maker or researcher who can involve the approver can reach this route.
- **Potential package (`fit_call`):** an authorized buyer reports a relevant inquiry or administration workflow, investment readiness, near-term timing, tools, and meaningful recurring work. The result is an indication of fit, not confirmation of exact software compatibility or delivery capacity.

Revenue of $250,000 or more sets an internal `established` priority signal. Lower revenue or preferring to discuss it does not by itself exclude an operating business. Revenue cannot override the authority, investment, problem, or timing rules. AI experience and selected barriers remain in the saved qualification guidance and answer summary; they are not a positive/negative score.

Every recommendation has `checkoutReady: false`. Package prices and scopes remain provisional. Package checkout and signing from the quiz remain pending. Google Calendar supplies its own availability and booking interaction, while phone consultation requests still require arranging a time. The funnel has no booking completion callback or Calendar API synchronization, so it does not verify a booking, attach answers automatically to the calendar event, or create a project from a booking. Intake success confirms only that the selected request or optional quiz answers were saved. No appointment, quote, purchase, or website entitlement is created by an intake submission.

## Configuration

[Consultation configuration](../src/content/aiConsultation.ts) owns `durationMinutes: 45`, the supplied public `bookingUrl`, and the same URL with `?gv=true` for embedding. The existing schedule displayed 45 minute appointments and the owner explicitly confirmed retaining that duration. The URL is public and needs no API credentials. This is local funnel configuration only; the sitewide `business.bookingUrl` remains unchanged. Booking availability and Google confirmation are controlled in the owner's Google Calendar schedule.

Public submissions are disabled unless the **server-only** variable `AI_OPPORTUNITY_ENABLED` is exactly `true`. A disabled endpoint returns `503` with `not_configured`. Owner read/retry access stays available so existing records can be recovered even while the offer is disabled.

| Setting | Purpose |
| --- | --- |
| `AI_OPPORTUNITY_ENABLED` | Explicit public capture switch; absent or any other value keeps capture disabled |
| `DEMO_AUDIT_REDIS_URL`, `DEMO_AUDIT_REDIS_TOKEN` | Preferred durable Redis REST connection, shared with existing portal infrastructure |
| `RATE_LIMIT_REDIS_URL` / `RATE_LIMIT_REDIS_TOKEN`, `KV_REST_API_URL` / `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Existing store fallbacks, in that order, when the dedicated pair is absent |
| `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` | Internal notification provider and verified sender |
| `AI_OPPORTUNITY_TO_EMAIL` | Optional internal recipient override; otherwise uses `CONTACT_TO_EMAIL` |
| `PORTAL_ADMIN_EMAIL` | Existing portal owner identity; falls back to existing demo-admin/contact-owner configuration |

Use a writable HTTPS Redis REST endpoint. A partially configured dedicated pair fails closed. The database must provide persistence, backups, and no eviction for application records. Do not point a local trial at the production database or recipient. Vite forwards these settings to server handlers; they are not browser configuration and must not receive a `VITE_` prefix.

## Submission and notification behavior

`POST /api/ai-opportunity` accepts the exact [shared payload](../src/content/aiOffer.ts). The backend rejects unknown fields, invalid option values, stale offer versions, oversized data, missing acknowledgments, and cross-origin submissions. The `workflows` array accepts all applicable business challenges, with “not sure” exclusive. Impact and AI barrier selections remain bounded to two values. All multi-select fields are unique and normalized into a stable order. Branch-inapplicable approver and AI-barrier answers are rejected. Contact consent is required; website-offer acknowledgment is required for non-resource routes and must be false for a resource route. It uses a honeypot and shared limits of eight submissions per IP/hour and 200/day. No advertising IDs, marketing subscription consent, client-supplied qualification result, or tracking fields are accepted in this version.

The payload includes `nextStep: 'package' | 'consultation'` and `packageId: 'inquiry' | 'notes' | ''`. Package requests require a valid catalog ID and `contactMethod: 'email'`; their phone field is cleared. Consultation requests clear `packageId`. Existing `contactMethod` values are retained: `email` represents the optional quiz answer handoff for Google Meet, and `call` represents a phone consultation request. Email is optional only for a phone consultation. Owner notifications include the requested path, trusted package name and proposed price or consultation format, and all quiz answers. They identify Meet submissions as answer handoffs that do not prove an appointment was booked, and phone submissions as requests for a time to be arranged. A phone request without email omits the notification's `reply_to` field.

The public endpoint rewrites to `/api/demo-admin?offer=ai`, sharing an existing deployed function to remain within the 12-function deployment limit. Its implementation lives in [ai-opportunity-handler.ts](../api/_lib/ai-opportunity-handler.ts); Vite mounts that same handler directly at the public path. The handler retains its own validation, feature flag, and owner authorization. The client portal dispatch remains separate.

Each browser submission has a UUID. Repeating the same UUID with the same normalized answers and conversion selection returns the existing application. Changing its answers or selected package produces `409 submission_conflict`; the client uses a new UUID after details or the selected path change. A stale offer version produces `409 offer_changed` and requires refreshing the offer before resubmission.

On an explicit contact request, the server validates the answers and independently computes a qualification snapshot containing the route, rationale, priority, package candidate, barrier guidance, and unconfirmed checkout status. The application, snapshot, and index are saved before any email request. This snapshot records the rules at submission rather than reclassifying history later. Storage failure returns an error, never a saved-application confirmation. A successful response contains only `ok`, `applicationId`, `route`, and `notification`.

- `notification: sent`: Resend accepted the internal message. This does not establish inbox delivery.
- `notification: queued`: the application is safely stored, but notification was not confirmed. There is no background worker in this version; the owner must inspect and recover pending work.
- `route: fit_call`, `manual_review`, or `resource`: a provisional routing recommendation, not an eligibility decision.

The intake API sends no confirmation or marketing email to the applicant. Google Calendar handles its own booking messages independently. The existing contact endpoint and demo invitation flow are unchanged.

## Owner review and recovery

Sign into `/client-portal` as the configured owner. Use the **same origin** for the portal and application API because the session cookie is host-specific. Ordinary client sessions, engagement-scoped sessions, and demo-admin cookies cannot read application records.

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

There is no deletion API or scheduled purge in this version. An authorized store administrator must handle an approved deletion by removing the exact `ai-opportunity:application:<UUID>` record and its member in `ai-opportunity:index`. Avoid broad key deletion, which could affect other applications or the shared portal. Internal notification email, provider history, exports, and backups have separate retention and deletion handling.

Deleting a record also removes its submission-idempotency history; a later replay can create it again. If durable suppression after deletion is required, implement a minimal non-PII tombstone policy before enabling automated deletion. Do not treat removing a Redis record as deleting all copies.

## Checks before enabling capture or advertising

1. Confirm the $2,500 threshold, qualifying project scope, bonus limits, exclusions, payments, available capacity, and approved offer wording. Update the offer version when acknowledgment terms change.
2. Verify the durable store, intended internal recipient, sender, portal owner identity, and owner access to the application list. Verify the retention and notification-review routine.
3. Run `npm run test:ai-offer`, `npm run test:analytics`, and `npm run build`. The AI-offer tests isolate network providers and do not read local environment files or send real messages.
4. Perform a browser flow with fictional details against isolated test storage and a mock/test mail recipient. Check both conversion paths for all three routing types, qualification conditions, lower-revenue and prefer-to-discuss cases, package and consultation selection retention, a phone request without email, switching back to Google Meet, edits that change branches, duplicate submission, disabled capture, storage failure, queued notification, and owner recovery. Production receipt and inbox delivery remain separate checks.
5. Check keyboard navigation, mobile layout, error recovery, retained answers, the embedded calendar and fallback link, and the distinction between saved intake and Google booking. Verify Google availability separately without creating a real appointment during routine UI testing. The funnel must not infer booking completion from loading the calendar or sending quiz answers.
6. Confirm consent-based analytics behavior. Funnel events contain fixed step and broad result-type labels only; quiz answers, revenue, authority, barriers, private records, contact details, and identifiers must stay out of analytics. A recommendation view is not a submitted application or acquired customer. This implementation adds no ad pixel, offline conversion upload, or ad consent flow.
7. Enable public capture only in the intended environment after the review. Publishing, enabling submissions, and purchasing ads are separate actions; none occurred through this implementation.

Backend tests cover persistence before notification, idempotency including selection order and chosen package, notification failure/recovery, stale uncertain attempts, storage failures, bounded and conditional validation, rate limits, qualification gates, revenue priority, old-record compatibility, owner access, catalog validation, and phone consultations without email. Client tests cover step validation, normalization after branch and conversion-path changes, deterministic qualification, email requirements, payload construction/response handling, and recovery contracts. See [backend tests](../scripts/test-ai-opportunity.mjs), [client tests](../scripts/test-ai-opportunity-client.mjs), and [analytics guidance](analytics.md).
