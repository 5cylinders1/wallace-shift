import { stormReading, type StormFix } from '../content'
import { baseTarget, calmSoil, clearWeather, noDamage, noRepairs, seasonAt, type CameraTarget, type DamageState, type Repairs, type SceneTarget } from '../engine/state'

/**
 * The home page is one continuous shot of one model. Each section asks for
 * a camera, a season and a state of the house; the engine eases between
 * them, so scrolling never cuts.
 */

export type StageName = 'hero' | 'year' | 'repairs' | 'storm'
export type Layout = 'wide' | 'narrow'

export interface StormState { fixes: Record<StormFix, boolean>; power: boolean }

export interface DirectorInput {
  stage: StageName
  step: number
  progress: number
  layout: Layout
  /** Month for the hero, 0..12. */
  month: number
  storm: StormState
}

type Shot = Omit<CameraTarget, 'fov'> & { fov?: number }

const shots: Record<string, Shot> = {
  hero: { azimuth: 21, elevation: 9, distance: 55, target: [0.6, -2.9, -3.4], offsetX: 0.26, offsetY: -0.03 },
  ground: { azimuth: -3, elevation: 5, distance: 47, target: [-2.6, -3.8, -2], offsetX: 0.25, offsetY: 0 },
  spring: { azimuth: -36, elevation: 7, distance: 19, target: [5.0, -1.2, -2.7], offsetX: 0.22, offsetY: 0 },
  summer: { azimuth: 30, elevation: 10, distance: 22, target: [-4.8, -1.0, -2.6], offsetX: 0.22, offsetY: 0 },
  winter: { azimuth: 9, elevation: 6, distance: 24, target: [-9.6, -1.2, -1.5], offsetX: 0.2, offsetY: 0 },
  years: { azimuth: 6, elevation: 9, distance: 36, target: [0.4, -1.4, -3], offsetX: 0.2, offsetY: 0 },
  outside: { azimuth: 16, elevation: 14, distance: 24, target: [7.6, -0.6, -1.6], offsetX: 0.2, offsetY: 0 },
  drain: { azimuth: -24, elevation: 13, distance: 17, target: [4.4, -2.3, -1.4], offsetX: 0.2, offsetY: 0 },
  wall: { azimuth: -34, elevation: 7, distance: 19, target: [5.2, -1.1, -2.6], offsetX: 0.2, offsetY: 0 },
  anchors: { azimuth: -12, elevation: 6, distance: 22, target: [6.6, -1.3, -1.4], offsetX: 0.2, offsetY: 0 },
  piers: { azimuth: 12, elevation: 3, distance: 30, target: [-5.6, -4.3, -1.6], offsetX: 0.2, offsetY: 0 },
  storm: { azimuth: -9, elevation: 10, distance: 31, target: [5.6, -0.9, -2.4], offsetX: -0.2, offsetY: 0 },
}

/** Phones: copy sits below, so the model rises into the top of the screen. */
function shot(name: keyof typeof shots, layout: Layout): CameraTarget {
  const base = shots[name]
  if (layout === 'wide') return { ...base, target: [...base.target] as [number, number, number], fov: base.fov ?? 30 }
  const hero = name === 'hero'
  return {
    ...base,
    target: [base.target[0] * (hero ? 0.4 : 0.85), base.target[1] + (hero ? 0.8 : 0), base.target[2]],
    distance: base.distance * (hero ? 1.12 : 1.32),
    offsetX: 0,
    offsetY: hero ? -0.25 : 0.21,
    fov: 38,
  }
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const ramp = (x: number, from: number, to: number) => clamp01((x - from) / (to - from))

const springDamage: DamageState = { settle: 0, bow: 0.85, stepCrack: 0, hCrack: 1, puddle: 0 }
const allDamage: DamageState = { settle: 1, bow: 0.85, stepCrack: 1, hCrack: 1, puddle: 0 }

export function directTarget(input: DirectorInput): SceneTarget {
  const { stage, step, progress, layout } = input
  const t: SceneTarget = { ...baseTarget, ...calmSoil, ...noDamage, ...clearWeather, repairs: { ...noRepairs }, focus: -1, camera: shot('hero', layout) }

  if (stage === 'hero') {
    Object.assign(t, seasonAt(input.month))
    t.drift = 1
    return t
  }

  if (stage === 'year') {
    if (step === 0) {
      Object.assign(t, seasonAt(10.5))
      t.focus = 1
      t.camera = shot('ground', layout)
    } else if (step === 1) {
      Object.assign(t, seasonAt(4), springDamage)
      t.hCrack = ramp(progress, 0.15, 0.6)
      t.bow = 0.85 * ramp(progress, 0.2, 0.75)
      t.puddle = ramp(progress, 0.1, 0.7) * 0.8
      t.rain = 0.55; t.flow = 1
      t.camera = shot('spring', layout)
    } else if (step === 2) {
      Object.assign(t, seasonAt(8), springDamage)
      t.settle = ramp(progress, 0.1, 0.7)
      t.stepCrack = ramp(progress, 0.25, 0.75)
      t.camera = shot('summer', layout)
    } else if (step === 3) {
      Object.assign(t, seasonAt(0.6), allDamage)
      t.camera = shot('winter', layout)
    } else {
      Object.assign(t, seasonAt(10), allDamage)
      t.camera = shot('years', layout)
    }
    return t
  }

  if (stage === 'repairs') {
    // Water fixes stay once made; the wall and pier options are shown one at a time.
    Object.assign(t, seasonAt(4.5), allDamage)
    t.swell = 0
    t.wet = 0.7
    t.table = -3.2
    const r: Repairs = { ...noRepairs }
    const done = (from: number) => step > from
    if (step >= 0) { r.extension = step === 0 ? ramp(progress, 0.05, 0.45) : 1; r.regrade = step === 0 ? ramp(progress, 0.35, 0.8) : 1 }
    if (step >= 1) { r.drain = step === 1 ? ramp(progress, 0.05, 0.45) : 1; r.sump = r.drain; r.battery = step === 1 ? ramp(progress, 0.5, 0.8) : 1 }
    t.negGrade = 1
    t.rain = step <= 1 ? 0.5 : 0
    t.flow = step <= 1 ? 1 : 0
    t.pressure = step <= 1 ? 0.6 : 0
    t.puddle = 0
    if (step === 2) { r.straps = ramp(progress, 0.05, 0.6); t.bow = 0.85 - 0.25 * ramp(progress, 0.2, 0.9) }
    if (step === 3) { r.anchors = ramp(progress, 0.05, 0.75); t.bow = 0.85 * (1 - 0.75 * ramp(progress, 0.5, 1)) }
    if (step === 4) { r.braces = ramp(progress, 0.05, 0.6); t.bow = 0.6 }
    if (step === 5) { r.piers = ramp(progress, 0.05, 0.75); t.settle = 1 - ramp(progress, 0.7, 0.95); t.stepCrack = 1 - 0.4 * ramp(progress, 0.7, 1) }
    if (step === 6) { r.helical = ramp(progress, 0.05, 0.75); t.settle = 1 - ramp(progress, 0.7, 0.95); t.stepCrack = 1 - 0.4 * ramp(progress, 0.7, 1) }
    if (done(4)) t.bow = 0.25
    if (step >= 5) t.hCrack = 0.6
    t.repairs = r
    t.camera = shot((['outside', 'drain', 'wall', 'anchors', 'wall', 'piers', 'piers'] as const)[Math.min(step, 6)], layout)
    return t
  }

  // Storm mode: a long wet spell at night, with the visitor's fixes in place.
  const reading = stormReading(input.storm.fixes, input.storm.power)
  Object.assign(t, seasonAt(4), springDamage)
  t.table = -2.0
  t.wet = 1
  t.rain = 1
  t.flow = 1
  t.night = 0.82
  t.power = input.storm.power ? 1 : 0
  t.pressure = 0.85
  t.hCrack = 0.7
  t.bow = 0.45
  t.puddle = reading.puddle
  t.drift = 0.6
  const f = input.storm.fixes
  t.repairs = { ...noRepairs, extension: f.extension ? 1 : 0, regrade: f.regrade ? 1 : 0, drain: f.drain ? 1 : 0, sump: f.drain ? 1 : 0, battery: f.battery && f.drain ? 1 : 0, membrane: f.membrane ? 1 : 0 }
  t.camera = shot('storm', layout)
  return t
}
