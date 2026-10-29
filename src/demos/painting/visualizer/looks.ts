import type { PaintSelection } from './palette'

/**
 * Previews of the sample house made ahead of time through the same studio
 * endpoint (scripts/painting/prepare-samples.mjs), so the sample works
 * instantly and without live previews switched on. The first look is the
 * timelapse's own finished house.
 */
export interface Look {
  name: string
  selection: PaintSelection
  src: string
}

export const SAMPLE_PHOTO = '/demos/painting/studio/sample.jpg'

export const SAMPLE_LOOKS: Look[] = [
  { name: 'As in the timelapse', selection: { body: 'evergreen', trim: 'warm-white', door: 'ochre' }, src: '/demos/painting/hero-finished.webp' },
  { name: 'Harbor navy', selection: { body: 'navy', trim: 'bright-white', door: 'red' }, src: '/demos/painting/studio/navy-bright-white-red.webp' },
  { name: 'Sage & oak', selection: { body: 'sage', trim: 'warm-white', door: 'wood' }, src: '/demos/painting/studio/sage-warm-white-wood.webp' },
  { name: 'Modern farmhouse', selection: { body: 'cream', trim: 'black', door: 'wood' }, src: '/demos/painting/studio/cream-black-wood.webp' },
  { name: 'Charcoal monochrome', selection: { body: 'charcoal', trim: 'match', door: 'ochre' }, src: '/demos/painting/studio/charcoal-match-ochre.webp' },
]

export const selectionKey = (selection: PaintSelection) =>
  `${selection.body === 'custom' ? `custom${selection.customHex ?? ''}` : selection.body}-${selection.trim}-${selection.door}`
