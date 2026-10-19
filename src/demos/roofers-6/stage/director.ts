import { noUpgrades, type Upgrades } from '../catalog'
import type { HeroMode } from '../content'
import type { CameraTarget, SceneTarget } from '../engine/RoofEngine'

/**
 * The page is one continuous shot of one house. Each section asks for a
 * camera, a time of day and a state of the roof; the engine eases between
 * them, so scrolling never cuts.
 */

export type StageName = 'hero' | 'anatomy' | 'services' | 'studio'
export type Layout = 'wide' | 'narrow'
export type StudioView = 'street' | 'aerial' | 'detail'

export interface DirectorInput {
  stage: StageName
  /** The block nearest the middle of the viewport, and how far through it we are. */
  step: number
  stepProgress: number
  layout: Layout
  time: number
  heroMode: HeroMode
  studio: { upgrades: Upgrades; tod: number; view: StudioView }
}

type Shot = Omit<CameraTarget, 'fov'> & { fov?: number }

const wide: Record<string, Shot> = {
  hero: { azimuth: -30, elevation: 7.5, distance: 54, target: [3, 3.6, 0], offsetX: 0.22, offsetY: -0.03 },
  heroTune: { azimuth: 8, elevation: 17, distance: 42, target: [2.5, 5.6, 1], offsetX: 0.22, offsetY: -0.02 },
  heroBuild: { azimuth: -36, elevation: 18, distance: 50, target: [2.5, 4.6, 0], offsetX: 0.22, offsetY: -0.04 },
  heroUpgrade: { azimuth: 10, elevation: 10, distance: 50, target: [4, 4, 1], offsetX: 0.22, offsetY: -0.03 },
  anatomy: { azimuth: -31, elevation: 17, distance: 47, target: [0, 6.6, 1.5], offsetX: 0.2, offsetY: -0.03 },
  storm: { azimuth: -22, elevation: 9, distance: 52, target: [3, 4.3, 0], offsetX: 0.2, offsetY: 0 },
  aftermath: { azimuth: -12, elevation: 19, distance: 39, target: [1.5, 6, 2.5], offsetX: 0.2, offsetY: -0.02 },
  tuneup: { azimuth: 16, elevation: 20, distance: 42, target: [3.2, 5.6, 1], offsetX: 0.2, offsetY: -0.02 },
  build: { azimuth: -38, elevation: 24, distance: 50, target: [3, 4.6, 0], offsetX: 0.2, offsetY: -0.02 },
  upgrades: { azimuth: 12, elevation: 13, distance: 48, target: [4, 4.4, 1], offsetX: 0.2, offsetY: -0.02 },
  street: { azimuth: -24, elevation: 6.5, distance: 48, target: [3, 3.8, 0], offsetX: 0.19, offsetY: -0.02 },
  aerial: { azimuth: -36, elevation: 33, distance: 50, target: [3, 3, 0], offsetX: 0.19, offsetY: -0.02 },
  detail: { azimuth: -10, elevation: 16, distance: 22, target: [0, 6.8, 2.4], offsetX: 0.19, offsetY: -0.02 },
}

/** Phones: the copy sits above or below, so the house moves vertically instead. */
function narrow(shot: Shot, name: string): CameraTarget {
  const hero = name.startsWith('hero')
  return {
    ...shot,
    target: [shot.target[0] + (hero ? 0.6 : 0.3), shot.target[1], shot.target[2]],
    distance: shot.distance * (name === 'detail' ? 1.5 : hero ? 1.62 : 1.6),
    offsetX: 0,
    offsetY: hero ? -0.21 : 0.2,
    fov: 36,
  }
}

function shot(name: keyof typeof wide, layout: Layout): CameraTarget {
  const base = wide[name]
  return layout === 'wide' ? { ...base, target: [...base.target] as [number, number, number], fov: base.fov ?? 30 } : narrow(base, name)
}

const step = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function blank(camera: CameraTarget): SceneTarget {
  return {
    camera, drift: 0, tod: 0.72, weather: 0, rain: 0, hail: 0, lightning: 0,
    explode: 0, focus: -1, build: 1, damage: 0, upgrades: { ...noUpgrades },
  }
}

const allUpgrades: Upgrades = { skylights: 1, solar: 1, copper: 1, snowGuards: 1, lighting: 1, gutterGuards: 1 }

/** Anatomy blocks: 0 intro, 1 to 9 the layers, 10 the reassembled roof. */
export const ANATOMY_STEPS = 11
/** Service blocks, in page order. */
export const serviceSteps = ['storm', 'aftermath', 'tuneup', 'build', 'upgrades'] as const
export type ServiceStep = typeof serviceSteps[number]

export function heroBuild(time: number): number {
  const cycle = time % 11
  return Math.min(1, cycle / 8.5)
}

export function upgradeShown(progress: number, index: number): boolean {
  return progress > 0.06 + index * 0.1
}

export function directTarget(input: DirectorInput): SceneTarget {
  const { layout, step: n, stepProgress: q } = input

  if (input.stage === 'hero') {
    switch (input.heroMode) {
      case 'storm':
        return { ...blank(shot('hero', layout)), drift: 0.6, tod: 0.6, weather: 1, rain: 1, hail: 0.75, lightning: 1 }
      case 'tuneup':
        return { ...blank(shot('heroTune', layout)), drift: 0.5, tod: 0.5 }
      case 'build':
        return { ...blank(shot('heroBuild', layout)), drift: 0.4, tod: 0.5, build: heroBuild(input.time) }
      case 'upgrades':
        return { ...blank(shot('heroUpgrade', layout)), drift: 0.6, tod: 0.86, upgrades: { ...allUpgrades } }
      default:
        return { ...blank(shot('hero', layout)), drift: 1, tod: 0.74 }
    }
  }

  if (input.stage === 'anatomy') {
    const target = blank(shot(n === 0 && q < 0.35 ? 'hero' : 'anatomy', layout))
    target.tod = 0.42
    target.explode = n === 0 ? step(0.35, 0.9, q) : n >= ANATOMY_STEPS - 1 ? 1 - step(0.15, 0.7, q) : 1
    target.focus = n >= 1 && n <= 9 ? n - 1 : -1
    return target
  }

  if (input.stage === 'services') {
    const name = serviceSteps[Math.max(0, Math.min(serviceSteps.length - 1, n))]
    if (name === 'storm') return { ...blank(shot('storm', layout)), tod: 0.58, weather: 1, rain: 1, hail: q < 0.8 ? 0.9 : 0.2, lightning: 1 }
    if (name === 'aftermath') return { ...blank(shot('aftermath', layout)), tod: 0.58, damage: step(0.0, 0.25, q) }
    if (name === 'tuneup') return { ...blank(shot('tuneup', layout)), tod: 0.47 }
    if (name === 'build') return { ...blank(shot('build', layout)), tod: 0.45, build: step(0.08, 0.86, q) }
    const order: (keyof Upgrades)[] = ['skylights', 'solar', 'copper', 'snowGuards', 'lighting', 'gutterGuards']
    const upgrades = { ...noUpgrades }
    order.forEach((key, index) => { upgrades[key] = upgradeShown(q, index) ? 1 : 0 })
    return { ...blank(shot('upgrades', layout)), tod: 0.84, upgrades }
  }

  return { ...blank(shot(input.studio.view, layout)), tod: input.studio.tod, upgrades: { ...input.studio.upgrades } }
}
