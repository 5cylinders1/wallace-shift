/**
 * Privacy-policy content.
 *
 * This describes what the site actually does today, verified against the
 * code: one contact form, no analytics, no advertising pixels, no
 * cookies set by the application, and web fonts served by Google.
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
      'One thing: what you type into the contact form. That is your name, your email address, and whatever you write in the message field.',
      'We collect it so we can reply to you. We do not sell it, rent it, trade it, or add it to a marketing list you did not ask to join.',
    ],
  },
  {
    heading: 'What we do not collect',
    paragraphs: [
      'This site runs no analytics, no advertising pixels, no tracking scripts, no session recording, and no chat widget. It sets no cookies of its own.',
    ],
  },
  {
    heading: 'Third parties',
    paragraphs: [
      'Two services are involved in serving this site, and both necessarily see your IP address as a consequence of your browser requesting files:',
    ],
    bullets: [
      'Our hosting provider, which serves the pages you are reading.',
      'Google Fonts, which serves the two typefaces the site uses.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'Enquiries stay in our email for as long as they are useful — typically while a project is live and for a reasonable period afterwards for reference. If you would rather we did not keep yours, say so and we will delete it.',
    ],
  },
  {
    heading: 'Your choices',
    paragraphs: [
      'You can ask what we hold about you, ask for it to be corrected, or ask us to delete it. Email us and we will do it. We will not ask you to justify the request or route you through a form.',
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
export const privacyLastUpdated = '1 September 2026'
