# Wallace Shift client portal

Implemented at `/client-portal`. New invoice emails include a private link that signs the client in and opens the specific agreement. Email-code sign in remains available for owners and for client recovery. By default the owner is the existing demo admin (`DEMO_ADMIN_EMAIL`, falling back to `CONTACT_TO_EMAIL`); an optional `PORTAL_ADMIN_EMAIL` overrides it. Portal and demo sessions remain separate. No production configuration, payment, or deployment is performed by this change.

## Workflow

1. Owner creates a draft with the client’s legal name and email, scope, exclusions, acceptance criteria, billing schedule, and amounts including the specified tax treatment. One-time work has an amount and due date. Monthly, quarterly, and yearly plans have a recurring amount, start date, optional inclusive end date, and an optional separate initial amount and payment date. The initial date must be today or later and on or before the recurring start. A blank end date means until canceled.
2. Review the generated Kansas service agreement. Issue it to make it visible to that email and create the first recurring invoice and, when specified, a separate initial invoice (or a single invoice for one-time work). Issuing automatically emails the client the invoice amounts, due dates, recurring schedule, and a link to review and sign the agreement. Each invoice and the unsigned agreement are attached as text files. Email does not sign the agreement or authorize payment. The sender is `CONTACT_FROM_EMAIL`; replies go to the issuing owner.
3. Client opens the private link from their invoice email (or uses an email code if the link has expired) and signs with their full name and explicit electronic-signature consent. The stored receipt includes the exact agreement text, SHA-256 fingerprint, verified email, name, timestamp, and consent. Issued agreements cannot be edited or signatures overwritten. Create a replacement agreement and cancel the old engagement for a scope/price change.
4. One-time invoices support Stripe or cash/check/Zelle. An offline payment report remains open until the owner explicitly confirms receipt of the full amount. Check payments should only be confirmed after funds clear.
5. Recurring engagements require automatic Stripe payments. Signing is separate from authorizing those charges. The client saves a card in Stripe-hosted Setup Checkout, returns to the portal, reviews the exact service amount and eligible surcharge, and authorizes the displayed total and calendar schedule.
6. The earliest unpaid invoice is charged on authorization if its due date has arrived; otherwise it is scheduled. Initial and recurring charges have separate totals and surcharge calculations, both disclosed in the authorization. The initial payment must settle before recurring charges. When both dates match, both invoices are due that day; the billing job processes them in order and stops if the initial payment needs attention. The daily billing job creates subsequent invoices, preserves the original calendar day across short months, allows charges on the end date but stops creating recurring invoices and attempting automatic recurring payments after it, and charges only previously authorized amounts. It pauses new invoice generation while a previous invoice remains unpaid. Outstanding balances remain manually payable after the recurring end date. These are portal-managed billing schedules using Stripe PaymentIntents, **not Stripe Billing subscriptions**.
7. Clients can cancel future service from the portal. This stops future automatic attempts and invoice generation, preserves historical records and existing balances, and does not reverse an in-flight charge. Owners can mark completed engagements only after signature and all invoices are paid or voided.
8. Download agreements and invoices/receipts as text; the agreement also has a print layout. Refunds are initiated in Stripe Dashboard, then reconciled into portal history by webhook or Refresh status. Partial payment allocation, credit notes, automatic tax calculation, automatic dunning emails, accounting exports, and a Stripe Billing subscription dashboard are not implemented.

Existing records retain their original amounts, dates, invoice IDs, and stored signed agreements. New records optionally store `initialPayment`; `amount` and `firstDue` continue to represent the recurring terms. Initial invoice IDs include an `initial` segment so same-day payments cannot collide. New two-part schedules require authorization bound to the agreement hash. There is no backfill or automatic alteration of signed terms.

## Invoice email delivery

The issue action commits the agreement, invoices, and an immutable email request together before sending through Resend. Duplicate issue requests reuse the stored message and provider idempotency key. The owner sees email status, and a failed or interrupted request can be retried without reissuing invoices. Missing mail configuration leaves a new agreement in draft. Email accepted for sending is not a delivery confirmation; check the provider dashboard for bounces or inbox delivery. Sends with an uncertain outcome older than 23 hours require provider-history review rather than risking a duplicate outside the provider's retention window.

Older issued, unsigned agreements with untouched open invoices expose **Email agreement & invoices** to send the initial email once. Recurring invoices generated later by the billing job are not emailed by this issue action. New links establish a scoped client session and never bypass the signature gate. Existing emails without a private token still use email-code sign in. Localhost emails are labeled as local tests because their links only open on the development computer. Issue real client emails from the deployed portal once its configuration and records are ready.

## Configuration

Use server-side environment variables. Never prefix secrets with `VITE_`.

| Variable | Purpose |
| --- | --- |
| `PORTAL_ADMIN_EMAIL` | Optional owner override. Otherwise reuses `DEMO_ADMIN_EMAIL` / `CONTACT_TO_EMAIL`. Grants access to all client records. |
| `DEMO_AUDIT_REDIS_URL`, `DEMO_AUDIT_REDIS_TOKEN` | Existing durable Redis REST store; use a dedicated persistent, backed-up database with no eviction. Falls back to the repository’s configured limiter Redis only if the dedicated pair is absent. Never use a disposable/evicting limiter database for contracts. |
| `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` | Existing verified sending setup for requested sign in codes. |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | Matching Stripe test keys first, then matching live keys after validation. |
| `STRIPE_WEBHOOK_SECRET` | Endpoint signing secret for `/api/client-portal?action=webhook`. |
| `CRON_SECRET` | Random high-entropy secret used by Vercel to authorize the scheduled job. |
| `PORTAL_CASH_INSTRUCTIONS` | Verified arrangements for delivering cash. |
| `PORTAL_CHECK_INSTRUCTIONS` | Verified payee and delivery instructions. |
| `PORTAL_ZELLE_INSTRUCTIONS` | Verified business recipient and transfer instructions. |
| `PORTAL_SURCHARGE_APPROVED` | Defaults off. Set to `true` only after applicable processor, network, and legal requirements are satisfied. |
| `PORTAL_CARD_COST_BPS` | Confirmed applicable acceptance-cost cap in basis points (300 = 3%). Missing/invalid values waive the fee. Use the lowest applicable cost across accepted credit brands if costs differ. |
| `PORTAL_SURCHARGE_CAP_BPS` | Additional legal/network cap, at most 300; defaults 300. |
| `PORTAL_SURCHARGE_STATES` | Comma-separated, reviewed US billing jurisdictions; defaults KS. Unlisted states, missing addresses, non-US cards/addresses, and unknown funding waive the fee. Billing state is a conservative technical gate, not a determination of governing law. |

The public `/api/client-portal` route rewrites to the existing `demo-admin` function with `portal=client`. This keeps the deployment within its 12-function limit, including middleware. Authorization remains separate from demo administration.

The origin allowlist uses existing `nodeDemoOrigin`: wallaceshift.com, www.wallaceshift.com, the existing subdomains, or `DEMO_ACCESS_ORIGIN`. Set the latter if testing on an additional HTTPS preview domain. Localhost is allowed in local development.

Local Vite needs the sign in email and durable storage configuration in its own server environment or ignored `.env.local`. A working deployed demo login does not configure localhost. `.demo-preview.local` only supports synthetic demo preview sessions and does not provide email or storage services. Preserve unrelated local environment settings when adding credentials.

`vercel.json` includes a daily job at **14:00 UTC** (9 a.m. CDT / 8 a.m. CST): `/api/client-portal?action=cron`. Invoice dates use UTC calendar dates, not elapsed 30-day intervals. Enable the job and `CRON_SECRET` on the production project; verify a production execution in Vercel. A processing or declined payment is not silently retried. Clients can resume bank authentication or reset a failed attempt, replace the card, and authorize again. The owner’s **Run due billing** action is available for recovery; it can make real, previously authorized charges.

The job is bounded by the serverless runtime and stores a round-robin cursor. If volume exceeds a run’s time budget, continue via another authorized run or increase scheduler frequency on an appropriate hosting plan. For higher volume, migrate the ledger to a relational database with per-record transactions and a durable job queue. The current ledger uses whole-document Redis compare-and-set and is intended for a small client roster.

## Guided client access

New issue emails carry a random 256-bit access token in the URL fragment. The portal removes it from the address bar and exchanges it through a same-origin POST for an eight-hour HttpOnly session. The link expires after seven days and is consumed atomically once. Its session is restricted to that agreement and always has the client role, including when a test invoice uses the owner email. Used or expired links fall back to email-code sign in. An existing session from the same link may reopen it without minting another session. The token hash and expiry are stored with the immutable issue email; neither tokens nor hashes are returned in admin or client API views. The server-only retry email payload necessarily retains the original link. Previously sent emails are unchanged.

Clients land on the agreement, then signing automatically opens hosted Stripe card setup. One-time clients may instead select cash, check, or Zelle before signing. Returning from Stripe automatically confirms the saved card and fetches the exact quote. The client must explicitly accept the displayed amounts, dates, and payment terms before any payment or automatic schedule is authorized. Replaying a completed Stripe return does not erase existing payment authorization. Other invoices remain accessible below the current payment. Stripe failures leave the signature saved and show a retry action.

## Stripe setup and verification

For localhost, save matching sandbox keys in ignored `.env.local`, then run `npm run portal:stripe`. This command requires the Stripe CLI, rejects live keys, verifies sandbox API access, and forwards the portal's payment/refund/dispute events to port 5182. It saves the listener's signing secret as `STRIPE_WEBHOOK_SECRET` without printing credentials. Start or restart `npm run dev -- --host 127.0.0.1 --port 5182` after the listener reports ready, and keep both processes running during tests. This is a local connection, not a deployed webhook endpoint. The public Dashboard endpoint and its signing secret are configured separately.

Local sign in also needs `PORTAL_ADMIN_EMAIL` (or the existing owner fallback), `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, and durable Redis REST credentials. Use a separate persistent sandbox database so test records and Stripe customer IDs never mix with live records. Do not copy a production database connection into localhost for sandbox payment tests.

Register a webhook using the pinned `2025-06-30.basil` API shape. Subscribe to `payment_intent.succeeded`, `payment_intent.processing`, `payment_intent.payment_failed`, `payment_intent.canceled`, `payment_intent.requires_action`, `charge.refunded`, and relevant `charge.dispute.*` events. Normal portal actions accept Vercel's parsed JSON bodies. Stripe signature verification uses the original bytes, including the raw stream restored by Vercel's Node helpers; it never serializes a parsed object to reconstruct a signature payload. Configure customer payment receipts in Stripe.

Before accepting real clients, run a test-mode end-to-end transaction for each path: successful credit card, debit card with no fee, declined card, 3DS challenge, canceled setup, duplicate request, delayed webhook, recurring first/future charge, cancellation during processing, and a refund. Confirm the actual Stripe objects, portal balances, receipt email, and stored consent. Verify that the deployed cron is running. The repository tests mock Stripe/Redis/email and cannot establish live account compatibility or merchant approval.

No real card numbers touch the portal. Checkout saves a payment method, then a server-created PaymentIntent charges the authorized amount. The client cannot set an invoice price. A stored attempt ID provides Stripe idempotency; an uncertain attempt older than 23 hours is blocked for reconciliation instead of risking another charge after Stripe prunes idempotency keys. Review those cases against Stripe metadata (`engagement`, `invoice`, `attempt`) before making any manual correction. Do not simply delete an attempt.

## Agreement and surcharge review

The generated agreement is a starter draft for Wallace Shift LLC under Kansas law. Have Kansas counsel review it for the actual services and customer types before issuing it, especially ownership/license terms, cancellation, tax treatment, warranties, liability, and any consumer-specific disclosures. It deliberately avoids invented penalties, universal nonrefundable deposits, or an unreviewed liability cap.

- Kansas requires clear, conspicuous surcharge notice before the transaction: [K.S.A. 16a-2-403](https://www.kslegislature.gov/b2025_26/laws/016a_000_0000_chapter/016a_002_0000_article/016a_002_0403_section/016a_002_0403_k/).
- Visa prohibits debit/prepaid surcharges and limits credit surcharges to the lower of acceptance cost or 3%, with additional processor/network prerequisites: [Visa merchant Q&A](https://usa.visa.com/content/dam/VCOM/global/support-legal/documents/merchant-surcharging-qa-for-web.pdf).
- An electronic signature is not unenforceable solely because it is electronic, but that is not a guarantee that every contract or signing process is enforceable: [FTC ESIGN discussion](https://www.ftc.gov/legal-library/browse/advisory-opinions/advisory-opinion-zalenski-05-24-01).
- Payment authorization and bank authentication are separate from signing: [Stripe SetupIntents](https://docs.stripe.com/payments/setup-intents), [Stripe next actions](https://docs.stripe.com/js/payment_intents/handle_next_action), [Stripe webhook handling](https://docs.stripe.com/events/manage-webhook-endpoints).

## Checks

`npm run test:portal` covers server authorization, immutable signatures, manual receipt confirmation, recurring calendar behavior, fee eligibility, concurrency, idempotent retries, declined payments, webhook signatures, and passwordless session revocation. `npm run build` checks deployment compilation and both site bundles. The browser check uses explicitly labeled, mocked sample records; it sends no emails or payments.

`node scripts/test-client-portal-invitation-browser.mjs` verifies the guided private-link, signature, mocked Stripe redirect/return, explicit authorization, completion, expired-link recovery, checkout-error recovery, and offline choice paths on desktop and mobile. The Stripe setup parameters were also verified against the sandbox API: the previous unsupported `setup_intent_data[usage]` request returned HTTP 400; the corrected USD setup request returned HTTP 200 and the unused checkout was expired. No charge was made by that check.
