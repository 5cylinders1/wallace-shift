/**
 * Privacy-policy content.
 *
 * This describes what the site actually does today, verified against the
 * code: contact and demo forms, verified private demo access, public-page
 * visitor analytics, web fonts served by Google, and consultation scheduling.
 *
 * If analytics settings, a booking embed, a chat widget, or another third-party
 * script changes, this file must be updated in the same change — a privacy
 * policy that describes a site you no longer run is worse than none.
 */

export const privacyMeta = {
  eyebrow: 'Privacy',
  heading: 'What this site collects.',
  supporting:
    'How we handle site visits, enquiries, private access, client agreements, and payment records.',
}

export interface PrivacySection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export const privacySections: PrivacySection[] = [
  {
    heading: 'What we collect',
    paragraphs: [
      'When you contact us or request a demo, we collect the details you submit: your name, email address, business name where requested, and any website or message you provide.',
      'We collect it so we can reply to you. We do not sell it, rent it, trade it, or add it to a marketing list you did not ask to join.',
      'The AI opportunity quiz uses predefined rules in your browser. When you submit a qualifying quiz, we email your answers and the submission time to Matthew at Wallace Shift. You can complete the quiz without providing your name or email address.',
      'If you submit that request, we collect your business type, annual revenue range, business challenges, estimated weekly team hours and impact, purchasing role, availability of another approver where relevant, previous AI experience, barriers to adoption, current tools, investment readiness, project timing, and any description you provide. We also collect your chosen next step, selected package where relevant, contact details, preferred consultation format, and phone number if you request a call. Email is optional for phone consultations. We store these answers with the recommendation and its reasons, submission time, offer version, acknowledgements, and notification status so we can review the fit and respond. Please leave passwords, customer records, and other sensitive information out of your description.',
      'When you reach consultation booking, Calendly can receive your browser information to display available times. If you book, Calendly collects the details you enter, including your name, email address and chosen time, and shares the appointment with our connected Google Calendar for your Google Meet invitation. When you book through the embedded calendar, Calendly tells this page when you finish booking so we can show the consultation video. You can also open Calendly directly in a separate tab. Your quiz answers are emailed separately to Wallace Shift.',
      'You can also request a phone consultation without providing an email address. Submitting that request sends your phone number and quiz answers so we can arrange a call.',
      'For private demo access, we verify your approved email address and record your full name, business name, verified email, acceptance time, invitation identifier, and the exact version and text of the agreement you accept. We use this record to manage access and document your agreement with Wallace Shift LLC.',
      'The client portal stores your contact details, service scope, signed agreement text and fingerprint, typed signature, verified email, signature time, invoices, payment authorizations, payment references, and account activity. We use these records to provide services, manage billing, and document your instructions. Client portal sign in cookies expire after eight hours; sign in verification expires after ten minutes.',
    ],
  },
  {
    heading: 'Site visitor analytics',
    paragraphs: [
      'With your permission, we use Google Analytics on our public studio pages, blog, contractor gallery, offer pages, and demo request page to understand which pages people visit and where traffic comes from. Reports include page views, visits, referring websites and campaign labels, approximate location, and browser and device information.',
      'Google Analytics uses cookies to distinguish browsers and understand visits over time. We load its tracking script only after you allow analytics. We keep your analytics choice in your browser so you do not have to answer on each visit. We do not enable advertising personalization or Google signals.',
      'We also measure actions such as an accepted enquiry or demo request, application starts and steps, the broad recommendation type shown, saved applications, a submission failure, quiz completion, preview playback, and clicks on email, phone, and resource links. These events use fixed labels rather than the details you enter. Quiz answers, including revenue, purchasing authority, business problems, and AI experience, are not sent to analytics. Viewing a recommendation does not mean you submitted a request; an accepted enquiry means our service acknowledged the request, not that a sale occurred.',
      'Our analytics code excludes the client portal, admin pages, agreement pages, private demos, and development previews. It removes URL fragments and query parameters other than filtered campaign labels. We do not send form entries, email addresses, messages, access codes, or payment details to analytics.',
      'You can allow or reject analytics, or change your choice using Analytics preferences on public pages. Our analytics code does not load when your browser sends Do Not Track or Global Privacy Control, even if you previously allowed it. Rejecting analytics or blocking it with browser privacy tools does not affect forms or private access.',
    ],
  },
  {
    heading: 'What we do not collect',
    paragraphs: [
      'We do not run advertising pixels, session recording, or a chat widget. When you use electronic payments, Stripe processes payment and fraud prevention information through its hosted checkout and, when needed, its payment verification script. Card numbers and security codes are handled by Stripe rather than stored in our portal.',
      'Private demos use essential cookies for your pending invitation, email verification, and approved access. These are not advertising cookies. Verification lasts up to ten minutes, and visitor invitation and access cookies last no longer than the invitation’s 72-hour window. The site owner can separately sign in with an emailed code; the admin access cookie lasts up to 30 days or until the owner signs out of that browser. We use temporary counters and hashed identifiers to limit repeated requests and verification attempts.',
    ],
  },
  {
    heading: 'Third parties',
    paragraphs: [
      'We use service providers to host the site, display fonts, deliver requested emails, and securely store demo verification and agreement records. Providers receive the information needed to perform those functions:',
    ],
    bullets: [
      'Vercel, which hosts the site.',
      'Google Analytics, which processes visitor and interaction statistics when you allow analytics. You can read more at policies.google.com/privacy.',
      'Google Fonts, which serves the two typefaces the site uses.',
      'Calendly, which displays consultation times and processes bookings. It may use cookies and browser information to operate its scheduling page. Its privacy notice is at calendly.com/legal/privacy-notice.',
      'Google Calendar and Google Meet, which handle calendar invitations and video meetings. Its privacy policy is at policies.google.com/privacy.',
      'Resend, which processes contact and demo request emails, sends application notifications to Wallace Shift, and delivers email verification codes.',
      'Our configured Redis storage provider, which stores temporary verification data, request counters, demo agreement acceptance records, and AI opportunity applications. Application records are restricted to the site owner.',
      'Stripe, which securely stores payment methods, processes electronic payments, and provides payment status and receipts. We store Stripe reference identifiers and payment authorization records, not full card details.',
      'Our configured Redis storage provider also stores client agreements, invoice records, account activity, and temporary portal sessions. Resend delivers portal sign in codes.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'Enquiries stay in our email while useful to the enquiry or project and for a reasonable period afterwards for reference. Verification codes expire after ten minutes and temporary request counters expire automatically.',
      'AI opportunity applications are stored separately from email notifications and do not automatically expire. We keep them while useful for reviewing your request, providing services, and related follow up, and review requests to correct or delete them. Copies in email are handled separately from the stored application.',
      'Agreement acceptance records are kept separately from temporary access data. They do not automatically expire when demo access ends, because we may need them to document the agreement or address a dispute. We review deletion requests in light of those needs and any legal obligations.',
      'Client agreements, invoices, payment authorizations, and receipt records do not automatically expire when you sign out or cancel service. We retain records needed for accounting, contractual, tax, and dispute obligations and review deletion requests against those requirements.',
    ],
  },
  {
    heading: 'Your choices',
    paragraphs: [
      'You can ask what we hold about you, ask for it to be corrected, or ask us to delete it. Email us and we will respond, explaining any information we need to retain for legal or agreement-related reasons. You can read the public site and agreement without accepting demo access; blocking essential cookies will prevent private demo access.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: [
      'If this policy changes, the date below changes with it. There is no mailing list to notify, because we do not run one.',
    ],
  },
]

/**
 * Update this whenever `privacySections` changes. Kept as an explicit
 * string rather than a build timestamp so it reflects a real review of
 * the policy rather than the date of an unrelated deploy.
 */
export const privacyLastUpdated = '9 November 2026'
