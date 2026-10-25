/**
 * About-page content.
 *
 * Everything here is a stated fact about the studio. Nothing on this page
 * may claim a client count, a founding year, years of experience, an
 * award, or a credential that has not been supplied — an About page is
 * exactly where invented detail does the most damage to trust.
 *
 * `name: null` on a person renders their role and bio without a name,
 * which reads correctly rather than showing a placeholder.
 */

export interface Person {
  name: string | null
  role: string
  bio: string
  /** Direct address. Null until that mailbox actually receives mail — the
   *  page omits the link rather than publishing one that bounces. */
  email: string | null
}

export const aboutMeta = {
  eyebrow: 'The company / About Wallace Shift',
  headlineLines: ['Your systems.', 'Our shared'],
  headlineAccent: 'focus.',
  supporting:
    'A two-person software company building custom CRMs, AI integrations, and connected workflows. Bella handles the first conversation. Matthew scopes and builds the system.',
}

export const aboutPeople: Person[] = [
  {
    name: 'Matthew Wallace',
    role: 'Software engineering and design',
    bio: 'The software engineer who maps the technical requirements and designs and builds each system. You can discuss workflows, integrations, and build decisions directly with the person doing the work.',
    email: 'matthew@wallaceshift.com',
  },
  {
    name: 'Bella Wallace',
    role: 'Sales and first contact',
    bio: 'Your first point of contact. Bella learns what is getting in the way and coordinates the next conversation. Technical questions and project scoping go directly to Matthew.',
    email: 'bella@wallaceshift.com',
  },
]

export const aboutStory = {
  heading: 'Start with how the business works.',
  paragraphs: [
    'An enquiry arrives. Someone needs to respond, record the details, and move the work forward. We start by understanding those steps, the tools involved, and where information or follow-up gets lost.',
    'The right answer may be a custom CRM, a connection between existing tools, or a focused AI integration. We define the job before choosing the technology, then build, test, and document the agreed system. A website can be the front door to that same process.',
    'Working directly with a small team keeps the reasoning behind the system close to the people building it. We take on a limited number of projects at a time and agree the scope of support and future development separately.',
  ],
}

/** Answers the practical questions a cautious local buyer asks first. */
export const aboutFacts = {
  heading: 'The practical answers.',
  items: [
    {
      question: 'Do you work in person?',
      answer:
        'Projects run remotely through calls, screen shares, and working previews. We use those conversations to understand your process and review the build together. Meeting in person is possible for local businesses, at your premises or somewhere neutral.',
    },
    {
      question: 'Who owns what you build?',
      answer:
        'You do. The domain, hosting account, content, and project code are yours, in your name, from the start. Documentation and handover give you a record of how the system works.',
    },
    {
      question: 'What happens if you are unavailable?',
      answer:
        'We build on standard, widely used technology and document the work so another competent developer can take it on. Your project does not depend on knowledge kept only in one person’s head.',
    },
    {
      question: 'How does the system evolve after launch?',
      answer:
        'Support depends on the plan you choose. Maintenance and minor adjustments keep the agreed system working. New workflows, larger features, and substantial changes are scoped separately, either as a project or through an ongoing development partnership.',
    },
  ],
} as const

export type AboutFact = (typeof aboutFacts.items)[number]
