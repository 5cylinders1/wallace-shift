# Hero callback and Google Meet review

Reviewed November 17, 2026. Website changes are local and uncommitted. The existing Calendly event was updated live to 20 minutes at the user's request. No callback email or calendar booking was sent during this review.

## Scope and observed evidence

The screenshot matches `prototypes/homepage/purchase/`, an isolated preview, not the production homepage entry. Its original primary action linked to `#packages`; the question action linked to a lower contact section that offered email or another page. Neither provided immediate capture from the hero.

The existing `/api/contact` transport supported name, email and a message, and treats a successful Resend response as acknowledgement, not verified inbox delivery. The existing AI consultation used Calendly at `https://calendly.com/matthew-wallaceshift/consultation`. The signed-in event settings showed a 30 minute Google Meet before this change.

Repository searches found illustrative customer fixtures and a prospect list, not original prospect conversations, inquiry exports or visitor recordings. Narrow connected Drive discovery found an authored proposal, not first-hand visitor evidence. Existing analytics documents explicitly exclude session recordings and freeform form values. No live analytics export or representative research participants were available. The design decisions below are hypotheses supported by observed interaction friction, not measured conversion gains.

The business phone comes from `src/content/siteConfig.ts`: **(913) 347-5479**, linked as `tel:+19133475479` in the hero and both overlay modes.

## Resulting behavior

- The first viewport names websites and lead pages, leads with **Request a call**, and offers **Book a Google Meet** as the secondary action. Existing prices, package links and demo disclosures remain.
- Both actions open the same full viewport dialog, animated upward from the bottom. The page retains its dimensions and position. The body is locked; the dialog can scroll internally and follows the visible viewport when available.
- A callback requires only name and phone. Optional email and note are collapsed initially. On a 390 × 844 viewport, the required fields and submit control fit in the initial dialog view.
- The callback endpoint accepts phone-only inquiries without inventing a reply-to email address. Existing email forms retain their original requirements. Provider notifications include the phone and callback preference.
- A 20 second request timeout reports uncertain delivery honestly. Pending requests block duplicate clicks. Identical retries keep a random request identifier; the endpoint forwards it as a Resend idempotency key. Resend's documented retention is 24 hours. A changed payload or a new page session creates a new identifier. This is not a permanent cross-session deduplication guarantee. [Provider documentation](https://resend.com/docs/dashboard/emails/idempotency-keys).
- Callback confirmation says it is a request, not a booked appointment. Google Meet confirmation requires the existing scheduler's validated event from the active Calendly iframe; date selection alone cannot confirm a booking.
- Native modal behavior supplies background inertness; explicit Tab wrapping keeps focus within the dialog. Escape/Close restore the invoking control and scroll position. Drafts stay in memory across dismissal; no contact data is written to analytics or browser storage. Reduced motion removes the slide animation. Behavior follows the [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

## Calendar change verified live

The existing event was saved as **Free 20 Minute Consultation**, duration **20 minutes**, location **Google Meet**. The reusable URL is unchanged. The real embed loaded that title and duration and displayed the day selector in the new overlay. No appointment was reserved and no invitation or Meet link delivery was exercised.

Because the AI consultation funnel uses the same event, its shared duration constant and related tests/documentation now say 20 minutes. The website code has not been deployed, so already deployed copy still needs the code release to match the changed event.

## Validation

| Check | Evidence and result |
| --- | --- |
| Browser interaction | Eight Playwright scenarios passed: four callback viewport/motion variants, a minimal phone-only callback, two booking confirmations, and blocked-calendar recovery. |
| First viewport | Hero action visible at 1440 × 900, 1280 × 720, 390 × 844 and 320 × 568. No horizontal page overflow. Required callback fields and submit fit at 390 × 844. |
| Layout and navigation | Underlying header, heading, hero action and demo positions match before/during/after opening. Background scroll locked; focus and nonzero scroll position restored on close. |
| Form recovery | Missing/invalid phone, malformed optional email, pending duplicate attempt, server failure, HTML masquerading as success, HTTP 503 with `ok:true`, retry, draft retention and confirmed success passed. Same-payload retries retain the request ID. |
| Booking | Mocked provider source/origin validation, 20 minute copy, separate-tab fallback and blocked widget recovery passed. Real embed separately inspected without booking. |
| Automated accessibility | Axe reported zero violations or incomplete findings in the scoped hero/header/dialog scenarios. This does not certify the third-party live calendar or unchanged page sections. |
| Manual keyboard | Browser-operated opening, initial heading focus, Tab to the first field, Shift-Tab toward Close, and Escape returning focus were observed. Final automated cases cover both completed modes. |
| Server transport | 13 contact regression tests passed, using a simulated Resend provider, including destination/reply-to, phone-only callback, validation, retry after lost response and existing email callers. |
| Related scheduling | 35 booking and 28 AI opportunity unit tests passed after the shared 20 minute duration update. The older AI consultation browser suite could not run after sandbox denial and aborted escalation. |
| Code | Application and isolated prototype TypeScript checks, targeted ESLint, isolated Vite bundle and Vercel server type/emit check passed. The ordinary production bundle excludes this prototype, so it is not used as evidence that the preview built. |
| Design inspection | Desktop and mobile hero/callback screenshots inspected. The real Google Meet embed was inspected separately. Impeccable's mechanical detector found no issues in its completed pass. |

The browser suite mocks all submission responses and booking confirmations. The server suite mocks provider delivery. Neither is evidence of real inbox receipt or a newly booked appointment.

## Pending checks and release boundaries

- **Real callback receipt:** Local configuration lacks `CONTACT_TO_EMAIL`. A deliberately invalid request to the public endpoint returned a validation error without sending; this only establishes reachability. Connected Resend tooling belongs to a different account and cannot verify this destination. A configured test environment and observed receipt are still required.
- **Real booking completion:** The live event settings and embed are verified; invitation delivery, an actual calendar entry and the resulting Google Meet link remain untested.
- **VoiceOver:** Native app access was not approved when attempting this check. Accessibility-tree inspection and axe results are not a substitute for VoiceOver testing.
- **Physical phone:** Small viewports and keyboard space were simulated. No physical phone keyboard was tested.
- **Prospective users and conversion:** No representative participants or traffic baseline were available. Task comprehension and conversion improvement remain unverified.
- **Deployment:** Website, callback API and shared duration-copy changes are local. The screenshot's prototype is not part of production Vite inputs. No commit or website deployment was made. Only the explicitly requested Calendly event setting was changed live.

## Review artifacts

- [Desktop hero](../prototypes/homepage/purchase/review/hero-call-desktop.png)
- [Mobile hero](../prototypes/homepage/purchase/review/hero-call-mobile.png)
- [Desktop callback](../prototypes/homepage/purchase/review/callback-desktop.png)
- [Mobile callback](../prototypes/homepage/purchase/review/callback-mobile.png)

Run the focused browser suite with `node scripts/test-purchase-inquiry-browser.mjs`. It uses the repository's existing Playwright runtime helper and a local axe bundle; set `AXE_PATH` if the default cached bundle is unavailable. It blocks remote requests and cannot send a real inquiry or booking.

Commit message: `Add phone callbacks and 20 minute Google Meet booking to the hero`
