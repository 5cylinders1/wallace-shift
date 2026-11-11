/**
 * Everything the SoLara Salon concept says about the business, in one place.
 * Read 2026-11-11 from the salon's Square site, its Google Business Profile,
 * Fresha and MapQuest. Sources per fact are in docs/demos/solara.md.
 * Nothing here is invented: there are no prices, durations or staff beyond Lara.
 */

export const MEDIA = '/demos/solara'

export const salon = {
  name: 'SoLara Salon',
  wordmark: 'SoLara',
  stylist: 'Lara Black',
  role: 'Colorist & Stylist',
  area: 'South Overland Park',
  building: 'Aspen Salon & Spa Suites',
  street: '8025 W 151st St',
  city: 'Overland Park',
  region: 'KS',
  postal: '66223',
  phone: '(913) 579-0178',
  phoneHref: 'tel:+19135790178',
  // Specializing in haircolor and customized looks for women of all ages (Square site).
  specialty: 'Haircolor and customized looks for women of all ages.',
  // Coordinates from the Google Business Profile pin.
  geo: { lat: 38.8528639, lng: -94.680623 },
} as const

export const links = {
  directions: 'https://www.google.com/maps/dir/?api=1&destination=SoLara+Salon%2C+8025+W+151st+St%2C+Overland+Park%2C+KS+66223',
  googleReviews: 'https://www.google.com/maps/search/?api=1&query=SoLara+Salon+8025+W+151st+St+Overland+Park+KS',
  shop: 'https://solara-salon.square.site/',
  giftCards: 'https://solara-salon.square.site/product/gift-card/22',
} as const

export const nav = [
  { href: '#services', label: 'Services' },
  { href: '#work', label: 'Work' },
  { href: '#clean-color', label: 'Clean color' },
  { href: '#reviews', label: 'Reviews' },
  { href: '#visit', label: 'Visit' },
] as const

/** 0 = Sunday. Minutes after midnight, Central time. Google and Fresha agree. */
export const HOURS: Record<number, { open: number; close: number }> = {
  0: { open: 10 * 60, close: 17 * 60 },
  1: { open: 11 * 60, close: 20 * 60 },
  2: { open: 11 * 60, close: 20 * 60 },
  3: { open: 11 * 60, close: 20 * 60 },
  4: { open: 11 * 60, close: 20 * 60 },
  5: { open: 11 * 60, close: 20 * 60 },
  6: { open: 10 * 60, close: 17 * 60 },
}

export const hoursTable = [
  { days: 'Monday – Friday', hours: '11 a.m. – 8 p.m.' },
  { days: 'Saturday & Sunday', hours: '10 a.m. – 5 p.m.' },
] as const

export interface Service {
  id: string
  name: string
  line: string
  detail: string
  /** Where the service is evidenced, for the docs and for review. */
  source: string
}

/** The menu as the public record shows it. Prices and durations are not published anywhere. */
export const services: Service[] = [
  {
    id: 'color',
    name: 'Haircolor',
    line: 'All-over color, gloss and root retouch',
    detail: 'Custom-mixed color in O&M CØR, from a soft refresh to a full change of shade.',
    source: 'Square site: "Specializing in haircolor", "Now offering O&M CØR COLOR"; Google reviews',
  },
  {
    id: 'highlights',
    name: 'Highlights & dimension',
    line: 'Highlights, balayage and blended blonde',
    detail: 'Placed to suit your cut, your hair type and your coloring.',
    source: 'Google reviews (Janet H., Troy & Patty N.); owner photos',
  },
  {
    id: 'vivid',
    name: 'Vivid & fashion color',
    line: 'Blues, violets, ruby, copper and rose gold',
    detail: 'Saturated color for when you want to be noticed.',
    source: 'Owner photos on the Google profile',
  },
  {
    id: 'correction',
    name: 'Color correction',
    line: 'Brassy, uneven or box-dyed color, set right',
    detail: 'Correction is a plan, not a guess. Some hair needs more than one visit.',
    source: 'Google reviews: "very knowledgeable about color and color correction", "it took several times"',
  },
  {
    id: 'cut',
    name: 'Cuts & styling',
    line: 'Precision cuts, bobs and shape-ups',
    detail: 'Cut the way you ask, with honest input on what suits your hair type.',
    source: 'Google reviews (Cheryl H., Alissa B.); review services: Haircut, Hairstyling',
  },
  {
    id: 'keratin',
    name: 'Keratin treatment',
    line: 'Smoothing for thick, frizzy hair',
    detail: 'For thick or frizzy hair that you want smoother and calmer.',
    source: 'Google review (Troy & Patty N.): "I also love the keratin treatments"',
  },
  {
    id: 'blowdry',
    name: 'Blow dry & finish',
    line: 'Shampoo, conditioning and a polished blowout',
    detail: 'Finished with Kevin Murphy styling products.',
    source: 'Fresha listing: "Blow Dry"; review services: Shampoo & conditioning; Square site products',
  },
  {
    id: 'consult',
    name: 'Color consultation',
    line: 'Not sure what to book? Start here',
    detail: 'Talk through your hair history and the look you want before anything is mixed.',
    source: 'Proposed for the concept: confirm with Lara',
  },
]

export type WorkTag = 'vivid' | 'blonde' | 'red' | 'brunette' | 'correction'

export const workFilters: { id: 'all' | WorkTag; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'vivid', label: 'Vivid' },
  { id: 'blonde', label: 'Blonde' },
  { id: 'red', label: 'Red & copper' },
  { id: 'brunette', label: 'Brunette' },
  { id: 'correction', label: 'Before & after' },
]

export interface WorkPhoto {
  slug: string
  title: string
  alt: string
  tag: WorkTag
  /** Intrinsic size of the 640 rendition. */
  w: number
  h: number
  /** Width of the large rendition. */
  full: number
  /** Lara's own caption is part of the image, so the page adds none on top. */
  captioned?: boolean
}

/** Lara's own photos, posted as the owner on the salon's Google profile. */
export const work: WorkPhoto[] = [
  { slug: 'ocean-blue-bob', title: 'Ocean blues', alt: 'A wavy bob colored in layered sapphire, teal and denim blue', tag: 'vivid', w: 640, h: 640, full: 1400 },
  { slug: 'lived-in-blonde', title: 'Lived-in blonde', alt: 'Long beach waves with bright blonde balayage over a deeper root', tag: 'blonde', w: 640, h: 854, full: 1400 },
  { slug: 'ruby-bob', title: 'Ruby', alt: 'A glossy angled bob in bright ruby red, photographed in sunlight', tag: 'red', w: 640, h: 854, full: 1400 },
  { slug: 'brass-to-cool', title: 'Brass to cool blonde', alt: 'Before and after: long orange-toned blonde hair, then cool blonde waves with a soft root', tag: 'correction', w: 640, h: 640, full: 1400 },
  { slug: 'plum-crop', title: 'Plum', alt: 'A short stacked crop in deep plum with a magenta shine', tag: 'vivid', w: 640, h: 640, full: 1400 },
  { slug: 'bronde-gloss', title: 'Bronde gloss', alt: 'Long, very straight hair with a glossy golden-brown finish', tag: 'brunette', w: 640, h: 854, full: 1400 },
  { slug: 'rose-gold', title: 'Rose gold', alt: 'Shoulder-length waves in soft rose gold', tag: 'red', w: 640, h: 854, full: 1400 },
  { slug: 'icy-blonde', title: 'Icy blonde', alt: 'A sleek long bob in cool, icy blonde', tag: 'blonde', w: 640, h: 854, full: 1400 },
  { slug: 'violet-to-orchid', title: 'Violet to orchid', alt: 'Long waves melting from violet roots into orchid pink ends', tag: 'vivid', w: 640, h: 854, full: 1400 },
  { slug: 'brassy-to-beauty', title: 'Brassy to beauty', alt: 'Before and after: bright brassy orange hair corrected to a smooth beige blonde', tag: 'correction', w: 640, h: 640, full: 1400, captioned: true },
  { slug: 'copper-shag', title: 'Copper shag', alt: 'A layered, tousled shag with copper ribbons through brunette', tag: 'brunette', w: 640, h: 854, full: 1400 },
  { slug: 'silver-balayage', title: 'Silver balayage', alt: 'Long waves with silver and ash balayage, shown mirrored', tag: 'blonde', w: 640, h: 640, full: 1400 },
  { slug: 'lavender-bob', title: 'Lavender bob', alt: 'A shoulder-length bob in violet fading to lavender ends', tag: 'vivid', w: 640, h: 854, full: 1400 },
  { slug: 'copper-waves', title: 'Copper waves', alt: 'Long, full waves in bright copper, shown mirrored', tag: 'red', w: 640, h: 640, full: 1200, captioned: true },
  { slug: 'caramel-ribbons', title: 'Caramel ribbons', alt: 'Straight brunette hair with fine caramel highlights', tag: 'brunette', w: 640, h: 854, full: 1400 },
  { slug: 'paula-before-after', title: 'Highlights to rich brunette', alt: 'Before and after: grown-out highlights changed to a rich, even brunette', tag: 'correction', w: 640, h: 640, full: 1024, captioned: true },
  { slug: 'golden-blonde', title: 'Golden blonde', alt: 'Tousled waves in warm golden blonde', tag: 'blonde', w: 640, h: 854, full: 1400 },
  { slug: 'red-violet-bob', title: 'Black cherry', alt: 'An angled bob in deep red-violet', tag: 'vivid', w: 640, h: 854, full: 1400 },
]

export interface Review {
  name: string
  when: string
  stars: number
  text: string
}

/** The five written Google reviews, verbatim. A sixth (4 stars) has no text. */
export const reviews: Review[] = [
  {
    name: 'Alissa Bender',
    when: 'a year ago',
    stars: 5,
    text: 'Lara does a wonderful job and is extremely pleasant while doing it! She knows her stuff and I can trust her to modify my requests to what best suits my hair type and coloring. Not once have I left disappointed...in fact, I always leave after my cuts and colors feeling like a million bucks!',
  },
  {
    name: 'Janet Heslop',
    when: '2 years ago',
    stars: 5,
    text: 'I have used Lara for years for my cuts, color and highlights. I trust her completely as she is very knowledgeable about color and color correction. She’s a great listener and always tries to resolve any hair issues I may be having. I love that she uses a color line that is healthier for me and the environment! She’s great!',
  },
  {
    name: 'Troy & Patty Nelson',
    when: '2 years ago',
    stars: 5,
    text: 'I have been going to Lara for several years…. it took several times to get my hair into shape… She worked & worked & worked & my hair is never looked better. I pre-schedule myself every seven or so weeks… With either color combo, highlights, haircut, etc.. I also love the keratin treatments… I have thick frizzy, crazy hair… She makes it actually look normal… You won’t be disappointed…. she’s more than my stylist… She’s become my friend…',
  },
  {
    name: 'Tina Forir',
    when: '2 years ago',
    stars: 5,
    text: 'I would definitely recommend Lara, she does an excellent job on my hair! She is very knowledgeable when it comes to hair or color, just ask her! I decided to go back to my original color and she matched it perfectly! I get lots of compliments on my hair and color!! Thanks Lara!!! ☺️',
  },
  {
    name: 'Cheryl Horton',
    when: '2 years ago',
    stars: 5,
    text: 'I’ve been going to Lara for several years now since I moved here as a reference from a friend that’s been going to her for years! She cuts my hair the exact way I ask….always listens and gives me input. She also has been flexible…if something comes up and I have to change my appointment, she always works to get me in!! She is great!',
  },
]

export const rating = { score: '4.8', count: 6, source: 'Google' } as const

/** Exactly as the Square site lists the O&M CØR line (spelling of sodium chloride corrected). */
export const freeFrom = [
  'Sulfates',
  'Parabens',
  'Triclosan',
  'Propylene glycol',
  'Phthalates',
  'Sodium chloride',
  'Animal testing',
] as const

/** Google Business Profile "About" attributes. */
export const amenities = [
  'Wheelchair-accessible entrance, restroom and parking',
  'Free on-site parking',
  'LGBTQ+ friendly',
  'Appointments recommended',
  'Credit, debit, mobile pay and checks',
] as const
