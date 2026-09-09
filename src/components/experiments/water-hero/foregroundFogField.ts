export const FOREGROUND_FOG_STEPS = { low: 12, medium: 16, high: 20 } as const

/** A shallow volume in front of the emblem, below most of the open sky.
 * Its placement is fixed to the opening composition, not the live camera. */
export function layoutForegroundFog(aspect: number, openingCameraZ: number) {
  const widthScale = Math.max(.25, Math.min(1.4, aspect / (16 / 9)))
  const depthOffset = openingCameraZ - 7.9
  return {
    widthScale, depthOffset,
    min: [-5 * widthScale, .006, 1 + depthOffset] as const,
    max: [5 * widthScale, .78, 7.60 + depthOffset] as const,
  }
}
