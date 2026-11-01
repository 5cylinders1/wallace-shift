import layout from '../engine/layout.json'
import { baseTarget, type CameraTarget, type Mode, type RoomEffect, type SceneTarget, type TracerId } from '../engine/state'

/**
 * The page is one continuous visit to one house. Each section asks for a
 * camera and a state of the plumbing; the engine eases between them.
 */

export type StageName = 'hero' | 'coverage' | 'system' | 'rooms' | 'study' | 'volume'
export type Layout = 'wide' | 'narrow'

export interface DirectorInput {
  stage: StageName
  step: number
  layout: Layout
  mode: Mode
  tracer: TracerId | 'all'
  years: number
  hardness: number
  people: number
}

export interface Pin { anchor: string; label: string; fixture?: string; tone?: 'raw' | 'clean' | 'plain' }

type Shot = Omit<CameraTarget, 'fov' | 'offsetY'> & { fov?: number; offsetY?: number; narrow?: Partial<CameraTarget> }

const { tanks: T } = layout
const TZ = T.z

const shots = {
  hero: { azimuth: -5, elevation: 4, distance: 46, target: [-2.2, 2.0, 0], offsetX: 0.13, narrow: { distance: 62, target: [-0.2, 1.8, 0], offsetY: 0.17, fov: 34 } },
  coverage: { azimuth: -3, elevation: 3, distance: 41, target: [-2.0, 2.1, 0], offsetX: 0.17, narrow: { distance: 58, target: [-0.4, 2.0, 0], offsetY: 0.17, fov: 34 } },
  overview: { azimuth: -10, elevation: 2, distance: 7.6, target: [-3.3, -1.55, TZ], offsetX: 0.2, narrow: { distance: 11.5, offsetY: 0.2, fov: 34 } },
  sediment: { azimuth: -8, elevation: 2, distance: 3.5, target: [T.sediment.x, -1.25, TZ], offsetX: 0.2, narrow: { distance: 5.2, offsetY: 0.2, fov: 34 } },
  carbon: { azimuth: -5, elevation: 1, distance: 4.2, target: [T.carbon.x, -1.55, TZ], offsetX: 0.2, narrow: { distance: 5.8, offsetY: 0.2, fov: 34 } },
  scale: { azimuth: -3, elevation: 1, distance: 4.2, target: [T.scale.x, -1.55, TZ], offsetX: 0.2, narrow: { distance: 5.8, offsetY: 0.2, fov: 34 } },
  tracer: { azimuth: -6, elevation: 2, distance: 7.6, target: [-3.3, -1.42, TZ], offsetX: 0.21, narrow: { distance: 11, offsetY: 0.25, fov: 34 } },
  kitchen: { azimuth: 9, elevation: 5, distance: 6.6, target: [-2.75, 1.7, -2.45], offsetX: 0.2, fov: 30, narrow: { distance: 8.2, offsetY: 0.24, fov: 36 } },
  shower: { azimuth: 12, elevation: 2, distance: 7.6, target: [-4.1, 4.65, -1.8], offsetX: 0.2, fov: 30, narrow: { distance: 9.5, offsetY: 0.24, fov: 36 } },
  machines: { azimuth: -8, elevation: 2, distance: 8.2, target: [1.6, -1.4, -1.9], offsetX: 0.2, fov: 30, narrow: { distance: 12, offsetY: 0.22, fov: 36 } },
  study: { azimuth: 24, elevation: 34, distance: 13, target: [0, -0.3, -0.2], offsetX: 0.2, fov: 28, narrow: { distance: 17, offsetY: 0.24, fov: 32 } },
  volume: { azimuth: -12, elevation: 8, distance: 78, target: [5.4, 1.5, -1], offsetX: 0.14, narrow: { distance: 112, offsetY: 0.22, fov: 32, target: [6.5, 1.5, -1] } },
} satisfies Record<string, Shot>

function shot(name: keyof typeof shots, mode: Layout): CameraTarget {
  const base: Shot = shots[name] as Shot
  const camera: CameraTarget = {
    azimuth: base.azimuth, elevation: base.elevation, distance: base.distance,
    target: [...base.target] as [number, number, number],
    offsetX: base.offsetX, offsetY: base.offsetY ?? 0, fov: base.fov ?? 28,
  }
  if (mode === 'wide') return camera
  return { ...camera, offsetX: 0, ...base.narrow, target: ([...(base.narrow?.target ?? camera.target)]) as [number, number, number] }
}

export function directTarget(input: DirectorInput): SceneTarget {
  const { stage, step, layout: view, mode, tracer } = input
  const t: SceneTarget = { ...baseTarget, mode, camera: shot('hero', view), tracer: null, years: input.years, hardness: input.hardness, people: input.people }
  if (stage === 'hero') return t
  if (stage === 'coverage') {
    t.camera = shot('coverage', view)
    t.drift = 0.5
    return t
  }
  if (stage === 'system') {
    t.drift = 0.35
    t.dim = 0.55
    t.mode = 'whole'
    const names = ['overview', 'sediment', 'carbon', 'scale', 'tracer'] as const
    t.camera = shot(names[Math.min(step, 4)], view)
    t.open = step === 0 ? 0 : 1
    t.tracer = step === 0 ? null : tracer
    t.focusTank = step >= 1 && step <= 3 ? step - 1 : -1
    return t
  }
  if (stage === 'rooms') {
    t.drift = 0.3
    const names = ['kitchen', 'shower', 'machines'] as const
    const effects: RoomEffect[] = ['kitchen', 'shower', 'none']
    t.camera = shot(names[Math.min(step, 2)], view)
    t.effect = effects[Math.min(step, 2)]
    return t
  }
  if (stage === 'study') {
    t.world = 'study'
    t.drift = 0.45
    t.camera = shot('study', view)
    return t
  }
  // volume
  t.camera = shot('volume', view)
  t.mode = 'whole'
  t.drift = 0.3
  t.volume = 1
  return t
}

const PIN_FIXTURES: Pin[] = [
  { anchor: 'kitchenSink', label: 'Kitchen tap', fixture: 'kitchenSink' },
  { anchor: 'dishwasher', label: 'Dishwasher', fixture: 'dishwasher' },
  { anchor: 'fridge', label: 'Fridge & ice', fixture: 'fridge' },
  { anchor: 'vanity', label: 'Bathroom sink', fixture: 'vanity' },
  { anchor: 'toilet', label: 'Toilet', fixture: 'toilet' },
  { anchor: 'shower', label: 'Shower', fixture: 'shower' },
  { anchor: 'washer', label: 'Washer', fixture: 'washer' },
  { anchor: 'heater', label: 'Water heater', fixture: 'heater' },
]

export function directPins(input: { stage: StageName; step: number; mode: Mode; layout: Layout }): Pin[] {
  const { stage, step, mode, layout: view } = input
  if (stage === 'coverage') {
    const pins = [...PIN_FIXTURES, { anchor: 'main', label: 'Water main', tone: 'raw' as const }, { anchor: 'hose', label: 'Hose bib: raw on purpose', tone: 'raw' as const }]
    if (mode === 'whole') pins.push({ anchor: 'system', label: 'Riffle system', tone: 'clean' as const })
    if (mode === 'tap') pins.push({ anchor: 'underSink', label: 'Under-sink filter', tone: 'clean' as const })
    return view === 'wide' ? pins : pins.filter((pin) => ['kitchenSink', 'shower', 'heater'].includes(pin.anchor))
  }
  if (stage === 'system') {
    const tanks: Pin[] = [
      { anchor: 'tank0', label: '1  Sediment', tone: 'plain' },
      { anchor: 'tank1', label: '2  Carbon', tone: 'plain' },
      { anchor: 'tank2', label: '3  Scale control', tone: 'plain' },
    ]
    if (step === 0 || step === 4) return tanks
    return [tanks[step - 1]]
  }
  if (stage === 'rooms' && step === 2) return PIN_FIXTURES.filter((pin) => pin.anchor === 'washer' || pin.anchor === 'heater')
  if (stage === 'study') return [{ anchor: 'pipeRaw', label: 'As it arrives', tone: 'raw' }, { anchor: 'pipeClean', label: 'After scale control', tone: 'clean' }]
  return []
}
