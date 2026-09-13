// Percentage points of stage height, following the site's diagonal divider.
export const TILT_PCT = 55
export const START_LEFT_Y = 170
export const END_LEFT_Y = -20
export const FALLBACK_BAND_PCT = 0.4
export const BAND_PX = 3

export function getBrandStatementBandPct(height: number, fallback = FALLBACK_BAND_PCT) {
  return height > 0 ? (BAND_PX / height) * 100 : fallback
}

export function getBrandStatementWipe(leftY: number, bandPct = FALLBACK_BAND_PCT) {
  const rightY = leftY - TILT_PCT
  return {
    plane: `polygon(0% ${leftY}%, 100% ${rightY}%, 100% 100%, 0% 100%)`,
    edge: `polygon(0% ${leftY - bandPct}%, 100% ${rightY - bandPct}%, 100% ${rightY}%, 0% ${leftY}%)`,
  }
}
