export interface FlowSeed {
  filament: boolean
  x: number
  y: number
  z: number
  phase: number
  size: number
  warm: boolean
  near: boolean
  stretch: number
  highlight: boolean
}

export interface FlowState {
  time: number
  cursorX: number
  cursorY: number
  cursorStrength: number
}

export interface FlowSample { x: number; y: number; z: number; alpha: number; dx: number; dy: number; dz: number }

const ease = (value: number) => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

/** Stable prefixes keep quality changes from rebuilding an unrelated field. */
export function createFlowSeeds(count: number): FlowSeed[] {
  let seed = 7319
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  return Array.from({ length: count }, () => {
    const filament = random() < .28
    const near = !filament && random() < .045
    const strand = Math.floor(random() * 8)
    const y = -.30 - random() * 7.7
    // Thin, irregular threads occupy fixed channels between the formations.
    // The majority is independent suspension throughout the water volume.
    const x = filament
      ? (strand - 3.5) * 1.12 + Math.sin(y * .63 + strand) * .18 + (random() - .5) * .25
      : (random() - .5) * 9.2
    const z = near ? 2.60 + random() * .52 : filament
      ? Math.sin(strand * 2.37) * 2.35 + Math.cos(y * .48 + strand) * .16 + (random() - .5) * .24
      : -2.74 + random() * 5.20
    const far = 1 - ease((z + 2.5) / 3.5)
    return {
      filament, near, x, y, z,
      phase: random() * Math.PI * 2,
      size: near ? .014 + random() * .006 : (.0050 + random() ** 2 * .0048) * (1 - far * .26),
      stretch: filament && random() < .20 ? 1.6 + random() * .8 : 1,
      warm: random() < .025,
      highlight: random() < .035,
    }
  })
}

/** Every point has a permanent world anchor. Bounded currents evolve locally;
 * camera travel reveals an existing volume without growing or moving it with
 * the logo. No emitter, modulo reset, scroll scale or accumulated force. */
export function sampleFlowParticle(seed: FlowSeed, state: FlowState, out: FlowSample): void {
  const rate = seed.filament ? .10 : .12
  const amplitude = seed.filament ? .12 : .20
  const wave = state.time * rate + seed.x * .28 + seed.y * .38 + seed.z * .61 + seed.phase * .12
  const eddy = state.time * .27 + seed.phase
  let x = seed.x + Math.sin(wave) * amplitude + Math.sin(eddy) * .025
  let y = seed.y + Math.sin(wave * .71 + seed.phase * .12) * .12
  const z = seed.z + Math.cos(wave * .83) * .09
  const alpha = (seed.near ? .16 : seed.filament ? .44 : .31)
    * (.68 + .32 * Math.sin(seed.phase) ** 2)

  // Small reversible parting near the pointer, with a falloff through depth.
  if (state.cursorStrength > 0) {
    const dx = x - state.cursorX, dy = y - state.cursorY
    const distance = Math.hypot(dx, dy)
    const falloff = 1 - ease(distance / .92)
    const push = .28 * falloff * state.cursorStrength / (1 + Math.abs(z) * .55)
    x += dx / (distance + .06) * push
    y += dy / (distance + .06) * push
  }

  out.x = x
  out.y = y
  out.z = z
  // Ordinary depth testing protects the mark. No traveling face-shaped hole
  // or logo-relative opacity change can pull this volume along with it.
  out.alpha = alpha * (1 - ease((y + .14) / .14))
  out.dx = Math.cos(wave) * amplitude * rate + Math.cos(eddy) * .00675
  out.dy = Math.cos(wave * .71 + seed.phase * .12) * .12 * rate * .71
  out.dz = -Math.sin(wave * .83) * .09 * rate * .83
}
