/** A viewport-relative pose shared with the lazily loaded renderer. */
export interface JourneyFrame {
  headerOffset: number
  visible: number
  x: number
  y: number
  scale: number
  yaw: number
  split: number
  partTurn: number
  finish: number
  charge: number
  water: number
  servicesSurface: number
  anchorScale: number
  surfaceReveal: number
  headerEdge: number
  findEdge: number
  makeEdge: number
  launchEdge: number
  findWipe: number
  makeWipe: number
  launchWipe: number
  leftTurn: number
  rightTurn: number
  partScale: number
  shimmer: number
}

export interface JourneyLayout {
  viewportHeight: number
  viewportWidth: number
  headerOffset: number
  servicesTop: number
  servicesRowsBottom: number
  servicesHeaderHeight: number
  servicesHeadingRight: number
  servicesHeadingBaseline: number
  entranceDistance: number
  processTop: number
  processHeight: number
  processHeadingRight: number
  quizTop: number
  closingTop: number
  end: number
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
export const journeyEase = (value: number) => {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}
const phase = (scroll: number, start: number, length: number) => journeyEase((scroll - start) / Math.max(.001, length))

// Units are available viewport heights below navigation. Each new panel
// crosses the stage, rests, and only then yields to the next chapter.
export const PROCESS_TIMING = {
  findStart: .45, findEnd: 1.25,
  makeStart: 1.85, makeEnd: 2.65,
  leftTurnStart: 2.75, leftTurnEnd: 3.63,
  rightTurnStart: 2.94, rightTurnEnd: 3.84,
  launchStart: 4.35, launchEnd: 5.15,
  shimmerStart: 5.3, shimmerEnd: 5.95,
  end: 6.45,
} as const
export const PROCESS_SCROLL_UNITS = PROCESS_TIMING.end + 1

export const initialJourneyFrame: JourneyFrame = {
  headerOffset: 80,
  visible: 0, x: 1.5, y: .4, scale: .14, yaw: 0,
  split: 0, partTurn: 0, finish: 0, charge: .08, water: 0, servicesSurface: 1,
  anchorScale: .14, surfaceReveal: 1, headerEdge: 2,
  findEdge: 2, makeEdge: 2, launchEdge: 2,
  findWipe: 0, makeWipe: 0, launchWipe: 0,
  leftTurn: 0, rightTurn: 0, partScale: 1, shimmer: 0,
}

/** Absolute scroll is the only clock: seeking, stopping and reversing all
 * preserve the same panel positions, material boundaries and assembly pose. */
export function sampleJourneyFrame(scroll: number, layout: JourneyLayout): JourneyFrame {
  const h = Math.max(1, layout.viewportHeight)
  const w = Math.max(1, layout.viewportWidth)
  const stageHeight = Math.max(1, h - layout.headerOffset)
  const entry = phase(scroll, layout.servicesTop - layout.headerOffset, layout.entranceDistance)
  const release = layout.servicesRowsBottom - layout.servicesHeaderHeight - layout.headerOffset
  const processPin = layout.processTop - layout.headerOffset
  const moveRight = phase(scroll, release, Math.max(stageHeight * .55, processPin - release))
  const chapter = (scroll - processPin) / stageHeight
  const t = PROCESS_TIMING
  const findWipe = phase(chapter, t.findStart, t.findEnd - t.findStart)
  const makeWipe = phase(chapter, t.makeStart, t.makeEnd - t.makeStart)
  const launchWipe = phase(chapter, t.launchStart, t.launchEnd - t.launchStart)
  const leftSpin = phase(chapter, t.leftTurnStart, t.leftTurnEnd - t.leftTurnStart)
  const rightSpin = phase(chapter, t.rightTurnStart, t.rightTurnEnd - t.rightTurnStart)
  const make = phase(chapter, t.makeEnd, .45)
  const assembled = phase(chapter, t.launchStart, t.launchEnd - t.launchStart)
  const shimmer = phase(chapter, t.shimmerStart, t.shimmerEnd - t.shimmerStart)
  const quiz = phase(scroll, layout.quizTop - h * .65, h * .65)
  const closing = phase(scroll, layout.closingTop - h * .65, h * .65)
  const visualTop = Math.max(0, layout.servicesTop - scroll)
  // Keep the ORIGINAL pinned baseline even after the heading itself releases.
  // anchorScale supplies a fixed half-height offset in the renderer, so even
  // the Make chapter's scale increase cannot pull the logo up or down.
  const baseline = Math.max(layout.headerOffset, layout.servicesTop - scroll) + layout.servicesHeadingBaseline
  const headingY = 1 - 2 * (baseline - visualTop) / h
  const servicesWidth = Math.min(240, Math.max(160, w * .14))
  const servicesScale = servicesWidth / w
  const servicesX = (layout.servicesHeadingRight + 75 + servicesWidth / 2) * 2 / w - 1
  const processX = Math.min(1 - servicesScale - .08,
    (Math.max(layout.servicesHeadingRight, layout.processHeadingRight) + 100 + servicesWidth / 2) * 2 / w - 1)
  const shortViewport = 1 - journeyEase((h - 650) / 300)
  const closingScale = Math.min(.22, h * .25 / (w * .549))
  // These match the native sticky element boundaries, including before pin
  // and after release. The same normalized positions reach the GPU masks.
  const headerTop = Math.min(Math.max(layout.servicesTop - scroll, layout.headerOffset),
    layout.servicesRowsBottom - scroll - layout.servicesHeaderHeight)
  const stageTop = Math.min(Math.max(layout.processTop - scroll, layout.headerOffset),
    layout.processTop + layout.processHeight - scroll - stageHeight)
  const edge = (wipe: number) => (stageTop + stageHeight * (1 - wipe) - visualTop) / h
  return {
    headerOffset: layout.headerOffset,
    visible: scroll + h > layout.servicesTop && scroll < layout.end ? 1 : 0,
    x: mix(mix(mix(1.48, mix(servicesX, processX, moveRight), entry), .61, quiz), -.52, closing),
    y: mix(mix(headingY, -.03, quiz), mix(-.1, -.48, shortViewport), closing),
    scale: mix(mix(servicesScale, .21, quiz), closingScale, closing),
    anchorScale: servicesScale * (1 - quiz),
    yaw: .08 * quiz * (1 - closing),
    split: .14 * make * (1 - assembled) * (1 - quiz),
    partTurn: Math.PI * 2 * Math.max(leftSpin, rightSpin),
    leftTurn: Math.PI * 2 * leftSpin,
    rightTurn: -Math.PI * 2 * rightSpin,
    partScale: 1 + .12 * make * (1 - assembled),
    finish: mix(assembled, 1, quiz),
    charge: mix(.08 + .15 * findWipe + .3 * Math.sin(Math.PI * shimmer), .12, quiz),
    water: closing,
    servicesSurface: 1 - moveRight,
    surfaceReveal: 1 - quiz,
    headerEdge: (headerTop + layout.servicesHeaderHeight - visualTop) / h,
    findEdge: edge(findWipe), makeEdge: edge(makeWipe), launchEdge: edge(launchWipe),
    findWipe, makeWipe, launchWipe, shimmer,
  }
}
