# Demo requests and private access

The public roofing collection stays open. All five interactive websites and
the roofing dashboard require an approved access link. Submitting the request
form **does not unlock a demo**.

## Owner workflow

1. A visitor follows a demo link and arrives at `/request-demo/`, with the
   requested demo selected.
2. The form emails the existing `CONTACT_TO_EMAIL` inbox with their name,
   business, email, optional website/message, requested demo, and an access link.
3. Review the request. If approved, reply to the prospect and share that link.
   The application does not automatically send the prospect an invitation.
4. The link grants access to the collection on that host for up to 72 hours
   from the time the request was made. It expires even if opened later.

For an approved request received directly by email, or to preview your own
demos without sending email, generate a link locally using the same server
secret as the target environment:

```sh
npm run demo:invite -- --demo roofers-4 --origin https://roofers.wallaceshift.com
```

For local development, use `--origin http://127.0.0.1:5174` (or the actual
listening origin). The command reads the server-only secret from `.env.local`
or the process environment and prints a new 72-hour link. It sends no email.
Keep the resulting link private. The CLI and server must use the same secret.

Links are bearer credentials: anyone they are forwarded to can use them until
expiry. There are no user accounts or individual revocation records. Rotating
`DEMO_ACCESS_SECRET` invalidates all outstanding links and browser sessions.
Approved visitors can still save the frontend files delivered to their browser.

## Server settings

Set these in the deployment's environment settings before releasing the gate:

| Variable | Purpose |
| --- | --- |
| `DEMO_ACCESS_SECRET` | A random server-only secret, at least 32 characters. Generate with `openssl rand -hex 32`. Never use a `VITE_` prefix. |
| `DEMO_ACCESS_ORIGIN` | Canonical origin used in invitations. Defaults to `https://roofers.wallaceshift.com`. Use an exact HTTPS origin; for local testing, use the exact localhost origin. |
| `RESEND_API_KEY` | Existing contact-form email provider credential. |
| `CONTACT_FROM_EMAIL` | A verified sender on the sending domain. |
| `CONTACT_TO_EMAIL` | Inbox receiving demo requests and private links. Set this to the intended sales inbox. |

The existing Redis limiter environment pairs are reused when configured; see
`api/_lib/limiter-store.ts`. Without Redis, the request limiter is per function
instance and does not provide a deployment-wide cap.

Missing access configuration keeps demos locked. Missing email configuration
reports that the form is unavailable and provides Bella's email address; it
does not claim the request was delivered. A successful provider response means
the provider accepted the email, not that mailbox delivery was confirmed.

## Protection boundary

`middleware.ts` checks requests before Vercel serves static files. It covers
the original `/demos/` routes, branded aliases and deep pages, private media,
`/demo-assets/` bundles, and roof-tool APIs. The public offer and its assets,
plus the three catalog preview images, remain public. Private responses use
`Cache-Control: private, no-store`.

The release build uses two Vite passes. Public pages compile to `/assets/`;
the demos and their complete dependency graph compile to `/demo-assets/`.
Shared libraries are duplicated across the two builds intentionally. The public
build rejects imports of private demo modules. `scripts/verify-demo-build.mjs`
checks the emitted documents, bundle paths, and absence of source archives/maps.

`npm run build` runs the complete pipeline; do not deploy a bare `vite build`
or host `dist` on an unprotected static server. The Vercel middleware is required
for protection. The Vite dev and preview commands mirror the gate for local
review; a development server is not a production security boundary.

The new gate cannot revoke copies already downloaded or protect older Vercel
deployments automatically. Before relying on the production gate, restrict or
remove older publicly accessible deployments and verify the release's direct
document, asset, API, and alternate-domain URLs without cookies.

## Verification

- `npm run build`: compile both output trees and check the build boundary.
- `node --test scripts/test-demo-access.mjs`: exercise access and request logic
  with mocked outbound services, without sending email.
- `node --test scripts/test-demo-preview.mjs`: exercise the built output through
  a real local preview server and a mocked mail provider, including approving
  a request and then loading its private bundles with the issued cookie.
- Review `/request-demo/?demo=roofers-4` at desktop and narrow widths.
- With no access cookie, confirm `/halcyon` redirects and a direct private
  JavaScript/media/API request is denied.
- Confirm an approved, unexpired invite sets an HttpOnly session, returns to
  the selected demo, and allows its dependent files. Tampered and expired links
  must remain locked.

Production middleware execution and real email delivery require a deployed
check. Local tests alone do not establish either.
