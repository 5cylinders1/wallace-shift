/**
 * Mitre & Rift Cabinetmakers: a fictional cabinetmaker (Wallace Shift demo).
 * Copy and the hero's timing live here. Nothing on the page claims a founding
 * year, a project count, a review or an award.
 */

export const brand = {
  name: 'Mitre & Rift',
  trade: 'Cabinetmakers',
  line: 'Rift oak cabinetry, stone and light, built for one room at a time.',
}

export const nav = [
  { id: 'make', label: 'Kitchens' },
  { id: 'process', label: 'Process' },
  { id: 'materials', label: 'Materials' },
]

/**
 * The hero is one pinned stage. Positions are the "playhead": viewport heights
 * of scroll into the section, after scrub smoothing. They were measured from
 * the reference reel (docs/demos/cabinetry-2.md, timing sheet). The stage
 * releases at PIN_VH and scrolls away with the page.
 */
export const PIN_VH = 4.66
export const SCRUB = 0.8

/** The rendered sequence: frame 0 at playhead START, the last frame at END. */
export const SEQUENCE = { frames: 128, start: 0.4, end: 3.75 }

export const hero = {
  eyebrow: 'Cabinetmakers · Rift oak & stone',
  title: ['Built to', 'the room.'],
  lede: 'Rift oak cabinetry made in our own workshop, hung in true frames and fitted to walls that are never quite straight.',
  cue: 'Scroll to build',
  /** Hero copy blurs out in place while the first chapter blurs in. */
  out: [0.2, 0.39] as const,
}

export type Chapter = {
  id: string
  number: string
  label: string
  title: string
  body: string
  /** [fade in start, in end, fade out start, out end] in playhead vh */
  at: [number, number, number, number]
  side: 'left' | 'right'
}

export const chapters: Chapter[] = [
  {
    id: 'joinery', number: '01', label: 'Joinery', side: 'left', at: [0.31, 0.41, 1.41, 1.53],
    title: 'Set true to the wall',
    body: 'Inset doors in rift-sawn white oak, each hung in its own frame and scribed to the wall.',
  },
  {
    id: 'stone', number: '02', label: 'Stone', side: 'left', at: [1.44, 1.53, 2.33, 2.54],
    title: 'One block, end to end',
    body: 'Gold-veined quartzite, book-matched at the seam and folded down both island ends.',
  },
  {
    id: 'light', number: '03', label: 'Light', side: 'left', at: [2.41, 2.58, 3.54, 3.7],
    title: 'Evening, by design',
    body: 'Opal glass and aged brass over the island, and soft light under every wall cabinet.',
  },
  {
    id: 'room', number: '04', label: 'The finished room', side: 'right', at: [3.7, 3.91, 99, 99],
    title: 'Ready for the long table',
    body: '',
  },
]

export const disclosure = 'The kitchen in this film is a rendering made for this concept, not a photographed project.'

export const statement = {
  eyebrow: 'The Mitre & Rift way',
  lines: ['Made for one room,', 'fitted by the hands that made it.'],
  emphasis: 'hands',
  body: 'Every box, door and drawer front is cut and finished in our workshop, then fitted on site by the people who built it. The stone is templated after the cabinets are in, so it meets the walls you actually have.',
}

export const offers = [
  {
    title: 'Kitchens',
    body: 'Full rooms in rift oak, painted or stained finishes, with inset or full-overlay doors. Islands, hoods and wall runs designed together.',
    image: 'detail-island',
    alt: 'The fluted island front and its quartzite waterfall end',
  },
  {
    title: 'Pantries & built-ins',
    body: 'Tall storage, coffee stations and scullery walls, matched to the kitchen so the whole floor reads as one piece of work.',
    image: 'detail-stack',
    alt: 'Oak wall cabinets with glass-front stackers lit from inside',
  },
  {
    title: 'Stone & light',
    body: 'We select and template the stone and plan the lighting with the cabinetry, so pendants, under-cabinet light and veining line up.',
    image: 'detail-light',
    alt: 'Opal glass pendants over the island at dusk',
  },
]

export const process = [
  { n: '01', title: 'Measure the room', body: 'We survey the space ourselves, walls, floors and services, and listen to how you cook and gather.' },
  { n: '02', title: 'Draw it properly', body: 'Plans, elevations and material samples you can hold, revised until every inch is agreed.' },
  { n: '03', title: 'Build in the workshop', body: 'Boxes, frames and doors are made and finished in our shop, then dry-fitted before they leave.' },
  { n: '04', title: 'Fit and finish', body: 'Our own fitters install, scribe and adjust. Stone is templated in place, then the light goes in.' },
]

export const materials = [
  { name: 'Rift white oak', note: 'Straight, quiet grain, matte lacquer', swatch: 'swatch-oak' },
  { name: 'Gold-veined quartzite', note: 'Honed, book-matched slabs', swatch: 'swatch-stone' },
  { name: 'Warm ink paint', note: 'Satin, on the fluted island', swatch: 'swatch-ink' },
  { name: 'Blackened bronze', note: 'Knobs and bar pulls', swatch: 'swatch-bronze' },
  { name: 'Smoked oak herringbone', note: 'Oiled floor', swatch: 'swatch-floor' },
]

export const contact = {
  title: 'Plan your kitchen',
  body: 'Tell us about the room and how you use it. We will come and measure, then draw it with you.',
  phone: '(555) 010-4417',
  email: 'studio@mitreandrift.example',
  note: 'Demo details: the phone number and email are placeholders.',
}
