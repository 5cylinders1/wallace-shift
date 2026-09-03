/**
 * Live site audit copy.
 *
 * TONE RULE — this is the highest-risk copy on the site. It grades a
 * prospect's existing work, unprompted, and a bad first conversation is
 * one that opens with "your site scores 31". Every string here is
 * diagnostic, never judgmental: it says what we would look at and what it
 * costs the business, not how badly they have done. No score is ever the
 * headline, and nothing implies the site is bad — plenty of slow sites
 * belong to businesses doing very well.
 */

export type Band = 'good' | 'mixed' | 'attention'

export const auditCopy = {
  eyebrow: 'Stage 01',
  heading: 'Find the friction.',
  summary:
    'What customers need, where trust is being lost, and what is slowing the business down. It starts as a conversation — but you can start it yourself, right now.',
  supporting:
    'Enter your current website and we will run the same automated first check we use to begin a website review. It takes about twenty seconds and needs no contact information.',
  inputLabel: 'Your website address',
  placeholder: 'yourbusiness.com',
  submit: 'Run the first check',
  resubmit: 'Check another site',

  /* Shown beside the input before anything runs, so the section is not a
     lone field in an empty column. */
  previewLabel: 'What it checks',
  previewItems: [
    'How quickly the first content appears on a phone',
    'What a search engine can read about the page',
    'Accessibility basics — contrast, labels, alternatives',
    'Whether the page is served securely',
  ],

  /* The tool only works for an existing public site. These keep the other
     two services from feeling excluded by the page's own centrepiece. */
  alternatives: [
    { label: 'No website yet? Book a free fit call.', href: '/contact' },
    {
      label: 'Planning an app or automation? Tell us what is getting in the way.',
      href: '/contact',
    },
  ],

  /** Shown while Google runs Lighthouse. Honest about the wait. */
  runningTitle: 'Running the first check',
  runningSteps: [
    'Loading your site the way a phone would',
    'Measuring how long the first thing takes to appear',
    'Checking what a search engine can read',
    'Looking for barriers to getting in touch',
  ],
  runningNote: 'This runs on Google’s infrastructure and takes 15–25 seconds.',

  resultEyebrow: 'What we found',
  /** Never leads with a number. */
  resultLead:
    'Here is what an automated first check surfaced, and what each finding would mean for the work. A person still reads it properly before anything is quoted.',

  /* The highest-intent moment on the page. Wasting it by simply carrying
     on was the single biggest conversion miss in the first version. */
  nextTitle: 'Want help fixing what we found?',
  nextPrimary: 'Talk through these results',
  nextSecondary: 'See website pricing',

  disclaimer:
    'An automated check, measured once on a simulated mobile connection. It is a starting point for a conversation, not a full review or a verdict — real conditions vary, and plenty of successful businesses run slow sites.',

  retry: 'Try again',

  errors: {
    invalid_url: 'That does not look like a web address. Try it without the https:// — just yourbusiness.com.',
    unreachable:
      'We could not load that page. It may be password-protected, blocking automated visits, or not published yet.',
    timeout:
      'That check ran longer than we can wait for. Trying again usually works — the result is often ready the second time. Or send us the address and we will run it manually.',
    quota:
      'Our check allowance for today is used up. Send us the address and we will run it manually — that is the same check, just with a person doing it.',
    rate_limited:
      'That is a lot of checks in a short time. Give it a few minutes, or send us the address and we will run it for you.',
    upstream: 'The audit service did not respond. Try again in a moment.',
    network: 'Something went wrong reaching the audit. Try again shortly.',
  },
} as const

export interface FindingSpec {
  id: string
  /** Which stage of the process this finding belongs to. */
  stage: '01' | '02' | '03'
  label: string
  /** Said when the check passes. Credit where due — this builds trust. */
  good: string
  /** Said when it does not. Names the business cost, not the failure. */
  attention: string
}

/**
 * Score thresholds. Deliberately generous: the point is to start a
 * conversation, not to fail people. Anything at or above `goodAt` is
 * reported as working well.
 */
export const scoreBands = {
  performance: { goodAt: 75, mixedAt: 45 },
  seo: { goodAt: 85, mixedAt: 60 },
  accessibility: { goodAt: 85, mixedAt: 60 },
} as const

export const findingSpecs: FindingSpec[] = [
  {
    id: 'lcp',
    stage: '02',
    label: 'How fast the first thing appears',
    good: 'Your main content appears quickly on a phone. Fast initial content gives visitors less reason to leave while the page loads.',
    attention:
      'Your main content takes a while to appear on a phone. Shortening that gives visitors less reason to leave before they have seen anything.',
  },
  {
    id: 'metaDescription',
    stage: '02',
    label: 'What search results show',
    good: 'A search description is available for results pages to use.',
    attention:
      'There is no description for search engines to show under your name, so Google writes its own — usually from whatever text it finds first.',
  },
  {
    id: 'viewport',
    stage: '02',
    label: 'Behaviour on a phone',
    good: 'The page is set up to adapt to phone screens.',
    attention:
      'The page is not telling phones how to size it, which normally means visitors have to pinch and zoom to read anything.',
  },
  {
    id: 'https',
    stage: '03',
    label: 'The padlock',
    good: 'Your site is served securely.',
    attention:
      'The page is not served over a secure connection, which browsers now flag to visitors directly in the address bar.',
  },
  {
    id: 'contrast',
    stage: '02',
    label: 'Text legibility',
    good: 'The text sampled has enough contrast against its background to stay readable.',
    attention:
      'Some text sits too close in tone to its background to read comfortably — most often light grey on white, which looks refined on a designer’s monitor and disappears in daylight.',
  },
  {
    id: 'altText',
    stage: '02',
    label: 'Images and screen readers',
    good: 'Alternative text is present on the images checked. Whether it describes them usefully is a human judgement, not an automated one.',
    attention:
      'Some images have no text alternative, so they are invisible to screen readers and to search engines.',
  },
  {
    id: 'linkNames',
    stage: '03',
    label: 'Getting in touch',
    good: 'Links inspected have accessible names that assistive technology can announce.',
    attention:
      'Some links have no readable label, which matters most on the ones people use to contact you.',
  },
]

/** What we would do about it, by stage — ties findings back to the page. */
export const stageResponse: Record<'01' | '02' | '03', string> = {
  '01': 'We would map this before quoting anything.',
  '02': 'This is the kind of thing stage 02 fixes as part of the build.',
  '03': 'This gets checked before launch, every time.',
}
