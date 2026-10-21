import type { PageName } from './routes'

/** Tambour is a fictional cabinetmaker. Contact details are placeholders. */
export const business = {
  name: 'Tambour',
  full: 'Tambour Cabinetry, Kitchens & Baths',
  trade: 'Cabinetry · Kitchens · Baths',
  phone: '(816) 555-0147',
  phoneHref: 'tel:+18165550147',
  email: 'studio@tambour.example',
  area: 'Kansas City and the surrounding communities',
  hours: 'Design studio by appointment',
}

export const nav: { label: string; page: PageName }[] = [
  { label: 'Kitchens', page: 'kitchens' },
  { label: 'Baths', page: 'baths' },
  { label: 'Built-ins', page: 'built-ins' },
  { label: 'Workshop', page: 'workshop' },
  { label: 'Investment', page: 'investment' },
]

export const titles: Record<'home' | PageName, string> = {
  home: 'Custom cabinetry, kitchens & baths | Tambour · Wallace Shift Demo',
  kitchens: 'Custom kitchens | Tambour · Wallace Shift Demo',
  baths: 'Bathroom remodels & vanities | Tambour · Wallace Shift Demo',
  'built-ins': 'Built-ins, closets & libraries | Tambour · Wallace Shift Demo',
  workshop: 'The workshop | Tambour · Wallace Shift Demo',
  investment: 'What custom cabinetry costs | Tambour · Wallace Shift Demo',
  consultation: 'Book a design consultation | Tambour · Wallace Shift Demo',
  photography: 'Photography credits | Tambour · Wallace Shift Demo',
}

export const pillars = [
  { title: 'Drawn in-house', body: 'Plans, elevations and a finish schedule from our own designers, revised until every line is right.' },
  { title: 'Built in our workshop', body: 'Face frames, doors and drawer boxes milled, joined and finished under one roof in Kansas City.' },
  { title: 'Installed by the people who built it', body: 'Our own crew scribes every filler and panel to your walls. Nothing is handed off.' },
]

export interface Hotspot { id: string; x: number; y: number; title: string; body: string }

/** Positions are percentages of the kitchen-anatomy photograph. */
export const anatomy: Hotspot[] = [
  { id: 'crown', x: 12.5, y: 5.9, title: 'Crown to the ceiling', body: 'Cabinets run all the way up and finish in crown molding, so there is no dusty gap above and the uppers read as part of the architecture.' },
  { id: 'stacked', x: 12.4, y: 12.9, title: 'Stacked uppers', body: 'A second, shorter tier uses the space up high for the platters and vases you reach for twice a year.' },
  { id: 'enclosure', x: 27.3, y: 36.5, title: 'Refrigerator enclosure', body: 'A full-height panel and a cabinet above frame the refrigerator, so it sits in the wall rather than in front of it.' },
  { id: 'lighting', x: 9.5, y: 46.2, title: 'Light where you work', body: 'LED strips hidden under the uppers light the counter itself, not the back of your head.' },
  { id: 'microwave', x: 21.9, y: 57.6, title: 'Built-in appliances', body: 'The microwave drawer is built into the cabinet run at the height you use it, trimmed to match.' },
  { id: 'hardware', x: 77.6, y: 39.4, title: 'Hardware, drawn door by door', body: 'Pull lengths and positions are set on the elevations, so every line of hardware lands where your hand does.' },
  { id: 'drawers', x: 78.5, y: 66.5, title: 'Drawers, not doors', body: 'Deep, full-extension drawers beside the range bring the pots to you instead of hiding them behind a door.' },
  { id: 'island', x: 68.8, y: 82, title: 'An island that reads as furniture', body: 'Paneled ends and a recessed toe kick on every side, with a deep overhang where the stools tuck in.' },
]

export interface Material { id: string; group: 'wood' | 'paint' | 'stone'; name: string; note: string; image?: string; hex?: string }

const MAT = '/demos/cabinetry/materials'
export const materials: Material[] = [
  { id: 'wood-walnut', group: 'wood', name: 'American walnut', note: 'Oiled. Chocolate brown that softens toward gold with time.', image: `${MAT}/wood-walnut.webp` },
  { id: 'wood-rift-oak', group: 'wood', name: 'Rift white oak', note: 'Straight, quiet grain in a matte natural finish.', image: `${MAT}/wood-rift-oak.webp` },
  { id: 'wood-figured-oak', group: 'wood', name: 'Plain-sawn white oak', note: 'Cathedral grain with more movement, for a warmer room.', image: `${MAT}/wood-figured-oak.webp` },
  { id: 'wood-cherry', group: 'wood', name: 'Cherry', note: 'Starts pale and deepens to red-brown in the sun.', image: `${MAT}/wood-cherry.webp` },
  { id: 'wood-maple', group: 'wood', name: 'Hard maple', note: 'Fine, even grain. Our paint-grade and drawer-box wood.', image: `${MAT}/wood-maple.webp` },
  { id: 'wood-smoked-walnut', group: 'wood', name: 'Figured walnut', note: 'Sequence-matched veneer for a statement island or panel.', image: `${MAT}/wood-smoked-walnut.webp` },
  { id: 'stone-calacatta', group: 'stone', name: 'Calacatta-look quartz', note: 'Soft gray veining on white. Nonporous and low maintenance.', image: `${MAT}/stone-calacatta.webp` },
  { id: 'stone-arabescato', group: 'stone', name: 'Arabescato marble', note: 'Bold gray-green veining. Honed or polished.', image: `${MAT}/stone-arabescato.webp` },
  { id: 'stone-nero-marquina', group: 'stone', name: 'Nero Marquina', note: 'Black marble with fine white veins.', image: `${MAT}/stone-nero-marquina.webp` },
]

export const materialGroups: { id: Material['group']; label: string; intro: string }[] = [
  { id: 'wood', label: 'Wood', intro: 'Real veneer scans, shown with the finish we would use.' },
  { id: 'paint', label: 'Paint', intro: 'Sprayed in a catalyzed conversion varnish, far tougher than wall paint.' },
  { id: 'stone', label: 'Stone', intro: 'Cut from the photographs on this site.' },
]

const paints = [
  { id: 'bone', name: 'Bone', hex: '#ECE6D9', note: 'A warm white that stays soft in north light.' },
  { id: 'putty', name: 'Putty', hex: '#C9BBA6', note: 'Greige with a little warmth, kind to wood floors.' },
  { id: 'sage', name: 'Sage', hex: '#9AA68C', note: 'A gray-green that sits well beside brass and oak.' },
  { id: 'fern', name: 'Fern', hex: '#3E4A3D', note: 'Deep forest green, quiet in daylight, rich at night.' },
  { id: 'harbor', name: 'Harbor', hex: '#5F7381', note: 'Smoked blue-gray, between slate and sky.' },
  { id: 'ink', name: 'Ink', hex: '#263445', note: 'A navy with a gray undertone, never purple.' },
  { id: 'oxblood', name: 'Oxblood', hex: '#5A2A27', note: 'Red-brown, the color of an old leather chair.' },
  { id: 'ebony', name: 'Ebony', hex: '#1F1E1C', note: 'Soft black with a warm base, not blue.' },
]
const paintSamples: Material[] = paints.map(paint => ({ id: `paint-${paint.id}`, group: 'paint', name: paint.name, note: paint.note, hex: paint.hex }))
/** Every sample a visitor can add to the sample box, paint chips included. */
export const allMaterials = [...materials, ...paintSamples]
export const sampleName = (id: string) => allMaterials.find(item => item.id === id)?.name ?? id

export const MAX_SAMPLES = 6

export const process = [
  { title: 'Consultation', time: 'One visit, about 90 minutes', body: 'We meet in your home, measure the room and talk through how you cook, store and gather.' },
  { title: 'Design', time: 'Typically 3–5 weeks', body: 'Floor plans, elevations, a finish schedule and a fixed proposal, revised until it is right.' },
  { title: 'Workshop', time: 'Typically 8–12 weeks', body: 'Your cabinetry is built and finished in our shop while the room is prepared.' },
  { title: 'Installation', time: 'Typically 1–3 weeks of cabinetry work', body: 'Our own crew installs, scribes and adjusts every door. Other trades follow in sequence.' },
  { title: 'Walkthrough', time: 'At completion, then after a season', body: 'We adjust, touch up and leave a care guide for every finish in the room.' },
]

export const faqs = [
  { q: 'How is custom different from semi-custom?', a: 'Semi-custom cabinets come in fixed widths from a catalog. Ours are drawn to your room’s own measurements, so fillers, panels and odd corners are built in rather than patched around.' },
  { q: 'Do you only build cabinetry, or the whole remodel?', a: 'Both. We can design and install cabinetry for your builder, or run the full kitchen or bath remodel with our own project lead and the trades we work with every week.' },
  { q: 'How long does a kitchen take?', a: 'From the first visit to the last door adjustment, most kitchens take four to six months. Most of that is design and shop time, while your kitchen stays usable.' },
  { q: 'Can I see the finishes in person?', a: 'Yes. Pick samples on this site and we bring them to your consultation, or visit the design studio by appointment.' },
  { q: 'Will you work with my designer or architect?', a: 'Often. We build from their drawings, or develop shop drawings with them so every detail is agreed before we cut.' },
  { q: 'What finish goes on painted cabinets?', a: 'A catalyzed conversion varnish, sprayed in our finishing room. It is far harder than wall paint, and a touch-up kit is left with every job.' },
]

export interface LookbookItem { slug: string; caption: string; wide?: boolean }
export interface RoomFeature { title: string; body: string; slug?: string }
export interface Room {
  page: 'kitchens' | 'baths' | 'built-ins'
  kicker: string
  title: string
  em: string
  hero: string
  heroPosition?: string
  /** A scroll-built film replaces the photo hero (see builds.ts). */
  build?: 'bath' | 'library'
  lede?: string
  intro: string
  facts: { label: string; value: string }[]
  lookbook: LookbookItem[]
  featuresTitle: string
  features: RoomFeature[]
}

export const rooms: Record<Room['page'], Room> = {
  kitchens: {
    page: 'kitchens',
    kicker: 'Kitchens',
    title: 'The room everyone',
    em: 'ends up in.',
    hero: 'kitchen-black-marble',
    heroPosition: '50% 60%',
    intro: 'We plan a kitchen around how you actually use it: where the groceries land, who cooks while someone else does homework at the island, where the coffee lives. Then we draw cabinetry that makes those moments easy, and build it to the millimeter.',
    facts: [
      { label: 'Construction', value: 'Face-frame or frameless, inset or overlay' },
      { label: 'Woods', value: 'Walnut, white oak, cherry, maple' },
      { label: 'Finishes', value: 'Oil, matte lacquer, conversion-varnish paint' },
    ],
    lookbook: [
      { slug: 'kitchen-island-brass', caption: 'Painted shaker, stacked uppers, brass pendants', wide: true },
      { slug: 'kitchen-warm-oak', caption: 'Oak veneer, fluted island base, black stone' },
      { slug: 'kitchen-two-tone', caption: 'Black tall wall, stained shaker island' },
      { slug: 'kitchen-oak-display', caption: 'Lit glass display wall in oak', wide: true },
      { slug: 'kitchen-to-family-room', caption: 'An island that opens to the family room', wide: true },
      { slug: 'kitchen-range-wall', caption: 'Range wall with pot drawers and a pro hood' },
    ],
    featuresTitle: 'Door styles we build',
    features: [
      { title: 'Shaker', body: 'A recessed center panel in a square frame. Timeless, and the right canvas for paint.', slug: 'kitchen-range-wall' },
      { title: 'Slab', body: 'Flat fronts with tight reveals, in veneer or lacquer, for a quiet modern room.', slug: 'kitchen-black-marble' },
      { title: 'Fluted', body: 'Vertical reeding milled into solid wood, for an island or a hood that catches the light.', slug: 'kitchen-warm-oak' },
    ],
  },
  baths: {
    page: 'baths',
    kicker: 'Baths',
    title: 'Quiet, considered,',
    em: 'built to stay dry.',
    hero: 'bath-arabescato',
    heroPosition: '50% 45%',
    build: 'bath',
    lede: 'Vanities, linen towers and the whole remodel around them, built to take steam every morning.',
    intro: 'A bathroom asks more of cabinetry than any other room: steam every morning, water on every edge. We build vanities, linen towers and built-in surrounds in sealed hardwoods and moisture-resistant cores, and we run the whole remodel around them, from tile to lighting.',
    facts: [
      { label: 'Vanities', value: 'Floating, furniture-style or built-in' },
      { label: 'Surfaces', value: 'Marble, quartzite, quartz' },
      { label: 'Remodels', value: 'Showers, tubs, tile, lighting, heated floors' },
    ],
    lookbook: [
      { slug: 'bath-walnut-brass', caption: 'Walnut floating vanity, brass, marble', wide: true },
      { slug: 'bath-double-vanity', caption: 'Shaker double vanity with a center drawer bank' },
      { slug: 'bath-powder-room', caption: 'Slatted wood wall and a stone vessel' },
      { slug: 'bath-primary-shower', caption: 'Primary bath with a glass shower' },
      { slug: 'bath-white-marble', caption: 'Wall-hung cabinets and a freestanding tub' },
    ],
    featuresTitle: 'Vanities, three ways',
    features: [
      { title: 'Floating', body: 'Wall-hung on a hidden steel cleat, with the floor running underneath and room for toe-kick lighting.', slug: 'bath-walnut-brass' },
      { title: 'Furniture-style', body: 'Legs, a drawer bank and a top that overhangs, like a chest that happens to hold a sink.', slug: 'bath-arabescato' },
      { title: 'Double', body: 'Two sinks with a shared drawer bank between them, so mornings stop being a negotiation.', slug: 'bath-double-vanity' },
    ],
  },
  'built-ins': {
    page: 'built-ins',
    kicker: 'Built-ins',
    title: 'Every room has a wall',
    em: 'that could work harder.',
    hero: 'builtin-library',
    heroPosition: '60% 50%',
    build: 'library',
    lede: 'Libraries, dressing rooms and media walls, made with the same joinery as our kitchens and scribed to your walls.',
    intro: 'Libraries, dressing rooms, mudrooms, laundry rooms and media walls, made with the same joinery and finishes as our kitchens, and scribed to walls that were never quite square.',
    facts: [
      { label: 'Rooms', value: 'Closets, libraries, laundry, mudrooms, media' },
      { label: 'Details', value: 'Integrated lighting, adjustable shelving' },
      { label: 'Fit', value: 'Scribed to your walls, floors and ceilings' },
    ],
    lookbook: [
      { slug: 'builtin-dressing-room', caption: 'Dressing room with lit shelving and drawers', wide: true },
      { slug: 'builtin-closet-oak', caption: 'Oak walk-in with a center drawer island' },
      { slug: 'builtin-fireplace', caption: 'Painted shelving around a fireplace' },
      { slug: 'builtin-laundry', caption: 'A laundry room that works like a kitchen', wide: true },
    ],
    featuresTitle: 'Where built-ins earn their keep',
    features: [
      { title: 'Dressing rooms', body: 'Hanging bays sized to what you own, drawers for what folds and lighting that turns on with the door.', slug: 'builtin-closet-oak' },
      { title: 'Libraries & media', body: 'Shelves that will not sag under books, with wiring and ventilation planned into the case.', slug: 'builtin-library' },
      { title: 'Laundry & mudrooms', body: 'Durable painted finishes, a place for every bag and boot, and counters at folding height.', slug: 'builtin-laundry' },
    ],
  },
}

export const workshopChapters = [
  { slug: 'shop-lumber', title: 'Chosen by the board', body: 'We buy hardwood by the board, not the bundle, and let it acclimate in the shop before it is cut, so it moves before it becomes a door rather than after.' },
  { slug: 'shop-hand-plane', title: 'Flat, square and true', body: 'Machines do the heavy milling. The last passes are often by hand, where a plane leaves a surface no sander can.' },
  { slug: 'shop-measure', title: 'Measured in your room', body: 'Every dimension comes from a site visit with a laser and a tape, then is checked again once the walls are opened.' },
  { slug: 'shop-sanding', title: 'Sanded between every coat', body: 'Painted doors get primer and two topcoats of conversion varnish, each one sanded, sprayed and cured in our finishing room.' },
  { slug: 'shop-fitting', title: 'Fitted, then fitted again', body: 'Panels and fillers leave the shop a little long. On site we scribe them to the wall, so the gap you would see in a stock kitchen never appears.' },
]

export const specs = [
  { label: 'Cases', value: '¾-inch furniture-grade plywood, glued and screwed' },
  { label: 'Face frames', value: 'Solid hardwood, pocket-screwed and glued' },
  { label: 'Drawer boxes', value: 'Solid maple or white oak, dovetailed' },
  { label: 'Slides', value: 'Full-extension, soft-close, undermount' },
  { label: 'Hinges', value: 'Concealed and soft-close; butt hinges for inset' },
  { label: 'Paint finish', value: 'Catalyzed conversion varnish, sprayed in-house' },
  { label: 'Wood finish', value: 'Hardwax oil or matte catalyzed lacquer' },
]
