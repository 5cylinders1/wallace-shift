import { useCallback, useState } from 'react'
import type { QualityTier } from './waterHeroTypes'

const ORDER: QualityTier[] = ['high', 'medium', 'low']

/**
 * Picks a starting tier from what the device actually is, not from its
 * user-agent string: pointer type, pixel ratio, and the number of pixels
 * the three render passes would have to cover.
 */
function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'medium'

  const coarse = window.matchMedia('(pointer: coarse)').matches
  const dpr = window.devicePixelRatio || 1
  const width = window.innerWidth

  if (coarse || width < 768) return 'low'

  const pixels = width * window.innerHeight * dpr * dpr
  if (pixels > 4.2e6 || dpr > 2) return 'medium'

  return 'high'
}

/**
 * The tier, plus a one-way downgrade.
 *
 * Downgrades only, and only once per step: a tier change rebuilds the
 * water geometry and both render targets, so a policy that could go back
 * up would find a reason to oscillate between two tiers forever and spend
 * more time reallocating than rendering.
 */
export function useQualityTier(initial?: QualityTier) {
  const [tier, setTier] = useState<QualityTier>(() => initial ?? detectTier())

  const downgrade = useCallback(() => {
    setTier((current) => {
      const next = ORDER[Math.min(ORDER.indexOf(current) + 1, ORDER.length - 1)]
      return next
    })
  }, [])

  return { tier, setTier, downgrade, canDowngrade: tier !== 'low' }
}
