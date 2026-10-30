/**
 * Everything the page says about the business, in one place.
 *
 * Sources (checked 2026-10-29): the business's own site, completepaintingllc.net
 * (offline by then, read from search-engine copies: services, Bonner Springs,
 * phone, email, hours, "25 years of experience", mission, how rot is
 * repaired); its Facebook page "Complete Painting, LLC | Kansas City KS"; Yelp
 * and Manta listings with the same phone number; and Matthew, who found the
 * 2023 registration. No reviews, ratings, prices, warranties, licences or
 * owner names were found, so none are shown. The street address in older
 * directory listings is deliberately not published.
 */

export const business = {
  name: 'Complete Painting LLC',
  short: 'Complete Painting',
  phone: '(913) 742-1506',
  phoneHref: 'tel:+19137421506',
  smsHref: 'sms:+19137421506',
  email: 'leonellaalvarez56@gmail.com',
  home: 'Bonner Springs, Kansas',
  area: 'Bonner Springs, Kansas City and the surrounding area',
  experienceYears: 25,
  registered: 2023,
  facebook: 'https://www.facebook.com/p/Complete-Painting-LLC-100089499775971/',
  hours: [
    { days: 'Monday – Friday', time: '8 am – 5 pm' },
    { days: 'Saturday – Sunday', time: '8 am – noon' },
  ],
}

/** The timelapse, in order. Labels double as the hero's stage buttons. */
export const stages = [
  { id: 'weathered', label: 'Before', short: 'Before', caption: 'Faded, peeling and soft in places.' },
  { id: 'prepped', label: 'Wash & scrape', short: 'Wash', caption: 'Cleaned, scraped, sanded and masked.' },
  { id: 'primed', label: 'Repair & prime', short: 'Prime', caption: 'Rotten boards replaced, bare wood primed.' },
  { id: 'painted', label: 'Paint', short: 'Paint', caption: 'New color, coat by coat.' },
  { id: 'finished', label: 'Complete', short: 'Done', caption: 'Masking off. Walkthrough done.' },
] as const

export type StageId = (typeof stages)[number]['id']

export interface Service {
  id: string
  title: string
  /** For the services hall's index. */
  short: string
  body: string
  points: string[]
  image: { src: string; alt: string }
}

export const services: Service[] = [
  {
    id: 'exterior',
    title: 'Exterior painting',
    short: 'Exterior',
    body: 'Siding, trim, doors and porches, prepared properly so the new color holds up to Kansas sun, storms and winters.',
    points: ['Washing, scraping and sanding', 'Caulking and priming bare wood', 'Body, trim and door colors'],
    image: { src: '/demos/painting/service-exterior.webp', alt: 'A deep blue-green house with warm white trim and a golden ochre front door' },
  },
  {
    id: 'interior',
    title: 'Interior painting',
    short: 'Interior',
    body: 'Walls, ceilings and trim with clean lines and even coverage, and your rooms protected while the work is underway.',
    points: ['Walls and ceilings', 'Baseboards, casings and crown', 'Furniture and floors covered'],
    image: { src: '/demos/painting/service-interior.webp', alt: 'A freshly painted living room in warm greige with crisp white trim' },
  },
  {
    id: 'cabinets',
    title: 'Cabinet refinishing',
    short: 'Cabinets',
    body: 'A new color on the cabinets you already have: one of the biggest changes a kitchen can get without a remodel.',
    points: ['Kitchen and bath cabinets', 'Smooth, durable finish', 'A new look without new boxes'],
    image: { src: '/demos/painting/service-cabinets.webp', alt: 'Shaker kitchen cabinets refinished in deep sage green with brass pulls' },
  },
  {
    id: 'carpentry',
    title: 'Rotten wood replacement',
    short: 'Rotten wood',
    body: 'Soft, rotted trim is never painted over. The damage is assessed, the rotten wood removed and new wood installed, then primed and painted to match.',
    points: ['Fascia, sills and corner boards', 'Porch columns and railings', 'Primed and painted to match'],
    image: { src: '/demos/painting/service-carpentry.webp', alt: 'A new primed white fascia board and corner trim beside blue-green siding' },
  },
  {
    id: 'commercial',
    title: 'Commercial painting',
    short: 'Commercial',
    body: 'Storefronts, offices and rental properties, scheduled around the way your business runs.',
    points: ['Storefronts and offices', 'Rental and investment properties', 'Interior and exterior'],
    image: { src: '/demos/painting/service-commercial.webp', alt: 'A small storefront freshly painted in warm off-white with charcoal window frames' },
  },
]

/**
 * The sequence the hero shows. These are the standard stages of a full
 * exterior repaint; confirm the wording with the business before launch.
 */
export const process = [
  { title: 'Walkthrough & estimate', body: 'We look at the house with you, talk colors and condition, and put the scope in writing.' },
  { title: 'Wash & scrape', body: 'Dirt and mildew washed off, loose paint scraped and sanded, windows and plants covered.' },
  { title: 'Repair & prime', body: 'Rotten wood replaced with new boards, gaps caulked, bare wood primed so paint can grip.' },
  { title: 'Paint', body: 'Body, trim and door in your colors, with clean lines where they meet.' },
  { title: 'Clean up & walkthrough', body: 'Masking off, site cleaned, and a final look together before we call it complete.' },
]

export const faqs = [
  {
    q: 'What kinds of painting do you do?',
    a: 'Exterior and interior painting, cabinet refinishing, rotten wood replacement, and commercial painting for homes and businesses.',
  },
  {
    q: 'My trim has soft, rotten spots. Can you still paint?',
    a: 'Yes. Rotted wood is assessed, removed and replaced with new wood first, then primed and painted to match, so the new paint isn’t hiding a problem.',
  },
  {
    q: 'How does the color studio work?',
    a: 'Upload a photo of your house, pick siding, trim and door colors, and an AI preview shows the house repainted. It is a guide for comparing ideas, not an exact color match, so check real paint samples on the house before choosing.',
  },
  {
    q: 'Is my photo stored?',
    a: 'No. Your photo stays in your browser until you choose to create a preview. It is then sent to OpenAI to make the image and is not saved by this website.',
  },
  {
    q: 'Where do you work?',
    a: `${business.area}. Call or text to check your address.`,
  },
  {
    q: 'When can I reach you?',
    a: `${business.hours.map((h) => `${h.days}, ${h.time}`).join('; ')}. Call or text ${business.phone}.`,
  },
]
