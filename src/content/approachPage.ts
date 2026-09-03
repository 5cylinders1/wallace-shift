/**
 * `/approach` content.
 *
 * The pit-stop sequence lives on the homepage now, so this page carries
 * the substance instead of the motion: what actually happens at each
 * stage, and the terms around it.
 *
 * Every concrete claim here is drawn from material already approved
 * elsewhere in the project — the engagement descriptions and FAQ answers
 * in `pricing.ts`, the inclusions in `websiteStandard`, and the studio
 * facts in `about.ts`. Nothing describes a process step, a timeline, or a
 * guarantee that is not already stated somewhere the client has signed
 * off. If a stage needs a new claim, it gets added to the source of truth
 * first, not invented here.
 */

export interface ApproachStageDetail {
  index: string
  title: string
  summary: string
  /** What concretely happens. Each line traceable to approved copy. */
  points: string[]
}

export const approachStages: ApproachStageDetail[] = [
  {
    index: '01',
    title: 'Find the friction',
    summary:
      'Understand what customers need, where trust is being lost, and what is slowing the business down.',
    points: [
      'It starts as a conversation about what is not working. It costs nothing, and it is not a sales call.',
      'For a web app, this becomes a paid definition sprint — users, workflows, roles, integrations, and edge cases mapped before anyone commits to a build price.',
      'For automation, an audit traces the repetitive work, calculates what it costs, and returns a prioritized plan. If the savings do not justify a build, we will say so, and the plan is still yours.',
    ],
  },
  {
    index: '02',
    title: 'Build the shift',
    summary:
      'Create the strategy, identity, experience, and technology as one coherent system.',
    points: [
      'Positioning and content structure come before design, so the layout is built around something to say rather than the other way round.',
      'You see a real, viewable version at a private link — structure, design, and your content in place. Not a mockup.',
      'Revisions are consolidated into rounds rather than drip-fed, so feedback lands as one decision instead of fifty small ones.',
    ],
  },
  {
    index: '03',
    title: 'Launch with momentum',
    summary:
      'Refine, test, launch, and leave the business with a platform built to keep working.',
    points: [
      'Accessibility and performance review, foundational SEO, and analytics are done before launch, not bolted on after it.',
      'A launch warranty covers defects at no cost — if something we built is broken or fails on a device it should support, we fix it inside the window.',
      'Then it is handed over and it is yours. Ongoing care is optional, and never folded into the project price.',
    ],
  },
]

export const approachTerms = {
  eyebrow: 'The terms',
  heading: 'What that means in practice.',
  supporting:
    'The parts of a project people are least comfortable asking about, stated before you have to.',
  items: [
    {
      title: 'Payment is split across the project',
      body: 'A deposit to hold the schedule, a payment at design approval, and the balance before launch. Care plans and retainers are billed monthly.',
    },
    {
      title: 'Scope changes are agreed in writing',
      body: 'The starting price buys a complete, launched project at that level. Anything beyond it is scope we agree on together, in writing, before it is built.',
    },
    {
      title: 'We take on a limited number of projects',
      body: 'That is a constraint of a two-person studio rather than a scarcity tactic, and we will tell you when something is not a fit.',
    },
  ],
} as const
