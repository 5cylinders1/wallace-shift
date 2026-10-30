/**
 * Business/location/category provenance: docs/demos/bucyrus-sources.md.
 * Maintenance and modifications are user-authorized demo categories. Examples
 * below are discussion prompts, not a verified service menu or capability claim.
 */
export type BucyrusService = {
  slug: 'maintenance' | 'auto-repair' | 'drivetrain' | 'modifications'
  name: string
  title: string
  description: string
  heading: string
  intro: string
  summary: string
  image: { src: string; alt: string; caption: string; width: number; height: number }
  sections: { heading: string; paragraphs: string[]; items?: string[] }[]
  preparation: string[]
  faq: { question: string; answer: string }[]
}

export const bucyrusServices: BucyrusService[] = [
  {
    slug: 'maintenance',
    name: 'Standard maintenance',
    title: 'Vehicle Maintenance in Bucyrus, KS | Bucyrus Auto & Drivetrain',
    description: 'Discuss oil, filter, fluid and scheduled maintenance needs with Bucyrus Auto & Drivetrain in Bucyrus, Kansas. Bring your mileage and service history.',
    heading: 'Vehicle maintenance in Bucyrus, Kansas.',
    intro: 'Routine upkeep starts with knowing your vehicle. Tell Bucyrus Auto & Drivetrain what you drive, its mileage and what may be due, then call to confirm the work and availability.',
    summary: 'Oil changes, filters, fluids or scheduled upkeep? Start with your mileage and service history.',
    image: {
      src: '/media/bucyrus/film-detail.webp',
      alt: 'Close view of a classic car headlamp, chrome trim and burgundy paint',
      caption: 'Illustrative car imagery · Not a customer vehicle',
      width: 1920,
      height: 1080,
    },
    sections: [
      {
        heading: 'Start with what is due.',
        paragraphs: [
          'Your owner’s manual and maintenance records give the conversation a useful starting point. Share the last known service date and mileage. If the history is incomplete, say so; there is no need to guess what a previous owner had done.',
          'Oil and filter changes, fluid questions and scheduled upkeep are topics to bring to the shop. Requirements vary by vehicle and use, so confirm the appropriate work before choosing a service.',
        ],
      },
      {
        heading: 'Describe how you use your vehicle.',
        paragraphs: [
          'A daily commute, frequent short trips, towing or long periods parked can make useful context. Mention these alongside any reminder on the dashboard. A new noise, leak or change in how the vehicle drives deserves its own description, even when you are calling about routine maintenance.',
          'Ask which items can be addressed together and what information the shop needs before scheduling. Confirm scope, expected cost and timing directly; this demo does not provide a maintenance quote.',
        ],
      },
    ],
    preparation: [
      'Year, make, model and current mileage.',
      'Date and mileage of the last known maintenance.',
      'Relevant records or an owner’s manual service reminder.',
      'How you use the vehicle and any recent changes you have noticed.',
    ],
    faq: [
      {
        question: 'How often should I change my oil?',
        answer: 'Use the guidance for your exact vehicle as the starting point. Share your mileage, driving habits and service history with the shop to discuss what applies; a single interval does not fit every vehicle.',
      },
      {
        question: 'Can I request several maintenance items together?',
        answer: 'List the items you have in mind when you call. The shop can confirm which requests it can accommodate and discuss scheduling before you bring the vehicle in.',
      },
    ],
  },
  {
    slug: 'auto-repair',
    name: 'Auto repair',
    title: 'Auto Repair in Bucyrus, KS | Bucyrus Auto & Drivetrain',
    description: 'Contact Bucyrus Auto & Drivetrain about a vehicle repair in Bucyrus, Kansas. Explain the symptoms, when they occur and any recent work before scheduling.',
    heading: 'Auto repair in Bucyrus, Kansas.',
    intro: 'Something feels different behind the wheel. Start with what you have noticed, even if you do not know the cause. A clear description gives the shop a better starting point for your repair enquiry.',
    summary: 'A new noise, warning light or change in how your vehicle drives? Tell us what you have noticed.',
    image: {
      src: '/media/bucyrus/shop-classic.webp',
      alt: 'Red and white classic car outside a shop in a supplied photograph',
      caption: 'Original supplied photograph · Project details unverified',
      width: 720,
      height: 960,
    },
    sections: [
      {
        heading: 'Describe the symptom, not a guessed repair.',
        paragraphs: [
          'Explain what changed and when you first noticed it. Is it a sound, a smell, a warning on the dashboard or a difference in how the vehicle responds? Note whether it happens every time or only under certain conditions.',
          'Details such as a cold start, a particular speed or a recent service can help frame the conversation. You do not need to name the failed part. If you have a warning message or an existing written report, keep the wording available.',
        ],
      },
      {
        heading: 'Agree on the next step.',
        paragraphs: [
          'Call Bucyrus Auto & Drivetrain to discuss your vehicle and confirm whether the requested work is within the shop’s scope. Ask what an initial appointment involves and how any further work would be discussed with you.',
          'Confirm timing and costs directly before making arrangements. If the vehicle cannot be driven, explain that when you call and discuss how it would arrive. An online description alone cannot establish the cause or a repair price.',
        ],
      },
    ],
    preparation: [
      'Vehicle year, make, model and mileage.',
      'What changed, when it started and how often it happens.',
      'Exact dashboard messages or existing repair reports.',
      'Recent work and whether the vehicle can be driven.',
    ],
    faq: [
      {
        question: 'Do I need to know what is wrong before calling?',
        answer: 'No. Describe what you can observe and the circumstances in which it happens. Avoid guessing at a component; the shop can discuss what information it needs next.',
      },
      {
        question: 'Can I get a repair price from this website?',
        answer: 'This demo does not provide quotes or diagnoses. Contact the shop to discuss the vehicle, the requested work and what is needed before a price can be established.',
      },
    ],
  },
  {
    slug: 'drivetrain',
    name: 'Drivetrain concerns',
    title: 'Drivetrain Concerns in Bucyrus, KS | Bucyrus Auto & Drivetrain',
    description: 'Discuss shifting changes, noises and vibrations with Bucyrus Auto & Drivetrain in Bucyrus, Kansas. Learn which observations to share before an appointment.',
    heading: 'Drivetrain concerns in Bucyrus, Kansas.',
    intro: 'A change in shifting, a vibration or an unfamiliar noise is worth describing clearly. Bring your observations to Bucyrus Auto & Drivetrain and confirm the next step for your particular vehicle.',
    summary: 'A noise, vibration or change in shifting? Describe when it happens and what feels different.',
    image: {
      src: '/media/bucyrus/drivetrain.webp',
      alt: 'Underbody view of a vehicle’s differential and axle in a supplied photograph',
      caption: 'Original supplied photograph · Project details unverified',
      width: 960,
      height: 542,
    },
    sections: [
      {
        heading: 'What the drivetrain does.',
        paragraphs: [
          'The drivetrain transfers power to the wheels. Depending on the vehicle, its layout can include a transmission, driveshafts, differentials and axles. Front, rear, all and four wheel drive vehicles arrange these components differently.',
          'A symptom does not identify its source by itself. A sound or vibration can have more than one explanation, so describe the experience without assuming that a particular component needs replacement.',
        ],
      },
      {
        heading: 'The conditions matter.',
        paragraphs: [
          'Mention whether the concern appears while starting off, accelerating, coasting, turning or changing gears. Note whether it happens when the vehicle is cold or after driving, and whether a dashboard message appears alongside it.',
          'Share any recent repair, tire change or modification that preceded the concern. Existing records can provide context without proving a cause. Call to confirm the shop’s scope for your vehicle and discuss scheduling; this page cannot diagnose a drivetrain issue.',
        ],
      },
    ],
    preparation: [
      'Year, make, model, mileage and drivetrain type if known.',
      'A plain description of the sound, vibration or shifting change.',
      'When it occurs and when you first noticed it.',
      'Recent repairs, modifications and any warning messages.',
    ],
    faq: [
      {
        question: 'Does a vibration mean the transmission needs work?',
        answer: 'A vibration alone does not establish the cause. Describe where you notice it and the driving conditions when it happens, then discuss the appropriate next step with the shop.',
      },
      {
        question: 'What if I do not know my drivetrain type?',
        answer: 'Start with the year, make and model. If you have vehicle records, have them available. The shop can tell you which additional details it needs to discuss your request.',
      },
    ],
  },
  {
    slug: 'modifications',
    name: 'Modifications & upgrades',
    title: 'Vehicle Modifications in Bucyrus, KS | Bucyrus Auto & Drivetrain',
    description: 'Discuss a vehicle modification or upgrade with Bucyrus Auto & Drivetrain in Bucyrus, Kansas. Start with your goals, existing modifications and intended use.',
    heading: 'Vehicle modifications in Bucyrus, Kansas.',
    intro: 'An upgrade starts with a clear goal. Tell Bucyrus Auto & Drivetrain what you want to change, how you use the vehicle and what is already installed. Confirm the project’s scope before buying parts.',
    summary: 'Have an upgrade in mind? Discuss your goals, existing modifications and how you use the vehicle.',
    image: {
      src: '/media/bucyrus/film-engine.webp',
      alt: 'Burgundy classic muscle car with its hood raised above a polished V8 engine bay',
      caption: 'Illustrative car imagery · Not a customer build',
      width: 1920,
      height: 1080,
    },
    sections: [
      {
        heading: 'Define what you want to change.',
        paragraphs: [
          'Explain the result you are looking for in everyday terms. Is the project about appearance, driving feel or a particular mechanical goal? Include your budget range, timing and any existing concern you want to resolve before planning new work.',
          'Describe how the car is used: daily travel, occasional weekends or another intended purpose. Bring a list of current modifications and any available installation records. The starting configuration matters when discussing a new component.',
        ],
      },
      {
        heading: 'Ask the practical questions first.',
        paragraphs: [
          'Discuss fitment, compatibility and whether supporting work would be needed. If you already have parts, share the manufacturer and part numbers and ask whether the shop can work with them. Confirm acceptance before ordering or dropping anything off.',
          'Ask how the proposal relates to your intended street use, applicable inspection requirements and existing vehicle or parts warranties. Confirm the scope, responsibilities and expected cost directly. This demo promises neither a particular performance gain nor availability for every modification.',
        ],
      },
    ],
    preparation: [
      'Vehicle year, make, model and current configuration.',
      'Your goal, intended use, budget range and timing.',
      'Existing modifications and available installation records.',
      'Part numbers or product details for anything already purchased.',
    ],
    faq: [
      {
        question: 'Should I buy parts before contacting the shop?',
        answer: 'Discuss the proposal first. Ask about compatibility, any supporting work and whether the shop accepts the parts you are considering. A product listing alone does not confirm suitability for your vehicle.',
      },
      {
        question: 'Can you promise a specific power increase?',
        answer: 'No performance gain is promised by this demo. Share the outcome you have in mind and ask what can reasonably be established for your vehicle and proposed project.',
      },
    ],
  },
]
