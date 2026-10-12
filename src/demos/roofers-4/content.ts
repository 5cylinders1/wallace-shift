/**
 * Halcyon Roofworks, roofing demo 04. A fictional luxury roofing contractor.
 *
 * Every figure here is a planning illustration for the demo, not market data,
 * a quote, or a manufacturer claim. Replace with approved pricing, real
 * warranty terms and a real service area before adapting for a contractor.
 */

export const brand = {
  name: 'Halcyon Roofworks',
  short: 'Halcyon',
  tagline: 'The architecture above you.',
  region: 'Serving estates across the Mountain West',
  phone: '(000) 000-0000',
  email: 'studio@halcyonroofworks.example',
}

export type MaterialId = 'standing-seam' | 'slate' | 'cedar' | 'clay' | 'designer'

export type Material = {
  id: MaterialId
  name: string
  short: string
  image: string
  alt: string
  character: string
  lifespan: string
  weight: string
  performance: string[]
  /** Illustrative installed planning rate per square foot of roof area. */
  rate: [number, number]
  /** Finish swatches used by the visualizer. */
  colors: { name: string; hex: string }[]
}

export const materials: Material[] = [
  {
    id: 'standing-seam',
    name: 'Standing-seam metal',
    short: 'Metal',
    image: '/demos/roofers-4/material-metal.jpg',
    alt: 'Charcoal standing-seam metal roof planes seen from a drone, with a stone chimney and copper cap',
    character: 'Crisp, linear and quiet. The roof for modern mountain, prairie and contemporary homes.',
    lifespan: 'Typically 40 to 70 years',
    weight: 'Light, about 1 to 1.5 lb per sq ft',
    performance: ['Sheds snow and water cleanly', 'High solar reflectance finishes available', 'Concealed fasteners, solar-ready seams'],
    rate: [16, 28],
    colors: [
      { name: 'Charcoal', hex: '#3a3d41' },
      { name: 'Matte black', hex: '#1f2124' },
      { name: 'Slate blue', hex: '#4a5a6a' },
      { name: 'Zinc gray', hex: '#8b9096' },
      { name: 'Bronze', hex: '#5a4a3a' },
      { name: 'Aged copper', hex: '#5e8c7a' },
    ],
  },
  {
    id: 'slate',
    name: 'Natural slate',
    short: 'Slate',
    image: '/demos/roofers-4/material-slate.jpg',
    alt: 'Blue-gray and green-gray natural slate roof with copper valley flashing, seen from above',
    character: 'The hundred-year roof. Quarried stone with a color that deepens as it ages.',
    lifespan: 'Typically 75 to 150 years',
    weight: 'Heavy, 8 to 10 lb per sq ft; framing is reviewed',
    performance: ['Class A fire rating', 'Impervious to rot, insects and UV', 'Repairable slate by slate'],
    rate: [25, 45],
    colors: [
      { name: 'Vermont gray', hex: '#5d6468' },
      { name: 'Unfading green', hex: '#5f6f62' },
      { name: 'Purple gray', hex: '#605868' },
      { name: 'Black', hex: '#2b2e31' },
      { name: 'Mottled blend', hex: '#6a6a66' },
    ],
  },
  {
    id: 'cedar',
    name: 'Hand-split cedar shake',
    short: 'Cedar',
    image: '/demos/roofers-4/material-cedar.jpg',
    alt: 'Thick hand-split cedar shakes on a lakeside home roof with copper ridge detail',
    character: 'Warm, textural and alive. Honey tones that silver gracefully with the seasons.',
    lifespan: 'Typically 25 to 40 years with stewardship',
    weight: 'Moderate, 3 to 4 lb per sq ft',
    performance: ['Natural insulation value', 'Fire-retardant treated options', 'Breathes with a ventilated deck'],
    rate: [14, 24],
    colors: [
      { name: 'New honey', hex: '#b08a5a' },
      { name: 'Amber', hex: '#8f6a44' },
      { name: 'Weathered', hex: '#8a8278' },
      { name: 'Silvered', hex: '#9a9a94' },
    ],
  },
  {
    id: 'clay',
    name: 'Handmade clay tile',
    short: 'Clay',
    image: '/demos/roofers-4/material-clay.jpg',
    alt: 'Terracotta barrel clay tiles on a Mediterranean villa roof with a cream stucco chimney',
    character: 'Sculptural and sun-loving. Barrel or flat profiles for Mediterranean and Spanish homes.',
    lifespan: 'Typically 50 to 100 years',
    weight: 'Heavy, 9 to 12 lb per sq ft; framing is reviewed',
    performance: ['Thermal mass keeps attics cooler', 'Class A fire rating', 'Colorfast, never needs coating'],
    rate: [18, 35],
    colors: [
      { name: 'Terracotta', hex: '#b5643f' },
      { name: 'Tuscan blend', hex: '#a3684c' },
      { name: 'Sand', hex: '#c2a27c' },
      { name: 'Smoke gray', hex: '#7a7470' },
    ],
  },
  {
    id: 'designer',
    name: 'Designer composite slate',
    short: 'Composite',
    image: '/demos/roofers-4/material-designer.jpg',
    alt: 'Graphite designer composite slate shingles in staggered courses with copper flashing and a dormer, seen from above',
    character: 'The look of slate or shake at a fraction of the weight, engineered for hail and high UV.',
    lifespan: 'Typically 40 to 50 years',
    weight: 'Light, about 1.5 to 2 lb per sq ft',
    performance: ['Class 4 impact rating available', 'Class A fire rating', 'No framing upgrade needed'],
    rate: [12, 20],
    colors: [
      { name: 'Graphite', hex: '#44484d' },
      { name: 'Smoky gray', hex: '#6b6f72' },
      { name: 'Brownstone', hex: '#5e4e42' },
      { name: 'Forest', hex: '#4e5b4f' },
    ],
  },
]

export const complexities = [
  { id: 'simple', name: 'Simple', note: 'Few planes, gentle pitch, easy access', factor: 1 },
  { id: 'moderate', name: 'Moderate', note: 'Several planes, dormers, one or two chimneys', factor: 1.18 },
  { id: 'complex', name: 'Complex', note: 'Steep pitch, many valleys, turrets or large skylights', factor: 1.4 },
] as const

export type ComplexityId = (typeof complexities)[number]['id']

export const pillars = [
  {
    kicker: 'Beauty',
    title: 'The roof is the largest visible surface of your home.',
    text: 'From the street, the approach and every drone photograph a future buyer will see, proportion, pitch and material read before anything else. A considered roof completes the architecture; a tired one undermines it.',
  },
  {
    kicker: 'Performance',
    title: 'A roof system, not a covering.',
    text: 'Ventilation, ice and water barrier, underlayment, flashing and the finish material work together. Done properly, the attic runs cooler, the structure stays dry, and the envelope quietly earns its keep for decades.',
  },
  {
    kicker: 'Value',
    title: 'Permanent materials are read as equity.',
    text: 'Buyers, appraisers and insurers notice a slate, metal, clay or impact-rated roof. It removes the single largest deferred-maintenance question from a sale and can support premium insurance ratings.',
  },
]

export const paths = [
  {
    kicker: 'New custom builds',
    title: 'Specified with the architect, before the first truss.',
    text: 'We join the design team early so the roof is drawn, flashed and detailed as architecture: eave depths, seam layout, snow management, concealed drainage and solar readiness are resolved on paper, not improvised on site.',
    points: ['Material and profile consultation with your architect', 'Structural review for slate and clay loads', 'Flashing, drainage and ventilation detailing', 'Coordinated with the builder\u2019s schedule'],
  },
  {
    kicker: 'Performance re-roofs',
    title: 'Replace it once, and upgrade everything beneath it.',
    text: 'A re-roof is the one moment the whole system is open. We rebuild the deck where needed, add ice barrier and high-temperature underlayment, correct ventilation and install a finish you will never need to think about again.',
    points: ['Drone survey and moisture inspection first', 'Deck, ventilation and insulation corrections', 'Impact-rated and Class A assemblies', 'Documented daily in your client ledger'],
  },
]

export const stewardship = {
  title: 'Repairs and stewardship',
  text: 'Storm assessments, copper and flashing repairs, moss and debris management, and annual inspections for the roofs we build and the ones we inherit. Not the headline, but always available.',
}

export const ledgerEntries = [
  { day: 'Day 01', time: '07:40', kind: 'Drone survey', text: 'Pre-construction orthomosaic captured. 14 images, moisture scan attached.' },
  { day: 'Day 02', time: '16:05', kind: 'Daily report', text: 'Tear-off complete on east planes. Two sheets of decking replaced, photographed before cover.' },
  { day: 'Day 03', time: '12:20', kind: 'Video', text: '4K walk-through: ice barrier, underlayment and valley metal installed.' },
  { day: 'Day 05', time: '17:30', kind: 'Milestone', text: 'Standing-seam panels set on the great room. Ridge detail photographed.' },
  { day: 'Day 07', time: '15:10', kind: 'Handover', text: 'Final drone set, warranty documents and inspection report filed to your vault.' },
]

export const ledgerFeatures = [
  { title: 'Daily drone progress', text: 'Aerial photographs of every plane, every working day, so you can review the roof from the only angle that shows all of it.' },
  { title: 'Video walk-throughs', text: 'Short recorded walk-throughs by your project lead at each milestone, with the details that will soon be hidden under the finish.' },
  { title: 'Reports and documents', text: 'Inspection reports, change orders, schedule updates, payment milestones and the final warranty vault, in one place, time-stamped.' },
]

export const steps = [
  { n: '01', title: 'Site consultation and drone survey', text: 'We walk the property with you and fly the roof. You receive the survey whether or not we proceed.' },
  { n: '02', title: 'Design and specification', text: 'Material, profile, color and the full assembly beneath it, documented with samples and drawings.' },
  { n: '03', title: 'Proposal and ledger access', text: 'A fixed scope, a schedule, and your client ledger opened before the first delivery.' },
  { n: '04', title: 'Installation, documented daily', text: 'A dedicated crew, a protected property, and progress you can review from anywhere.' },
  { n: '05', title: 'Handover and warranty vault', text: 'Final drone set, a written warranty and a stewardship plan for the decades ahead.' },
]

export const faqs = [
  { q: 'Does a premium roof really change what my home is worth?', a: 'It changes how the home is read. Buyers and appraisers treat a permanent roof as a solved problem rather than a negotiation, and the curb-visible improvement is immediate. Exact resale impact depends on your market, so we talk in terms of what the roof removes from a sale, not a promised percentage.' },
  { q: 'Can my framing carry slate or clay?', a: 'Often yes, sometimes with reinforcement. Our structural review is part of specification and the answer is given in writing before you commit to a material.' },
  { q: 'How disruptive is a re-roof on an occupied estate?', a: 'Landscaping, glass and vehicles are protected before tear-off, the site is cleared each evening and you watch progress in your ledger. Most estate re-roofs run one to three weeks depending on material.' },
  { q: 'What about solar?', a: 'Standing-seam metal takes clamp-mounted solar with no roof penetrations. For other materials we plan conduit paths and attachment zones now so a future array never compromises the roof.' },
]

export function money(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}
