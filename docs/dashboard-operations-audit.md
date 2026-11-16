# Dashboard operations audit

Inspected local source on November 16, 2026. These findings describe the current implementation and its local UI changes. They do not verify deployed configuration, provider permission or actual delivery.

## Capability boundaries

| Area | Implemented source evidence | Dashboard treatment | Limits and next dependency |
| --- | --- | --- | --- |
| Email composition | `src/mail/MailApp.tsx`, `api/_lib/mail-handler.ts`, `docs/mail.md`: separate staff session; rich text; approved Matthew and Bella identities; To, Cc, Bcc; attachments; local drafts; saved signatures; private recent outgoing history | Email opens the existing `/mail` workspace in a new tab. Its separate sign in is explicit. No new sending path. | Provider acceptance is not delivery. Existing mailbox content is not imported. Live delivery remains unverified in this task. |
| Email reporting | `api/_lib/business-dashboard-handler.ts` `loadMail`: counts only from up to 50 retained outgoing records for the signed in mail user; filtered by reporting dates | Accepted for sending and sends needing review appear with count bars, scope notes and last retrieval time. Missing session or provider error is not represented as zero. | No delivery, open, reply or inbox metrics. Inbound email requires a separately scoped mailbox/provider integration, authorization, synchronization and thread model. It is not created by linking this workspace. |
| Client records | `ClientPortal.tsx` owns the authorized session's `engagements`; `model.ts` defines client, billing email, agreement state, terms, signature and invoices | Clients receives those existing records from the parent. It groups by normalized billing email, searches contact and project fields, marks draft/issued/complete/canceled records, optionally includes archived records, and opens the corresponding existing agreement through a parent callback. | This is an agreement contact directory, not a prospect CRM. Same email is a billing contact grouping, not a claim of one legal business. Inquiries without agreements are excluded. The directory is current session data, not date filtered analytics. |
| Social publishing | `LinkedInPublisher.tsx`, `linkedin-publishing-handler.ts`, `linkedin-publishing-provider.ts`: owner only; fixed Wallace Shift LinkedIn Page `143962288`; text with optional image or video; review, explicit confirmation, history and uncertain result safeguards | Social Media Posting lists the supported Page, reads its existing connection endpoint, and opens the unchanged publisher. Composer remains mounted after first opening. Wrapper and parent guard navigation while an operation is busy. | Page role confirmation does not prove permission to publish. Only explicit publication tests that provider permission. No real post was made. Existing LinkedIn posts are not imported; history contains attempts from this workspace. |
| Add publishing account | The publishing endpoint has one fixed author. No account discovery, selection, OAuth onboarding or per account credential storage exists. | Add account opens an honest explanation of the current limit. It does not simulate a successful connection or create an account. | Additional LinkedIn Pages and Facebook/Instagram publishing need separately implemented provider permissions, account selection, credential isolation and actions. Analytics and advertising authorization do not imply publishing authorization. |

## Interaction and data safety

- The operations view adds only a read request to `/api/business-publishing`. Client and email data arrive through existing authorized parent data. No credentials or account identifiers are invented in UI fixtures.
- The account overview check runs at its first mount, on request and when returning from the composer. It aborts when superseded or unmounted and times out after 20 seconds. Failure keeps the connection unconfirmed and provides a retry; an older successful timestamp is not described as a fresh check.
- The existing publisher remains responsible for all upload, review and publish actions, their error handling and duplicate prevention. Merely opening its workspace performs reads.
- Client links use callbacks into the portal rather than navigating away. Archived records must be selected with the portal's archived view enabled by that parent callback.
- The mail composer opens a separate existing workspace. New mail, provider account connection and publishing actions were not exercised against real accounts.

## Local verification

- Targeted strict TypeScript compilation of `OperationsViews.tsx`, including its imports and Vite CSS declarations: passed.
- `npm run test:mail`: 18 mocked API tests passed. Coverage includes authorization separation, exact domain verification, sanitization, sender and recipient validation, safe retries and storage failure.
- `npm run test:linkedin-publishing`: 13 mocked API tests passed. Coverage includes owner and origin checks, fixed Page identity, explicit publication confirmation, concurrent duplicate prevention, uncertain outcomes, media validation and draft isolation.
- These suites intercept network calls. No live message or post was sent. Existing publisher and mail source files were unchanged.
- Desktop/mobile rendering and navigation are checked in the parent task's isolated dashboard fixture. This audit does not substitute mocked provider checks for live account verification.

## Acceptance criteria

1. Email shows no incoming mailbox, delivery or open count. An unavailable session shows a sign in action, not zero sends. Composer access remains obvious.
2. Client searches return actual matching agreement contacts, drafts remain identifiable, and each agreement opens its own existing record. Archived records are opt in.
3. Posting overview has one supported Page. Add account explains the current limitation. Its action does not make a provider write or display a fake connection.
4. Typed post text survives visiting the account overview and other dashboard pages after the publisher is mounted. Back and outer navigation cannot interrupt active upload or publication.
5. Empty, unavailable and failed states remain readable at mobile width. All actionable controls have visible labels and keyboard focus.

Proposed commit message: `Refine dashboard email, client records and publishing navigation`
