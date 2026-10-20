import type { RepairId } from './pricing'

/** Datum Foundation & Waterproofing is fictional. 555-01xx numbers and .example addresses are reserved for fiction. */
export const business = {
  name: 'Datum',
  full: 'Datum Foundation & Waterproofing',
  phone: '(816) 555-0142',
  phoneHref: 'tel:+18165550142',
  email: 'hello@datum.example',
  area: 'Kansas City, both sides of State Line',
}

export interface Pin { anchor: string; label: string; tone?: 'water' | 'stress' | 'ink' }

export interface YearStep {
  kicker: string
  title: string
  body: string
  note?: string
  pins: Pin[]
}

export const yearSteps: YearStep[] = [
  {
    kicker: 'The ground',
    title: 'Your house sits in soil that moves.',
    body: 'Under the lawn is topsoil, then clay, then firmer shale and limestone. The clay is the part that moves: it swells as it takes on water and shrinks as it dries. In this model, the basement walls and footings sit right in it.',
    pins: [
      { anchor: 'topsoil', label: 'Topsoil' }, { anchor: 'clay', label: 'Clay · moves with moisture', tone: 'stress' },
      { anchor: 'shale', label: 'Shale · firmer' }, { anchor: 'rock', label: 'Limestone · load-bearing' }, { anchor: 'backfill', label: 'Backfill' },
    ],
  },
  {
    kicker: 'Spring',
    title: 'Wet ground pushes in.',
    body: 'Rain saturates the soil and the water table rises. Saturated soil presses on the basement walls. That pressure can open a horizontal crack, bow a block wall inward and push water through the joint where the wall meets the floor.',
    note: 'Clay holds water longer than sandy soil, so the pressure lasts.',
    pins: [
      { anchor: 'waterTable', label: 'Water table', tone: 'water' }, { anchor: 'pressure', label: 'Pressure on the wall', tone: 'water' },
      { anchor: 'hCrack', label: 'Horizontal crack', tone: 'stress' }, { anchor: 'coveJoint', label: 'Water at the floor joint', tone: 'water' },
    ],
  },
  {
    kicker: 'Late summer',
    title: 'Dry clay lets go.',
    body: 'As clay dries it shrinks, cracks and pulls back from the walls. If one corner loses support, that corner settles. Stair-step cracks open in the block, floors start to slope toward the low corner and doors stick in their frames.',
    pins: [
      { anchor: 'gap', label: 'Soil pulls away', tone: 'stress' }, { anchor: 'stepCrack', label: 'Stair-step crack', tone: 'stress' },
      { anchor: 'floor', label: 'Floor slopes', tone: 'stress' }, { anchor: 'door', label: 'Door racks' },
    ],
  },
  {
    kicker: 'Winter',
    title: 'Frost stays above the footing.',
    body: 'Footings in Kansas City, Missouri go at least 36 inches below grade to stay below the frost. Frozen, saturated soil can still push on the upper part of a basement wall.',
    pins: [{ anchor: 'frost', label: '36 in. footing depth', tone: 'water' }, { anchor: 'footing', label: 'Footing below the frost' }],
  },
  {
    kicker: 'Year after year',
    title: 'Small movements add up.',
    body: 'Most of this happens slowly, which is why measuring beats guessing. A crack that stays the same width is a different story from one that keeps growing.',
    note: 'Movement in the model is exaggerated so you can see it.',
    pins: [{ anchor: 'stepCrack', label: 'Settled corner', tone: 'stress' }, { anchor: 'hCrack', label: 'Bowed wall', tone: 'stress' }],
  },
]

export interface RepairStep {
  kicker: string
  title: string
  body: string
  repairs: RepairId[]
  pins: Pin[]
}

/** Least invasive first. */
export const repairSteps: RepairStep[] = [
  {
    kicker: 'Water first',
    title: 'Move the water before anything else.',
    body: 'The cheapest fix comes first. Carry roof water well clear of the foundation, and build the soil up so it falls away from the house. Code asks for at least 6 inches of fall in the first 10 feet.',
    repairs: ['extension', 'regrade'],
    pins: [{ anchor: 'extension', label: 'Downspout extension' }, { anchor: 'regrade', label: 'Soil built up to fall away' }],
  },
  {
    kicker: 'Drainage',
    title: 'Catch it at the footing, pump it out.',
    body: 'A trench along the inside of the wall collects water at the footing and carries it to a sump pit. The pump sends it out and away from the house. Battery backup keeps it running when the power does not.',
    repairs: ['drain', 'battery'],
    pins: [{ anchor: 'drain', label: 'Drain in gravel' }, { anchor: 'sump', label: 'Sump pit and pump' }, { anchor: 'battery', label: 'Battery backup' }],
  },
  {
    kicker: 'Walls · light',
    title: 'Carbon fiber straps.',
    body: 'Bonded straps reinforce a block wall that has cracked or started to bow, while the movement is still small. They hold the wall where it is.',
    repairs: ['straps'],
    pins: [{ anchor: 'straps', label: 'Carbon fiber straps' }, { anchor: 'hCrack', label: 'Crack held', tone: 'stress' }],
  },
  {
    kicker: 'Walls · outside room',
    title: 'Wall anchors.',
    body: 'Steel rods run through the wall to plates set in firmer soil away from the house. Tightened over time, they hold the wall and can help draw it back.',
    repairs: ['anchors'],
    pins: [{ anchor: 'anchors', label: 'Earth anchor plate' }, { anchor: 'hCrack', label: 'Wall plate inside' }],
  },
  {
    kicker: 'Walls · no outside room',
    title: 'Steel wall braces.',
    body: 'Steel beams fixed to the floor and to the framing above, for walls that need support from inside or where anchors will not fit.',
    repairs: ['braces'],
    pins: [{ anchor: 'braces', label: 'Steel brace' }],
  },
  {
    kicker: 'Settlement',
    title: 'Push piers to firm ground.',
    body: 'Steel piers are driven past the moving clay to firmer ground, using the weight of the house to push them. Once they bear, the settled corner can be lifted back toward level.',
    repairs: ['piers'],
    pins: [{ anchor: 'piers', label: 'Push pier' }, { anchor: 'footing', label: 'Bracket under the footing' }, { anchor: 'rock', label: 'Bearing layer' }],
  },
  {
    kicker: 'Settlement · lighter loads',
    title: 'Helical piers.',
    body: 'Helical piers are screwed in, with steel plates that bear on firm soil. They suit lighter structures, porches and additions, where there is not enough weight to drive a push pier.',
    repairs: ['helical'],
    pins: [{ anchor: 'helical', label: 'Helical plates' }],
  },
]

export type StormFix = 'extension' | 'regrade' | 'drain' | 'battery' | 'membrane'

export const stormFixes: { id: StormFix; label: string; detail: string }[] = [
  { id: 'extension', label: 'Extend the downspouts', detail: 'Roof water lands clear of the wall.' },
  { id: 'regrade', label: 'Regrade the soil', detail: 'Rain runs away from the house.' },
  { id: 'drain', label: 'Interior drain and sump', detail: 'Water at the footing goes to a pump.' },
  { id: 'battery', label: 'Battery backup', detail: 'The pump keeps going in an outage.' },
  { id: 'membrane', label: 'Exterior membrane', detail: 'Dig out the wall and seal it outside.' },
]

export interface StormReading { level: 'Heavy' | 'Some' | 'None'; pump: string; note: string; puddle: number }

/** What the storm does with the fixes in place. Deterministic, so the copy always matches the model. */
export function stormReading(fixes: Record<StormFix, boolean>, power: boolean): StormReading {
  const pumping = fixes.drain && (power || fixes.battery)
  const pump = !fixes.drain ? 'No sump' : pumping ? (power ? 'Running' : 'Running on battery') : 'Stopped: no power'
  if (fixes.membrane) return { level: 'None', pump, puddle: 0, note: 'The wall is sealed and drained on the outside. It works, but it is the most disruptive and expensive fix, which is why it comes last.' }
  if (fixes.drain && pumping) return { level: 'None', pump, puddle: 0, note: fixes.extension || fixes.regrade ? 'Roof water is handled outside; what reaches the footing goes to the pump and out.' : 'The pump is keeping up, but it is working harder than it needs to. Extending the downspouts would take most of this load off.' }
  if (fixes.drain && !pumping) return { level: 'Some', pump, puddle: 0.55, note: 'Storms can knock out power just as the pump is needed. With no backup, the pit fills and overflows.' }
  if (fixes.extension || fixes.regrade) return { level: 'Some', pump, puddle: 0.4, note: 'Roof water now drains away from the house. Groundwater from a long wet spell can still reach the wall at the footing.' }
  return { level: 'Heavy', pump, puddle: 1, note: 'Roof water lands beside the wall, soaks down the backfill and comes in where the wall meets the floor.' }
}

export const processSteps = [
  { title: 'Inspect', body: 'We measure floor levels across the house, map every crack, and check grading, gutters and downspouts.' },
  { title: 'Explain', body: 'You get a written report with what we found, what is causing it, and your options with planning prices.' },
  { title: 'Repair', body: 'We start with the least invasive fix that deals with the cause, and say plainly when something is cosmetic.' },
  { title: 'Re-measure', body: 'After the work we survey the floor again, so you can see the result in numbers.' },
]

export const faqs = [
  { q: 'How do I know if a crack is serious?', a: 'Start with the crack decoder. Horizontal cracks, bowing walls and cracks that keep growing deserve an inspection soon. Thin vertical cracks in poured walls are usually shrinkage and are worth watching rather than fixing.' },
  { q: 'Will a repair stop the soil from moving?', a: 'No one can stop clay from swelling and shrinking. Repairs support the house on firmer ground and manage water, so that movement stops damaging it.' },
  { q: 'What can I do myself?', a: 'Clean the gutters, extend the downspouts, fill low spots so the soil falls away from the house, and log any cracks. Those steps cost little and solve more problems than people expect.' },
  { q: 'Do I need a structural engineer?', a: 'For significant movement, an independent engineer’s assessment is worth having, and we are glad to work from one. Your report will say when we think you need one.' },
  { q: 'What happens at an inspection?', a: 'We walk the outside first, then measure floor levels inside, photograph and map cracks, and check the basement for water. You get the written report afterward.' },
]

export const sellingSteps = [
  { title: 'Send us the note', body: 'Forward the line from the home inspection report and your closing date.' },
  { title: 'Get it in writing', body: 'We inspect, then write up what we found and what it would take, for both sides to read.' },
  { title: 'Repair or credit', body: 'Schedule the work around your closing, or use the written scope to agree a credit.' },
]
