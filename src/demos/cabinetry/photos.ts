/**
 * Every photograph on the site. They are licensed stock (Pexels license:
 * free to use and modify, no attribution required) standing in for the
 * cabinetmaker's own project photography, and they are credited anyway on
 * /photography. Files are graded once in the build scripts and exported at
 * 2000 and 1000 pixels wide.
 */
export interface Photo {
  slug: string
  pexelsId: number
  photographer: string
  w: number
  h: number
  alt: string
}

const ROOT = '/demos/cabinetry/photos'

const list: Photo[] = [
  { slug: 'kitchen-anatomy', pexelsId: 4800189, photographer: 'Curtis Adams', w: 5000, h: 3333, alt: 'A painted gray shaker kitchen with brass hardware, a white quartz island and brass pendants' },
  { slug: 'kitchen-island-brass', pexelsId: 4800175, photographer: 'Curtis Adams', w: 2600, h: 1760, alt: 'Painted gray shaker kitchen with a thick-edged white quartz island, brass pendants and double wall ovens' },
  { slug: 'kitchen-range-wall', pexelsId: 4800177, photographer: 'Curtis Adams', w: 2600, h: 1733, alt: 'Range wall of painted shaker cabinets with a stainless hood, subway tile and drawers beside the range' },
  { slug: 'kitchen-to-family-room', pexelsId: 4800185, photographer: 'Curtis Adams', w: 2600, h: 1733, alt: 'Kitchen island looking through to a family room with painted built-ins around the fireplace' },
  { slug: 'kitchen-black-marble', pexelsId: 6538939, photographer: 'Max Vakhtbovych', w: 2600, h: 1796, alt: 'Handleless black kitchen with a black marble backsplash, a waterfall island and lit glass display cabinets' },
  { slug: 'kitchen-warm-oak', pexelsId: 10153052, photographer: 'Jonathan Borba', w: 2600, h: 1733, alt: 'Oak kitchen with a fluted island base, black stone counters and lit open shelving' },
  { slug: 'kitchen-oak-display', pexelsId: 10153051, photographer: 'Jonathan Borba', w: 2600, h: 1733, alt: 'Floor-to-ceiling oak and glass display wall with integrated lighting beside an island' },
  { slug: 'kitchen-two-tone', pexelsId: 19227216, photographer: 'Curtis Adams', w: 2600, h: 1734, alt: 'Two-tone kitchen with black painted tall cabinets and a stained wood island and range wall' },
  { slug: 'bath-arabescato', pexelsId: 7166639, photographer: 'Max Vakhtbovych', w: 2600, h: 1735, alt: 'Bath with Arabescato marble walls, a marble-clad tub and a painted vanity with bin pulls' },
  { slug: 'bath-walnut-brass', pexelsId: 19141076, photographer: 'Patrick Bohn', w: 2600, h: 1734, alt: 'Marble bathroom with a glass shower, brass fixtures and a high-gloss walnut floating vanity' },
  { slug: 'bath-primary-shower', pexelsId: 4800174, photographer: 'Curtis Adams', w: 2600, h: 1733, alt: 'Primary bathroom with a white shaker vanity, marble counters and a glass shower' },
  { slug: 'bath-white-marble', pexelsId: 6587855, photographer: 'Max Vakhtbovych', w: 2600, h: 1828, alt: 'White marble bathroom with a freestanding tub, a crystal chandelier and wall-hung vanity cabinets' },
  { slug: 'bath-double-vanity', pexelsId: 15667601, photographer: 'Curtis Adams', w: 2600, h: 1734, alt: 'White shaker double vanity with a center drawer bank, marble top and black-framed mirrors' },
  { slug: 'bath-powder-room', pexelsId: 10153047, photographer: 'Jonathan Borba', w: 2600, h: 1733, alt: 'Powder room with a slatted wood wall, a stone vessel sink and a floating shelf' },
  { slug: 'builtin-dressing-room', pexelsId: 6585750, photographer: 'Max Vakhtbovych', w: 2600, h: 1735, alt: 'Dressing room with open shelving, a run of drawers and a walnut door, lit by LED strips' },
  { slug: 'builtin-closet-oak', pexelsId: 11701120, photographer: 'Max Vakhtbovych', w: 2600, h: 1733, alt: 'Oak walk-in closet with hanging bays, shelving and a central drawer unit' },
  { slug: 'builtin-library', pexelsId: 7167083, photographer: 'Max Vakhtbovych', w: 2600, h: 1876, alt: 'Wood library wall of built-in bookshelves with lit display niches' },
  { slug: 'builtin-fireplace', pexelsId: 4800186, photographer: 'Curtis Adams', w: 2600, h: 1733, alt: 'Living room with painted built-in shelving on both sides of a fireplace' },
  { slug: 'builtin-laundry', pexelsId: 4800182, photographer: 'Curtis Adams', w: 2600, h: 1733, alt: 'Laundry room lined with painted shaker cabinets, a sink and stacked counters' },
  { slug: 'shop-hand-plane', pexelsId: 7109995, photographer: 'Daniel Reche', w: 2600, h: 1733, alt: 'Hands pushing a hand plane across a board, curls of wood on the bench' },
  { slug: 'shop-measure', pexelsId: 5973894, photographer: 'Ono Kosuki', w: 2600, h: 1733, alt: 'A woodworker measuring a board with a tape on a worn workbench' },
  { slug: 'shop-sanding', pexelsId: 5710754, photographer: 'Anna Shvets', w: 2600, h: 1733, alt: 'A craftsman sanding a board with an orbital sander' },
  { slug: 'shop-lumber', pexelsId: 12278570, photographer: 'Mark Stebnicki', w: 2600, h: 1733, alt: 'Stacks of sawn lumber in a warehouse' },
  { slug: 'shop-plane-closeup', pexelsId: 374861, photographer: 'Burst', w: 1920, h: 1080, alt: 'Close view of a hand plane shaving a board' },
  { slug: 'shop-fitting', pexelsId: 5089178, photographer: 'cottonbro studio', w: 2333, h: 3500, alt: 'A craftsman checking the fit of a wooden piece at the bench' },
  { slug: 'coffee-station', pexelsId: 5825346, photographer: 'Charlotte May', w: 2600, h: 3900, alt: 'Espresso machine and grinder on a counter beneath wood shelves of cups' },
]

export const photos: Record<string, Photo> = Object.fromEntries(list.map(photo => [photo.slug, photo]))
export const photoList = list

export function photo(slug: string): Photo {
  const found = photos[slug]
  if (!found) throw new Error(`Unknown photo: ${slug}`)
  return found
}

export const photoSrc = (slug: string, size: 1000 | 2000 = 2000) => `${ROOT}/${slug}-${size}.webp`
export const photoSrcSet = (slug: string) => `${ROOT}/${slug}-1000.webp 1000w, ${ROOT}/${slug}-2000.webp 2000w`
export const pexelsUrl = (id: number) => `https://www.pexels.com/photo/${id}/`

