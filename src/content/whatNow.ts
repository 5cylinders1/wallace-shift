/**
 * Copy for /what-now, the page both enquiry forms open after a confirmed
 * send.
 *
 * Every statement here is already published elsewhere on the site: the
 * reply time comes from `business.responseTime`, the three steps restate
 * the contact page's "What happens next" list, the preparation list is its
 * "Before you write" note, and the split between Bella and Matthew is the
 * one on the About page. Nothing here promises a timeline, a price, or an
 * outcome the site does not already state.
 */
import { business } from './siteConfig'

export const whatNow = {
  hero: {
    sentEyebrow: 'Message sent',
    defaultEyebrow: 'What happens next',
    headlineLines: ['Here is what', 'happens'],
    headlineAccent: 'now.',
    sentSupporting:
      'Your message is with us. Here is the path from our first reply to a first step agreed in writing.',
    defaultSupporting:
      'Every enquiry follows the same path, from our first reply to a first step agreed in writing.',
  },

  steps: {
    eyebrow: 'From here',
    heading: 'Three steps, in order.',
    items: [
      {
        index: '01',
        title: `We reply ${business.responseTime}.`,
        body:
          'We read every message properly before answering. Bella Wallace handles first contact. Technical questions and project scoping go straight to Matthew Wallace, who builds every project.',
      },
      {
        index: '02',
        title: 'We talk through how your work runs.',
        body:
          'A conversation about your workflow, the tools you use now, and what needs to change. You do not need a technical brief.',
      },
      {
        index: '03',
        title: 'You get a first step in writing.',
        body:
          'An agreed first step, with scope and cost in writing. Focused builds include scoping. Larger systems or unclear requirements may start with paid definition or audit work.',
        link: { label: 'See what things cost', href: '/pricing' },
      },
    ],
  },

  prepare: {
    eyebrow: 'Before we talk',
    heading: 'Bring one real example.',
    supporting:
      'A useful starting point is one enquiry, followed from start to finish. Think through:',
    checklist: [
      'Where the enquiry arrives',
      'Who follows up, and how',
      'Which tools hold the details',
      'Where the process gets stuck',
    ],
  },

  /** Rendered only while `business.salesEmail` is set. */
  noReply: {
    label: 'Not heard back?',
    body: 'If a business day passes without a reply, check your spam or junk folder first. Then email Bella directly:',
  },

  /** After a send, the useful next click is reading, not another form. */
  closingSent: {
    headline: 'While you wait.',
    supporting: 'See how a project runs from the first conversation onward, or what the work costs.',
    primary: { label: 'How a project runs', href: '/approach' },
    secondary: { label: 'See pricing', href: '/pricing' },
  },

  /** A visitor who arrived without sending anything gets the form instead. */
  closingUnsent: {
    headline: 'Ready to start?',
    supporting: 'Tell us where work gets stuck. The steps above begin with your first message.',
    primary: { label: 'Start a project', href: '/contact' },
    secondary: { label: 'See pricing', href: '/pricing' },
  },
} as const
