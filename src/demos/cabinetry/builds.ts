import type { PageName } from './routes'

/**
 * The three scroll-built rooms. Every image is generated concept imagery from
 * one camera (scripts/cabinetry/generate_hero.py), so a later stage can wipe in
 * over an earlier one. Positions (`at`, `wipe`) are fractions of the film's
 * scroll; components/BuildFilm.tsx lays its timeline out against them.
 */
export interface BuildStage { id: string; alt: string; wipe?: [number, number] }
export interface BuildChapter { id: string; title: string; em?: string; body: string; at: number; still: string }
export interface Build {
  id: 'kitchen' | 'bath' | 'library'
  folder: string
  label: string
  listLabel: string
  stages: BuildStage[]
  chapters: BuildChapter[]
  cta: { label: string; page: PageName }
}

const ROOT = '/demos/cabinetry/hero'
export const buildSrc = (build: Build, name: string) => `${build.folder}/${name}.webp`

export const builds: Record<Build['id'], Build> = {
  kitchen: {
    id: 'kitchen',
    folder: ROOT,
    label: 'A kitchen built in stages as you scroll: bare framing, rough-in, drywall, cabinetry and the finished room',
    listLabel: 'How a Tambour kitchen is built',
    stages: [
      { id: 'framing', alt: 'The room in bare wood framing' },
      { id: 'roughin', alt: 'Insulation, wiring and plumbing stubs', wipe: [0.33, 0.43] },
      { id: 'drywall', alt: 'Primed drywall and the first cabinet boxes', wipe: [0.49, 0.59] },
      { id: 'cabinetry', alt: 'Cabinets and the navy island installed, the hood frame in raw wood', wipe: [0.62, 0.72] },
      { id: 'finished', alt: 'The finished kitchen', wipe: [0.78, 0.88] },
    ],
    chapters: [
      { id: 'drawn', title: 'Drawn', em: 'before it’s built.', body: 'Every Tambour kitchen starts as a set of drawings: plans, elevations and a finish schedule you approve line by line.', at: 0.08, still: 'blueprint' },
      { id: 'measured', title: 'Designed', em: 'to the inch.', body: 'Measured in the room and drawn around its real walls, so every cabinet has its place before a board is cut.', at: 0.22, still: 'framing' },
      { id: 'rough', title: 'Rough-in.', body: 'Power, plumbing and lighting go exactly where the drawings put the sink, the range and the lanterns.', at: 0.40, still: 'roughin' },
      { id: 'closed', title: 'Closed', em: 'and squared.', body: 'Walls hung, primed and checked for plumb before the first cabinet leaves the workshop.', at: 0.52, still: 'drywall' },
      { id: 'cabinetry', title: 'Cabinetry.', body: 'Built in our Kansas City workshop, then installed and scribed to the walls by the people who made it.', at: 0.65, still: 'cabinetry' },
      { id: 'finished', title: 'Built', em: 'to gather.', body: 'Stone, the plaster hood, the lanterns and the last door adjustment. Then it’s yours.', at: 0.80, still: 'finished' },
    ],
    cta: { label: 'See kitchens', page: 'kitchens' },
  },
  bath: {
    id: 'bath',
    folder: `${ROOT}/bath`,
    label: 'A primary bath built in stages as you scroll: bare framing, rough plumbing, waterproofed walls, stone and vanity, the finished room, then evening light',
    listLabel: 'How a Tambour bath is built',
    stages: [
      { id: 'framing', alt: 'The bath in bare wood framing' },
      { id: 'roughin', alt: 'Supply lines, drains and the shower valve in the open walls', wipe: [0.33, 0.41] },
      { id: 'drywall', alt: 'Backer board and waterproofing membrane on the wet walls', wipe: [0.45, 0.53] },
      { id: 'vanity', alt: 'Marble set and the oak vanity hung, the tub wrapped in film', wipe: [0.57, 0.65] },
      { id: 'finished', alt: 'The finished bath', wipe: [0.69, 0.79] },
      { id: 'evening', alt: 'The finished bath in the evening, sconces and cove light on', wipe: [0.86, 0.95] },
    ],
    chapters: [
      { id: 'drawn', title: 'Your own spa,', em: 'drawn first.', body: 'The tub under the window, the shower where the steam can’t reach the oak, a vanity at the height you actually use.', at: 0.08, still: 'blueprint' },
      { id: 'designed', title: 'Designed', em: 'around the window.', body: 'Every fixture is placed on the drawings before a wall closes, so each pipe and wire lands exactly where it should.', at: 0.22, still: 'framing' },
      { id: 'rough', title: 'Rough plumbing.', body: 'Supply lines, drains and the shower valve set in the open walls and pressure-tested before anything covers them.', at: 0.36, still: 'roughin' },
      { id: 'sealed', title: 'Sealed', em: 'before it’s tiled.', body: 'Backer board and a waterproofing membrane on every wet wall, and a mortar bed sloped to the drain.', at: 0.48, still: 'drywall' },
      { id: 'vanity', title: 'Tile & vanities.', body: 'Stone set floor to ceiling, the oak vanity hung on a hidden cleat, the tub placed and wrapped until the end.', at: 0.60, still: 'vanity' },
      { id: 'finished', title: 'Rest', em: 'easy.', body: 'Marble, brass, glass and the last bead of sealant. Then the lights come on, and the room is yours.', at: 0.74, still: 'evening' },
    ],
    cta: { label: 'Plan a bath', page: 'consultation' },
  },
  library: {
    id: 'library',
    folder: `${ROOT}/library`,
    label: 'A library wall built in stages as you scroll: bare framing, drywall, raw casework, painted cabinetry, the finished room, then evening light',
    listLabel: 'How a Tambour library wall is built',
    stages: [
      { id: 'framing', alt: 'The room in bare wood framing, the arch framed around the window' },
      { id: 'drywall', alt: 'Primed drywall and the framed arch', wipe: [0.33, 0.41] },
      { id: 'boxes', alt: 'Raw maple cabinet carcasses set against the wall', wipe: [0.45, 0.53] },
      { id: 'cabinetry', alt: 'The green cabinetry painted and installed, shelves still empty', wipe: [0.57, 0.65] },
      { id: 'finished', alt: 'The finished library', wipe: [0.69, 0.79] },
      { id: 'evening', alt: 'The library in the evening, every picture light on', wipe: [0.86, 0.95] },
    ],
    chapters: [
      { id: 'drawn', title: 'A wall', em: 'worth reading.', body: 'Shelves drawn to the books, the window seat to the window, the ladder to the reach.', at: 0.08, still: 'blueprint' },
      { id: 'designed', title: 'Drawn', em: 'to the inch.', body: 'The arch, the bays and every picture light are set on the elevations before a board is cut.', at: 0.22, still: 'framing' },
      { id: 'closed', title: 'Closed', em: 'and squared.', body: 'The arch is framed and the walls are hung and checked for plumb, ready for the casework.', at: 0.36, still: 'drywall' },
      { id: 'casework', title: 'Casework.', body: 'Maple carcasses and face frames, cut and joined in our workshop, set against the wall and scribed to it.', at: 0.48, still: 'boxes' },
      { id: 'painted', title: 'Finished in', em: 'our shop.', body: 'Doors and shelves sprayed in our finishing room, then hung, levelled and adjusted on site.', at: 0.60, still: 'cabinetry' },
      { id: 'finished', title: 'Your', em: 'library.', body: 'Books, brass and the last cushion on the window seat. In the evening, every picture light comes on.', at: 0.74, still: 'evening' },
    ],
    cta: { label: 'Plan a built-in', page: 'consultation' },
  },
}
