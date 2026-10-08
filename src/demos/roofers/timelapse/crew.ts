/**
 * The crew: simple jointed figures posed from a small library.
 *
 * Each figure is drawn facing right with its feet at (0, 0) and +y down.
 * A pose is a set of joints; the director blends between poses (for the
 * walk and climb cycles) and turns the joints into stroked paths. Tools
 * hang off a pose, never off the figure, so a pose change swaps the tool.
 */

type Point = readonly [number, number]

export type ToolName = 'none' | 'shovel' | 'nailer' | 'tablet' | 'bundle' | 'sweeper' | 'roll'

export interface Pose {
  hip: Point
  shoulder: Point
  head: Point
  kneeBack: Point
  footBack: Point
  kneeFront: Point
  footFront: Point
  elbowBack: Point
  handBack: Point
  elbowFront: Point
  handFront: Point
  tool: ToolName
}

const stand: Pose = {
  hip: [0, -52],
  shoulder: [1, -87],
  head: [3, -101],
  kneeBack: [-4, -26],
  footBack: [-5, 0],
  kneeFront: [4, -26],
  footFront: [5, 0],
  elbowBack: [-5, -67],
  handBack: [-4, -49],
  elbowFront: [6, -67],
  handFront: [7, -49],
  tool: 'none',
}

const walkA: Pose = {
  ...stand,
  kneeBack: [-9, -26],
  footBack: [-15, 0],
  kneeFront: [9, -27],
  footFront: [15, 0],
  elbowBack: [4, -67],
  handBack: [9, -51],
  elbowFront: [-4, -67],
  handFront: [-9, -51],
}

const walkB: Pose = {
  ...stand,
  kneeBack: [9, -27],
  footBack: [15, 0],
  kneeFront: [-9, -26],
  footFront: [-15, 0],
  elbowBack: [-4, -67],
  handBack: [-9, -51],
  elbowFront: [4, -67],
  handFront: [9, -51],
}

export const poses = {
  stand,
  walkA,
  walkB,
  inspect: {
    ...stand,
    elbowBack: [8, -68],
    handBack: [16, -66],
    elbowFront: [10, -66],
    handFront: [20, -70],
    tool: 'tablet',
  },
  shovel: {
    hip: [-4, -48],
    shoulder: [12, -79],
    head: [21, -89],
    kneeBack: [-10, -25],
    footBack: [-16, 0],
    kneeFront: [11, -25],
    footFront: [10, 0],
    elbowBack: [10, -60],
    handBack: [20, -50],
    elbowFront: [20, -64],
    handFront: [30, -54],
    tool: 'shovel',
  },
  kneel: {
    hip: [-6, -38],
    shoulder: [9, -71],
    head: [17, -83],
    kneeBack: [-2, -5],
    footBack: [-26, -3],
    kneeFront: [14, -27],
    footFront: [16, 0],
    elbowBack: [18, -48],
    handBack: [28, -32],
    elbowFront: [22, -54],
    handFront: [34, -38],
    tool: 'nailer',
  },
  roll: {
    hip: [-8, -36],
    shoulder: [8, -66],
    head: [16, -78],
    kneeBack: [-4, -5],
    footBack: [-28, -3],
    kneeFront: [12, -26],
    footFront: [14, 0],
    elbowBack: [18, -44],
    handBack: [30, -24],
    elbowFront: [20, -48],
    handFront: [34, -28],
    tool: 'roll',
  },
  carry: {
    ...walkA,
    elbowFront: [12, -78],
    handFront: [6, -96],
    tool: 'bundle',
  },
  push: {
    hip: [-4, -50],
    shoulder: [10, -84],
    head: [17, -97],
    kneeBack: [-10, -26],
    footBack: [-16, 0],
    kneeFront: [10, -26],
    footFront: [12, 0],
    elbowBack: [18, -68],
    handBack: [30, -64],
    elbowFront: [20, -70],
    handFront: [32, -66],
    tool: 'sweeper',
  },
  climbA: {
    hip: [0, -52],
    shoulder: [0, -87],
    head: [0, -101],
    kneeBack: [-6, -26],
    footBack: [-6, 0],
    kneeFront: [7, -44],
    footFront: [7, -20],
    elbowBack: [-12, -96],
    handBack: [-9, -112],
    elbowFront: [12, -88],
    handFront: [9, -102],
    tool: 'none',
  },
  climbB: {
    hip: [0, -52],
    shoulder: [0, -87],
    head: [0, -101],
    kneeBack: [-7, -44],
    footBack: [-7, -20],
    kneeFront: [6, -26],
    footFront: [6, 0],
    elbowBack: [-12, -88],
    handBack: [-9, -102],
    elbowFront: [12, -96],
    handFront: [9, -112],
    tool: 'none',
  },
} satisfies Record<string, Pose>

export type PoseName = keyof typeof poses

const mixPoint = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
]

export function blendPoses(a: Pose, b: Pose, t: number): Pose {
  return {
    hip: mixPoint(a.hip, b.hip, t),
    shoulder: mixPoint(a.shoulder, b.shoulder, t),
    head: mixPoint(a.head, b.head, t),
    kneeBack: mixPoint(a.kneeBack, b.kneeBack, t),
    footBack: mixPoint(a.footBack, b.footBack, t),
    kneeFront: mixPoint(a.kneeFront, b.kneeFront, t),
    footFront: mixPoint(a.footFront, b.footFront, t),
    elbowBack: mixPoint(a.elbowBack, b.elbowBack, t),
    handBack: mixPoint(a.handBack, b.handBack, t),
    elbowFront: mixPoint(a.elbowFront, b.elbowFront, t),
    handFront: mixPoint(a.handFront, b.handFront, t),
    tool: t < 0.5 ? a.tool : b.tool,
  }
}

const f = (n: number) => n.toFixed(1)
const line = (...points: Point[]) =>
  points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`).join('')

export interface FigurePaths {
  legBack: string
  legFront: string
  bootBack: string
  bootFront: string
  armBack: string
  armFront: string
  torso: string
  stripe: string
  headX: number
  headY: number
  handFrontX: number
  handFrontY: number
}

export function figurePaths(pose: Pose): FigurePaths {
  const [hx, hy] = pose.hip
  const [sx, sy] = pose.shoulder
  // The reflective stripe crosses the torso two-thirds of the way up.
  const mx = hx + (sx - hx) * 0.62
  const my = hy + (sy - hy) * 0.62
  const len = Math.hypot(sx - hx, sy - hy) || 1
  const nx = (-(sy - hy) / len) * 11
  const ny = ((sx - hx) / len) * 11

  return {
    legBack: line(pose.hip, pose.kneeBack, pose.footBack),
    legFront: line(pose.hip, pose.kneeFront, pose.footFront),
    bootBack: line(pose.footBack, [pose.footBack[0] + 8, pose.footBack[1]]),
    bootFront: line(pose.footFront, [pose.footFront[0] + 8, pose.footFront[1]]),
    armBack: line(pose.shoulder, pose.elbowBack, pose.handBack),
    armFront: line(pose.shoulder, pose.elbowFront, pose.handFront),
    torso: line(pose.hip, pose.shoulder),
    stripe: line([mx - nx, my - ny], [mx + nx, my + ny]),
    headX: pose.head[0],
    headY: pose.head[1],
    handFrontX: pose.handFront[0],
    handFrontY: pose.handFront[1],
  }
}

export interface Outfit {
  vest: string
  shirt: string
  pants: string
  skin: string
  hat: string
  cap?: boolean
}

export const outfits = {
  inspector: { vest: '#25384a', shirt: '#25384a', pants: '#b5a37f', skin: '#d6a17e', hat: '#1e2a35', cap: true },
  r1: { vest: '#d3e54b', shirt: '#4a5157', pants: '#2e3947', skin: '#b67a55', hat: '#f4f4ef' },
  r2: { vest: '#f28b25', shirt: '#5c6a76', pants: '#3a3f46', skin: '#e0b391', hat: '#f4f4ef' },
  r3: { vest: '#d3e54b', shirt: '#3b4047', pants: '#4a4036', skin: '#8b5a3c', hat: '#f29a2c' },
  g1: { vest: '#f28b25', shirt: '#4a5157', pants: '#2e3947', skin: '#c99272', hat: '#f4f4ef' },
} satisfies Record<string, Outfit>

export type CrewMember = keyof typeof outfits
