/**
 * Wall styles the idea tool can show: the kinds of paneling on LP
 * Construction's Instagram. Shared by the page and api/_lib/trim/render.ts,
 * which builds the image prompt from these ids only.
 */
export const IDEA_STYLES = [
  {
    id: 'frames', label: 'Picture-frame molding', sample: 'frames',
    prompt: 'full-height picture-frame wall molding: crisp rectangular panel moldings in an evenly spaced grid sized to the wall, with the panel layout working around any outlets, switches, windows and doors',
  },
  {
    id: 'grid', label: 'Board & batten grid', sample: 'grid',
    prompt: 'a board-and-batten grid: flat painted battens forming an even square grid over the whole wall, working around any outlets, switches, windows and doors',
  },
  {
    id: 'slats', label: 'Vertical slat wall', sample: 'slats',
    prompt: 'a modern vertical slat wall: closely spaced vertical wood slats running floor to ceiling across the whole wall over a dark backing',
  },
  {
    id: 'wainscot', label: 'Wainscoting & chair rail', sample: 'wainscot',
    prompt: 'raised-panel style wainscoting on the lower third of the wall: rectangular panel moldings below a painted chair rail, with a tall baseboard below',
  },
  {
    id: 'geometric', label: 'Geometric panels', sample: 'geometric',
    prompt: 'a custom geometric panel design: thin flat moldings laid out as large diamonds and diagonals across the whole wall, symmetrical about the wall’s center',
  },
] as const

export type IdeaStyleId = typeof IDEA_STYLES[number]['id']

export const IDEA_FINISHES = [
  { id: 'match', label: 'Match the wall', prompt: 'painted the same color as the existing wall, in a satin finish' },
  { id: 'white', label: 'Soft white', prompt: 'painted a soft warm white, in a satin finish' },
  { id: 'dark', label: 'Deep charcoal', prompt: 'painted a deep charcoal, in a satin finish' },
  { id: 'oak', label: 'Natural oak', prompt: 'in a warm natural white oak wood finish' },
] as const

export type IdeaFinishId = typeof IDEA_FINISHES[number]['id']

export const findStyle = (id: unknown) => IDEA_STYLES.find(style => style.id === id)
export const findFinish = (id: unknown) => IDEA_FINISHES.find(finish => finish.id === id)
