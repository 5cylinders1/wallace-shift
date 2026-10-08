import { blendPoses, figurePaths, poses, type CrewMember, type Pose, type PoseName } from './crew'
import {
  CHALK_MARKS,
  CHIMNEY,
  COURSE,
  DORMERS,
  EAVE_Y,
  GARAGE,
  GROUND_Y,
  ICE_TOP,
  LADDER,
  PIPE_BOOTS,
  RIDGE_Y,
  ROOF_X0,
  ROOF_X1,
  TRAILER,
  TRAILER_MOUTH,
  TRUCK,
  YARD_SIGN,
  garageRoofY,
  groundY,
  roofY,
} from './geometry'
import {
  clamp,
  easeIn,
  easeInOut,
  easeOut,
  keyedColor,
  keyedNumber,
  lerp,
  segment,
  window4,
} from './math'
import { PHASE, clockAt, stepAt } from './timeline'
import { DEBRIS_COUNT } from './SceneActors'

/* ------------------------------------------------------------------ */
/* Element lookup                                                       */
/* ------------------------------------------------------------------ */

const CREW: CrewMember[] = ['inspector', 'r1', 'r2', 'r3', 'g1']

type FigureNodes = {
  root: SVGGElement
  parts: Record<string, SVGElement>
  tools: Record<string, SVGGElement>
  lastTool: string
}

export interface SceneNodes {
  svg: SVGSVGElement
  byId: (id: string) => SVGElement
  figures: Record<CrewMember, FigureNodes>
  chalk: SVGElement[]
  oldBoots: SVGElement[]
  newBoots: SVGElement[]
  bundles: Array<{ node: SVGElement; x: number; y: number }>
  debris: SVGElement[]
  dormers: SVGElement[]
  dormerGlows: SVGElement[]
  roofCrewLayer: SVGGElement
  frontCrewLayer: SVGGElement
}

export function collectNodes(svg: SVGSVGElement): SceneNodes {
  const cache = new Map<string, SVGElement>()
  const byId = (id: string) => {
    let node = cache.get(id)
    if (!node) {
      node = svg.querySelector<SVGElement>(`#${id}`) ?? undefined
      if (!node) throw new Error(`Timelapse scene is missing #${id}`)
      cache.set(id, node)
    }
    return node
  }

  const figures = {} as Record<CrewMember, FigureNodes>
  for (const member of CREW) {
    const root = byId(`rf-crew-${member}`) as SVGGElement
    const parts: Record<string, SVGElement> = {}
    root.querySelectorAll<SVGElement>('[data-part]').forEach((node) => {
      parts[node.dataset.part as string] = node
    })
    const tools: Record<string, SVGGElement> = {}
    root.querySelectorAll<SVGGElement>('[data-tool]').forEach((node) => {
      tools[node.dataset.tool as string] = node
      node.style.display = 'none'
    })
    figures[member] = { root, parts, tools, lastTool: 'none' }
  }

  return {
    svg,
    byId,
    figures,
    chalk: CHALK_MARKS.map((_, i) => byId(`rf-chalk-${i}`)),
    oldBoots: Array.from(svg.querySelectorAll<SVGElement>('.rf-old-boot')),
    newBoots: Array.from(svg.querySelectorAll<SVGElement>('.rf-new-boot')),
    bundles: Array.from(svg.querySelectorAll<SVGElement>('[data-bundle]')).map((node) => ({
      node,
      x: Number(node.dataset.x),
      y: Number(node.dataset.y),
    })),
    debris: Array.from(byId('rf-debris').children) as SVGElement[],
    dormers: DORMERS.map((_, i) => byId(`rf-dormer-${i}`)),
    dormerGlows: DORMERS.map((_, i) => byId(`rf-dormer-glow-${i}`)),
    roofCrewLayer: byId('rf-roof-crew') as SVGGElement,
    frontCrewLayer: byId('rf-front-crew') as SVGGElement,
  }
}

/* ------------------------------------------------------------------ */
/* Camera                                                               */
/* ------------------------------------------------------------------ */

type Box = readonly [number, number, number, number]
type Shot = { at: number; target: Box; screen: Box }

/**
 * Each shot names a world rectangle that must be in view and the share of
 * the viewport it should fill. Desktop keeps a column on the left for the
 * copy; portrait keeps the top (intro, finale) or the bottom (captions).
 */
const WIDE_SHOTS: Shot[] = [
  { at: 0, target: [540, 400, 2000, 1170], screen: [0.42, 0.12, 1, 0.94] },
  { at: 4, target: [540, 400, 2000, 1170], screen: [0.42, 0.12, 1, 0.94] },
  { at: 15, target: [700, 400, 2200, 1220], screen: [0.33, 0.11, 0.995, 0.96] },
  { at: 50, target: [720, 410, 2195, 1210], screen: [0.33, 0.11, 0.995, 0.96] },
  { at: 84, target: [700, 400, 2200, 1220], screen: [0.33, 0.11, 0.995, 0.96] },
  { at: 97, target: [520, 380, 2040, 1290], screen: [0.42, 0.12, 1, 0.96] },
]

/** Tall shots pin the target to the top of its box so the lawn, not the
 *  roof, sits behind the caption sheet. */
const TALL_SHOTS: Shot[] = [
  { at: 0, target: [560, 430, 1990, 1130], screen: [0, 0.6, 1, 0.98] },
  { at: 4, target: [560, 430, 1990, 1130], screen: [0, 0.6, 1, 0.98] },
  { at: 15, target: [830, 400, 1870, 1200], screen: [0.01, 0.17, 0.99, 0.6] },
  { at: 50, target: [840, 410, 1870, 1190], screen: [0.01, 0.17, 0.99, 0.6] },
  { at: 84, target: [830, 400, 1870, 1200], screen: [0.01, 0.17, 0.99, 0.6] },
  { at: 97, target: [540, 380, 2010, 1300], screen: [0, 0.5, 1, 0.98] },
]

/** The reduced-motion still: the finished house, centred, nothing overlaid. */
const STILL_SHOT: Shot = { at: 100, target: [500, 380, 2040, 1250], screen: [0.02, 0.03, 0.98, 0.99] }

/** The breakpoint the CSS shares: `(min-aspect-ratio: 21/20)`. */
export const WIDE_ASPECT = 21 / 20

const mixBox = (a: Box, b: Box, t: number): Box => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
  lerp(a[3], b[3], t),
]

export type ViewBox = { x: number; y: number; w: number; h: number }

export function cameraAt(p: number, width: number, height: number, still = false): ViewBox {
  const tall = width / height < WIDE_ASPECT && !still
  const shots = still ? [STILL_SHOT] : tall ? TALL_SHOTS : WIDE_SHOTS
  let target = shots[shots.length - 1].target
  let screen = shots[shots.length - 1].screen
  for (let i = 1; i < shots.length; i += 1) {
    if (p <= shots[i].at) {
      const t = easeInOut(segment(p, shots[i - 1].at, shots[i].at))
      target = mixBox(shots[i - 1].target, shots[i].target, t)
      screen = mixBox(shots[i - 1].screen, shots[i].screen, t)
      break
    }
  }
  const tw = target[2] - target[0]
  const th = target[3] - target[1]
  const sw = (screen[2] - screen[0]) * width
  const sh = (screen[3] - screen[1]) * height
  const scale = Math.min(sw / tw, sh / th)
  const cx = (target[0] + target[2]) / 2
  const cy = (target[1] + target[3]) / 2
  const sx = ((screen[0] + screen[2]) / 2) * width
  const centeredY = ((screen[1] + screen[3]) / 2) * height
  const sy = tall ? Math.min(centeredY, screen[1] * height + (th * scale) / 2) : centeredY
  return { x: cx - sx / scale, y: cy - sy / scale, w: width / scale, h: height / scale }
}

/** Camera height, 0 at eye level and 1 at the working height. */
function elevationAt(p: number): number {
  if (p < 4) return 0
  if (p < 15) return easeInOut(segment(p, 4, 15))
  if (p < 86) return 1
  return lerp(1, 0.25, easeInOut(segment(p, 86, 97)))
}

/* ------------------------------------------------------------------ */
/* Light                                                                */
/* ------------------------------------------------------------------ */

type SkyKey = { at: number; value: string }

const SKY_TOP: SkyKey[] = [
  { at: 0, value: '#7fa6cf' },
  { at: 20, value: '#5f97cf' },
  { at: 50, value: '#5a93cd' },
  { at: 56, value: '#6a86b8' },
  { at: 58.5, value: '#2c3c68' },
  { at: 60.5, value: '#070f24' },
  { at: 62.3, value: '#070f24' },
  { at: 64, value: '#3e5b93' },
  { at: 68, value: '#5f97cf' },
  { at: 92, value: '#5f97cf' },
  { at: 100, value: '#6f9ccc' },
]
const SKY_MID: SkyKey[] = [
  { at: 0, value: '#b9cfe0' },
  { at: 20, value: '#a9cbe6' },
  { at: 50, value: '#a6c8e4' },
  { at: 56, value: '#c3a9a6' },
  { at: 58.5, value: '#7a5f7c' },
  { at: 60.5, value: '#13234a' },
  { at: 62.3, value: '#13234a' },
  { at: 64, value: '#b48a95' },
  { at: 68, value: '#a9cbe6' },
  { at: 92, value: '#a9cbe6' },
  { at: 100, value: '#b8cde0' },
]
const SKY_LOW: SkyKey[] = [
  { at: 0, value: '#f2d6b8' },
  { at: 20, value: '#e3eef5' },
  { at: 50, value: '#e6eff4' },
  { at: 56, value: '#f3c08b' },
  { at: 58.5, value: '#e7936c' },
  { at: 60.5, value: '#2a3d66' },
  { at: 62.3, value: '#2a3d66' },
  { at: 64, value: '#f2b588' },
  { at: 68, value: '#e3eef5' },
  { at: 92, value: '#e8eff2' },
  { at: 100, value: '#f1dcc2' },
]
/** Multiply tint over the land: warm at dawn and dusk, deep blue at night. */
const TINT_COLOR: SkyKey[] = [
  { at: 0, value: '#ffd9b0' },
  { at: 18, value: '#ffffff' },
  { at: 52, value: '#ffffff' },
  { at: 56, value: '#ffc78a' },
  { at: 58.5, value: '#c77d6a' },
  { at: 60.5, value: '#1d2b52' },
  { at: 62.3, value: '#1d2b52' },
  { at: 64, value: '#f6b98d' },
  { at: 68, value: '#ffffff' },
  { at: 92, value: '#ffffff' },
  { at: 100, value: '#ffe0b8' },
]
const TINT_OPACITY = [
  { at: 0, value: 0.2 },
  { at: 18, value: 0 },
  { at: 52, value: 0 },
  { at: 56, value: 0.22 },
  { at: 58.5, value: 0.4 },
  { at: 60.5, value: 0.74 },
  { at: 62.3, value: 0.74 },
  { at: 64, value: 0.26 },
  { at: 68, value: 0 },
  { at: 92, value: 0 },
  { at: 100, value: 0.14 },
]

/** Shingle-edge colour on every rake and hip: old → bare deck → felt → new. */
const RAKE: SkyKey[] = [
  { at: 29, value: '#8a867d' },
  { at: 30.5, value: '#b98f5c' },
  { at: 52, value: '#b98f5c' },
  { at: 53.5, value: '#d2d5d6' },
  { at: 76, value: '#d2d5d6' },
  { at: 78, value: '#3b3f45' },
]
const CAP: SkyKey[] = [
  { at: 35, value: '#7d7970' },
  { at: 36.5, value: '#b98f5c' },
  { at: 54, value: '#b98f5c' },
  { at: 55.5, value: '#d2d5d6' },
  { at: 80.5, value: '#d2d5d6' },
  { at: 82, value: '#2f3237' },
]

function sunAt(p: number): { x: number; y: number; visible: number } {
  const day2 = p > 61
  const t = day2 ? segment(p, 62, 122) : segment(p, -2, 59.5)
  return {
    x: lerp(-260, 2700, t),
    y: 1000 - Math.sin(t * Math.PI) * 880,
    visible: day2 ? segment(p, 62, 63.5) : 1 - segment(p, 58.5, 59.6),
  }
}

/* ------------------------------------------------------------------ */
/* Crew choreography                                                    */
/* ------------------------------------------------------------------ */

type Space = 'roof' | 'ground' | 'world' | 'garage'
type Motion = PoseName | 'walk' | 'climb'
type Key = { at: number; x: number; y: number; space: Space; motion: Motion; face?: 1 | -1 }

type Surface = { k: number; g: number; kg: number }

function toWorld(x: number, y: number, space: Space, s: Surface): [number, number] {
  if (space === 'roof') return [x, roofY(y, s.k)]
  if (space === 'garage') return [x, garageRoofY(y, s.kg)]
  if (space === 'ground') return [x, groundY(y, s.g)]
  return [x, y]
}

type FigureState = {
  x: number
  y: number
  face: 1 | -1
  pose: Pose
  opacity: number
  /** Drawn behind the dormers and gables rather than in front of the house. */
  onRoof: boolean
  /** The surface of the current segment; lifelines only run on the main roof. */
  surface: Space
}

const LADDER_FOOT = { x: LADDER.x, y: GROUND_Y + 4 }
const LADDER_TOP = { x: LADDER.x, y: EAVE_Y - 2 }
const TRUCK_DOOR = { x: TRUCK.x + 150, y: 1196 }

function motionPose(motion: Motion, p: number, phase: number): Pose {
  if (motion === 'walk') return blendPoses(poses.walkA, poses.walkB, (Math.sin(p * 9 + phase) + 1) / 2)
  if (motion === 'climb') return blendPoses(poses.climbA, poses.climbB, (Math.sin(p * 14 + phase) + 1) / 2)
  return poses[motion]
}

/**
 * Interpolates a figure along keyframes and fades it in at the first and
 * out after the last. Each key's motion applies until the next key: while
 * moving it is the gait, while still a walk or climb settles to standing.
 */
function track(p: number, keys: Key[], s: Surface, phase: number): FigureState | null {
  const first = keys[0].at
  const last = keys[keys.length - 1].at
  if (p < first - 0.6 || p > last + 0.6) return null
  const opacity = Math.min(segment(p, first - 0.6, first), 1 - segment(p, last, last + 0.6))
  let a = keys[0]
  let b = keys[0]
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i].at <= p) {
      a = keys[i]
      b = keys[Math.min(i + 1, keys.length - 1)]
    }
  }
  const t = b.at === a.at ? 0 : clamp((p - a.at) / (b.at - a.at))
  const [ax, ay] = toWorld(a.x, a.y, a.space, s)
  const [bx, by] = toWorld(b.x, b.y, b.space, s)
  const moving = b !== a && Math.abs(bx - ax) + Math.abs(by - ay) > 1
  const motion: Motion = moving ? a.motion : a.motion === 'walk' || a.motion === 'climb' ? 'stand' : a.motion
  const climbing = moving && a.motion === 'climb'
  return {
    x: lerp(ax, bx, t),
    y: lerp(ay, by, t),
    face: a.face ?? (bx < ax ? -1 : 1),
    pose: motionPose(motion, p, phase),
    opacity,
    onRoof: !climbing && (a.space === 'roof' || a.space === 'garage' || b.space === 'roof' || b.space === 'garage'),
    surface: a.space,
  }
}

const key = (at: number, x: number, y: number, space: Space, motion: Motion, face?: 1 | -1): Key => ({
  at,
  x,
  y,
  space,
  motion,
  face,
})

/** Up the ladder from the truck and out to a spot on the roof (2.7 long). */
function ascend(start: number, to: [number, number]): Key[] {
  return [
    key(start, TRUCK_DOOR.x, TRUCK_DOOR.y, 'ground', 'walk'),
    key(start + 1.1, LADDER_FOOT.x, LADDER_FOOT.y, 'world', 'climb'),
    key(start + 2, LADDER_TOP.x, LADDER_TOP.y, 'world', 'walk'),
    key(start + 2.7, to[0], to[1], 'roof', 'stand'),
  ]
}

/** From a spot on a roof, down the ladder and back to the truck (2.6 long). */
function descend(start: number, from: [number, number], space: Space = 'roof'): Key[] {
  return [
    key(start, from[0], from[1], space, 'walk'),
    key(start + 0.8, LADDER_TOP.x, LADDER_TOP.y, 'world', 'climb'),
    key(start + 1.6, LADDER_FOOT.x, LADDER_FOOT.y, 'world', 'walk'),
    key(start + 2.6, TRUCK_DOOR.x, TRUCK_DOOR.y, 'ground', 'walk'),
  ]
}

const tearLine = (p: number) => lerp(RIDGE_Y, EAVE_Y, segment(p, ...PHASE.tearOff))
const installLine = (p: number) => lerp(EAVE_Y, RIDGE_Y, segment(p, ...PHASE.install))
const underLine = (p: number) => lerp(ICE_TOP, RIDGE_Y, segment(p, ...PHASE.underlay))
const garageTearLine = (p: number) => lerp(GARAGE.ridgeY, GARAGE.eaveY, segment(p, ...PHASE.garageTear))
const garageInstallLine = (p: number) => lerp(GARAGE.eaveY, GARAGE.ridgeY, segment(p, ...PHASE.garageInstall))

const lineY = (y: number) => clamp(y, RIDGE_Y + 12, EAVE_Y - 4)
const rollY = (p: number) => Math.min(underLine(p) + 12, EAVE_Y - 6)
const garageWorkY = (p: number) => GARAGE.eaveY - 18 - segment(p, 53.5, 56) * 70

/** A worker holding one spot while the work line moves past them. */
function at(p: number, x: number, y: number, space: Space, pose: PoseName, face: 1 | -1, sway = 0): Key {
  return key(p, x + Math.sin(p * 6 + sway) * 5, y, space, pose, face)
}

function crewState(member: CrewMember, p: number, s: Surface): FigureState | null {
  const hold = (k: Key, phase: number) => track(p, [k], s, phase)

  switch (member) {
    case 'inspector': {
      const marks = CHALK_MARKS.flatMap((m, i) => [
        key(10.4 + i * 0.62, m.x - 22, m.y + 16, 'roof', 'inspect', i < 3 ? 1 : -1),
        key(10.7 + i * 0.62, m.x - 22, m.y + 16, 'roof', 'walk'),
      ])
      return track(
        p,
        [
          key(6, 300, 1150, 'ground', 'walk'),
          key(8.4, LADDER_FOOT.x - 30, 1100, 'ground', 'walk'),
          key(8.8, LADDER_FOOT.x, LADDER_FOOT.y, 'world', 'climb'),
          key(9.7, LADDER_TOP.x, LADDER_TOP.y, 'world', 'walk'),
          ...marks,
          key(15, LADDER_TOP.x, LADDER_TOP.y, 'world', 'climb'),
          key(15.8, LADDER_FOOT.x, LADDER_FOOT.y, 'world', 'walk'),
          key(16.6, 1240, 1180, 'ground', 'inspect', -1),
          key(18.2, 1240, 1180, 'ground', 'walk'),
          key(19.6, 520, 1200, 'ground', 'walk'),
        ],
        s,
        0,
      )
    }

    case 'r1': {
      const x = 1610
      if (p >= 23.3 && p < 40) return hold(at(p, x, lineY(tearLine(p) + 8), 'roof', 'shovel', -1), 0)
      if (p >= 40 && p < 47.5) return hold(at(p, 1586, 812, 'roof', 'kneel', -1), 0)
      if (p >= 47.5 && p < 55.2) return hold(key(p, 1660 - segment(p, 47.5, 50) * 60, rollY(p), 'roof', 'roll', -1), 0)
      if (p >= 67.1 && p < 80) return hold(at(p, x, lineY(installLine(p) - 2), 'roof', 'kneel', -1), 0)
      if (p >= 80 && p < 82.4) return hold(key(p, 1570 - segment(p, 80, 82.4) * 60, RIDGE_Y + 16, 'roof', 'kneel', -1), 0)
      return (
        track(p, ascend(20.6, [x, RIDGE_Y + 14]), s, 0) ??
        track(p, descend(55.2, [1600, rollY(55.2)]), s, 0) ??
        track(p, ascend(64.4, [x, EAVE_Y - 4]), s, 0) ??
        track(p, descend(82.4, [1510, RIDGE_Y + 16]), s, 0)
      )
    }

    case 'r2': {
      const x = 1000
      if (p >= 24.1 && p < 40) return hold(at(p, x, lineY(tearLine(p) + 8), 'roof', 'shovel', 1, 2), 2)
      if (p >= 40 && p < 47.5) return hold(at(p, 1004, 806, 'roof', 'kneel', 1, 2), 2)
      if (p >= 47.5 && p < 55.4) return hold(key(p, 940, rollY(p), 'roof', 'roll', 1), 2)
      if (p >= 67.5 && p < 80.5) return hold(at(p, x, lineY(installLine(p) - 2), 'roof', 'kneel', 1, 2), 2)
      return (
        track(p, ascend(21.4, [x, RIDGE_Y + 14]), s, 2) ??
        track(p, descend(55.4, [940, rollY(55.4)]), s, 2) ??
        track(p, ascend(64.8, [x, EAVE_Y - 4]), s, 2) ??
        track(p, descend(80.5, [x, RIDGE_Y + 12]), s, 2)
      )
    }

    case 'r3': {
      const x = 1300
      if (p >= 24.9 && p < 33.2) return hold(at(p, x, lineY(tearLine(p) + 8), 'roof', 'shovel', 1, 4), 4)
      if (p >= 33.2 && p < 34.4) {
        return track(p, [key(33.2, x, lineY(tearLine(33.2) + 8), 'roof', 'walk'), key(34.4, 1786, GARAGE.ridgeY + 14, 'garage', 'shovel', -1)], s, 4)
      }
      if (p >= 34.4 && p < 40) {
        return hold(at(p, 1786, Math.min(garageTearLine(p) + 10, GARAGE.eaveY - 6), 'garage', 'shovel', -1, 4), 4)
      }
      if (p >= 40 && p < 55.6) return hold(key(p, 1800, garageWorkY(p), 'garage', p > 53.5 ? 'roll' : 'kneel', -1), 4)
      if (p >= 67.9 && p < 77.6) return hold(at(p, x, lineY(installLine(p) - 2), 'roof', 'kneel', 1, 4), 4)
      if (p >= 77.6 && p < 78.4) {
        return track(p, [key(77.6, x, lineY(installLine(77.6) - 2), 'roof', 'walk'), key(78.4, 1790, GARAGE.eaveY - 10, 'garage', 'kneel', -1)], s, 4)
      }
      if (p >= 78.4 && p < 81.6) {
        return hold(at(p, 1790, Math.max(garageInstallLine(p) - 4, GARAGE.ridgeY + 10), 'garage', 'kneel', -1, 4), 4)
      }
      return (
        track(p, ascend(22.2, [x, RIDGE_Y + 14]), s, 4) ??
        track(p, descend(55.6, [1800, garageWorkY(55.6)], 'garage'), s, 4) ??
        track(p, ascend(65.2, [x, EAVE_Y - 4]), s, 4) ??
        track(p, descend(81.6, [1790, GARAGE.ridgeY + 10], 'garage'), s, 4)
      )
    }

    case 'g1': {
      return (
        track(
          p,
          [
            key(20.4, TRUCK_DOOR.x, TRUCK_DOOR.y, 'ground', 'walk'),
            key(22.8, 600, 1110, 'ground', 'walk'),
            key(24.6, TRAILER.x + 110, 1206, 'ground', 'stand', -1),
            key(56.4, TRAILER.x + 110, 1206, 'ground', 'walk'),
            key(57.4, TRUCK_DOOR.x, TRUCK_DOOR.y, 'ground', 'walk'),
          ],
          s,
          6,
        ) ??
        track(
          p,
          [
            key(64, TRUCK_DOOR.x, TRUCK_DOOR.y, 'ground', 'carry'),
            key(65.4, LADDER_FOOT.x + 40, 1110, 'ground', 'stand', -1),
            key(82.4, LADDER_FOOT.x + 40, 1110, 'ground', 'walk'),
            key(83, 560, 1190, 'ground', 'push', 1),
            key(87.4, 1460, 1190, 'ground', 'walk'),
            key(88.2, TRUCK_DOOR.x, TRUCK_DOOR.y, 'ground', 'walk'),
          ],
          s,
          6,
        )
      )
    }
  }
}

/* ------------------------------------------------------------------ */
/* Render                                                               */
/* ------------------------------------------------------------------ */

const FIGURE_SCALE = 0.92

function applyFigure(fig: FigureNodes, state: FigureState | null, nodes: SceneNodes) {
  if (!state || state.opacity <= 0.001) {
    if (fig.root.style.opacity !== '0') fig.root.style.opacity = '0'
    return
  }
  const layer = state.onRoof ? nodes.roofCrewLayer : nodes.frontCrewLayer
  if (fig.root.parentNode !== layer) layer.appendChild(fig.root)
  fig.root.style.opacity = state.opacity.toFixed(3)
  fig.root.setAttribute(
    'transform',
    `translate(${state.x.toFixed(1)} ${state.y.toFixed(1)}) scale(${state.face * FIGURE_SCALE} ${FIGURE_SCALE})`,
  )
  const paths = figurePaths(state.pose)
  fig.parts.legBack.setAttribute('d', paths.legBack)
  fig.parts.legFront.setAttribute('d', paths.legFront)
  fig.parts.bootBack.setAttribute('d', paths.bootBack)
  fig.parts.bootFront.setAttribute('d', paths.bootFront)
  fig.parts.armBack.setAttribute('d', paths.armBack)
  fig.parts.armFront.setAttribute('d', paths.armFront)
  fig.parts.torso.setAttribute('d', paths.torso)
  fig.parts.stripe.setAttribute('d', paths.stripe)
  fig.parts.head.setAttribute('transform', `translate(${paths.headX.toFixed(1)} ${paths.headY.toFixed(1)})`)
  fig.parts.tool.setAttribute('transform', `translate(${paths.handFrontX.toFixed(1)} ${paths.handFrontY.toFixed(1)})`)
  if (fig.lastTool !== state.pose.tool) {
    if (fig.tools[fig.lastTool]) fig.tools[fig.lastTool].style.display = 'none'
    if (fig.tools[state.pose.tool]) fig.tools[state.pose.tool].style.display = ''
    fig.lastTool = state.pose.tool
  }
}

/** Removes `full` courses from the top, plus a fraction of the next. */
function setTearClip(full: SVGElement, part: SVGElement, progress: number, top: number, bottom: number) {
  const rows = Math.ceil((bottom - top) / COURSE)
  const removed = progress * rows
  const whole = Math.floor(removed)
  const frac = removed - whole
  const width = ROOF_X1 - ROOF_X0 + 80
  // Remaining courses sit below the first untouched course edge.
  const keepTop = whole >= rows ? bottom + 60 : bottom - (rows - whole - 1) * COURSE
  full.setAttribute('y', keepTop.toFixed(1))
  full.setAttribute('height', String(Math.max(0, bottom + 60 - keepTop)))
  if (whole >= rows) {
    part.setAttribute('width', '0')
    return
  }
  const rowTop = whole === 0 ? top - 40 : bottom - (rows - whole) * COURSE
  part.setAttribute('x', String(ROOF_X0 - 40))
  part.setAttribute('y', rowTop.toFixed(1))
  part.setAttribute('height', (keepTop - rowTop).toFixed(1))
  part.setAttribute('width', (width * (1 - frac)).toFixed(1))
}

/** Lays `full` courses from the eave up, plus a fraction of the next. */
function setLayClip(full: SVGElement, part: SVGElement, progress: number, top: number, bottom: number) {
  const rows = Math.ceil((bottom - top) / COURSE)
  const laid = progress * rows
  const whole = Math.floor(laid)
  const frac = laid - whole
  const width = ROOF_X1 - ROOF_X0 + 80
  const laidTop = whole >= rows ? top - 40 : bottom - whole * COURSE
  full.setAttribute('y', laidTop.toFixed(1))
  full.setAttribute('height', String(Math.max(0, bottom + 60 - laidTop)))
  if (whole >= rows || progress <= 0) {
    part.setAttribute('width', '0')
    return
  }
  const rowTop = whole === rows - 1 ? top - 40 : laidTop - COURSE
  part.setAttribute('x', String(ROOF_X0 - 40))
  part.setAttribute('y', rowTop.toFixed(1))
  part.setAttribute('height', (laidTop - rowTop).toFixed(1))
  part.setAttribute('width', (width * frac).toFixed(1))
}

export interface OverlayNodes {
  intro: HTMLElement | null
  captions: HTMLElement | null
  finale: HTMLElement | null
  day: HTMLElement | null
  time: HTMLElement | null
  hud: HTMLElement | null
  labels: Record<string, HTMLElement>
}

type LabelSpec = {
  range: [number, number, number, number]
  anchor: (s: Surface, figures: Partial<Record<CrewMember, FigureState | null>>) => [number, number] | null
}

/** Callouts pinned to the drawing. Their copy lives with the hero. */
const LABELS: Record<string, LabelSpec> = {
  chalk: { range: [11.2, 12, 15.4, 16], anchor: (s) => [1572, roofY(690, s.k)] },
  tarps: { range: [21.6, 22.4, 24.2, 25], anchor: () => [1300, GROUND_Y - 50] },
  trailer: { range: [26, 27, 33.5, 34.5], anchor: (s) => [TRAILER.x + 130, groundY(TRAILER.baseY, s.g) - 104] },
  deck: { range: [41, 42, 46.4, 47.2], anchor: (s) => [1590, roofY(752, s.k)] },
  drip: { range: [47.8, 48.4, 52, 52.8], anchor: () => [1660, EAVE_Y + 2] },
  ice: { range: [49.4, 50, 53.6, 54.4], anchor: (s) => [1240, roofY(842, s.k)] },
  under: { range: [52.6, 53.4, 56.6, 57.4], anchor: (s) => [1250, roofY(650, s.k)] },
  flashing: { range: [73.6, 74.4, 78.2, 79], anchor: (s) => [CHIMNEY.x1 + 4, roofY(CHIMNEY.baseY - 30, s.k)] },
  boot: { range: [76.4, 77.2, 80, 80.8], anchor: (s) => [PIPE_BOOTS[0].x, roofY(PIPE_BOOTS[0].y - 22, s.k)] },
  ridge: { range: [80.4, 81.2, 85, 85.8], anchor: (s) => [1120, roofY(RIDGE_Y - 4, s.k)] },
  magnet: {
    range: [83.6, 84.4, 87.2, 88],
    anchor: (_, figures) => {
      const g1 = figures.g1
      return g1 ? [g1.x + 40, g1.y - 4] : null
    },
  },
}

export interface RenderOptions {
  width: number
  height: number
  /** Reduced motion: one finished frame with no overlays. */
  still?: boolean
  onStep: (step: number) => void
}

export function renderScene(p: number, nodes: SceneNodes, overlay: OverlayNodes, options: RenderOptions) {
  const { width, height } = options
  const { byId } = nodes
  const e = elevationAt(p)
  const s: Surface = { k: 1 + 0.26 * e, g: 1 + 0.42 * e, kg: 1 + 0.18 * e }

  /* camera */
  const vb = cameraAt(p, width, height, options.still)
  nodes.svg.setAttribute('viewBox', `${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`)

  /* sky and light */
  byId('rf-sky-top').setAttribute('stop-color', keyedColor(p, SKY_TOP))
  byId('rf-sky-mid').setAttribute('stop-color', keyedColor(p, SKY_MID))
  byId('rf-sky-low').setAttribute('stop-color', keyedColor(p, SKY_LOW))
  const sun = sunAt(p)
  const sunNode = byId('rf-sun')
  sunNode.setAttribute('transform', `translate(${sun.x.toFixed(1)} ${sun.y.toFixed(1)})`)
  sunNode.style.opacity = sun.visible.toFixed(3)
  const nightness = window4(p, 58.8, 60.4, 62.4, 63.6)
  byId('rf-stars').style.opacity = nightness.toFixed(3)
  byId('rf-moon').style.opacity = nightness.toFixed(3)
  byId('rf-glow').style.opacity = window4(p, 58.4, 59.8, 62.6, 64).toFixed(3)
  const tint = byId('rf-tint')
  tint.setAttribute('fill', keyedColor(p, TINT_COLOR))
  tint.style.opacity = keyedNumber(p, TINT_OPACITY).toFixed(3)

  /* parallax: farther layers rise relative to the house as the camera does */
  byId('rf-celestial').setAttribute('transform', `translate(0 ${(-e * 130).toFixed(1)})`)
  byId('rf-clouds').setAttribute('transform', `translate(${(p * 7).toFixed(1)} ${(-e * 120).toFixed(1)})`)
  byId('rf-treeline').setAttribute('transform', `translate(0 ${(-e * 70).toFixed(1)})`)
  byId('rf-back-trees').setAttribute('transform', `translate(0 ${(-e * 40).toFixed(1)})`)
  byId('rf-side-trees').setAttribute('transform', `translate(0 ${(-e * 16).toFixed(1)})`)
  byId('rf-ground').setAttribute('transform', `translate(0 ${GROUND_Y}) scale(1 ${s.g.toFixed(4)}) translate(0 ${-GROUND_Y})`)

  /* surfaces */
  byId('rf-roof').setAttribute('transform', `translate(0 ${EAVE_Y}) scale(1 ${s.k.toFixed(4)}) translate(0 ${-EAVE_Y})`)
  byId('rf-garage-roof').setAttribute(
    'transform',
    `translate(0 ${GARAGE.eaveY}) scale(1 ${s.kg.toFixed(4)}) translate(0 ${-GARAGE.eaveY})`,
  )
  nodes.dormers.forEach((node, i) => {
    const dy = roofY(DORMERS[i].baseY, s.k) - DORMERS[i].baseY
    node.setAttribute('transform', `translate(0 ${dy.toFixed(1)})`)
    nodes.dormerGlows[i].setAttribute('transform', `translate(0 ${dy.toFixed(1)})`)
  })
  byId('rf-chimney').setAttribute('transform', `translate(0 ${(roofY(CHIMNEY.baseY, s.k) - CHIMNEY.baseY).toFixed(1)})`)

  /* roof layers */
  const tear = segment(p, ...PHASE.tearOff)
  const lay = segment(p, ...PHASE.install)
  setTearClip(byId('rf-old-clip-full'), byId('rf-old-clip-part'), tear, RIDGE_Y, EAVE_Y)
  setLayClip(byId('rf-new-clip-full'), byId('rf-new-clip-part'), lay, RIDGE_Y, EAVE_Y)
  const under = segment(p, ...PHASE.underlay)
  const underTop = lerp(ICE_TOP, RIDGE_Y - 30, under)
  const underRect = byId('rf-under-clip-rect')
  underRect.setAttribute('y', underTop.toFixed(1))
  underRect.setAttribute('height', under > 0 ? (ICE_TOP - underTop + 4).toFixed(1) : '0')
  const iceRect = byId('rf-ice-clip-rect')
  iceRect.setAttribute('x', String(ROOF_X0 - 40))
  iceRect.setAttribute('width', ((ROOF_X1 - ROOF_X0 + 80) * segment(p, ...PHASE.ice)).toFixed(1))
  byId('rf-drip').setAttribute('stroke-dashoffset', (1020 * (1 - segment(p, ...PHASE.dripEdge))).toFixed(1))

  const tearY = tearLine(p)
  const layY = installLine(p)
  const highlight = window4(p, 40.4, 41.4, 44.2, 45.2)
  byId('rf-rot-highlight').style.opacity = highlight.toFixed(3)
  const swap = segment(p, 43.4, 45.6)
  byId('rf-new-deck').style.opacity = swap.toFixed(3)
  byId('rf-rot').style.opacity = (1 - swap).toFixed(3)
  nodes.chalk.forEach((node, i) => {
    node.style.opacity = segment(p, 10.65 + i * 0.62, 10.85 + i * 0.62).toFixed(3)
  })
  PIPE_BOOTS.forEach((boot, i) => {
    nodes.oldBoots[i].style.opacity = tearY < boot.y - 6 ? '1' : '0'
    nodes.newBoots[i].style.opacity = layY < boot.y - 4 ? '1' : '0'
  })
  byId('rf-chimney-flash-old').style.opacity = tearY < CHIMNEY.baseY - 40 ? '1' : '0'
  byId('rf-chimney-flash-new').style.opacity = layY < CHIMNEY.baseY - 30 ? '1' : '0'
  byId('rf-ridge-new').style.opacity = segment(p, ...PHASE.ridge).toFixed(3)
  const sheen = byId('rf-sheen')
  const sheenT = segment(p, 92, 99.5)
  sheen.style.opacity = window4(p, 92, 93.5, 98.5, 100).toFixed(3)
  sheen.setAttribute('x', lerp(ROOF_X0 - 300, ROOF_X1 + 40, sheenT).toFixed(1))

  nodes.svg.style.setProperty('--rf-rake', keyedColor(p, RAKE))
  nodes.svg.style.setProperty('--rf-cap', keyedColor(p, CAP))

  /* garage roof */
  const gTear = segment(p, ...PHASE.garageTear)
  const gOld = byId('rf-garage-old-clip-rect')
  const gOldTop = lerp(GARAGE.ridgeY - 30, GARAGE.eaveY + 30, gTear)
  gOld.setAttribute('y', gOldTop.toFixed(1))
  gOld.setAttribute('height', String(GARAGE.eaveY + 60 - gOldTop))
  byId('rf-garage-underlay').style.opacity = segment(p, 54, 56).toFixed(3)
  const gNew = byId('rf-garage-new-clip-rect')
  const gNewTop = lerp(GARAGE.eaveY + 20, GARAGE.ridgeY - 30, segment(p, ...PHASE.garageInstall))
  gNew.setAttribute('y', gNewTop.toFixed(1))
  gNew.setAttribute('height', String(GARAGE.eaveY + 60 - gNewTop))

  /* site set-up */
  byId('rf-tarps').style.opacity = window4(p, 20.6, 22.4, 83, 85).toFixed(3)
  byId('rf-ladder').style.opacity = window4(p, 7.6, 8.4, 85.6, 86.4).toFixed(3)
  nodes.bundles.forEach((bundle, i) => {
    bundle.node.style.opacity = window4(p, 63.4 + i * 0.2, 64.2 + i * 0.2, 69 + i * 2, 70 + i * 2).toFixed(3)
    bundle.node.setAttribute('transform', `translate(${bundle.x} ${roofY(bundle.y, s.k).toFixed(1)})`)
  })

  /* vehicles */
  const arrive = 1 - easeOut(segment(p, 16, 20.6))
  const leaveNight = easeIn(segment(p, 58, 59.6)) - easeOut(segment(p, 62.6, 64.2))
  const leaveEnd = easeIn(segment(p, 88.6, 93))
  const trailerDx = arrive * 1600 + leaveEnd * 2400
  const truckDx = trailerDx + Math.max(0, leaveNight) * 1800
  const groundBase = groundY(TRUCK.baseY, s.g)
  byId('rf-truck').setAttribute('transform', `translate(${(TRUCK.x + truckDx).toFixed(1)} ${groundBase.toFixed(1)})`)
  byId('rf-trailer').setAttribute('transform', `translate(${(TRAILER.x + trailerDx).toFixed(1)} ${groundBase.toFixed(1)})`)
  const truckSpin = ((truckDx / 25) * 180) / Math.PI
  const trailerSpin = ((trailerDx / 21) * 180) / Math.PI
  byId('rf-truck-wheel-0').setAttribute('transform', `rotate(${truckSpin.toFixed(1)})`)
  byId('rf-truck-wheel-1').setAttribute('transform', `rotate(${truckSpin.toFixed(1)})`)
  byId('rf-trailer-wheel-0').setAttribute('transform', `rotate(${trailerSpin.toFixed(1)})`)
  byId('rf-trailer-wheel-1').setAttribute('transform', `rotate(${trailerSpin.toFixed(1)})`)
  const load = clamp(0.78 * tear + 0.22 * segment(p, ...PHASE.garageTear))
  byId('rf-debris-pile').setAttribute('transform', `translate(0 -100) scale(1 ${load.toFixed(3)}) translate(0 100)`)
  byId('rf-trailer-cover').style.opacity = Math.max(window4(p, 55.4, 56.2, 63, 63.8), segment(p, 86.6, 87.6)).toFixed(3)

  const sign = byId('rf-yard-sign')
  const rise = easeOut(segment(p, 87, 89.2))
  sign.setAttribute('transform', `translate(${YARD_SIGN.x} ${groundY(YARD_SIGN.y, s.g).toFixed(1)}) scale(1 ${rise.toFixed(3)})`)

  /* crew */
  const figures: Partial<Record<CrewMember, FigureState | null>> = {}
  for (const member of CREW) {
    const state = crewState(member, p, s)
    figures[member] = state
    applyFigure(nodes.figures[member], state, nodes)
  }

  /* lifelines from the ridge to each roofer's harness */
  for (const member of ['r1', 'r2', 'r3'] as const) {
    const rope = byId(`rf-rope-${member}`)
    const state = figures[member]
    if (!state || state.surface !== 'roof' || state.opacity < 0.5) {
      rope.setAttribute('d', '')
      continue
    }
    const anchorX = state.x + (state.face === 1 ? -40 : 40)
    const anchorY = roofY(RIDGE_Y + 4, s.k)
    const backX = state.x - state.face * 4
    const backY = state.y - 74 * FIGURE_SCALE
    rope.setAttribute(
      'd',
      `M${anchorX.toFixed(1)} ${anchorY.toFixed(1)}Q${((anchorX + backX) / 2).toFixed(1)} ${(Math.max(anchorY, backY) + 18).toFixed(1)} ${backX.toFixed(1)} ${backY.toFixed(1)}`,
    )
  }

  /* debris thrown into the trailer during tear-off */
  const flinging = window4(p, 25.4, 26.2, 38.8, 39.6)
  const sources = (['r1', 'r2', 'r3'] as const).map((m) => figures[m]).filter((f): f is FigureState => !!f && f.onRoof)
  const mouthX = TRAILER_MOUTH.x + trailerDx
  const mouthY = groundY(TRAILER.baseY, s.g) - 100
  nodes.debris.forEach((node, i) => {
    const source = sources[i % Math.max(1, sources.length)]
    if (!source || flinging <= 0) {
      node.setAttribute('opacity', '0')
      return
    }
    const phase = (p * 1.6 + i / DEBRIS_COUNT) % 1
    const startX = source.x
    const startY = source.y - 50
    const x = lerp(startX, mouthX + ((i % 5) - 2) * 18, phase)
    const y = lerp(startY, mouthY, phase * phase) - Math.sin(phase * Math.PI) * 70
    node.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(phase * 540 + i * 40).toFixed(0)})`)
    node.setAttribute('opacity', (flinging * (phase > 0.92 ? 0 : 1)).toFixed(2))
  })

  /* overlay */
  applyOverlay(p, vb, overlay, s, figures, options)
}

let lastStep = -2

function applyOverlay(
  p: number,
  vb: ViewBox,
  overlay: OverlayNodes,
  s: Surface,
  figures: Partial<Record<CrewMember, FigureState | null>>,
  options: RenderOptions,
) {
  const { width, height } = options
  if (overlay.intro) {
    const out = segment(p, 1.5, 6)
    overlay.intro.style.opacity = (1 - out).toFixed(3)
    overlay.intro.style.transform = `translate3d(0, ${(-out * 28).toFixed(1)}px, 0)`
    overlay.intro.style.visibility = out >= 1 ? 'hidden' : 'visible'
  }
  if (overlay.captions) {
    const shown = window4(p, 5, 7, 91.2, 93)
    overlay.captions.style.opacity = shown.toFixed(3)
    overlay.captions.style.visibility = shown <= 0 ? 'hidden' : 'visible'
  }
  if (overlay.finale) {
    const shown = segment(p, 93, 97)
    overlay.finale.style.opacity = shown.toFixed(3)
    overlay.finale.style.transform = `translate3d(0, ${((1 - shown) * 24).toFixed(1)}px, 0)`
    overlay.finale.style.visibility = shown <= 0 ? 'hidden' : 'visible'
  }
  if (overlay.hud) {
    const shown = window4(p, 4.5, 6.5, 91.5, 93)
    overlay.hud.style.opacity = shown.toFixed(3)
    overlay.hud.style.setProperty('--rf-job', segment(p, 16, 92).toFixed(4))
    overlay.hud.dataset.night = p > 58.6 && p < 63.4 ? 'true' : 'false'
  }
  const clock = clockAt(p)
  if (overlay.day && overlay.day.textContent !== clock.day) overlay.day.textContent = clock.day
  if (overlay.time && overlay.time.textContent !== clock.time) overlay.time.textContent = clock.time

  for (const [name, spec] of Object.entries(LABELS)) {
    const node = overlay.labels[name]
    if (!node) continue
    const opacity = window4(p, ...spec.range)
    const anchor = opacity > 0 ? spec.anchor(s, figures) : null
    if (!anchor) {
      node.style.opacity = '0'
      node.style.visibility = 'hidden'
      continue
    }
    const x = ((anchor[0] - vb.x) / vb.w) * width
    const y = ((anchor[1] - vb.y) / vb.h) * height
    node.style.visibility = 'visible'
    node.style.opacity = opacity.toFixed(3)
    node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
    node.dataset.side = x > width * 0.62 ? 'left' : 'right'
  }

  const step = stepAt(p)
  if (step !== lastStep) {
    lastStep = step
    options.onStep(step)
  }
}

export function resetStepCache() {
  lastStep = -2
}
