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
}

export const aboutMeta = {
  eyebrow: 'About',
  headlineLines: ['Two people,', 'and no'],
  headlineAccent: 'handoffs.',
  supporting:
    'Wallace Shift is a two-person studio. The person you talk to and the person who builds your project are the only two people involved.',
}

export const aboutPeople: Person[] = [
  {
    name: 'Matthew Wallace',
    role: 'Engineering and design',
    bio: 'A software engineer who designs and builds every site, application, and automation the studio ships. No subcontractors, no offshore build teams, and no template resold as custom work.',
  },
  {
    name: 'Bella Wallace',
    role: 'Sales and first contact',
    bio: 'The first conversation, and the person who works out what your business actually needs. Technical questions go straight to Matthew rather than back and forth through a middle layer — you talk to whoever can actually answer.',
  },
]

export const aboutStory = {
  heading: 'Why the studio works this way.',
  paragraphs: [
    'Most small businesses have been burned by one of two things: an agency expensive enough to be unreachable, or a freelancer cheap enough to disappear. Both leave the same result — a website nobody owns and nobody can change.',
    'A two-person studio sits deliberately between them. Small enough that you always know who is doing the work, and structured enough that the work is documented, tested, and handed over properly when it launches.',
    'That size is also a constraint we would rather state than hide: we take on a limited number of projects at a time, and we will say so when something is not a fit.',
  ],
}

/** Answers the practical questions a cautious local buyer asks first. */
export const aboutFacts = {
  heading: 'The practical answers.',
  items: [
    {
      question: 'Do you work in person?',
      answer:
        'Projects run remotely — calls, screen shares, and a private link to your site as it is built. Meeting in person is possible for local businesses, at your premises or somewhere neutral.',
    },
    {
      question: 'Who owns what you build?',
      answer:
        'You do. The domain, the hosting account, the content, and the code are yours, in your name, from the start. Nothing is held hostage to keep you on a retainer.',
    },
    {
      question: 'What happens if you are unavailable?',
      answer:
        'Everything is built on standard, widely used technology rather than a proprietary platform only we understand. Another competent developer can pick up any project we hand over.',
    },
  ],
} as const

export type AboutFact = (typeof aboutFacts.items)[number]
