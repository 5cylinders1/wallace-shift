# Wallace Shift Mail

The `/mail` area is a sending client for verified `@wallaceshift.com` staff. It supports Matthew and Bella as sending identities, rich text messages, To/Cc/Bcc recipients, file attachments, saved HTML signatures, and a recent sending history. It does not retrieve the existing mailboxes or synchronize their Sent folders. Replies go to the selected sender's existing mailbox.

## Configuration

Use the existing server environment variables:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Server-only Resend sending key authorized for the `wallaceshift.com` domain. |
| `CONTACT_FROM_EMAIL` | Existing verified sending identity used for sign-in codes. |
| `MAIL_LOGIN_FROM_EMAIL` | Optional override for sign-in code delivery only. |
| `DEMO_AUDIT_REDIS_URL` / `DEMO_AUDIT_REDIS_TOKEN` | Existing durable Upstash-compatible Redis REST store. Existing rate-limit/KV Redis configuration is also supported by `demoAgreementStore()`. |

The `wallaceshift.com` domain must be verified with sending enabled in the Resend account used by the application's API key. Verification of a different domain is insufficient. The code does not create mailboxes, change DNS, or transfer a domain between provider accounts. Keep normal inbound email routing in place for Matthew and Bella.

Mail records have their own `wallace-mail:production`, `wallace-mail:preview`, or `wallace-mail:development` Redis namespace. They do not depend on Stripe keys or billing portal access. A durable store with persistence, backups, and no eviction is required; missing or unavailable storage fails closed.

## Access and storage

- Sign-in codes prove possession of the exact `@wallaceshift.com` address. Subdomains and lookalike domains are rejected. Any verified address in that domain can send as either approved identity, as requested.
- Codes expire in 10 minutes, accept at most five guesses, and are single use. Resends have a 60-second cooldown. Actual code reservations are limited to five per address/hour, 15 per IP/hour, and 100 per environment/day; rejected cooldown clicks do not consume those budgets. A separate 60-request/IP/minute limit bounds rapid retry abuse.
- Sessions expire after eight hours, use HttpOnly/SameSite cookies, are bound to the website origin, and are revoked on logout. Secure cookies are used on HTTPS.
- Every mutation requires a same-origin JSON POST. Sender restrictions and recipient/file/content validation run on the server.
- Signatures are saved separately for each signed-in user and each sending address. HTML is sanitized on the server; normal formatting, links, HTTPS images, and signature tables are retained. Scripts, event handlers, unsafe URLs, and active CSS are removed.
- The recent history is private to the signed-in user, shows up to 50 messages, and is bounded to 2 MB per response. Message records are durable in Redis; archive/retention maintenance is an operational responsibility.
- File contents are kept only with pending/failed sends, for up to 24 hours, to support safe retries. They are removed after confirmed provider acceptance. Sent history keeps attachment names, sizes, and content types, not downloadable copies.

## Limits and sending behavior

- Maximum 50 total To/Cc/Bcc recipients, 10 files, and 3 MiB of combined attachment data. This conservative file limit leaves room for Base64 encoding below the hosting platform's request ceiling.
- Subject: 200 characters. Message HTML: 100,000 UTF-8 bytes, including any inserted signature. Saved signature: 30,000 UTF-8 bytes.
- Executable/script attachments are rejected. The email provider may reject additional file types.
- A unique message ID freezes the complete provider payload before sending. Concurrent requests and retries share that payload and the same idempotency key. Editing a previously reserved message ID is rejected.
- `sent` means Resend accepted the message; it is not a delivery or read receipt. A failed request may have reached the provider, so retries reuse the original ID.
- An uncertain send more than 23 hours old is marked `review` and cannot be automatically resent. Resend's idempotency window is 24 hours; this buffer avoids duplicate mail when the outcome is unknown. Check the provider's log before creating another message.
- Sending limits are 60 new messages per user/hour, 250 per user/day, and 500 per environment/day. Provider retries are additionally limited to 20 attempts/user/minute.

## Validation

Run `node scripts/test-mail.mjs` for mocked API tests covering exact-domain verification, OTP expiry/replay/guess limits, cookie and environment isolation, CSRF, signature isolation and sanitization, both sending identities, recipients, attachments, safe retries, concurrent sends, and storage failures. The tests intercept all network calls and send no real email.

Run `npm run test:mail-browser` for isolated desktop/mobile browser checks of sign-in, formatting, signature saving, attachments, draft recovery, same-message retries, and unresolved sends. The suite mocks every mail request and blocks external requests. It uses the repository's existing Playwright runtime and Chrome; screenshots are written to `/tmp/wallace-mail-review`. Set `MAIL_TEST_URL` to reuse an already-running local preview.

Then run the repository's normal TypeScript/deployment build checks. A live sign-in and an explicitly authorized test delivery are still needed to verify the configured provider account, DNS, and destination mailbox end to end.

Provider references: [Resend attachment API](https://resend.com/docs/api-reference/emails/send-email), [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
