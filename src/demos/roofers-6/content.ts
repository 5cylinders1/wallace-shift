/**
 * Copy and configuration for Stratum Roofing Co., a fictional contractor.
 * No licences, ratings, testimonials, certifications or lender offers are
 * claimed. Prices are planning illustrations, not quotes.
 */

export const brand = {
  name: 'Stratum',
  full: 'Stratum Roofing Co.',
  tagline: 'Every layer, accounted for.',
  phone: '(303) 555-0164',
  phoneHref: 'tel:+13035550164',
  email: 'hello@stratumroofing.example',
  area: 'Serving Denver and the Front Range',
}

export const nav = [
  { href: '#storm', label: 'Storm & insurance' },
  { href: '#tune-ups', label: 'Tune-ups' },
  { href: '#new-builds', label: 'New builds' },
  { href: '#upgrades', label: 'Upgrades' },
  { href: '#studio', label: 'Roof studio' },
] as const

export type HeroMode = 'overview' | 'storm' | 'tuneup' | 'build' | 'upgrades'

export const heroModes: { id: HeroMode; label: string; caption: string; href: string; link: string }[] = [
  { id: 'storm', label: 'Storm', caption: 'Hail and wind-driven rain, hitting a real roof plane by plane.', href: '#storm', link: 'How storm restoration works' },
  { id: 'tuneup', label: 'Tune-up', caption: 'The places leaks begin, checked one by one.', href: '#tune-ups', link: 'What a tune-up covers' },
  { id: 'build', label: 'New build', caption: 'Trusses to ridge cap, in the order it should be built.', href: '#new-builds', link: 'Building with Stratum' },
  { id: 'upgrades', label: 'Upgrades', caption: 'Skylights, copper, snow guards and light, planned with the roof.', href: '#upgrades', link: 'See every upgrade' },
]

export interface LayerCopy {
  key: 'rafters' | 'deck' | 'drip' | 'icewater' | 'underlayment' | 'starter' | 'finish' | 'flashing' | 'ridge'
  name: string
  short: string
  text: string
  check: string
}

export const layers: LayerCopy[] = [
  { key: 'rafters', name: 'Rafters and framing', short: 'Framing', text: 'The structure everything else depends on. Its spacing, size and condition decide what the roof above can carry.', check: 'We look for sag, rot and old water stains before anything new goes on top.' },
  { key: 'deck', name: 'Roof deck', short: 'Deck', text: 'Plywood or OSB sheathing that every fastener bites into. A roof is only as flat and as tight as the deck beneath it.', check: 'Soft or delaminated boards are replaced, never covered over.' },
  { key: 'drip', name: 'Drip edge', short: 'Drip edge', text: 'Formed metal along every eave and rake. It steers water into the gutter instead of behind the fascia.', check: 'Missing drip edge is one of the most common causes of rotted fascia.' },
  { key: 'icewater', name: 'Ice and water barrier', short: 'Ice & water', text: 'A self-sealing membrane at the eaves and around penetrations, where ice dams and wind-driven rain do the most harm.', check: 'It seals around every nail that passes through it.' },
  { key: 'underlayment', name: 'Synthetic underlayment', short: 'Underlayment', text: 'A water-resistant second skin across the whole deck, lapped and fastened so the roof stays dry beneath the finish.', check: 'Laps run with the water, never against it.' },
  { key: 'starter', name: 'Starter course', short: 'Starter', text: 'The first course at the eave. Its seal strip locks the bottom row of the finish against wind uplift.', check: 'Skipped starter is where wind lifts a roof first.' },
  { key: 'finish', name: 'The finish', short: 'Finish', text: 'The layer you see, installed to the manufacturer’s pattern and nailing so its warranty stays valid.', check: 'Shingle, metal, slate, clay or cedar. Try each in the roof studio.' },
  { key: 'flashing', name: 'Flashing and penetrations', short: 'Flashing', text: 'Chimney flashing, pipe boots and vent flanges: the joints where most leaks actually start.', check: 'We replace boots and reflash chimneys with every new roof.' },
  { key: 'ridge', name: 'Ridge vent and cap', short: 'Ridge', text: 'Lets hot, damp attic air escape at the peak while soffit vents draw fresh air in at the eaves.', check: 'Balanced ventilation keeps decks dry and shingles cooler.' },
]

export interface Pin { anchor: string; label: string; note: string }

export const damagePins: Pin[] = [
  { anchor: 'hail', label: 'Hail bruising', note: 'Granules knocked loose, soft spots in the mat' },
  { anchor: 'lifted', label: 'Lifted tab', note: 'Seal strip broken by wind' },
  { anchor: 'dent', label: 'Dented gutter', note: 'Useful evidence of hail size' },
  { anchor: 'exhaust', label: 'Cracked vent cap', note: 'Lets water straight into the attic' },
  { anchor: 'granules', label: 'Granules at the downspout', note: 'A sign the shingle surface is wearing away' },
]

export const inspectionPins: Pin[] = [
  { anchor: 'pipe', label: 'Pipe boots', note: 'Rubber collars crack in UV and cold' },
  { anchor: 'chimney', label: 'Chimney flashing', note: 'Sealant fails long before the metal' },
  { anchor: 'stepFlashing', label: 'Step flashing', note: 'Where the garage roof meets the wall' },
  { anchor: 'exhaust', label: 'Exhaust vents', note: 'Caps, fasteners and seals' },
  { anchor: 'ridge', label: 'Ridge vent', note: 'Clear, fastened and venting' },
  { anchor: 'field', label: 'Shingle field', note: 'Lifted tabs, popped nails, granule loss' },
  { anchor: 'gutter', label: 'Gutters and outlets', note: 'Flowing freely, pitched to the downspout' },
  { anchor: 'porchFlashing', label: 'Wall flashing', note: 'Porch roof against the house' },
]

export const upgradePins: Pin[] = [
  { anchor: 'skylight', label: 'Skylights', note: 'Curb-mounted and flashed with the roof' },
  { anchor: 'solar', label: 'Solar-ready layout', note: 'Mounts flashed before the finish' },
  { anchor: 'copper', label: 'Copper accents', note: 'Gutters, drip edge and chimney cap' },
  { anchor: 'snowGuard', label: 'Snow guards', note: 'Over the entry and walkway' },
  { anchor: 'lighting', label: 'Soffit lighting', note: 'Warm downlights in the eaves' },
  { anchor: 'gutterGuard', label: 'Gutter guards', note: 'Micro-mesh on every run' },
]

export const stormSteps = [
  { title: 'Free storm inspection', text: 'On the roof and in the attic, with photos of every hit.' },
  { title: 'A report you can read', text: 'Marked-up photos and a written scope, line by line.' },
  { title: 'Adjuster meeting', text: 'We walk the roof with your adjuster and answer their questions.' },
  { title: 'Restoration', text: 'Built layer by layer, photographed before each is covered.' },
  { title: 'Close-out paperwork', text: 'Final photos, invoices and warranty documents in one place.' },
]

export const tuneupItems = [
  'Reseal flashing and penetrations',
  'Replace cracked pipe boots',
  'Re-secure lifted or loose shingles',
  'Clear gutters, outlets and downspouts',
  'Check attic ventilation and moisture',
  'Photo report with a plain-language outlook',
]

export const buildPhases = [
  { at: 0, label: 'Framing' },
  { at: 0.18, label: 'Deck' },
  { at: 0.4, label: 'Barriers' },
  { at: 0.52, label: 'Underlayment' },
  { at: 0.66, label: 'Finish' },
  { at: 0.9, label: 'Ridge & gutters' },
]

export const process = [
  { title: 'Inspect', text: 'A drone pass and a hands-on look at the roof, attic and gutters. You get the photos, not just a verdict.' },
  { title: 'Scope', text: 'A written scope with every layer, quantity and option priced line by line. Nothing implied, nothing assumed.' },
  { title: 'Schedule', text: 'Materials ordered, permits pulled and a start date you can plan around, with a weather window watched for you.' },
  { title: 'Build', text: 'One project lead on site. Each layer photographed before it is covered, and the yard swept with a magnet every day.' },
  { title: 'Close out', text: 'A final walk-through together, warranty registration and a photo archive of the roof you can keep.' },
]

export const commitments = [
  { title: 'Written scopes', text: 'Every line priced before work starts.' },
  { title: 'Every layer photographed', text: 'Before it disappears under the next one.' },
  { title: 'A clean yard, daily', text: 'Tarps down, magnet sweep, debris hauled.' },
  { title: 'One project lead', text: 'The same person from inspection to close-out.' },
  { title: 'Insurance in plain language', text: 'What your policy usually covers, explained.' },
  { title: 'Workmanship warranty', text: 'In writing, with your close-out documents.' },
]

export const faqs = [
  { q: 'Will my insurance pay for a new roof?', a: 'Only your insurer can decide that. Policies differ on deductibles, depreciation and filing deadlines. We document what the storm did, explain what we find and meet your adjuster on the roof, so the decision is made with clear evidence.' },
  { q: 'How long does a replacement take?', a: 'Most single-family re-roofs take one to three working days once materials arrive. Weather, roof size, steep pitch and deck repairs can change that, and your written schedule will say so.' },
  { q: 'What is a roof tune-up, and how often should I get one?', a: 'A visit that inspects and fixes the details where leaks begin: flashing, pipe boots, vents, loose shingles and gutters. Many homeowners book one every two to three years, and after any major storm.' },
  { q: 'Can you work with my builder or architect?', a: 'Yes. On new construction we coordinate from framing, confirm ventilation and details with the plans, and photograph every stage for the builder and owner.' },
  { q: 'Are the roof studio prices a quote?', a: 'No. They are planning ranges for a sample home, using illustrative rates. A real price depends on measurements, deck condition, access, permits and the products you choose.' },
  { q: 'Do I need to be home during the work?', a: 'Not usually. We ask for access to power and the driveway, and we will tell you when it gets loud. Your project lead stays reachable throughout.' },
]

export const serviceOptions = [
  { value: 'storm', label: 'Storm inspection' },
  { value: 'tuneup', label: 'Roof tune-up' },
  { value: 'build', label: 'New construction' },
  { value: 'upgrades', label: 'Roof upgrades' },
  { value: 'replace', label: 'Full replacement' },
  { value: 'unsure', label: 'Not sure yet' },
] as const

export type ServiceValue = typeof serviceOptions[number]['value']
