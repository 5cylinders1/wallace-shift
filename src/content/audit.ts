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
  eyebrow: 'Optional website check',
  heading: 'Check the customer-facing page.',
  summary:
    'A website can be the entry point to your business system. This check looks at that public page; it does not assess your CRM or internal workflows.',
  supporting:
    'Enter your current website and we will load it on a simulated phone, the way a customer would. Keep reading while it runs — the result is waiting at the end of this page. No contact details needed.',
  inputLabel: 'Your website address',
  placeholder: 'yourbusiness.com',
  submit: 'Check this website',
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
    { label: 'No website yet? Discuss your plans.', href: '/contact' },
    {
      label: 'For CRM, AI, or workflow work, tell us where the process gets stuck.',
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

  reportEyebrow: 'Your website check',
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
 * The single decisive conclusion, and its supporting read.
 *
 * The result used to give the screenshot, filmstrip, metrics, findings,
 * positives, CTA and disclaimer roughly equal weight, which left the
 * visitor to work out for themselves what mattered. One sentence leads
 * now, and everything else supports it.
 *
 * TONE RULE, applied hard here because this is the most quotable line the
 * site will ever put in front of a stranger about their own business:
 *
 *  - It states a measurement, never a verdict. "Stays visually empty for
 *    2.6 seconds" is a fact; "your site is slow" is an insult.
 *  - No score is ever the headline.
 *  - `clear` is a real outcome. A checker that always finds something is a
 *    sales gimmick, and a local business owner can smell one. If every
 *    check passes we say so and do not manufacture a concern.
 *
 * `{site}` is replaced with the visitor's domain, `{value}` with the real
 * measurement. A conclusion with no `{value}` is one where a raw number
 * would mean nothing to a non-technical reader (layout shift is scored
 * 0–1; nobody outside the field knows that 0.31 is bad).
 */
export interface ConclusionCopy {
  /** The decisive sentence. Leads the whole report. */
  headline: string
  /** Why it costs the business something. */
  matters: string
  /** What we would actually do. Never a promise of a result. */
  change: string
  stage: '01' | '02' | '03'
}

export const conclusions: Record<string, ConclusionCopy> = {
  https: {
    headline: '{site} is not served over a secure connection.',
    matters:
      'Browsers now mark these pages "Not secure" in the address bar, next to your name, before a visitor has read anything. It is the first thing many people notice and the hardest to explain away.',
    change:
      'A certificate and a site-wide redirect, so every address resolves to the secure version. This is usually the fastest thing on this list to put right.',
    stage: '03',
  },
  viewport: {
    headline: '{site} does not tell phones how to size the page.',
    matters:
      'Phones fall back to rendering it at desktop width and scaling it down, so visitors have to pinch and zoom to read anything. Most give up instead.',
    change:
      'The page is rebuilt to respond to the screen it is on, rather than being a desktop layout viewed from far away.',
    stage: '02',
  },
  fcp: {
    headline:
      '{site} stays visually empty for {value} on a simulated mobile connection.',
    matters:
      'That is time a visitor spends looking at a blank screen with no evidence anything is happening. It is the point at which people go back to the search results and pick somebody else.',
    change:
      'Getting something meaningful on screen sooner — usually by cutting what has to load before the page can draw at all.',
    stage: '02',
  },
  lcp: {
    headline:
      'The main content on {site} takes {value} to finish loading on a phone.',
    matters:
      'The largest thing on screen — normally your headline or main image — is what tells a visitor they are in the right place. Until it arrives they are waiting without knowing what for.',
    change:
      'Prioritising the content that matters most so it loads first, rather than last behind everything else.',
    stage: '02',
  },
  cls: {
    headline: '{site} moves under the reader while it loads.',
    matters:
      'Content shifting as things arrive is why people tap the wrong link, lose the line they were reading, or miss the button they were aiming for. It reads as unfinished even when nothing is broken.',
    change:
      'Reserving space for everything that loads late, so the page settles as it arrives instead of rearranging itself.',
    stage: '02',
  },
  contrast: {
    headline:
      'Some text on {site} is too close in tone to its background to read comfortably.',
    matters:
      'It usually looks refined on the designer’s monitor and disappears in daylight, on an older screen, or for anyone with less than perfect vision — which is a large share of most local customer bases.',
    change:
      'Adjusting the affected text so it holds up outdoors and on ordinary screens, without flattening the design.',
    stage: '02',
  },
  metaDescription: {
    headline: '{site} has no description for search results to show.',
    matters:
      'Google writes its own instead, usually from whatever text it finds first. That sentence is often the only thing a customer reads before deciding whether to click you or a competitor.',
    change:
      'Writing the description for each page, so the line under your name in search results is one you chose.',
    stage: '02',
  },
  altText: {
    headline: 'Some images on {site} have no text alternative.',
    matters:
      'Those images are invisible to screen readers and to search engines — they simply are not there for either.',
    change:
      'Describing the images that carry meaning, and marking the purely decorative ones as decorative.',
    stage: '02',
  },
  linkNames: {
    headline: 'Some links on {site} have no readable label.',
    matters:
      'Assistive technology cannot announce them, which matters most on the links people use to contact you.',
    change:
      'Giving every link a name that says where it goes, read aloud or not.',
    stage: '03',
  },
  /* Distinct from `clear`. If Lighthouse returned nothing measurable,
     "passed every check" is a claim about work that was never done — the
     one sentence on this page that could be flatly untrue about someone
     else's business. Say what actually happened instead. */
  inconclusive: {
    headline: 'This check came back without enough detail to draw a conclusion.',
    matters:
      'That usually means the page blocked part of the automated visit, or responded differently to it than it would to a person. It is not a finding about your site.',
    change:
      'Send us the address and we will look at it directly, which is not something an automated pass can be talked into doing.',
    stage: '01',
  },
  clear: {
    // Deliberately a statement about findings, not about coverage.
    // "Passed every check" implies a breadth we cannot guarantee — if
    // Lighthouse skipped four of seven audits, the sentence is still
    // technically true and still misleading. "Nothing flagged" is
    // accurate however many ran.
    headline: '{site} came through this first check with nothing flagged.',
    matters:
      'Nothing in the automated pass needs attention, which is a genuinely good result and not one we are going to talk you out of.',
    // The honest sell: name the limit of the tool rather than inventing a
    // problem to justify a conversation.
    change:
      'An automated check can only see how a page is built. It cannot tell whether the words persuade anyone, whether the offer is clear, or whether the path to enquiring makes sense — which is usually where the real friction is. That part needs a person.',
    stage: '01',
  },
}

export const conclusionLabels = {
  observed: 'What we observed',
  matters: 'Why it matters',
  change: 'What we would change',
  evidence: 'The measurements behind this',
  evidenceOpen: 'View full findings',
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
