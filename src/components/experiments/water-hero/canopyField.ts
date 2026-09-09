/** Fixed submerged formations: the camera reveals them as it descends. */
export const CANOPY_COUNTS = { high: 60000, medium: 36000, low: 18000 } as const
export interface CanopySeed { x: number; y: number; z: number; size: number; phase: number; light: number; soft: number; pillar: number }

/** Unequal hanging spires in staggered depth sublayers. Broad distant bodies
 * overlap thinner close formations while leaving open travel channels. */
const MAIN_PILLARS = [
  { x: -1.4, z: -4.1, top: -.45, length: 6.95, radius: .78, lean: -.24 },
  { x: .55, z: -3.65, top: -.28, length: 5.0, radius: .71, lean: .34 },
  { x: 2.55, z: -3.1, top: -.57, length: 6.7, radius: .78, lean: -.32 },
  { x: -3.5, z: -2.75, top: -.32, length: 6.3, radius: .73, lean: .28 },
  { x: -1.85, z: -2.55, top: -.70, length: 4.75, radius: .59, lean: .31 },
  { x: 1.20, z: -2.05, top: -.38, length: 3.6, radius: .54, lean: -.24 },

  { x: -2.45, z: -.5, top: -.23, length: 3.8, radius: .64, lean: -.18 },
  { x: -.92, z: -.85, top: -.5, length: 2.8, radius: .49, lean: .34 },
  { x: 1.35, z: -.65, top: -.3, length: 4.4, radius: .55, lean: .30 },
  { x: 3.1, z: -.6, top: -.3, length: 6.2, radius: .72, lean: -.26 },
  { x: 4.5, z: -1.5, top: -.32, length: 5.4, radius: .78, lean: -.34 },
  { x: -4.25, z: .45, top: -.48, length: 6.8, radius: .63, lean: .22 },
  { x: -1.6, z: .45, top: -.63, length: 5.9, radius: .45, lean: -.20 },
  { x: 2.1, z: .80, top: -.35, length: 3.1, radius: .43, lean: .24 },
  { x: .2, z: -1.45, top: -.82, length: 2.2, radius: .38, lean: -.15 },

  { x: -2.0, z: 2.65, top: -.25, length: 5.8, radius: .55, lean: -.24 },
  { x: 2.4, z: 3.4, top: -.3, length: 6.8, radius: .61, lean: .18 },
  { x: -.8, z: 1.4, top: -.28, length: 1.7, radius: .38, lean: -.12 },
  { x: .75, z: 1.65, top: -.3, length: 2.25, radius: .44, lean: .16 },
  { x: -1.1, z: 3.65, top: -.52, length: 4.1, radius: .34, lean: -.16 },
  { x: 1.55, z: 2.7, top: -.72, length: 5.6, radius: .40, lean: .21 },
  { x: 3.6, z: 1.8, top: -.42, length: 3.4, radius: .45, lean: -.23 },
] as const

// Short overhangs sit between the entry camera and the distant pillars.
// Their submerged shoulders continue above the frame as the camera descends;
// narrow tips pass overhead instead of filling the logo's whole foreground.
export const CANOPY_OVERHANG_START = MAIN_PILLARS.length
export const CANOPY_PILLARS = [...MAIN_PILLARS,
  { x: -.15, z: 4.58, top: -.12, length: .82, radius: .30, lean: -.16 },
  { x: .35, z: 4.65, top: -.12, length: .63, radius: .23, lean: .06 },
  { x: .85, z: 4.55, top: -.12, length: .96, radius: .30, lean: .18 },
] as const

/** Color stays alive through the turn, then settles as the heading opens. */
export function sampleCanopyLight(progress: number) {
  const smooth = (a: number, b: number) => {
    const t = Math.max(0, Math.min(1, (progress - a) / (b - a)))
    return t * t * (3 - 2 * t)
  }
  return smooth(.435, .51) * (1 - smooth(.82, .99) * .82)
}

/** Stable prefixes preserve the same world on adaptive quality changes.
 * Scroll never stretches, scales or translates this particle volume. */
export function createCanopySeeds(count: number, overhangOffsetX = 0, overhangOffsetZ = 0, overhangDepth = 0, overhangDriftX = 0): CanopySeed[] {
  let state = 492713
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
  return Array.from({ length: count }, () => {
    const family = random()
    const overhang = random() < .085
    const pillar = overhang ? CANOPY_OVERHANG_START + Math.floor(random() * 3)
      : Math.floor(random() * MAIN_PILLARS.length)
    const column = CANOPY_PILLARS[pillar]
    const angle = random() * Math.PI * 2
    const depthLayer = random()
    let x: number, y: number, z: number
    if (family < .92) {
      const down = 1 - Math.pow(random(), .72)
      const rib = .80 + .20 * Math.sin(angle * 3 + down * 11 + pillar)
      const radius = column.radius * Math.pow(1 - down, .72) * rib * Math.sqrt(random())
      // Curved narrow tips and broad, broken shoulders create spires,
      // not uniform cylinders or a cloud ring around the moving emblem.
      x = column.x + column.lean * down + Math.sin(down * 5 + pillar) * .11 * down
        + Math.cos(angle) * radius
      y = column.top - down * column.length
      z = column.z + Math.sin(down * 3.5 + pillar) * .19 * down
        + Math.sin(angle) * radius * .78
      // Responsive framing is fixed for the viewport, never driven by scroll.
      // Portrait's farther-away camera needs its overhead layer farther forward.
      if (overhang) {
        x += overhangOffsetX + depthLayer * overhangDriftX
        z += overhangOffsetZ + depthLayer * overhangDepth
      }
    } else {
      x = (random() - .5) * 10
      y = -.3 - random() * 7.2
      z = -4.4 + random() * 8.2
    }
    const soft = random() < .008 ? 1 : 0
    const grain = random()
    // Most of the mass is readable round grain, with stronger body flecks
    // and rare large near glints. Wisps retain their former absolute budget.
    const size = soft ? .12 + random() * .20
      : z > 1.2 && grain > .975 ? .050 + random() * .035
      : grain > .80 ? .025 + Math.pow(random(), 1.35) * .020
      : .013 + Math.pow(random(), 1.4) * .015
    return { x, y, z, soft, pillar: family < .92 ? pillar : -1,
      size,
      phase: random() * Math.PI * 2,
      light: .35 + Math.pow(random(), 1.4) * .65,
    }
  })
}
