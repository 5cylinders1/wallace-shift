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
 *
 * The filmstrip and screenshot follow the same rule by being literal: they
 * show the visitor their own page as Chrome rendered it, at real
 * timestamps, and let them draw the conclusion. That is more persuasive
 * than any number and it cannot be accused of exaggerating.
 */

export type Band = 'good' | 'mixed' | 'attention'

export const auditCopy = {
  eyebrow: 'Stage 01',
  heading: 'Find the friction.',
  summary:
    'What customers need, where trust is being lost, and what is slowing the business down. It starts as a conversation — but you can start it yourself, right now.',
  supporting:
    'Enter your current website and we will load it on a simulated phone, the way a customer would. Keep reading while it runs — the result is waiting at the end of this page. No contact details needed.',
  inputLabel: 'Your website address',
  placeholder: 'yourbusiness.com',
  submit: 'Run the first check',
  resubmit: 'Check another site',

  /* Shown beside the input before anything runs, so the section is not a
     lone field in an empty column. */
  previewLabel: 'What it checks',
  previewItems: [
    'How your page looks part-way through loading, frame by frame',
    'How long a customer waits before anything appears',
    'What a search engine can read about the page',
    'Accessibility basics — contrast, labels, alternatives',
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

  /** Shown in stage 01 once the request is away. The wait is no longer
   *  dead time, so this points down the page rather than apologising. */
  runningTitle: 'Checking your site now',
  runningBody:
    'This runs on Google’s infrastructure and takes up to a minute. Read on — your result is being assembled at the end of the page.',
  runningCta: 'Read while it runs',

  /* Failure has to be stated where the visitor is, not only where the
     result would have been. Leaving this column empty on error was the
     original "looks broken" defect, and reverting to the generic "what it
     checks" list would read as though nothing had happened. */
  errorPanelTitle: 'That check did not finish',
  errorPanelBody:
    'Nothing is wrong with your site because of this — the detail is with your result further down.',
  errorPanelCta: 'See what happened',

  /** The sticky marker that follows the visitor while it works. */
  pillRunning: 'Checking your site',
  pillReady: 'Your result is ready',
  /* Distinct from `pillReady`: announcing "ready" for a run that failed is
     a small lie the visitor discovers one click later. */
  pillError: 'That check did not finish',
  pillJump: 'Jump to it',
  pillJumpError: 'See why',

  reportEyebrow: 'Your first check',
  /** Never leads with a number. The subject is their site, not a score. */
  reportHeading: 'as a phone sees it.',
  reportLead:
    'This is your own page, loaded on a simulated phone on a mid-range connection. Below it: what an automated first check surfaced, and what each finding would mean for the work. A person still reads it properly before anything is quoted.',

  filmstripLabel: 'Loading, frame by frame',
  filmstripNote:
    'What a customer sees while they wait. Blank frames are seconds where there is nothing to look at yet.',
  screenshotLabel: 'Finished page',
  metricsLabel: 'What the wait costs',

  attentionLabel: 'Worth looking at',
  workingLabel: 'Already working',

  /* The highest-intent moment on the page. Wasting it by simply carrying
     on was the single biggest conversion miss in the first version. */
  nextTitle: 'Want help fixing what we found?',
  nextPrimary: 'Talk through these results',
  nextSecondary: 'See website pricing',

  disclaimer:
    'An automated check, measured once on a simulated mobile connection. It is a starting point for a conversation, not a full review or a verdict — real conditions vary, and plenty of successful businesses run slow sites.',

  retry: 'Try again',

  errors: {
    invalid_url:
      'That does not look like a web address. Try it without the https:// — just yourbusiness.com.',
    unreachable:
      'We could not load that page. It may be password-protected, blocking automated visits, or not published yet.',
    timeout:
      'Your site took longer to analyse than this check allows — which usually means there is a lot going on in the page. That is worth a conversation in itself. Send us the address and we will run it properly.',
    quota:
      'Our check allowance for today is used up. Send us the address and we will run it manually — that is the same check, just with a person doing it.',
    rate_limited:
      'That is a lot of checks in a short time. Give it a few minutes, or send us the address and we will run it for you.',
    upstream: 'The audit service did not respond. Try again in a moment.',
    network: 'Something went wrong reaching the audit. Try again shortly.',
  },
} as const

/**
 * The three timings worth showing, in customer language.
 *
 * Lighthouse's own names are jargon ("Total Blocking Time"), and a local
 * business owner should not have to learn them to understand the point.
 * `note` says what the number means for a visitor, never whether it is
 * good — the value speaks and the findings below do the interpreting.
 */
export const metricSpecs = [
  {
    id: 'fcp' as const,
    label: 'Something appears',
    note: 'How long the screen stays empty before the first pixel of your page arrives.',
  },
  {
    id: 'lcp' as const,
    label: 'The main content appears',
    note: 'When the largest thing on screen — usually your headline or hero image — finishes loading.',
  },
  {
    id: 'cls' as const,
    label: 'Movement while loading',
    note: 'How much the page jumps around as it loads. Movement is what makes people tap the wrong thing.',
  },
]

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
