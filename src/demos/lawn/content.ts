/**
 * Everything the page says about the business, in one place. Every fact
 * comes from Trawsome Lawn Care's public Nextdoor page (story, services,
 * contact details, Neighborhood Favorite years); nothing here is invented.
 * Ratings, review counts, prices and years in business are deliberately
 * absent because none were supplied.
 */

export const business = {
  name: 'Trawsome Lawn Care',
  owner: 'Ben Traw',
  ownerFull: 'Benjamin Traw',
  phone: '(913) 282-8865',
  phoneHref: 'tel:+19132828865',
  smsHref: 'sms:+19132828865',
  email: 'benjamintraw@gmail.com',
  /** Service-area business: a town, never a street address. */
  home: 'Stilwell, Kansas',
  nextdoor: 'https://nextdoor.com/pages/trawsome-lawn-care-bucyrus-ks/',
  faveYears: [2022, 2023, 2024, 2025],
}

/**
 * Communities shown for local search. Kept in step with
 * LAWN_SERVICE_RADIUS_MILES by hand: these are the towns whose centers sit
 * inside the default 15-mile radius. The estimator's own check is the
 * authority for any one address.
 */
export const serviceTowns = ['Stilwell', 'Bucyrus', 'Overland Park', 'Leawood', 'Olathe', 'Spring Hill', 'Louisburg']

export const stages = [
  { id: 'before', label: 'Overgrown', caption: 'Two months without a mow.' },
  { id: 'mowed', label: 'Mowed & striped', caption: 'Cut, striped and trimmed.' },
  { id: 'finished', label: 'Trawsome', caption: 'Beds, shrubs and drives cleaned up.' },
] as const

export interface Service {
  id: string
  title: string
  body: string
  items: string[]
  image?: { src: string; alt: string }
}

export const services: Service[] = [
  {
    id: 'mowing',
    title: 'Mowing & trimming',
    body: 'A clean, even cut on a schedule that fits your yard, finished the way a good mow should be.',
    items: ['Mowing, weekly or every two weeks', 'Trimming along every edge', 'Porches, walks and driveways blown off'],
    image: { src: '/demos/lawn/edge.webp', alt: 'A crisp trimmed edge where a striped lawn meets a concrete walk' },
  },
  {
    id: 'shrubs',
    title: 'Shrubs & beds',
    body: 'Tidy shrubs and weed-free beds make the whole house look cared for.',
    items: ['Shrub trimming', 'Weed removal', 'Beds prepared for new landscaping'],
    image: { src: '/demos/lawn/beds.webp', alt: 'Neatly clipped boxwoods in a fresh mulch bed against a limestone wall' },
  },
  {
    id: 'seasonal',
    title: 'Seasonal cleanups',
    body: 'Spring and fall bring the most work. Leaves, sticks and fallen limbs are cleared and hauled off.',
    items: ['Leaf removal', 'Tree limb removal', 'One-time cleanups'],
    image: { src: '/demos/lawn/leaves.webp', alt: 'A lawn half covered in autumn leaves and half cleared to fresh stripes' },
  },
  {
    id: 'turf',
    title: 'Seeding & fertilizing',
    body: 'Thin or patchy spots filled in and fed, so the lawn comes back thicker.',
    items: ['Seeding', 'Fertilizing'],
  },
]

/** Themes from Nextdoor's summary of neighbors' recommendations, not individual reviews. */
export const neighborThemes = [
  { title: 'Dependable', body: 'Reliable, professional, quality work.' },
  { title: 'Hard-working', body: 'Praised for his work ethic on every job.' },
  { title: 'Great communication', body: 'Prompt, courteous and personable.' },
  { title: 'Attention to detail', body: 'Trimming shrubs, removing weeds, preparing beds.' },
  { title: 'Affordable', body: 'Quality lawn care at a fair price.' },
  { title: 'Weather-aware', body: 'Considerate of the weather when scheduling.' },
]

export const faqs = [
  {
    q: 'How does the instant estimate work?',
    a: 'Enter your address and the estimator finds the grass on your lot in public aerial imagery, then prices a mow by its size. You can paint or erase areas if it missed something. Ben confirms the price when he sees the yard, so there are no surprises.',
  },
  {
    q: 'What is included in a mow?',
    a: 'Mowing, trimming along the edges, and blowing clippings off your porch, walks and driveway.',
  },
  {
    q: 'What if I’m not happy with the work?',
    a: 'Ben personally guarantees your satisfaction. If you’re not happy, he’ll make it right.',
  },
  {
    q: 'Do you do more than mowing?',
    a: 'Yes: shrub trimming, weed removal, seeding, fertilizing, leaf removal and tree limb removal. Add them to your request and Ben will quote them after a look at the yard.',
  },
  {
    q: 'Where do you work?',
    a: `Homes around Stilwell, Kansas, including ${serviceTowns.slice(1, -1).join(', ')} and ${serviceTowns[serviceTowns.length - 1]}. The estimator checks your address against the service area.`,
  },
  {
    q: 'How do I get started?',
    a: `Request service from the estimator, or call or text Ben at ${business.phone}.`,
  },
]
