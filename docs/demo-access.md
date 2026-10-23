# Demo requests, approval, and confidentiality

The roofing collection is public. Visitors to all six interactive websites and
the roofing dashboard require approval, email verification, and agreement acceptance.
Submitting a request or opening an invitation never unlocks the demos by itself.

## Admin access

Open `/demo-admin/` on the same site as the demos, or follow **Admin sign in**
from the request page or collection footer. Select **Email me a sign-in code**, then enter
the six-digit code sent to the configured owner inbox. There is no separate
password, invitation, or visitor agreement for the owner. The admin page links
to all six demos and the roofing dashboard.

The only permitted admin mailbox is `DEMO_ADMIN_EMAIL`, or `CONTACT_TO_EMAIL`
when `DEMO_ADMIN_EMAIL` is unset. Set `DEMO_ADMIN_EMAIL` to your personal owner
address if the contact inbox is shared. An explicitly empty or invalid override
disables admin sign-in; it does not fall back. The browser cannot choose or change
the recipient. Keep this setting server-only, without a `VITE_` prefix.

This reuses the existing `DEMO_ACCESS_SECRET`, Resend sender, and Redis REST
configuration listed below. No additional auth service is needed. Those settings
must be present in the running environment; `.env.local` is only for local work.

A code expires within ten minutes, can be used once, and permits five attempts.
Sending is limited to once per minute and three times per mailbox per hour,
including across browsers and cleared cookies. Admin counters are separate from
visitor verification. Missing configuration, email rejection, and storage failures
do not grant access. Codes and mailbox addresses are never returned to the browser.

The signed, host-only, HttpOnly cookie lasts 30 days and uses `Secure` on HTTPS
and `SameSite=Lax`. It opens all protected demos, assets, and demo APIs on that
origin. A different hostname or browser needs its own sign-in. Returning to
`/demo-admin/` lets you sign out, which clears both admin and visitor cookies in
that browser. Logout does not revoke a copied cookie on another device: rotate
`DEMO_ACCESS_SECRET` to invalidate all sessions immediately. Changing the configured
admin mailbox invalidates existing admin sessions without affecting visitor grants.
Signing in as the owner creates no visitor agreement acceptance record.

## Owner workflow

1. A visitor follows a demo link to `/request-demo/` and submits their name,
   business, email, optional website/message, and requested demo.
2. The form emails `DEMO_REQUEST_TO_EMAIL` with those details and a private invitation. If that dedicated setting is absent, it falls back to `CONTACT_TO_EMAIL` for compatibility.
3. Review the request. If approved, manually send that invitation to the approved
   email address. The application does not automatically invite the prospect.
4. The recipient opens `/demo-agreement/`, verifies the approved email with a
   six-digit code, reads the agreement, enters their full name and business, and
   affirmatively confirms both agreement and authority to represent the business.
5. The server saves the exact agreement and acceptance record before issuing a
   host-only, HttpOnly access cookie. Access ends 72 hours after invitation creation,
   even if the invitation is opened later. Acceptance does not extend that window.

For a request received directly or an expired approval, generate
an invitation with the same server secret as the target environment:

```sh
npm run demo:invite -- --demo roofers-4 --email prospect@example.com --origin https://roofers.wallaceshift.com
```

Use the actual approved recipient's email. The CLI sends no email; it reads the
server secret from `.env.local` or the process environment and prints the link.
For local development, use the actual listening origin, such as
`--origin http://127.0.0.1:5174`. The CLI and target server need matching secrets.

Invitations contain a keyed hash of the recipient's normalized email, not their
name or plaintext email. A forwarded invitation cannot unlock access without
verification of that approved mailbox and acceptance. Each viewer needs their
own invitation. Shared mailboxes or deliberately shared codes/sessions can still
be shared; this is not identity-document verification. Approved viewers can still
save the frontend files their browser receives.

There are no accounts or individual revocation controls. Rotating
`DEMO_ACCESS_SECRET` invalidates every outstanding invitation and session.
Old v1 invitations and sessions are rejected by this release; issue new links.

## Server settings

Set these server-only values before production use:

| Variable | Purpose |
| --- | --- |
| `DEMO_ACCESS_SECRET` | Random secret of at least 32 characters, for example generated with `openssl rand -hex 32`. Never use a `VITE_` prefix. |
| `DEMO_ACCESS_ORIGIN` | Exact HTTPS origin for emailed invitations. Defaults to `https://roofers.wallaceshift.com`; use the exact localhost origin only in development. |
| `DEMO_ADMIN_EMAIL` | Optional owner-only sign-in mailbox. Defaults to `CONTACT_TO_EMAIL` when unset. Use a private owner inbox if the contact inbox is shared. |
| `RESEND_API_KEY` | Email provider credential. |
| `CONTACT_FROM_EMAIL` | Verified sender address for requests and verification codes. |
| `CONTACT_TO_EMAIL` | Owner inbox receiving requests and invitations for manual approval. |
| `DEMO_REQUEST_TO_EMAIL` | Inbox receiving demo access requests for manual approval. Set this to `matthew@wallaceshift.com`; defaults to `CONTACT_TO_EMAIL` when unset. |
| `DEMO_AUDIT_REDIS_URL` | HTTPS origin of a Redis REST service supporting `/pipeline` and `EVAL`. |
| `DEMO_AUDIT_REDIS_TOKEN` | Corresponding server-only read/write token. |

Generate `DEMO_ACCESS_SECRET` in your terminal with `openssl rand -hex 32` and
copy the resulting 64-character value into that environment variable. Generate
it once for the target environment; the local invitation CLI must use the same
value when creating links for that environment.

`REDIS_URL` is not read by this flow. A native `redis://` or `rediss://` connection
string cannot replace the HTTPS REST URL and token. If your existing database is
on Upstash, open that database in its console, then **Connect → REST**. Copy
`UPSTASH_REDIS_REST_URL` to `DEMO_AUDIT_REDIS_URL` and the writable
`UPSTASH_REDIS_REST_TOKEN` to `DEMO_AUDIT_REDIS_TOKEN`; do not use the read-only
token. See [Upstash's REST credential documentation](https://upstash.com/docs/redis/features/restapi).
The token comes from the database provider, not from generating a random secret.
For another provider, check for a compatible REST API; native Redis-only services
require a backend adapter change before their `REDIS_URL` can be used here.

The audit store can instead use a complete existing `RATE_LIMIT_REDIS_URL/TOKEN`,
`KV_REST_API_URL/TOKEN`, or `UPSTASH_REDIS_REST_URL/TOKEN` pair. A partially set
`DEMO_AUDIT_` pair fails closed; it does not silently fall back. The Redis service
must support Lua, `SET NX`, `SET KEEPTTL`, and `EXPIRE NX`.

**Use persistent storage with no eviction of agreement records and backups.**
The code writes acceptance records without a TTL and does not overwrite them;
this alone does not establish provider durability or an independently immutable
archive. Restrict operator access and include these records in your retention and
backup process. No provider or paid service is provisioned by this change.

Verification and acceptance fail closed when storage is missing or unavailable.
There is no in-memory acceptance fallback. Request-form rate limiting separately
reuses the existing limiter settings; without those, that form's limiter is per
function instance. OTP limits use the required shared audit store.

A code lasts ten minutes (or until the invite expires), has five verification
attempts, and can be used once. Sending has a 60-second cooldown, a maximum of
three sends per approved mailbox per hour, and a global 200-per-day cap. Resending
replaces the previous code for that invitation. Successful email API responses
mean provider acceptance, not confirmed mailbox delivery. No email-provider calls
are retried automatically by this flow.

## Agreement and acceptance records

`src/content/demoAgreement.ts` is the shared source for the public text and the
server's canonical agreement text. It identifies **Wallace Shift LLC**. The
initial version uses a two-year confidentiality period after disclosure, with
trade-secret protection continuing while the information legally qualifies. It
preserves public-information, independent-work, and third-party-license rights.
Have counsel review the wording for your business and jurisdiction before relying
on it. This implementation does not establish enforceability.

Every text change requires a new version. The server computes SHA-256 over the
canonical text and requires the frontend to send the matching version and hash.
An update invalidates existing sessions and stale acceptance forms; previously
saved acceptance records retain their original text and timestamp.

Records are stored under `demo-agreement:acceptance:<id>`, where `id` is SHA-256 of
`<invitation nonce>:<agreement hash>`. Each JSON record contains:

- Record ID and invitation ID.
- Full name, business name, and verified approved email.
- Server acceptance timestamp.
- Agreement version, SHA-256 hash, and exact full text including the confirmations.
- Explicit `accepted: true` and `authority: true`.

Retrieve/export these records using the storage provider's protected console or
administrative API; no public record-listing endpoint exists. An identical retry
returns the original record. A retry with a different identity cannot overwrite
it. There is no automatic record-deletion job; apply a counsel-reviewed retention
policy. The public privacy page explains the records and essential cookies.

The agreement can be read without an invitation and printed/saved from
`/demo-agreement/`. Verification and consent are separate steps; the initial
request does not count as acceptance. Cookies and audit records are never exposed
in public bundles. The agreement does not recover already-downloaded files or
make previously public information confidential.

## Protection boundary

`middleware.ts` checks requests before Vercel serves static files. It covers the
original `/demos/` routes, branded aliases and deep pages, private media,
`/demo-assets/` bundles, and roof-tool APIs. The public offer and its assets, plus
three catalog preview images, remain public. Private responses use
`Cache-Control: private, no-store`.

The build uses separate Vite passes: public pages under `/assets/`, private demos
and their complete dependency graph under `/demo-assets/`. The public build rejects
private demo imports; `scripts/verify-demo-build.mjs` checks emitted documents,
bundle paths, and the absence of source archives/maps.

Run the complete `npm run build` pipeline. Do not deploy a bare `vite build` or
serve `dist` through an unprotected static server. Vercel middleware is required
in production. Vite dev and preview mirror the gate for local review; development
servers are not production security boundaries.

Before relying on a release, restrict or remove older public deployments and
verify direct document, asset, API, and alternate-domain URLs without cookies.

## Verification

- `npm run build`: compile both output trees and check the public/private boundary.
- `node --test scripts/test-demo-access.mjs`: exercise request, invitation,
  verification, agreement persistence, and access logic with mocked providers.
- `node --test scripts/test-demo-admin.mjs`: exercise owner sign-in, expiration,
  replay and attempt limits, origin restrictions, and separation from visitor grants.
- `node --test scripts/test-demo-preview.mjs`: load the built output over real
  local HTTP, with mocked email and Redis, through visitor approval and admin sign-in.
- `node scripts/verify-demo-redis.mjs`: with a supported Redis REST URL/token pair
  already in the process environment, check live connectivity and the current
  application Lua using isolated synthetic keys. The probe attaches a two-minute
  fallback expiry, deletes its keys afterward, and verifies cleanup. It never
  loads `.env` files, prints credentials, sends email, or reads application records.
- Check the request and agreement screens at desktop and narrow widths.
- Confirm an invitation alone cannot load private HTML, JavaScript, media, or APIs.
- Confirm incorrect recipients/codes, unchecked consent, stale terms, expired
  invitations, and storage failures never issue access.

The mocked flow tests model Redis command behavior but do not execute Lua on a
real Redis service. The live Redis probe checks the configured REST connection
and command compatibility; it does not verify provider persistence, backups, or
deployed application credentials. Production middleware and real mailbox delivery
require deployed verification. No production deployment or real email delivery is
established by local checks.
