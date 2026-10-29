# PAGE application preparation

Prepared October 28, 2026. Draft only. No application, message, or work sample has been transmitted.

## Confirmed experience

Matthew reports Canva logo design, Mailchimp, Constant Contact, Premiere Pro, iMovie, and After Effects. His Google Calendar, Calendly, Meet, and Zoom use concerns appointment scheduling; it does not establish social publishing experience. The application does not claim social scheduler or ClickUp experience.

## Application

Email application-email.md to catherine@pagepublicrelations.com with the sample PDF after Matthew's review. The RFP requests a short introduction, relevant samples, tools, availability, and hourly rate. No deadline is stated. Fully remote participation from Kansas remains to be confirmed with PAGE.

Proposed rate is $60 per hour and proposed availability is 5 to 10 hours weekly. These are application terms for review, not confirmed billable volume. Optional first assignment is capped at four paid hours, $240. All setup, revisions, testing, and handoff count as work; agree on tasks and priorities before starting and obtain approval before exceeding the cap.

## Sample provenance

The PDF contains existing transactional email designs, not new invented client campaigns or evidence of performance results.

Reply365 source is apps/app/src/lib/email-template.js, renderBrandedEmail, with the call summary payload from mail.js. Reply365 is Matthew's own product project. Only the pure renderer is invoked. The sample uses fictional business and caller details. No sending code or provider module is imported.

Legacy Compounds source is wp-content/plugins/lcp-core/includes/class-lcp-auth.php, build_magic_link_email. The existing HTML is extracted without running WordPress or its plugin. The original project logo is embedded. The example access link is an example.com placeholder, not an authentication token. Standard template wording, including existing hyphenated terms, is preserved for fidelity.

Both templates retain their existing layout and styling, use inline local logo images, and replace all hyperlink destinations with inactive anchors. The renderer blocks network requests. No customer records, credentials, live authentication links, databases, provider logs, or private messages are accessed. No actual send history, campaign outcomes, Mailchimp provenance, or cross client compatibility is claimed.

## Build

Run build_samples.mjs with the bundled Node runtime and build_sample_pdf.py with the bundled Python runtime. The image renderer uses a temporary isolated headless Chrome profile, with page network requests blocked. Images and HTML are local intermediates in output/page-application. The final attachment is output/pdf/wallace-shift-email-work-samples.pdf.

## Completed verification

Both PDF pages were rendered with bundled Poppler and visually inspected. The email layouts, logos, CTA buttons, text, and explanatory labels are complete and readable. No customer details or active account links appear. The PDF has two pages. The source project repositories were only read; no production templates or mail configuration changed. This validates the portfolio rendering, not live delivery or compatibility across email clients. No email was sent.

## Commit message

docs: prepare PAGE application with verified email work samples
