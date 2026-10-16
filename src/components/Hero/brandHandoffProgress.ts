import { END_LEFT_Y, START_LEFT_Y, getBrandStatementBandPct, getBrandStatementWipe } from '../BrandStatement/brandStatementWipe'
import { logoRevealClip } from '../experiments/water-hero/handoffProgress'
import { SPLIT_START, smoothRange } from '../experiments/water-hero/sceneDirector'
import { STAGE_SCROLL_SVH } from '../experiments/water-hero/waterHeroConfig'
import type { LogoRevealContour } from '../experiments/water-hero/waterHeroTypes'

const HERO_TRAVEL = (STAGE_SCROLL_SVH - 100) / 100
export const BRAND_REVEAL_START_SVH = (STAGE_SCROLL_SVH - 100) * SPLIT_START
export const BRAND_REVEAL_OVERLAP_SVH = STAGE_SCROLL_SVH - BRAND_REVEAL_START_SVH
// After the canvas has left the viewport, retain the original statement's
// 45svh sticky travel: 20% dark hold, 65% diagonal wipe, 15% light hold.
export const BRAND_WIPE_TRAVEL_SVH = 45
export const BRAND_HANDOFF_HEIGHT_SVH = BRAND_REVEAL_OVERLAP_SVH + BRAND_WIPE_TRAVEL_SVH + 100

/** offset is the section's top in viewport heights, so this keeps advancing
 * after scene progress reaches 1. No timer: forward, reverse and jumps agree. */
export function getBrandHandoffFrame(narrative: number, offset: number,
  contour: LogoRevealContour | null | undefined, stageHeight: number) {
  const elapsed = -offset
  const canvasExit = BRAND_REVEAL_OVERLAP_SVH / 100
  const afterCanvas = elapsed >= canvasExit
  const headingOpacity = afterCanvas ? 1 : smoothRange(SPLIT_START, .90, narrative)
  const active = offset <= .002 && (afterCanvas || (headingOpacity > .001 && Boolean(contour?.open || contour?.complete)))
  const release = HERO_TRAVEL * (1 - SPLIT_START)
  const backgroundOpacity = smoothRange(release, release + .75, elapsed)
  const wipeTravel = BRAND_WIPE_TRAVEL_SVH / 100
  const wipeProgress = Math.max(0, Math.min(1, (elapsed - canvasExit - .2 * wipeTravel) / (.65 * wipeTravel)))
  const wipe = getBrandStatementWipe(START_LEFT_Y + (END_LEFT_Y - START_LEFT_Y) * wipeProgress,
    getBrandStatementBandPct(stageHeight))
  return {
    active,
    headingOpacity: active ? headingOpacity : 0,
    bodyOpacity: active ? (afterCanvas ? 1 : smoothRange(.92, .98, narrative)) : 0,
    backgroundOpacity,
    clip: afterCanvas ? 'none' : logoRevealClip(contour, { left: 0, top: 0, width: 1, height: 1 }),
    wipeProgress,
    ...wipe,
  }
}
