# Consultation booking and owner email

A qualified quiz submission emails the answers to `matthew@wallaceshift.com`. The visitor can immediately choose a time on the public 45 minute Google appointment schedule. Google collects the visitor’s email in its own form and sends the booking confirmation and Meet link after the appointment is booked. The quiz summary contains the answers and completion time. It cannot identify a Google event or provide a meeting link.

## Set up the quiz summary

Set `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` and a writable Redis endpoint and token for the deployment. The sender must be verified in Resend. The preferred Redis pair is `DEMO_AUDIT_REDIS_URL` and `DEMO_AUDIT_REDIS_TOKEN`. The fallback pairs are listed below. The recipient for qualified quiz summaries is fixed at `matthew@wallaceshift.com`. This send does not depend on Calendar OAuth or on a visitor entering a verification code. A failure to send the summary leaves booking available and offers a retry.

## Forward actual booking confirmations to the Wallace Shift inbox

1. On a computer, open Gmail as the calendar owner, `matthew.wallaceshift@gmail.com`. Under **Settings → See all settings → Forwarding and POP/IMAP** (or **Forwarding**), add `matthew@wallaceshift.com` as a forwarding address. Open Gmail’s verification message in that destination inbox and verify the address. For this filter, keep global forwarding disabled. [Gmail forwarding instructions](https://support.google.com/mail/answer/10957?hl=en)
2. In the owner’s Gmail, use an actual confirmation from the **Wallace Shift - Project Consultation** schedule. Open **Filter messages like these**. Use the sender and stable confirmation wording from that message, including the schedule name where it appears. Preview the search matches before creating the filter. Avoid matching general Calendar mail or a particular guest or appointment date. [Create a Gmail filter](https://support.google.com/mail/answer/6579?hl=en)
3. Select **Create filter → Forward it to → matthew@wallaceshift.com → Create filter**. Check the next new booking in the Wallace Shift inbox for the correct appointment and Google Meet details. Gmail applies forwarding filters to new matching messages. Google controls the original booking message and the organizer’s availability, conferencing and cancellation settings. [Google appointment schedule settings](https://support.google.com/calendar/answer/10729749?hl=en)

The filtered Google message and the quiz summary are separate emails. Neither one is matched to the other by the site.

## Walkthrough and purchases

Once the approved video is published, a qualified visitor can choose **Watch the walkthrough** below the calendar after booking, in the same tab. This action opens the video without marking the appointment confirmed. Set the video URL and English WebVTT captions in `src/content/aiConsultation.ts`. Both values currently remain `null`, so the public booking page shows no walkthrough button or package offers. A configured video must finish before the packages appear. Visitors can buy through the existing agreement and payment flow. Google’s confirmation email provides the link to cancel an appointment they no longer need.

The phone option remains a callback request. A visitor can provide a phone number without an email address, and Wallace Shift arranges a time separately.

## Optional legacy Calendar connection

The owner panel and previous versions of the booking client support read only Calendar OAuth, visitor email verification and verified appointment records. This setup is for those legacy clients and records. The current quiz summary, public calendar, walkthrough and Gmail forwarding work independently of this connection.

### Check what already exists

Start in the [Google Cloud Console](https://console.cloud.google.com/) using the account that manages Wallace Shift's Google services.

1. Open the project selector at the top. Check the existing Wallace Shift projects before creating another project.
2. In each likely project, open **APIs & Services → Enabled APIs & services** and look for **Google Calendar API**. If it is missing, you can enable it in that project during setup.
3. Open **Google Auth platform → Clients**. Look for an existing **Web application** client owned and managed by Wallace Shift. Open its details and check the client ID and registered redirect URIs. An API key, a service account, or a desktop application client is not a substitute for this server OAuth integration. [Google credential types and clients](https://developers.google.com/workspace/guides/create-credentials).
4. Check that the client's secret is available in your existing secure configuration and that its **Audience** permits the Google account that owns the consultation schedule. Do not paste the secret into chat.
5. If an existing client is suitable, reuse it and add this integration's callback without removing its other redirect URIs. Preserve scopes and settings needed by other applications in that project. If none is suitable, create a new web client in the chosen project using the next section.

The existing public Google booking link does not show whether a Cloud project or OAuth client has already been configured. The three items needed from Google are the selected project, a suitable web client ID, and its matching client secret. The encryption key is generated separately below.

### Configure Google Cloud

1. Select the existing suitable project, or create one if needed. Under **APIs & Services → Library**, enable **Google Calendar API** if it is not already enabled.
2. Open **Google Auth platform → Branding**. For a new setup, set the app name to **Wallace Shift**, choose the support email, and supply the developer contact email. Complete the app domain information using the real Wallace Shift website and privacy page. For an existing setup, verify these details rather than replacing unrelated application settings.
3. Under **Audience**, use **Internal** only if the project belongs to the Google Workspace organization and the calendar owner is in that organization. Otherwise use **External**. During testing, add the calendar owner's Google account under **Test users**.
4. Under **Data Access → Add or Remove Scopes**, include `https://www.googleapis.com/auth/calendar.events.readonly`. This is the only scope this integration requests; preserve any other scopes required by existing applications. Follow any verification requirements Google shows for the chosen audience and scope. [Google consent setup](https://developers.google.com/workspace/guides/configure-oauth-consent), [Calendar scopes](https://developers.google.com/workspace/calendar/api/auth).
5. Open the suitable existing client under **Google Auth platform → Clients**. If creating a new one, select **Create Client → Web application** and name it **Wallace Shift booking production**. Add this exact **Authorized redirect URI**:

   ```text
   https://wallaceshift.com/api/ai-booking?action=oauth-callback
   ```

   Use the actual origin from which the owner will connect. For example, `www.wallaceshift.com` needs its own exact registered callback if connecting there. The query string is part of the callback. This implementation exchanges the code on the server. [Google web client credentials](https://developers.google.com/workspace/guides/create-credentials), [Google server OAuth flow](https://developers.google.com/identity/protocols/oauth2/web-server).
6. Save the client ID and client secret in the server environment described below. For an External app, finish the applicable production publishing requirements before relying on it for ongoing bookings. External apps left in **Testing** receive refresh tokens that expire after seven days for this Calendar scope. Changing the publishing status does not replace an existing token; reconnect afterward. [Google refresh token expiration](https://developers.google.com/identity/protocols/oauth2#expiration).

### Legacy server environment

Add these values to the correct Vercel project's **Production** environment, then redeploy. Do not give these variables a `VITE_` prefix or put their values in client source, screenshots, or chat.

| Variable | Value and source |
| --- | --- |
| `GOOGLE_CALENDAR_CLIENT_ID` | Client ID from the Google web application client above. Required. |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Client secret for that same client. Required. |
| `GOOGLE_CALENDAR_TOKEN_KEY` | A persistent random 32 byte encryption key encoded as exactly 64 hexadecimal characters. Required. Generate once with `openssl rand -hex 32`, save securely, and use the same value across redeployments. |
| `GOOGLE_CALENDAR_ID` | Optional. Defaults to `primary` for the Google account authorized by the owner. For another calendar, use its ID from Google Calendar settings under **Integrate calendar**. It must be the calendar where this appointment schedule creates events. |
| `GOOGLE_CALENDAR_BOOKING_TITLE` | Optional. Defaults to `Wallace Shift - Project Consultation`, matching the supplied appointment schedule. Match the title actually created by that schedule. |
| `PORTAL_ADMIN_EMAIL` | Existing owner portal login email. Set this explicitly for clarity. Existing fallback is `DEMO_ADMIN_EMAIL`, then `CONTACT_TO_EMAIL`. |
| `RESEND_API_KEY` | Existing server API key from Resend, used for owner sign in and visitor email verification. |
| `CONTACT_FROM_EMAIL` | Existing verified sender address accepted by the Resend account. |
| `DEMO_AUDIT_REDIS_URL` and `DEMO_AUDIT_REDIS_TOKEN` | Existing durable Redis REST endpoint and write token. Use persistent storage with backups and no eviction. Both values are required when either is set. |

The existing Redis fallback pairs are `RATE_LIMIT_REDIS_URL` / `RATE_LIMIT_REDIS_TOKEN`, then `KV_REST_API_URL` / `KV_REST_API_TOKEN`, then `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. Calendar connection and booking records use the same durable store as the portal. No temporary in memory substitute is used.

Keep the encryption key stable. Replacing it makes the existing encrypted refresh token unreadable. Changing the client ID, selected calendar, or portal owner also requires reconnecting. Do not rotate any of these as part of an ordinary deployment.

For local development, use an ignored `.env.local` and a separate OAuth client and durable database. Register the exact local callback, for example `http://127.0.0.1:5174/api/ai-booking?action=oauth-callback`, and restart Vite after changing environment values. Local configuration does not configure Vercel. For an additional HTTPS preview host, set `DEMO_ACCESS_ORIGIN` to that origin and register its exact callback. Keep preview and production data separate.

### Connect the calendar

1. Open the deployed `/client-portal` and sign in using the configured owner email.
2. Find **Google Calendar** and choose **Connect Google Calendar**.
3. In Google's consent flow, select the account that owns the appointment schedule and approve the requested read access. This owner action is required; saving environment values alone does not grant access.
4. Return to the portal. The connection process checks that the selected calendar can be read and stores the encrypted refresh token. Refresh the connection status if necessary.

The portal's **Ready to connect** state means the required Calendar environment values have valid shapes. **Connection saved** means a compatible saved token can be decrypted. The API calls these fields `configured` and `connected`. Those states do not prove a future Google request will succeed. Revoked access, expired tokens, account policy changes, or an unavailable provider can still require reconnection.

### Legacy verification and recovery

For a legacy client, an eight hour quiz attempt and a verified attendee email identify a new appointment on the configured calendar. A matching event must be confirmed, future, organized on the connected calendar, use the expected title, and last 45 minutes. Ambiguous results do not confirm a booking. Previously verified records can be read in the owner portal under **Confirmed consultations and quiz answers**. These snapshots do not track subsequent reschedules or cancellations.

The connection requests offline access with `calendar.events.readonly`. That Google permission can read events on calendars available to the account; this implementation queries only the configured calendar. It never creates, modifies, or cancels Google events. The refresh token is encrypted with AES 256 GCM and stored durably. Tokens remain on the server.

Owner OAuth state is bound to the signed in owner session and expires after ten minutes. Visitor codes expire after ten minutes and allow five attempts. Successful verification creates a separate eight hour booking session bound to the quiz attempt, without owner portal access. Provider checks are rate bounded and responses are private with no caching.

| Symptom | Check |
| --- | --- |
| `redirect_uri_mismatch` | Exact scheme, hostname, port, path, and query string in the registered callback. |
| Google blocks authorization | Correct test user while testing, audience configuration, requested scope, and applicable Workspace policy or verification requirements. |
| Calendar connection unavailable | Required server values, durable Redis, Resend sender, and owner authorization. Redeploy or restart after environment changes. |
| Reconnection required | Revoked or expired access, a changed encryption key/client/calendar/owner, or a Testing refresh token reaching its seven day lifetime. |
| Booking stays pending | Same verified attendee email, correct calendar and schedule title, new future 45 minute event, and no duplicate matching appointments. Check Google directly before making another booking. |


The current funnel does not poll this legacy Calendar integration. Payment webhooks and billing jobs are documented in the [client portal guide](client-portal/README.md).
