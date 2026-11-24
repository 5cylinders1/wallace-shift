/**
 * Everything the page says about the business, in one place. Every fact
 * comes from Lareau Landscape & Design's own website (lareaulandscape.com:
 * story, services, warranties, contact details, the Rich Zak testimonial),
 * its Google Business Profile (rating, review count, hours, Lenexa listing,
 * the reviews quoted verbatim) or its Instagram bio (founded '96, serving the
 * residential KC metro). Nothing here is invented: no prices, project counts
 * or awards. The street address on the Google profile is left off on purpose.
 * The hero's yard frames are generated illustrations and say so on the page.
 */

export const business = {
  name: 'Lareau Landscape & Design',
  shortName: 'Lareau',
  phone: '(913) 888-5599',
  phoneHref: 'tel:+19138885599',
  email: 'tlareau@gmail.com',
  /** Service-area business: a town, never a street address. */
  home: 'Lenexa, Kansas',
  area: 'the Kansas City metro',
  founded: 1996,
  hours: 'Monday to Friday, 8 AM to 5 PM',
  hoursShort: 'Mon–Fri · 8 AM–5 PM',
  instagram: 'https://www.instagram.com/lareaulandscape/',
  google: 'https://www.google.com/maps/search/?api=1&query=Lareau+Landscape+%26+Design+Lenexa+KS',
  rating: 5.0,
  reviewCount: 8,
}

/** The scroll timelapse in the hero (generated illustrations, scripts/lawn/generate.py). */
export const stages = [
  { id: 'before', label: 'Overgrown' },
  { id: 'mowed', label: 'Mowed & striped' },
  { id: 'finished', label: 'Landscaped' },
] as const

export interface Service {
  id: string
  title: string
  body: string
  items: string[]
  image?: { src: string; alt: string; width: number; height: number }
}

export const services: Service[] = [
  {
    id: 'patios',
    title: 'Patios & retaining walls',
    body: 'Paver and flagstone patios, walls and steps built with an ICPI and NCMA certified installer on site, so they stay solid instead of becoming a maintenance problem later.',
    items: ['Paver and flagstone patios', 'Retaining and seat walls', 'Stone steps and walkways', '5-year structural warranty'],
    image: { src: '/demos/lawn/patios.webp', alt: 'A curved paver patio with flagstone steps, boulders and fresh plantings behind a white house', width: 1200, height: 800 },
  },
  {
    id: 'fire',
    title: 'Outdoor kitchens & fire',
    body: 'Outdoor kitchens, fire pits and stone fireplaces that turn a patio into somewhere to gather.',
    items: ['Outdoor kitchens', 'Fire pits', 'Outdoor fireplaces'],
    image: { src: '/demos/lawn/fire.webp', alt: 'A stone outdoor fireplace with a fire burning, firewood niches and a white outdoor sectional', width: 1000, height: 667 },
  },
  {
    id: 'planting',
    title: 'Trees, shrubs & perennials',
    body: 'From a full design and install down to a one-hour planting consultation. Evergreens, flowering shrubs and perennials, chosen for bloom timing, fall color, fragrance, upkeep, growth and sun.',
    items: ['Planting design and installation', 'Evergreens and flowering shrubs', 'Perennial beds', '1-year plant replacement warranty'],
    image: { src: '/demos/lawn/planting.webp', alt: 'A gravel garden path between beds of red flowers, green lawn and mature trees', width: 1000, height: 667 },
  },
  {
    id: 'lighting',
    title: 'Landscape lighting',
    body: 'Low-voltage lighting for safety and evenings outside, designed for as little upkeep as possible and installed by a team that has been doing it for decades.',
    items: ['Patio and garden lighting', 'A well-lit house for safety', 'Fixture warranties up to a lifetime'],
    image: { src: '/demos/lawn/lighting.webp', alt: 'A copper lantern mounted on a stone pillar', width: 1200, height: 800 },
  },
  {
    id: 'water',
    title: 'Drainage & sprinklers',
    body: 'Water moved away from the house, and sprinklers repaired or installed, most often alongside a patio or planting project.',
    items: ['Yard drainage and grading', 'Sump pump and water mitigation systems', 'Sprinkler repairs and new systems', '2-year drainage warranty'],
  },
]

/** Wide frames fall on 1, 4, 5 and 8 so every row of three columns is full. */
export const work = [
  { alt: 'A white pergola over a paver dining patio with a stone pillar and lantern', wide: true },
  { alt: 'A tall stone outdoor fireplace with firewood storage on either side' },
  { alt: 'White Adirondack chairs around a round fire pit on a paver patio' },
  { alt: 'An outdoor kitchen counter with a built-in grill and sink, seen from above', wide: true },
  { alt: 'A backyard with a curving paver path to a fire pit, a deck and Japanese maples', wide: true },
  { alt: 'A stone outdoor bar with stools beside a covered patio' },
  { alt: 'A flagstone path curving through a shaded garden past a path light' },
  { alt: 'A pergola sheltering an outdoor kitchen with a stone counter and grill', wide: true },
].map((item, index) => ({ ...item, src: `/demos/lawn/work-${index + 1}.webp`, small: `/demos/lawn/work-${index + 1}-small.webp` }))

export const warranties = [
  { term: '5 years', label: 'Patios & walls', body: 'Settling or product defects repaired at no cost, following ICPI and NCMA guidelines.' },
  { term: '2 years', label: 'Drainage', body: 'Drainage work is covered for two years.' },
  { term: '1 year', label: 'Plants', body: 'Full replacement for anything we plant.' },
]

export interface Review {
  name: string
  /** Where the review was posted. */
  source: 'Google' | 'lareaulandscape.com'
  /** A sentence lifted from the review itself, shown as its heading. */
  highlight: string
  text: string
}

/**
 * Google reviews, verbatim (spelling as written), read 2026-11-23. Two of the
 * eight are ratings without text, so six appear here. Rich Zak's testimonial
 * is from the business's own home page.
 */
export const reviews: Review[] = [
  {
    name: 'Dave Silverstein',
    source: 'Google',
    highlight: 'They stand by their product 100% and their quality, in my opinion, is unmatched.',
    text: 'This family is dedicated to their craft. They stand by their product 100% and their quality, in my opinion, is unmatched. Certainly not cheap, but the value you get is well worth the expense. Mine was a patio project with a retaining wall and a stone staircase. When it was my turn in line, they showed up at 7am everyday and had the entire job completed in 6 days (involved 42 tons of gravel so not a tiny project). They even came on Saturday. One of the best things is their communication. Taylor Lareau is the son I met first, and he communicated with me via and text and email through the entire process. Never left a message from me I answered. Came out a couple different times to do different bids for my project, evening though my house is far away from their shop. Texted me pictures while I was at work to make sure I approved of feature placement before it was built. They charged exactly what he said they’d charge, did exactly what he said would be done. They made a great effort to clean up my yard as much as possible on the last day. Highly recommend.',
  },
  {
    name: 'David Cook',
    source: 'Google',
    highlight: 'The communication all through the project was exceptional.',
    text: 'This is a really great company. From first call consultation to the final product, the Lareau’s and thier team didn’t miss a beat. That’s a rare thing with contractors of any sort today, especially so with larger landscape projects like the one we did with Lareau: patio & landscape design and installation. They also took care of a fairly significant drainage isse in or back yard, and when done put a finish grade in place to ensure rain flows out correctly. The communication all through the project was exceptional. All of our questions answered, concerns addressed and that was true from Taylor and Bob Lareau and also their crew of Austin and Stephen. They take great pride in their work and it shows. The Lareau gang couldn’t be easier to work with and we are thrilled with the results!',
  },
  {
    name: 'Lucinda Harper',
    source: 'Google',
    highlight: 'Can’t recommend this small, family-owned business highly enough.',
    text: 'Can’t recommend this small, family-owned business highly enough. We had four bids, and while not the cheapest, they were competitive. We knew the moment we met Taylor that we were going with him. Taylor was super patient with us during our learning (and mind-changing) process. His team was hard-working, professional, and took great pride in their work. We now have a beautiful new pavestone patio, pergola, and lovely landscaping to enjoy for years to come.',
  },
  {
    name: 'Eric Daly',
    source: 'Google',
    highlight: 'It was tough work, but they handled it professionally and efficiently.',
    text: 'Taylor and his crew did a fantastic job installing a new, vastly improved sump pump and water mitigation system. We’ve been dealing with persistent water issues and poor drainage in our basement for over 10 years. After the heavy rains on July 17, 2025, our basement flooded yet again thankfully, for the last time. The Lareau team came out on July 30th, during 100-degree heat, and completed all the digging and installation without a hitch. It was tough work, but they handled it professionally and efficiently. I’m extremely pleased with the results. The system is working great so far, and I now have peace of mind knowing our basement is protected. I would absolutely recommend Taylor and his team to anyone in need of drainage or water mitigation solutions.',
  },
  {
    name: 'Rich Zak',
    source: 'lareaulandscape.com',
    highlight: 'We have not had any water in the basement since.',
    text: 'Lareau Landscaping did a superior job installing a patio for us. Taylor provided expert advice on a design and materials, the result being exactly what we wanted. In the process, he and his crew demolished an old deck, re-landscaped the area, and also solved a drainage problem that had been causing seepage into the basement. We have not had any water in the basement since. We could not be any happier with their work and highly recommend this company.',
  },
  {
    name: 'Mike',
    source: 'Google',
    highlight: 'The estimate was the same as the final cost with no hidden additional costs after the job was done.',
    text: 'Taylor came out, wrote up an estimate and had it to me with a sketch of the design within a week. The estimate was the same as the final cost with no hidden additional costs after the job was done. Taylor and Jared did a great job on my paver stone patio. I would recommend Lareau Lanscape and Design, they are honest and do great work.',
  },
  {
    name: 'Steve Lange',
    source: 'Google',
    highlight: 'Taylor Lareau does excellent work at a very fair price.',
    text: 'Taylor Lareau does excellent work at a very fair price. We have hired him twice in the past years and are very pleased with his work. We have recommended him to our neighbors who share our favorable opinion.',
  },
]

export const faqs = [
  {
    q: 'Is the consultation really free?',
    a: 'Yes. Tell us what you have in mind and we’ll set up a no-cost consultation about your project.',
  },
  {
    q: 'How does the yard planner work?',
    a: 'Enter your address and the planner shows your property from public USDA aerial imagery and measures the lawn. Tap the projects you’re thinking about, add a note, and send it. We follow up to set a time to walk the yard with you.',
  },
  {
    q: 'What warranties do you offer?',
    a: 'Patios and retaining walls carry a 5-year structural warranty following ICPI and NCMA guidelines: settling or product defects are repaired at no cost. Drainage work is covered for 2 years, plants for 1 year with full replacement, and lighting fixtures carry warranties of up to a lifetime.',
  },
  {
    q: 'How will I see the design before it’s built?',
    a: 'We share the design in several formats so you can picture the entire project before work begins.',
  },
  {
    q: 'Do you take on smaller projects?',
    a: 'We create landscapes for any size budget, from a full outdoor living space to a single planting bed.',
  },
  {
    q: 'Where do you work?',
    a: `Homes across ${business.area}, from our base in ${business.home}.`,
  },
  {
    q: 'Who will I be working with?',
    a: 'The Lareau family. Bob Lareau and his sons, Taylor and Hunter, run the company, and our team sees each project through from the first consultation to installation.',
  },
]
