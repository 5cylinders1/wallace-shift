import { brand } from './brand'

/**
 * Every word on the roofing demo.
 *
 * Insurance and process facts are written as typical ranges, because that
 * is what is true across insurers and states. Prices, warranty lengths and
 * finance terms are realistic examples for a sample contractor — each is
 * marked with a visible demo note where it appears, and a live site swaps
 * in the contractor's own.
 */

export const WALLACE_SHIFT_URL = 'https://wallaceshift.com'
export const WALLACE_SHIFT_CONTACT_URL = 'https://wallaceshift.com/contact'

export const nav = [
  { label: 'Process', href: '#process' },
  { label: 'Insurance', href: '#insurance' },
  { label: 'Cost', href: '#cost' },
  { label: 'Financing', href: '#financing' },
  { label: 'Warranty', href: '#warranty' },
  { label: 'FAQ', href: '#faq' },
] as const

export const ribbon = {
  lead: 'Concept demo by Wallace Shift',
  detail: brand.personalized
    ? `Built as a preview for ${brand.company}.`
    : `${brand.company} is a sample brand.`,
  cta: 'Get this for your company',
}

export const hero = {
  eyebrow: `Roof repair & replacement · ${brand.city} metro`,
  titleLead: 'Your roof, explained',
  titleAccent: 'before anyone climbs a ladder.',
  supporting:
    'See a two-day roof replacement, start to finish. Then get straight answers on insurance, cost, financing and warranty — and a written estimate when you’re ready.',
  primary: 'Get my estimate',
  secondary: 'See what it costs',
  trust: ['Free photo inspection', 'Insurance claim help', '10-yr workmanship warranty', 'Monthly financing'],
  scrollCue: 'Scroll to start the timelapse',
  skip: 'Skip the timelapse',
}

export interface ProcessStep {
  number: string
  title: string
  when: string
  body: string
  note: string
}

export const steps: ProcessStep[] = [
  {
    number: '01',
    title: 'Free inspection & photo report',
    when: 'Before the job · about 45 minutes',
    body: 'We check every slope, the flashing and the attic, circle hail and wind damage in chalk, and send you the photos. You’ll know if it’s a repair, a replacement or an insurance claim before you call your insurer.',
    note: 'No storm damage? We’ll say so, and you skip a claim you didn’t need.',
  },
  {
    number: '02',
    title: 'Protect the property',
    when: 'Day 1 · 7:00 AM',
    body: 'Tarps over your landscaping, a dump trailer in the driveway and one ladder at one spot. Move cars out of the drive and take pictures off upstairs walls the night before.',
    note: 'You don’t need to be home. We do need the driveway.',
  },
  {
    number: '03',
    title: 'Tear off to the deck',
    when: 'Day 1 · morning',
    body: 'Old shingles and underlayment come off down to the wood, a section at a time, straight into the trailer — never more than we can seal the same day.',
    note: 'The loudest stretch of the job. Still safe to stay home.',
  },
  {
    number: '04',
    title: 'Repair the decking',
    when: 'Day 1 · midday',
    body: 'Soft or rotted sheets are cut out and replaced. Every one is photographed and billed at the per-sheet price written into your contract.',
    note: 'Most homes need between zero and four sheets.',
  },
  {
    number: '05',
    title: 'Dry-in before dark',
    when: 'Day 1 · afternoon',
    body: 'New drip edge, ice & water shield along the eaves and valleys, and synthetic underlayment everywhere else. The house is watertight before the crew leaves, every night.',
    note: 'Rain overnight is fine. An open deck never is.',
  },
  {
    number: '06',
    title: 'Install the roof system',
    when: 'Day 2',
    body: 'Starter strip, shingles nailed to the manufacturer’s pattern, new step and counter-flashing at the chimney, new pipe boots, then ridge vent and cap. One manufacturer’s system, so the full warranty applies.',
    note: 'Bundles are loaded at dawn; the courses go on from the eave up.',
  },
  {
    number: '07',
    title: 'Clean up & walkthrough',
    when: 'Day 2 · afternoon',
    body: 'Magnetic sweep of the lawn and driveway, every scrap hauled away, then a walkthrough with before-and-after photos. Your warranty is registered in your name.',
    note: 'Nothing is paid in full until you’ve walked it with us.',
  },
]

export const labels: Record<string, string> = {
  chalk: 'Hail hits circled & photographed',
  tarps: 'Landscaping tarped',
  trailer: 'Debris goes straight into the trailer',
  deck: 'Soft decking replaced, per sheet',
  drip: 'New drip edge',
  ice: 'Ice & water shield at the eaves',
  under: 'Synthetic underlayment',
  flashing: 'New step & counter-flashing',
  boot: 'New pipe boot',
  ridge: 'Ridge vent: the attic can breathe',
  magnet: 'Magnetic nail sweep',
}

export const finale = {
  eyebrow: 'Two days on site',
  title: 'One new roof. No surprises.',
  body: 'Most homes take one to two days. Next come the real questions: will insurance pay, what will it cost, and how do you pay for it?',
  primary: 'Get my estimate',
  secondary: 'The short answers',
}

export const quickAnswers = {
  eyebrow: 'The short version',
  title: 'What everyone asks first.',
  items: [
    {
      q: 'Will insurance pay for it?',
      a: 'Usually, if a storm did it — hail, wind or a falling limb. Not for age or wear. Either way, you pay your deductible.',
      href: '#insurance',
      link: 'What’s covered',
    },
    {
      q: 'How long does a claim take?',
      a: 'Typically 2–6 weeks from filing to approval, and longer after a big regional storm.',
      href: '#claim-timeline',
      link: 'The claim timeline',
    },
    {
      q: 'How long is the job?',
      a: 'Repairs take a few hours. Most replacements take 1–2 days on site; large or steep roofs, 3 or more.',
      href: '#process',
      link: 'Watch it again',
    },
    {
      q: 'Can we stay in the house?',
      a: 'Yes. It’s loud, but it’s safe — power, water and Wi-Fi stay on. We send a short prep list first.',
      href: '#during',
      link: 'What to expect',
    },
    {
      q: 'What does it cost?',
      a: 'Repairs start around $350. Most full replacements here land between $10,000 and $18,000.',
      href: '#cost',
      link: 'Price your roof',
    },
    {
      q: 'Can I finance it?',
      a: 'Yes — monthly plans with approved credit, including 12 months same-as-cash.',
      href: '#financing',
      link: 'See payments',
    },
    {
      q: 'What’s the warranty?',
      a: 'The manufacturer’s system warranty, plus our own 10-year workmanship warranty in writing.',
      href: '#warranty',
      link: 'What’s guaranteed',
    },
    {
      q: 'What happens next?',
      a: 'A free inspection with photos, then a written estimate. No pressure and no obligation.',
      href: '#estimate',
      link: 'Get my estimate',
    },
  ],
}

export const insurance = {
  eyebrow: 'Insurance',
  title: 'Will insurance cover my roof?',
  lede: 'Homeowners insurance pays for sudden damage, not for a roof wearing out. Here’s how to tell which you have, and how a claim actually runs.',
  covered: {
    title: 'Usually covered',
    items: [
      'Hail: bruised, cracked or punctured shingles; dented vents and gutters',
      'Wind: missing, creased or lifted shingles',
      'A tree or limb falling on the roof',
      'Water damage inside caused by a covered roof event',
    ],
  },
  notCovered: {
    title: 'Usually not covered',
    items: [
      'Age and normal wear: curling, cracking, bald spots',
      'Slow leaks from long-term deterioration or skipped maintenance',
      'Problems caused by a previous installation',
      'Damage reported after your policy’s deadline',
      'Cosmetic-only damage, if your policy excludes it',
    ],
  },
  deductible: {
    title: 'Your deductible is yours to pay.',
    body: 'It may be a flat amount — often $1,000 to $2,500 — or, for wind and hail, a percentage of your home’s insured value: 1% of $300,000 is $3,000. In many states it is illegal for a contractor to waive or “cover” your deductible. We never will.',
  },
  policies: [
    {
      name: 'Replacement cost (RCV)',
      body: 'Pays to replace the roof at today’s prices, minus your deductible — usually in two checks: one when the claim is approved, the rest once the work is done.',
    },
    {
      name: 'Actual cash value (ACV)',
      body: 'Pays what your old roof was worth after depreciation, minus your deductible. The older the roof, the smaller the check.',
    },
    {
      name: 'Roof payment schedule',
      body: 'Some newer policies pay a set percentage based on the roof’s age. It’s on your declarations page — send it over and we’ll read it with you.',
    },
  ],
  example: {
    title: 'How the money moves on a replacement-cost claim',
    caption: 'An example $16,000 approved replacement with a $1,500 deductible.',
    parts: [
      { label: 'First check from your insurer', amount: 11000, tone: 'insurer' },
      { label: 'Released after the work is done', amount: 3500, tone: 'held' },
      { label: 'Your deductible', amount: 1500, tone: 'you' },
    ],
    total: 16000,
  },
  timeline: {
    title: 'How long a claim takes',
    steps: [
      {
        name: 'Free inspection',
        when: '1–3 days after you call',
        body: 'Before you file. If there’s no storm damage, you avoid a claim on your record.',
      },
      {
        name: 'File the claim',
        when: 'Same day',
        body: 'A ten-minute call or app form. We give you the date of loss and our photos.',
      },
      {
        name: 'Adjuster visit',
        when: 'Usually 1–3 weeks after filing',
        body: 'We meet the adjuster on the roof so nothing gets missed.',
      },
      {
        name: 'Approval & first check',
        when: 'Often 1–4 weeks after the visit',
        body: 'If code items or damage were missed, we send a documented supplement.',
      },
      {
        name: 'Your new roof',
        when: '1–2 days on site',
        body: 'Usually scheduled 1–3 weeks after you approve, once materials arrive.',
      },
      {
        name: 'Final check',
        when: 'Typically 1–3 weeks after',
        body: 'We send the invoice and photos your insurer needs to release the held-back depreciation.',
      },
    ],
    summary:
      'Filing to approval is typically 2–6 weeks. From your first call to a finished roof is usually 1–3 months, depending on your insurer and the storm backlog.',
  },
  deadline: {
    title: 'Don’t sit on storm damage.',
    body: 'Policies require prompt notice, and many set a hard deadline — often one year from the storm, sometimes less. Hail damage that looks minor can still let water in by next spring.',
  },
  note: 'General information, not legal or insurance advice. Your policy and your state’s rules decide what applies.',
}

export interface PriceRow {
  name: string
  range: string
  body: string
}

export const cost = {
  eyebrow: 'Cost',
  title: 'What it costs, before anyone visits.',
  lede: 'Real ranges, up front. Your written estimate is exact — these put you in the right ballpark so the conversation starts in the right place.',
  rows: [
    { name: 'Minor repair', range: '$350–$900', body: 'Replace damaged shingles, reseal flashing, swap a cracked pipe boot.' },
    { name: 'Leak repair', range: '$900–$2,500', body: 'Trace and fix a leak, including flashing or valley work and a little decking.' },
    { name: 'Partial replacement', range: '$2,500–$6,500', body: 'Rebuild one slope or section, matched as closely as available shingles allow.' },
    { name: 'Full replacement', range: '$10,000–$18,000', body: 'A typical one- or two-story home, architectural shingles, one layer torn off.' },
    { name: 'Premium & metal', range: '$18,000–$45,000+', body: 'Designer shingles, standing-seam metal, or large and complex roofs.' },
  ] satisfies PriceRow[],
  included: {
    title: 'Every replacement quote includes',
    items: [
      'Permit and tear-off of one layer',
      'Dump trailer and disposal',
      'Drip edge on eaves and rakes',
      'Ice & water shield at eaves and valleys',
      'Synthetic underlayment',
      'Starter strip, shingles, hip and ridge caps',
      'New pipe boots and flashing',
      'Ridge vent sized for your attic',
      'Magnetic sweep and full cleanup',
      'Warranty registration in your name',
    ],
  },
  extras: {
    title: 'Priced in writing, charged only if needed',
    items: [
      ['Replacement decking', '$85 per 4×8 sheet'],
      ['Each extra layer torn off', '$1,200–$2,500'],
      ['Chimney cricket', '$450–$900'],
      ['New skylight', '$1,100–$2,200 each'],
    ] as Array<[string, string]>,
  },
  factors: {
    title: 'What moves the price',
    items: [
      ['Size', 'Roofs are priced per square — 100 square feet of roof surface.'],
      ['Pitch', 'Steeper roofs need more safety gear and slower, careful work.'],
      ['Layers', 'Every extra layer of old shingles is more labor and disposal.'],
      ['Shape', 'Dormers, valleys, skylights and chimneys add flashing and time.'],
      ['Material', 'Architectural asphalt, designer shingles or metal.'],
    ] as Array<[string, string]>,
  },
  demoNote: 'Demo pricing: realistic examples for illustration. A live site publishes the contractor’s own numbers.',
}

export const roofTool = {
  eyebrow: 'Your roof, priced',
  title: 'Find your house. Set the pitch. See the price.',
  lede: 'We pull your building’s outline from public map data, you match the roof’s steepness on the drawing, and the estimate updates as you go.',
  steps: ['Find the house', 'Set the pitch', 'Your estimate'],
  addressHelp: 'We use it to find your building outline and fill in the form below. It only goes to the contractor if you send the form.',
  find: 'Find my roof',
  finding: 'Finding…',
  lookingUp: 'Looking up the address…',
  loadingPhoto: 'Loading the aerial view…',
  sample: 'Try it on a sample house',
  manual: 'No address handy? Estimate by home size',
  backToAddress: 'Use an address instead',
  locating: ['Finding the address', 'Pulling the building outline', 'Measuring the outline'],
  idle: 'Waiting for an address',
  confirm: 'Is this your house? Tap an outline to add or remove a building, like a detached garage.',
  pickHouse: 'We couldn’t tell which building is yours. Tap your house on the map, or tick it below.',
  pickStreet: 'We could only match this address to the street. Tap your house on the map, or tick it below.',
  pickLocked: 'Select your house on the map to continue.',
  buildingsLegend: 'Buildings to include',
  pitchHelp: 'Stand across the street and drag the ridge until the drawing matches your roof.',
  pitchLocked: 'Find your house first, then set the pitch here.',
  estimateLocked: 'Your price appears here once we have the building outline.',
  sizeLabel: 'Home size',
  sizeHelp: 'Finished square feet; include an attached garage.',
  storiesLabel: 'Stories',
  materialLabel: 'Material',
  layersLabel: 'Layers of old shingles',
  shapeLabel: 'Shape of the roof',
  shapeSuggested: 'Suggested from the outline',
  resultLabel: 'Estimated replacement',
  insuranceLine: 'Approved insurance claim? You’d typically pay your deductible.',
  cta: 'Get an exact estimate',
  disclaimer:
    'An estimate from the building outline and the pitch you set. Outlines from public data can miss a porch or include one, so final measurements are confirmed at your free inspection.',
  sampleNote: 'Sample house: an illustration, not a real property. Live addresses use public building outlines and aerial imagery.',
  errors: {
    not_configured: 'Live address lookup isn’t connected on this preview yet. Try the sample house, or estimate by home size.',
    invalid: 'That doesn’t look like a street address. Try the house number, street and ZIP.',
    address_not_found: 'We couldn’t find that address. Check the house number and ZIP, or pick one of the suggestions.',
    no_footprint: 'We found the address, but there’s no building outline for it in the public data yet. Estimate by home size instead — it takes a moment.',
    rate_limited: 'That’s a lot of lookups in a short time. Try again later, or estimate by home size.',
    busy: 'The map service is busy right now. Try again in a moment.',
    upstream: 'The lookup didn’t go through. Try again, or estimate by home size.',
    roof_not_found: 'We couldn’t find a roof under the pin. Put it in the middle of your roof and try again.',
    unmeasurable: 'This roof is too large or unusual to measure automatically. We’ll measure it at your free inspection; here’s a rough estimate meanwhile.',
    limit_reached: 'Instant measuring is paused for now. Here’s a rough estimate from the building outline instead.',
  },
  measure: {
    legend: 'Which building is your house?',
    tapPrompt: 'Tap the middle of your roof on the map, or pick your house below. Then we’ll measure it.',
    ready: 'Pin on your roof? Measure it.',
    button: 'Measure my roof',
    measuring: 'Measuring your roof…',
    measuringNote: 'From aerial imagery and laser height data. This takes about 20 seconds.',
    retry: 'Try measuring again',
    measuredTitle: 'Your measured roof',
    lowConfidence: 'Trees or a complex roof made this harder to measure, so we’ll confirm it at your free inspection.',
    extraBuildings: 'Garage or shed too? We’ll add it at your free inspection.',
    roughNote: 'Rough estimate from the public building outline. Your inspection gives the exact number.',
    locked: 'Measure your roof to see the price.',
    pitchMeasured: 'Measured from laser height data. Drag it only if you know your roof is steeper or flatter.',
    shapeMeasured: 'Suggested from the measurement',
    disclaimer:
      'Your roof was measured from aerial imagery and laser height data; the price uses your contractor’s rates for that size, pitch and shape. Final measurements are confirmed at your free inspection.',
  },
}

export const financing = {
  eyebrow: 'Financing',
  title: 'Paying out of pocket? Spread it out.',
  lede: 'Most homeowners don’t pay for a roof with one check. Here’s how people actually pay, and what a monthly plan looks like.',
  ways: [
    { name: 'Insurance claim', body: 'You pay your deductible. Your insurer pays the rest, usually in two checks.' },
    { name: 'Cash or check', body: 'A deposit at signing so materials can be ordered; the balance after your final walkthrough. Never paid in full up front.' },
    { name: 'Monthly plan', body: 'Financing through a lending partner, with approved credit. Seeing your options takes a few minutes.' },
  ],
  calculatorTitle: 'Estimate a monthly payment',
  amountLabel: 'Project amount',
  plans: [
    { id: 'promo', name: '12 months same-as-cash', months: 12, apr: 0, promo: true },
    { id: '60', name: '5-year fixed', months: 60, apr: 8.99, promo: false },
    { id: '120', name: '10-year fixed', months: 120, apr: 9.99, promo: false },
    { id: '180', name: '15-year fixed', months: 180, apr: 10.99, promo: false },
  ],
  promoNote:
    'Same-as-cash plans usually defer interest: pay the balance in full within the promo period and you pay no interest; if not, interest is charged from the start.',
  disclosure:
    'Example terms for illustration only — not an offer of credit. Financing is provided by a third-party lender and subject to credit approval. Rates, terms and promotional plans vary.',
  demoNote: 'Demo note: a live site names the contractor’s actual lending partner and current terms.',
}

export const during = {
  eyebrow: 'During the job',
  title: 'Yes, you can stay home.',
  lede: 'A roof replacement is loud, not dangerous. Here’s what to expect, and what to do the night before.',
  before: {
    title: 'The night before',
    items: [
      'Move cars out of the garage and driveway — the trailer needs the drive.',
      'Take pictures, mirrors and shelves off upstairs walls; hammering travels.',
      'Cover anything stored in the attic with an old sheet. Dust falls through.',
      'Point out sprinkler heads, invisible-fence lines and anything fragile in the beds.',
      'Plan for pets. The noise stresses most dogs; keep them inside or away for the day.',
    ],
  },
  onTheDay: {
    title: 'On the day',
    items: [
      'Noise from about 7 AM to late afternoon, loudest during tear-off.',
      'Power, water, Wi-Fi and heating or cooling all stay on.',
      'Nobody needs to come inside. We’ll ask before checking the attic.',
      'Kids and pets stay clear of the drop zone we mark around the house.',
      'Working from home? Avoid booking calls on the tear-off morning.',
    ],
  },
  stepOut:
    'We’ll tell you at the inspection if your situation is different: badly rotted decking over a bedroom, an active leak into a ceiling, or someone at home who is sensitive to noise or dust.',
  weather: 'Rain in the forecast? We watch the radar and never strip more roof than we can dry-in the same day.',
}

export const warranty = {
  eyebrow: 'Warranty',
  title: 'What’s guaranteed, and for how long.',
  lede: 'A new roof is covered three ways. Here’s who stands behind what.',
  layers: [
    {
      tag: 'From the manufacturer',
      name: 'Material warranty',
      term: 'Limited lifetime',
      body: 'Covers defects in the shingles themselves. Full coverage for an initial period, then prorated — the length depends on the product line.',
    },
    {
      tag: 'Upgrade we register for you',
      name: 'System warranty',
      term: 'Extended, non-prorated',
      body: 'When a certified installer uses the manufacturer’s full system — underlayment, starter, shingles, ridge — coverage extends, and some programs include labor.',
    },
    {
      tag: `From ${brand.company}`,
      name: 'Workmanship warranty',
      term: '10 years',
      body: 'Our installation: flashing, nailing, and any leak caused by how we built it. In writing, and transferable once if you sell the house.',
    },
  ],
  repairs: 'Repairs carry a 2-year workmanship warranty.',
  voids: {
    title: 'What can void a roof warranty',
    items: [
      'Another trade cutting into the roof — satellite, solar, vents — without proper flashing',
      'Pressure washing the shingles',
      'Mixing components from different manufacturers',
      'Never registering it (we do that for you)',
    ],
  },
  demoNote: 'Demo note: warranty lengths are examples. A live site states the contractor’s actual coverage.',
}

export const faq = {
  eyebrow: 'Questions',
  title: 'Everything else.',
  items: [
    {
      q: 'Do I need to be home during the job?',
      a: 'No. We need the exterior, the driveway and an outdoor outlet. Most homeowners are home for the walkthrough at the end.',
    },
    {
      q: 'What happens if it rains mid-job?',
      a: 'We only tear off what we can dry-in the same day, and we tarp anything open at the first sign of weather.',
    },
    {
      q: 'Can you shingle over my existing roof?',
      a: 'It’s sometimes allowed and rarely a good idea: it hides decking problems, adds weight, and can limit your warranty. We quote a full tear-off.',
    },
    {
      q: 'Do I need a permit?',
      a: 'Most cities require one for a replacement. We pull it and schedule any inspection; it’s included in the quote.',
    },
    {
      q: 'Will you work with my HOA?',
      a: 'Yes. We provide shingle samples and spec sheets for approval before anything is ordered.',
    },
    {
      q: 'Do you handle commercial roofs?',
      a: 'Yes — low-slope systems such as TPO, EPDM and modified bitumen for offices, retail and multi-family buildings. Commercial work is quoted after a site survey.',
    },
    {
      q: 'How soon can you start?',
      a: 'Inspections usually happen within a few days. Builds are scheduled once materials arrive — typically 1–3 weeks after you sign, longer after a major storm.',
    },
    {
      q: 'Can I choose my shingle color?',
      a: 'Yes. We bring samples and photos of finished roofs, and can suggest colors that suit your siding and stone.',
    },
  ],
}

export const estimate = {
  eyebrow: 'Free inspection & estimate',
  title: 'Get your estimate.',
  lede: 'Two minutes. Tell us what’s going on and we’ll come prepared — with your insurance situation, timing and budget already understood.',
  promises: [
    'A real person calls you back, usually the same business day.',
    'Free inspection with photos, whether or not you hire us.',
    'A written, itemized estimate. No pressure and no obligation.',
  ],
  consent: `By sending this, you agree that ${brand.company} may call or text you about your request. Message and data rates may apply. Consent is not a condition of purchase.`,
}

export const footer = {
  tagline: 'Roof repair and replacement, explained up front.',
  serviceArea: `Serving the ${brand.city} metro.`,
  credit: 'Concept demo designed and built by Wallace Shift.',
  creditCta: 'Want a site like this?',
}
