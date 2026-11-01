import { Vector3 } from 'three'
import layout from './layout.json'

/**
 * The house's plumbing as data: every run from the street to every fixture.
 * Both the glowing pipes and the particles inside them are built from this,
 * and "treated" is worked out by measuring distance along it from the point
 * the water was cleaned, which is what lets clean water visibly race through
 * the house when the visitor flips the switch.
 */

export type P = [number, number, number]

export interface PipeSpec {
  id: string
  points: P[]
  /** The run this one tees off. Omitted for the first run in the street. */
  parent?: string
  /** Thicker for trunks. */
  radius?: number
  /**
   * upstream: before the system, always raw. system: between the tanks, part
   * clean. Everything else is downstream, on treated water once the system is on.
   */
  zone?: 'upstream' | 'system'
  /** How clean the water here is with the system running, 0..1 (system runs only). */
  purity?: number
  /** Runs past the under-sink filter. */
  tap?: boolean
}

const { fixtures: FX, levels: LV, tanks: T, main: MAIN, cut: CUT } = layout
const WALL_Z = -2.86
const HEAD = T.floor + T.carbon.height + 0.16
const JUMP = HEAD + 0.2
const TZ = T.z
const KITCHEN_RUN = LV.groundFloor + 0.45
const BATH_RUN = LV.upperFloor + 0.22

export const SYSTEM = {
  inlet: [-5.1, HEAD, -2.62] as P,
  outlet: [-1.4, JUMP, TZ] as P,
  head: HEAD,
  jump: JUMP,
}

/** Under-sink filter position, shown only in that mode. */
export const TAP_FILTER: P = [FX.kitchenSink.x, KITCHEN_RUN - 0.03, -2.62]
export const SHUTOFF: P = [-5.8, MAIN.y, 1.86]

export const PIPES: PipeSpec[] = [
  {
    id: 'service', zone: 'upstream', radius: 1.25,
    points: [[MAIN.x + 0.28, MAIN.y, CUT + 0.015], [-5.8, MAIN.y, CUT + 0.015], [-5.8, MAIN.y, -2.62], [-5.8, HEAD, -2.62], SYSTEM.inlet],
  },
  {
    id: 'hose', parent: 'service', zone: 'upstream',
    points: [[-5.8, MAIN.y, FX.hose.z], [-5.8, 0.02, FX.hose.z], [FX.hose.x, 0.02, FX.hose.z], [FX.hose.x, FX.hose.y, FX.hose.z]],
  },
  {
    id: 'to-sediment', parent: 'service', zone: 'upstream', radius: 1.25,
    points: [SYSTEM.inlet, [T.sediment.x, HEAD, -2.62], [T.sediment.x, HEAD, TZ]],
  },
  {
    id: 'to-carbon', parent: 'to-sediment', zone: 'system', purity: 0.3, radius: 1.25,
    points: [[T.sediment.x + 0.12, HEAD + 0.04, TZ], [T.sediment.x + 0.22, JUMP, TZ], [T.carbon.x - 0.22, JUMP, TZ], [T.carbon.x - 0.12, HEAD + 0.04, TZ]],
  },
  {
    id: 'to-scale', parent: 'to-carbon', zone: 'system', purity: 0.75, radius: 1.25,
    points: [[T.carbon.x + 0.12, HEAD + 0.04, TZ], [T.carbon.x + 0.26, JUMP, TZ], [T.scale.x - 0.26, JUMP, TZ], [T.scale.x - 0.12, HEAD + 0.04, TZ]],
  },
  {
    id: 'outlet', parent: 'to-scale', radius: 1.3,
    points: [[T.scale.x + 0.12, HEAD + 0.04, TZ], [T.scale.x + 0.26, JUMP, TZ], SYSTEM.outlet, [-1.1, JUMP, TZ], [-1.1, JUMP, WALL_Z]],
  },
  {
    id: 'riser', parent: 'outlet', radius: 1.2,
    points: [[-1.1, JUMP, WALL_Z], [-1.1, BATH_RUN, WALL_Z]],
  },
  {
    id: 'kitchen-left', parent: 'riser',
    points: [[-1.1, KITCHEN_RUN, WALL_Z], [FX.kitchenSink.x, KITCHEN_RUN, WALL_Z], [FX.kitchenSink.x, KITCHEN_RUN, -2.62]],
  },
  {
    id: 'kitchen-tap', parent: 'kitchen-left', tap: true,
    points: [[FX.kitchenSink.x, KITCHEN_RUN, -2.62], [FX.kitchenSink.x, FX.kitchenSink.y, FX.kitchenSink.z]],
  },
  {
    id: 'dishwasher', parent: 'kitchen-left',
    points: [[FX.dishwasher.x, KITCHEN_RUN, WALL_Z], [FX.dishwasher.x, KITCHEN_RUN - 0.25, WALL_Z], [FX.dishwasher.x, KITCHEN_RUN - 0.25, -2.5]],
  },
  {
    id: 'fridge', parent: 'riser',
    points: [[-1.1, KITCHEN_RUN, WALL_Z], [FX.fridge.x, KITCHEN_RUN, WALL_Z], [FX.fridge.x, KITCHEN_RUN + 0.6, WALL_Z]],
  },
  {
    id: 'bath-run', parent: 'riser',
    points: [[-1.1, BATH_RUN, WALL_Z], [FX.shower.x, BATH_RUN, WALL_Z]],
  },
  {
    id: 'vanity', parent: 'bath-run',
    points: [[FX.vanity.x, BATH_RUN, WALL_Z], [FX.vanity.x, FX.vanity.y + 0.27, WALL_Z], [FX.vanity.x, FX.vanity.y + 0.27, -2.92]],
  },
  {
    id: 'toilet', parent: 'bath-run',
    points: [[FX.toilet.x, BATH_RUN, WALL_Z], [FX.toilet.x, BATH_RUN + 0.5, WALL_Z]],
  },
  {
    id: 'shower', parent: 'bath-run',
    points: [[FX.shower.x, BATH_RUN, WALL_Z], [FX.shower.x, FX.shower.headY, WALL_Z], [FX.shower.x, FX.shower.headY, FX.shower.z]],
  },
  {
    id: 'to-heater', parent: 'outlet',
    points: [[-1.1, JUMP, TZ], [FX.heater.x - 0.14, JUMP, TZ], [FX.heater.x - 0.14, LV.basementFloor + FX.heater.height, FX.heater.z]],
  },
  {
    id: 'to-laundry', parent: 'to-heater',
    points: [[FX.heater.x - 0.14, JUMP, TZ], [2.2, JUMP, TZ], [2.2, JUMP, FX.washer.z - 0.68], [FX.washer.x, JUMP, FX.washer.z - 0.68], [FX.washer.x, LV.basementFloor + 0.92, FX.washer.z - 0.68]],
  },
]

export type FixtureId = 'heater' | 'kitchenSink' | 'dishwasher' | 'fridge' | 'vanity' | 'toilet' | 'shower' | 'washer'

/** Where pins and the treated count read from: the run that feeds each fixture. */
export const FIXTURE_PIPE: Record<FixtureId, string> = {
  heater: 'to-heater',
  kitchenSink: 'kitchen-tap',
  dishwasher: 'dishwasher',
  fridge: 'fridge',
  vanity: 'vanity',
  toilet: 'toilet',
  shower: 'shower',
  washer: 'to-laundry',
}

/** Round the corners so runs read as bent copper, not a wire diagram. */
function fillet(points: P[], radius = 0.09): Vector3[] {
  const v = points.map((p) => new Vector3(...p))
  const out: Vector3[] = [v[0].clone()]
  for (let i = 1; i < v.length - 1; i++) {
    const a = v[i - 1], b = v[i], c = v[i + 1]
    const ab = a.distanceTo(b), bc = b.distanceTo(c)
    const r = Math.min(radius, ab * 0.45, bc * 0.45)
    const p0 = b.clone().add(a.clone().sub(b).normalize().multiplyScalar(r))
    const p1 = b.clone().add(c.clone().sub(b).normalize().multiplyScalar(r))
    for (let s = 0; s <= 5; s++) {
      const t = s / 5
      out.push(p0.clone().multiplyScalar((1 - t) * (1 - t)).add(b.clone().multiplyScalar(2 * t * (1 - t))).add(p1.clone().multiplyScalar(t * t)))
    }
  }
  out.push(v[v.length - 1].clone())
  return out
}

export interface Run {
  spec: PipeSpec
  points: Vector3[]
  /** Arc length at each point within this run. */
  arcs: number[]
  length: number
  /** Distance from the system outlet to this run's start (downstream runs). */
  start: number
  /** Distance from the under-sink filter to this run's start. */
  tapStart: number
}

function nearestArc(run: Run, p: Vector3): number {
  let best = 0, bestDistance = Infinity
  for (let i = 0; i < run.points.length - 1; i++) {
    const a = run.points[i], b = run.points[i + 1]
    const ab = b.clone().sub(a)
    const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-6)))
    const d = a.clone().add(ab.multiplyScalar(t)).distanceTo(p)
    if (d < bestDistance) { bestDistance = d; best = run.arcs[i] + (run.arcs[i + 1] - run.arcs[i]) * t }
  }
  return best
}

export function buildRuns(): Run[] {
  const runs = new Map<string, Run>()
  for (const spec of PIPES) {
    const points = fillet(spec.points)
    const arcs = [0]
    for (let i = 1; i < points.length; i++) arcs.push(arcs[i - 1] + points[i].distanceTo(points[i - 1]))
    const run: Run = { spec, points, arcs, length: arcs[arcs.length - 1], start: 0, tapStart: 0 }
    if (spec.parent) {
      const parent = runs.get(spec.parent)
      if (!parent) throw new Error(`Pipe ${spec.id} tees off unknown run ${spec.parent}`)
      run.start = spec.id === 'outlet' ? 0 : parent.start + nearestArc(parent, points[0])
    }
    runs.set(spec.id, run)
  }
  return [...runs.values()]
}

/** The longest treated run: how far the wave of clean water has to travel. */
export const treatedReach = (runs: Run[]) => runs.reduce((max, run) => (isDownstream(run.spec) ? Math.max(max, run.start + run.length) : max), 0)
export const isDownstream = (spec: PipeSpec) => !spec.zone
