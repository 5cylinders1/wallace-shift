/**
 * Privacy-policy content.
 *
 * This describes what the site actually does today, verified against the
 * code: contact and demo forms, verified private demo access, no analytics
 * or advertising pixels, and web fonts served by Google.
 *
 * If analytics, a booking embed, a chat widget, or any third-party script
 * is ever added, this file must be updated in the same change — a privacy
 * policy that describes a site you no longer run is worse than none.
 */

export const privacyMeta = {
  eyebrow: 'Privacy',
  heading: 'What this site collects.',
  supporting:
    'Short, because the site does very little. This describes what actually happens, not what a generic template says might happen.',
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
      'For private demo access, we verify your approved email address and record your full name, business name, verified email, acceptance time, invitation identifier, and the exact version and text of the agreement you accept. We use this record to manage access and document your agreement with Wallace Shift LLC.',
    ],
  },
  {
    heading: 'What we do not collect',
    paragraphs: [
      'This site runs no analytics, no advertising pixels, no tracking scripts, no session recording, and no chat widget.',
      'Private demos use essential cookies for your pending invitation, email verification, and approved access. These are not advertising cookies. Verification lasts up to ten minutes, and visitor invitation and access cookies last no longer than the invitation’s 72-hour window. The site owner can separately sign in with an emailed code; the admin access cookie lasts up to 30 days or until the owner signs out of that browser. We use temporary counters and hashed identifiers to limit repeated requests and verification attempts.',
    ],
  },
  {
    heading: 'Third parties',
    paragraphs: [
      'We use service providers to host the site, display fonts, deliver requested emails, and securely store demo verification and agreement records. Providers receive the information needed to perform those functions:',
    ],
    bullets: [
      'Our hosting provider, which serves the pages you are reading.',
      'Google Fonts, which serves the two typefaces the site uses.',
      'Resend, which processes contact and demo request emails and delivers email verification codes.',
      'Our configured Redis storage provider, which stores temporary verification data, request counters, and demo agreement acceptance records.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'Enquiries stay in our email while useful to the enquiry or project and for a reasonable period afterwards for reference. Verification codes expire after ten minutes and temporary request counters expire automatically.',
      'Agreement acceptance records are kept separately from temporary access data. They do not automatically expire when demo access ends, because we may need them to document the agreement or address a dispute. We review deletion requests in light of those needs and any legal obligations.',
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
export const privacyLastUpdated = '13 October 2026'
