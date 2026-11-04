# Consultation booking and owner email

Qualified visitors book a free 45 minute Google Meet consultation inside the funnel. Calendly supplies the scheduling form and confirms the appointment. Its confirmation opens the film automatically. Finishing the film reveals one AI website chatbot and AI phone agent bundle with three payment intervals.

## Connect the consultation event

1. In Calendly, go to **Settings → Scheduling → Calendars** and connect Google Calendar. Sign in as the calendar owner, `matthew.wallaceshift@gmail.com`. Choose the calendars to check for conflicts and select the consultation calendar under **Calendar to add events to**. [Connect Google Calendar](https://calendly.com/help/how-to-connect-your-google-calendar)
2. Go to **Scheduling → + Create → One-on-one**. Name the event **Wallace Shift Project Consultation**, set the duration to **45 minutes**, choose **Google Meet** as its location, set your available hours, and save. [Create an event type](https://calendly.com/help/how-to-set-up-an-event-type) · [Connect Google Meet](https://calendly.com/help/calendly-google-meet)
3. On this event’s card, choose **Copy link**. Use the reusable event link so visitors land directly on this consultation. [Share an event link](https://calendly.com/help/how-to-share-your-scheduling-link)
4. The funnel defaults to the owner's [Wallace Shift consultation](https://calendly.com/matthew-wallaceshift/consultation). No environment variable is needed for this link. To switch events, override `VITE_CALENDLY_EVENT_URL` with the new public URL, restart Vite locally, and redeploy for the Vercel environment you change. An explicitly empty or invalid override uses the existing Google schedule instead. Google can book the appointment and send its usual confirmation, but that fallback cannot advance to the film.

The booking screen also provides **Open calendar in a new tab** in case a browser or network blocks the embed. A failed script or an embed that remains unready for 15 seconds collapses the blank calendar area and offers a retry. A slow embed can still recover when Calendly signals that it is ready. Bookings completed in a separate tab receive Calendly's normal confirmation but cannot automatically open the film in the original tab. See [Calendly's embed troubleshooting guidance](https://calendly.com/help/troubleshooting-calendly-embeds).

## Check one booking before running ads

Complete a qualified quiz in the intended environment. Selecting a date or time should leave the scheduler visible. Finish an appointment using the embedded form. On success the funnel should bring the film into view automatically. Confirm the event appears on the chosen Google calendar with a Meet link and that the booking notice reaches the intended inbox. After the 15 second film ends, the single bundle and its three prepaid interval choices should appear. Cancel the test appointment through its confirmation. [Calendly embed events](https://developer.calendly.com/api-docs/overview/embedding/notifying-the-parent-window)

## Quiz summary and booking notices

Submitting a qualified quiz sends the answers and completion time to `matthew@wallaceshift.com`. The booking notice arrives separately and includes the appointment and Meet details when Google Meet is configured. Quiz answers are never sent to Calendly or matched to an appointment. The visitor enters contact details once in Calendly.

For quiz delivery, set `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, and a writable Redis endpoint and token. Verify the sender in Resend. The preferred Redis pair is `DEMO_AUDIT_REDIS_URL` and `DEMO_AUDIT_REDIS_TOKEN`. The fallback pairs are listed below. A failed quiz email can be retried while booking continues.

If the host booking notice arrives in `matthew.wallaceshift@gmail.com` and should also reach `matthew@wallaceshift.com`, preview or update the existing Gmail filter using an actual new Calendly booking notice. Its sender and subject may differ from the old Google appointment schedule. Keep global forwarding disabled and forward only matching messages to the verified address. Check a *subsequent* new booking in the destination inbox for the correct Meet link. [Gmail forwarding](https://support.google.com/mail/answer/10957?hl=en) · [Create a Gmail filter](https://support.google.com/mail/answer/6579?hl=en)

## Walkthrough and service registration

Only the active Calendly embed’s completed booking event reveals the player. The site then scrolls to **Put AI to work**, the supplied film with English captions in `public/media/ai-consultation/`. Update future media URLs in `src/content/aiConsultation.ts`. When playback ends, visitors can request one free month of both services, selecting $750 every calendar month, $4,050 every six calendar months, or $7,200 every twelve calendar months after the trial. The latter two amounts prepay the full service period. Applicable service taxes are included. The chatbot uses the client's existing website; the former free website benefit and $2,500 qualification do not apply to the current offer.

Requesting setup verifies the buyer email and creates an immutable agreement with no trial dates or invoice. The portal collects signature and a saved payment card. After Reply365 confirms both services are operational, the client reviews exact activation, trial-end, first-charge and renewal dates in UTC and explicitly starts the free month. No booking, signature, card-storage, or setup request starts billing by itself. The trial lasts at least a calendar month, with any extension to the next 14:00 UTC billing boundary free. [Full subscription specification](ai-subscription-offer.md)

An unavailable film leaves the offer locked. Registration leaves the consultation in place; clients can cancel their appointment through its booking confirmation. Reply365 readiness, usage, and access enforcement must be connected through the authenticated service gateway and verified before production activation. The local implementation does not establish that the provider integration or deployment is complete.

The phone option collects a phone number without requiring an email address. Wallace Shift arranges the time separately. A callback request does not unlock the video.

## Optional legacy Calendar connection

The owner panel and previous versions of the booking client support read only Calendar OAuth, visitor email verification and verified appointment records. This setup is for those legacy clients and records. Calendly confirms new funnel bookings directly in the visitor’s browser. The portal connection is independent of Calendly’s Google Calendar integration.

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

For a legacy client, an eight hour quiz attempt and a verified attendee email identify a new appointment on the configured calendar. A matching event must be confirmed, future, organized on the connected calendar, use the expected title, and last 45 minutes. Ambiguous results do not confirm a booking. Previously verified records can be read in the owner portal under **Previously matched consultations and quiz answers**. These snapshots do not track subsequent reschedules or cancellations.

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
