/**
 * Contact-page context for a visitor who arrives from one of the website
 * demos, e.g. `/contact?demo=deercreek` from the bar above the Deer Creek
 * Plumbing concept.
 *
 * The id travels with the enquiry as `source`, so the inbox says which demo
 * someone saw. `api/contact.ts` keeps its own allowlist of these ids and
 * ignores anything else.
 */
export type DemoHandoffId = 'deercreek' | 'deercreekplumbing'

export type DemoHandoff = {
  id: DemoHandoffId
  /** Explicit project context for the website-focused entry path. */
  project?: 'website'
  /** The concept the visitor was looking at. */
  name: string
  /** Where "Back to the demo" goes. */
  href: string
  eyebrow: string
  headlineLines: readonly string[]
  headlineAccent: string
  supporting: string
  messageLabel: string
  messagePlaceholder: string
  submitLabel: string
  /** Replaces the CRM-oriented "Before you write" hint. */
  beforeYouWrite: string
}

export const demoHandoffs: Record<DemoHandoffId, DemoHandoff> = {
  deercreekplumbing: {
    id: 'deercreekplumbing',
    project: 'website',
    name: 'Deer Creek Plumbing website concept',
    href: '/demo/deercreekplumbing',
    eyebrow: 'Website enquiry',
    headlineLines: ['Let’s discuss', 'your website.'],
    headlineAccent: '',
    supporting:
      'Tell Matthew about your business and what customers need to understand or accomplish online.',
    messageLabel: 'About your business and website',
    messagePlaceholder:
      'Tell us about your business, your current website if you have one, and what customers need to understand or do online.',
    submitLabel: 'Send website details',
    beforeYouWrite:
      'Share what your business does, who you serve, and what customers need from your website. You can mention something from the demo that would help your own customers. You do not need a technical brief.',
  },
  deercreek: {
    id: 'deercreek',
    name: 'Deer Creek Plumbing website concept',
    href: '/demo/deercreek',
    eyebrow: 'Website enquiry',
    headlineLines: ['Let’s plan a', 'website for'],
    headlineAccent: 'your business.',
    supporting:
      'Tell me what you do and what customers should be able to accomplish online.',
    messageLabel: 'About your business',
    messagePlaceholder:
      'What you do, where you work, and what customers should be able to do on your website.',
    submitLabel: 'Send website details',
    beforeYouWrite:
      'A useful starting point is what customers ask before they hire you, how they reach you today, and what they should be able to do without calling, such as request a visit or check whether you serve their area. You do not need a technical brief.',
  },
}
