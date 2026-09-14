/** A viewport-relative pose shared with the lazily loaded renderer. */
export interface JourneyFrame {
  headerOffset: number
  frictionCopyRight: number
  frictionCopyBottom: number
  frictionDock: number
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
  dawn: number
  servicesSurface: number
  anchorScale: number
  surfaceReveal: number
  headerEdge: number
  findEdge: number
  makeEdge: number
  launchEdge: number
  launchBottom: number
  closingEdge: number
  findWipe: number
  makeWipe: number
  launchWipe: number
  leftTurn: number
  rightTurn: number
  partScale: number
  shimmer: number
  register: number
  rules: number
  ascent: number
  quiz: number
  power: number
  surge: number
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
  processTop: number
  processHeight: number
  processHeadingRight: number
  findCopyRight?: number
  findCopyBottom?: number
  quizTop: number
  closingTop: number
  /** Measured top of the footer, and the enquiry card's own place in the grid.
   * The closing mark is centred on that card and sized to fill it, so both
   * follow the real layout rather than a fraction of the viewport. The card is
   * measured from its slot, which never moves; the card itself slides in. */
  closingFooterTop?: number
  closingCardLeft?: number
  closingCardTop?: number
  closingCardWidth?: number
  closingCardHeight?: number
  end: number
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
export const journeyEase = (value: number) => {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}
const phase = (scroll: number, start: number, length: number) => journeyEase((scroll - start) / Math.max(.001, length))

/** Draw only after the dark band has cleared the entire white logo. Edges
 * are top-origin canvas coordinates; CSS pixels keep the pause and drawing
 * distance consistent across screen sizes and device pixel ratios. Absolute
 * clearance also erases the drawing before the band returns on reverse scroll. */
export function sampleBlueprintDraw(headerEdge: number, logoTop: number, viewportHeight: number) {
  if (![headerEdge, logoTop, viewportHeight].every(Number.isFinite) || viewportHeight <= 0) return 0
  const clearance = (logoTop - headerEdge) * viewportHeight
  return journeyEase((clearance - 12) / 160)
}

// Units are available viewport heights below navigation. Each new panel
// crosses the stage, rests, and only then yields to the next chapter.
export const PROCESS_TIMING = {
  findStart: .45, findEnd: 1.25,
  makeStart: 1.85, makeEnd: 2.65,
  dockEnd: 3.10,
  // The drafting rules behind Make arrive broken with the panel and close
  // their cuts across the whole chapter, finishing with the plate register.
  rulesStart: 2.72, rulesEnd: 4.12,
  leftTurnStart: 3.15, leftTurnEnd: 3.85,
  rightTurnStart: 3.32, rightTurnEnd: 4.03,
  // Misregistered colour plates collapse onto the mark as the second half
  // settles, so alignment and assembly resolve on the same scroll beat.
  registerStart: 3.12, registerEnd: 4.06,
  launchStart: 4.35, launchEnd: 5.05,
  // Launch keeps a full stage height for the ascent: the assembled mark
  // grows and rises through the horizon under continuous scroll control.
  ascentStart: 5.05, ascentEnd: 6.15,
  shimmerStart: 5.45, shimmerEnd: 6.10,
  end: 6.95,
} as const

/** How the quiz mark reads at each of its three answered steps. Charge is
 * the lit contour along the cut; finish carries the whole surface from cold
 * metal to live crystal. Both are sampled from the answered fraction, so a
 * partly finished quiz is a partly powered mark rather than a switch. */
export const QUIZ_POWER = { finishFloor: .10, chargeFloor: .01, chargeRange: 1.15 } as const

/** What the reader has committed to so far. `level` is the eased answered
 * fraction and `surge` is the short flash carried by each new answer. */
export interface JourneyQuizPower {
  level: number
  surge: number
}

/** How much of the enquiry card the closing mark fills. It is centred on the
 * card and grown until it spans this much of whichever axis binds first, so
 * one axis lands exactly here and the other is short of it. The mark reads
 * through the card's frosted glass rather than in front of it, which is the
 * intent rather than a collision to design around. */
export const CLOSING_CARD_FILL = .9

/** The finalized mark's own proportion, height over width. */
export const MARK_RATIO = .549

/** How far the assembled mark grows during Launch, as a multiple of its
 * docked width. The matching climb lives with the motion it belongs to,
 * in journeyFrictionMotion. */
export const ASCENT_GROWTH = 1.2
export const PROCESS_SCROLL_UNITS = PROCESS_TIMING.end + 1

export const initialJourneyFrame: JourneyFrame = {
  headerOffset: 80,
  frictionCopyRight: 520, frictionCopyBottom: 400, frictionDock: 0,
  visible: 0, x: 1.5, y: .4, scale: .14, yaw: 0,
  split: 0, partTurn: 0, finish: 0, charge: .08, water: 0, dawn: 0, servicesSurface: 1,
  anchorScale: .14, surfaceReveal: 1, headerEdge: 2,
  findEdge: 2, makeEdge: 2, launchEdge: 2, launchBottom: 2, closingEdge: 2,
  findWipe: 0, makeWipe: 0, launchWipe: 0,
  leftTurn: 0, rightTurn: 0, partScale: 1, shimmer: 0,
  register: 0, rules: 0, ascent: 0, quiz: 0, power: 0, surge: 0,
}

/** Absolute scroll owns panel positions, material boundaries and assembly.
 * Find's ambient travel and capture are handled by journeyFrictionMotion. */
export function sampleJourneyFrame(scroll: number, layout: JourneyLayout,
  quizPower: JourneyQuizPower = { level: 0, surge: 0 }): JourneyFrame {
  const power = clamp(Number.isFinite(quizPower.level) ? quizPower.level : 0)
  const surge = clamp(Number.isFinite(quizPower.surge) ? quizPower.surge : 0)
  const h = Math.max(1, layout.viewportHeight)
  const w = Math.max(1, layout.viewportWidth)
  const stageHeight = Math.max(1, h - layout.headerOffset)
  // Enter when the whole heading band first fits in the viewport, and dock
  // as its top reaches navigation. The service rows follow the band directly.
  const entryStart = layout.servicesTop + layout.servicesHeaderHeight - h
  const entry = phase(scroll, entryStart, Math.max(1, stageHeight - layout.servicesHeaderHeight))
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
  const make = phase(chapter, t.dockEnd, .45)
  const assembled = phase(chapter, t.launchStart, t.launchEnd - t.launchStart)
  // Finish assembly before the whole mark grows. Scaling the rig preserves
  // the shared seam and lets the dock retain its measured right inset.
  const ascent = phase(chapter, t.ascentStart, t.ascentEnd - t.ascentStart)
  const register = phase(chapter, t.registerStart, t.registerEnd - t.registerStart)
  const rules = phase(chapter, t.rulesStart, t.rulesEnd - t.rulesStart)
  const shimmer = phase(chapter, t.shimmerStart, t.shimmerEnd - t.shimmerStart)
  const quiz = phase(scroll, layout.quizTop - h * .65, h * .65)
  const closing = phase(scroll, layout.closingTop - h * .65, h * .65)
  // An unanswered quiz shows cold, inert metal, and each answer carries the
  // surface further toward the live crystal. The closing water composition
  // always gets the finished mark, whether or not the reader played along.
  const quizFinish = mix(QUIZ_POWER.finishFloor
    + (1 - QUIZ_POWER.finishFloor) * power, 1, closing)
  // The cut is the mark's own light. Unanswered it is dark; fully answered it
  // reaches the hero's own seam intensity, and every answer flashes through it.
  const quizCharge = mix(QUIZ_POWER.chargeFloor
    + QUIZ_POWER.chargeRange * Math.pow(power, .6) + .55 * surge, .12, closing)
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
  // The closing mark is centred on the enquiry card and grown to fill it.
  // Both come from the card's measured place in the grid, so the composition
  // follows the real layout instead of a fraction of the viewport that has to
  // be re-guessed every time the form changes.
  const cardWidth = Math.max(1, layout.closingCardWidth ?? w * .5)
  const cardHeight = Math.max(1, layout.closingCardHeight ?? h * .5)
  const cardCenterX = (layout.closingCardLeft ?? (w - cardWidth) * .5) + cardWidth * .5
  const cardCenterY = (layout.closingCardTop ?? layout.closingTop + h * .15)
    - scroll + cardHeight * .5
  // Whichever axis runs out first is the one that lands on the fill.
  const closingScale = Math.min(cardWidth * CLOSING_CARD_FILL / w,
    cardHeight * CLOSING_CARD_FILL / (w * MARK_RATIO))
  // These match the native sticky element boundaries, including before pin
  // and after release. The same normalized positions reach the GPU masks.
  const headerTop = Math.min(Math.max(layout.servicesTop - scroll, layout.headerOffset),
    layout.servicesRowsBottom - scroll - layout.servicesHeaderHeight)
  const stageTop = Math.min(Math.max(layout.processTop - scroll, layout.headerOffset),
    layout.processTop + layout.processHeight - scroll - stageHeight)
  const edge = (wipe: number) => (stageTop + stageHeight * (1 - wipe) - visualTop) / h
  return {
    headerOffset: layout.headerOffset,
    frictionCopyRight: layout.findCopyRight ?? w * .42,
    frictionCopyBottom: layout.findCopyBottom ?? h * .55,
    frictionDock: phase(chapter, t.makeEnd, t.dockEnd - t.makeEnd),
    visible: scroll + h > layout.servicesTop && scroll < layout.end ? 1 : 0,
    // At zero yaw, placing the left edge at the viewport boundary makes the
    // first scroll movement visible without an empty offscreen approach.
    x: mix(mix(mix(1 + servicesScale, mix(servicesX, processX, moveRight), entry), .61, quiz),
      cardCenterX / w * 2 - 1, closing),
    y: mix(mix(headingY, -.03, quiz), 1 - 2 * (cardCenterY - visualTop) / h, closing),
    scale: mix(mix(servicesScale * (1 + ASCENT_GROWTH * ascent), .21, quiz), closingScale, closing),
    anchorScale: servicesScale * (1 - quiz),
    yaw: .08 * quiz * (1 - closing),
    split: .14 * make * (1 - assembled) * (1 - quiz),
    partTurn: Math.PI * 2 * Math.max(leftSpin, rightSpin),
    leftTurn: Math.PI * 2 * leftSpin,
    rightTurn: -Math.PI * 2 * rightSpin,
    partScale: 1 + .12 * make * (1 - assembled),
    finish: mix(assembled, quizFinish, quiz),
    charge: mix(.08 + .15 * findWipe + .3 * Math.sin(Math.PI * shimmer), quizCharge, quiz),
    water: closing,
    // The dawn reaches full strength early in the handoff instead of fading
    // up across the whole of it, so it never reads as a dim slide-in.
    dawn: journeyEase(closing / .4),
    servicesSurface: 1 - moveRight,
    surfaceReveal: 1 - quiz,
    headerEdge: (headerTop + layout.servicesHeaderHeight - visualTop) / h,
    findEdge: edge(findWipe), makeEdge: edge(makeWipe), launchEdge: edge(launchWipe),
    launchBottom: (stageTop + stageHeight - visualTop) / h,
    // The dawn belongs to the closing section alone, and uses the same
    // top-origin canvas coordinates as every other panel boundary.
    closingEdge: (layout.closingTop - scroll - visualTop) / h,
    findWipe, makeWipe, launchWipe, shimmer,
    // The plates and drafting rules belong to Make alone; the ascent belongs
    // to Launch. All three retire into the quiz handoff with the surface.
    register: register * (1 - quiz),
    rules: rules * (1 - quiz),
    ascent: ascent * (1 - quiz),
    // The charge belongs to the quiz alone: it arrives with the section and
    // leaves with it, and the closing water composition never carries it.
    quiz: quiz * (1 - closing),
    power: power * quiz * (1 - closing),
    surge: surge * quiz * (1 - closing),
  }
}
