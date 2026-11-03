# Google Calendar booking setup

The funnel keeps the existing Google appointment schedule and its 45 minute consultations. The server verifies a new appointment in the owner's calendar before the visitor reaches the walkthrough. Google handles available times, booking, meeting links, rescheduling, and cancellation.

Implementation is prepared locally. Google credentials, owner authorization, production deployment, and a real booking still need verification. The walkthrough video is also pending. Local tests do not establish that the Google account or deployed integration works.

## Check what already exists

Start in the [Google Cloud Console](https://console.cloud.google.com/) using the account that manages Wallace Shift's Google services.

1. Open the project selector at the top. Check the existing Wallace Shift projects before creating another project.
2. In each likely project, open **APIs & Services → Enabled APIs & services** and look for **Google Calendar API**. If it is missing, you can enable it in that project during setup.
3. Open **Google Auth platform → Clients**. Look for an existing **Web application** client owned and managed by Wallace Shift. Open its details and check the client ID and registered redirect URIs. An API key, a service account, or a desktop application client is not a substitute for this server OAuth integration. [Google credential types and clients](https://developers.google.com/workspace/guides/create-credentials).
4. Check that the client's secret is available in your existing secure configuration and that its **Audience** permits the Google account that owns the consultation schedule. Do not paste the secret into chat.
5. If an existing client is suitable, reuse it and add this integration's callback without removing its other redirect URIs. Preserve scopes and settings needed by other applications in that project. If none is suitable, create a new web client in the chosen project using the next section.

The existing public Google booking link does not show whether a Cloud project or OAuth client has already been configured. The three items needed from Google are the selected project, a suitable web client ID, and its matching client secret. The encryption key is generated separately below.

## Configure Google Cloud

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

## Server environment

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

## Connect the calendar

1. Open the deployed `/client-portal` and sign in using the configured owner email.
2. Find **Google Calendar** and choose **Connect Google Calendar**.
3. In Google's consent flow, select the account that owns the appointment schedule and approve the requested read access. This owner action is required; saving environment values alone does not grant access.
4. Return to the portal. The connection process checks that the selected calendar can be read and stores the encrypted refresh token. Refresh the connection status if necessary.

The portal's **Ready to connect** state means the required Calendar environment values have valid shapes. **Connection saved** means a compatible saved token can be decrypted. The API calls these fields `configured` and `connected`. Those states do not prove a future Google request will succeed. Revoked access, expired tokens, account policy changes, or an unavailable provider can still require reconnection.

## Verify the visitor flow

Use a controlled email account and arrange any real test appointment deliberately through Google.

1. Finish the quiz with investment approval and **Now** or **Within the next month**.
2. Verify the email address in the funnel, then use that same address when booking with Google. Both the embedded calendar and the external Google Calendar link remain hidden until email verification succeeds. The verification code does not create an appointment.
3. Book a new future 45 minute appointment through the embedded schedule. Leave the funnel open while its server checks Google.
4. Confirm that the walkthrough appears only after the matching event is found. Check the owner's **Confirmed consultations and quiz answers** list for the saved email, appointment time, and quiz answers.
5. If this is a test appointment, cancel it using Google's confirmation email. Check Google Calendar for the current appointment state.

The match requires a confirmed future event, the selected account as organizer, the verified visitor as an attendee, the expected appointment title, and a 45 minute duration. Its creation time must correspond to this booking attempt. Multiple matching events are treated as ambiguous. Old appointments or an iframe loading do not count as a new confirmation.

Quiz answers are saved with the verified booking in the owner portal. They are not inserted into the Google event, and these booking records are snapshots rather than a live cancellation or rescheduling feed. Check Google Calendar for subsequent changes. The phone callback request remains a separate path and does not create or confirm a Google appointment.

If required configuration or the saved calendar connection is unavailable, the page shows an online booking unavailable message and keeps both calendar entry points hidden. The phone call alternative remains above that notice. The funnel does not claim that a phone request or an unavailable calendar is a confirmed appointment.

## Walkthrough and purchases

Add the final video URL to `aiConsultation.walkthrough.src` and the English WebVTT caption URL to `aiConsultation.walkthrough.captionsSrc` in `src/content/aiConsultation.ts`. The intended video is about three to ten minutes long. Both values currently remain `null`.

Without a video, visitors see an honest coming soon message. Offers remain hidden until a real native video completion event occurs. A missing or failed video never simulates completion. Once visible, package buttons enter the existing agreement and payment flow. The free website requires a paid project of at least $2,500. Neither watching the video nor buying a package automatically cancels an appointment; visitors use Google's confirmation email if they no longer need the consultation.

## Runtime behavior and recovery

The connection requests offline access with `calendar.events.readonly`. That Google permission can read events on calendars available to the account; this implementation queries only the configured calendar. It never creates, modifies, or cancels Google events. The refresh token is encrypted with AES 256 GCM and stored durably. Tokens remain on the server.

Owner OAuth state is bound to the signed in owner session and expires after ten minutes. Visitor codes expire after ten minutes and allow five attempts. Successful verification creates a separate eight hour booking session bound to the quiz attempt, without owner portal access. Provider checks are rate bounded and responses are private with no caching.

| Symptom | Check |
| --- | --- |
| `redirect_uri_mismatch` | Exact scheme, hostname, port, path, and query string in the registered callback. |
| Google blocks authorization | Correct test user while testing, audience configuration, requested scope, and applicable Workspace policy or verification requirements. |
| Calendar connection unavailable | Required server values, durable Redis, Resend sender, and owner authorization. Redeploy or restart after environment changes. |
| Reconnection required | Revoked or expired access, a changed encryption key/client/calendar/owner, or a Testing refresh token reaching its seven day lifetime. |
| Booking stays pending | Same verified attendee email, correct calendar and schedule title, new future 45 minute event, and no duplicate matching appointments. Check Google directly before making another booking. |
| Video offers stay hidden | The finished video must be configured, load successfully, and reach its native completion event. |

No Google webhook or background cron is required for this implementation. The active funnel checks booking status; the existing payment webhook and billing cron are separate systems described in `docs/client-portal/README.md`.
