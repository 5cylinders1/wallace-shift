import type { RepairId } from './pricing'

/**
 * The crack decoder. Each symptom carries a base urgency and follow-up
 * questions that can raise it. The tiers are Datum's own triage language,
 * not an engineering standard; sources are listed in
 * docs/demos/foundation-research.md. Every result says it is a guide.
 */

export type Tier = 'watch' | 'look' | 'soon'
export type Area = 'walls' | 'rooms' | 'water' | 'outside'
export type Figure = 'vertical' | 'step' | 'horizontal' | 'bow' | 'diagonal' | 'floor' | 'door' | 'cove' | 'bloom' | 'gap'

export interface Escalator { question: string; tier: Tier }

export interface Symptom {
  slug: string
  /** Chip label. */
  short: string
  /** Page title, in the homeowner's words. */
  title: string
  area: Area
  tier: Tier
  figure: Figure
  meaning: string
  also: string[]
  now: string[]
  escalate: Escalator[]
  repairs: RepairId[]
  drivers: string[]
  /** Whether the crack log is the right next step. */
  measurable: boolean
}

export const tiers: Record<Tier, { label: string; line: string; rank: number }> = {
  watch: { label: 'Watch it', line: 'Not urgent. Measure it and see whether it changes.', rank: 0 },
  look: { label: 'Have it looked at', line: 'Worth an inspection in the coming weeks.', rank: 1 },
  soon: { label: 'Call soon', line: 'Book an inspection now rather than waiting for it to change.', rank: 2 },
}

export const areas: Record<Area, string> = {
  walls: 'Basement walls',
  rooms: 'Floors, doors and windows',
  water: 'Water and damp',
  outside: 'Outside the house',
}

export const symptoms: Symptom[] = [
  {
    slug: 'thin-vertical-crack',
    short: 'Thin vertical crack',
    title: 'A thin vertical crack in a poured concrete wall',
    area: 'walls', tier: 'watch', figure: 'vertical',
    meaning: 'Usually shrinkage from when the concrete cured. These are common in poured walls and generally not structural, but they are still worth watching.',
    also: ['Minor movement, if one side now sits further out than the other', 'A path for water, if it darkens after rain'],
    now: ['Mark both ends with a pencil and write the date beside them.', 'Measure the widest point and photograph it with a ruler or coin for scale.', 'Check it again in a month, or log it in the crack log.'],
    escalate: [
      { question: 'Has it grown longer or wider since you first noticed it?', tier: 'look' },
      { question: 'Does one side of the crack stick out further than the other?', tier: 'look' },
      { question: 'Does water or dampness come through it?', tier: 'look' },
    ],
    repairs: ['injection', 'extension'],
    drivers: ['Number and length of cracks', 'Whether a finished wall covers them'],
    measurable: true,
  },
  {
    slug: 'stair-step-crack',
    short: 'Stair-step crack',
    title: 'A stair-step crack in a block or brick wall',
    area: 'walls', tier: 'look', figure: 'step',
    meaning: 'A crack that steps diagonally along the mortar joints usually means part of the wall has moved down relative to the rest: uneven settlement.',
    also: ['Soil pressure, if the wall also bows inward', 'Moisture and temperature movement, which can look like settlement'],
    now: ['Hold a straightedge or a tight string across the wall to check for bowing.', 'Look upstairs for a sloping floor or a door that sticks on the same side.', 'Measure the widest step and log it monthly.'],
    escalate: [
      { question: 'Is the wall bowing or leaning inward?', tier: 'soon' },
      { question: 'Has it widened, or is one block now offset from the next?', tier: 'soon' },
    ],
    repairs: ['piers', 'helical', 'anchors'],
    drivers: ['How many piers the settled wall needs', 'Access along that side of the house', 'Finished walls or decks in the way'],
    measurable: true,
  },
  {
    slug: 'horizontal-crack',
    short: 'Horizontal crack',
    title: 'A horizontal crack along a basement wall',
    area: 'walls', tier: 'soon', figure: 'horizontal',
    meaning: 'Horizontal cracks are potentially serious. They usually mean soil and water outside are pushing on the wall and it has started to bend.',
    also: ['Frost heaving in saturated soil against the wall', 'Heavy equipment or careless backfilling when the house was built'],
    now: ['Photograph it with something for scale.', 'Keep water away from that side: clear the gutters and extend the downspouts.', 'Book an inspection rather than waiting for it to grow.'],
    escalate: [],
    repairs: ['straps', 'anchors', 'braces', 'regrade'],
    drivers: ['How far the wall has moved', 'Length of the wall', 'Whether the drainage outside needs fixing too'],
    measurable: true,
  },
  {
    slug: 'bowing-wall',
    short: 'Bowing wall',
    title: 'A basement wall that bows or leans inward',
    area: 'walls', tier: 'soon', figure: 'bow',
    meaning: 'A wall that bows in is being pushed by the soil outside. It usually comes with a horizontal crack near the middle of the wall.',
    also: ['Saturated or frozen soil against that wall', 'Water draining toward that side of the house'],
    now: ['Run a string line along the wall and measure the gap at the middle. Note the date.', 'Keep roof water and runoff away from that side.', 'Book an inspection soon.'],
    escalate: [],
    repairs: ['anchors', 'braces', 'straps'],
    drivers: ['How far the wall has moved', 'Room outside for anchors', 'Wall length'],
    measurable: true,
  },
  {
    slug: 'cracks-at-door-corners',
    short: 'Cracks at door corners',
    title: 'Diagonal cracks from the corners of doors or windows',
    area: 'rooms', tier: 'watch', figure: 'diagonal',
    meaning: 'Diagonal cracks that start at the corners of openings can come from uneven settlement below. Ordinary drywall shrinkage causes them too.',
    also: ['Seasonal movement in the framing', 'Settling of a new house in its first years'],
    now: ['Note whether nearby doors or windows stick.', 'Check whether the floor slopes toward that corner.', 'Mark the end of the crack and date it.'],
    escalate: [
      { question: 'Do nearby doors stick or no longer latch?', tier: 'look' },
      { question: 'Is the crack getting longer?', tier: 'look' },
    ],
    repairs: ['piers', 'helical'],
    drivers: ['What is causing the movement below', 'Interior repair after the work'],
    measurable: true,
  },
  {
    slug: 'sloping-floor',
    short: 'Sloping floor',
    title: 'Floors that slope or feel uneven',
    area: 'rooms', tier: 'look', figure: 'floor',
    meaning: 'A floor that falls toward one corner can mean that part of the foundation has settled. A floor-level survey shows exactly where and by how much.',
    also: ['Sagging joists or a beam that needs another support', 'A house that was framed out of level'],
    now: ['Use a level, or roll a marble, in a few rooms and note which way it runs.', 'Look for cracks in the basement wall below the low corner.'],
    escalate: [{ question: 'Is it getting worse, or new since you moved in?', tier: 'soon' }],
    repairs: ['piers', 'helical'],
    drivers: ['How much of the house has settled', 'How many piers it needs', 'Whether interior supports need work too'],
    measurable: false,
  },
  {
    slug: 'sticking-doors',
    short: 'Sticking doors',
    title: 'Doors or windows that stick or will not latch',
    area: 'rooms', tier: 'watch', figure: 'door',
    meaning: 'When several doors start sticking on one side of a house, the frames may have racked as the house moved. One sticking door in a humid month is usually just swollen wood.',
    also: ['Humidity: wood swells in damp weather', 'Worn hinges or loose screws'],
    now: ['Check whether the gap around the door is uneven, wider at one top corner.', 'Note whether it changes with the seasons.'],
    escalate: [
      { question: 'Is it more than one door or window, on the same side of the house?', tier: 'look' },
      { question: 'Did it start around the time cracks appeared?', tier: 'look' },
    ],
    repairs: ['piers', 'helical'],
    drivers: ['What is causing the movement below'],
    measurable: false,
  },
  {
    slug: 'water-at-floor-joint',
    short: 'Water at the floor joint',
    title: 'Water where the basement wall meets the floor',
    area: 'water', tier: 'look', figure: 'cove',
    meaning: 'Water at the joint between wall and floor usually means the soil outside is saturated and water is being pushed in under pressure. Clay holds water and adds to that pressure.',
    also: ['Gutters or downspouts emptying beside the house', 'Soil that slopes toward the house instead of away'],
    now: ['Clean the gutters and extend the downspouts.', 'Fill low spots so the soil falls away from the wall.', 'Note when it happens: every rain, or only after long wet spells.'],
    escalate: [{ question: 'Is there a crack in the wall above the wet area?', tier: 'look' }],
    repairs: ['extension', 'regrade', 'drain', 'battery'],
    drivers: ['Length of wall that needs drainage', 'Where the pump can discharge', 'Finished floors or walls'],
    measurable: false,
  },
  {
    slug: 'white-powder-on-walls',
    short: 'White powder on walls',
    title: 'White, chalky powder on basement walls',
    area: 'water', tier: 'watch', figure: 'bloom',
    meaning: 'This is efflorescence: salts left behind when water passes through masonry and evaporates. It is a sign of moisture, not of structural movement.',
    also: ['Damp soil against that wall', 'A downspout or low spot outside'],
    now: ['Brush it off and see whether it comes back.', 'Look outside that wall for water sources: gutters, downspouts, soil sloping in.'],
    escalate: [{ question: 'Does it come back after rain?', tier: 'look' }],
    repairs: ['extension', 'regrade', 'drain'],
    drivers: ['Where the water is coming from'],
    measurable: false,
  },
  {
    slug: 'gap-at-the-foundation',
    short: 'Gap at the foundation',
    title: 'Soil pulling away from the foundation outside',
    area: 'outside', tier: 'watch', figure: 'gap',
    meaning: 'In dry spells, clay soil shrinks and can pull back from the foundation. When the rain returns, that gap can channel water straight down the wall.',
    also: ['A low spot along the wall that holds water'],
    now: ['Fill the gap with soil and tamp it so water runs away from the wall.', 'Keep the soil sloping away from the house.'],
    escalate: [{ question: 'Do you also see cracks inside on that side of the house?', tier: 'look' }],
    repairs: ['regrade', 'extension'],
    drivers: ['Length of wall to regrade', 'Planting beds or paving in the way'],
    measurable: false,
  },
]

export const symptomBySlug = (slug: string) => symptoms.find(item => item.slug === slug)

/** The base tier raised by any follow-up answered yes. */
export function resolveTier(symptom: Symptom, answers: boolean[]): Tier {
  let tier = symptom.tier
  symptom.escalate.forEach((item, index) => {
    if (answers[index] && tiers[item.tier].rank > tiers[tier].rank) tier = item.tier
  })
  return tier
}
