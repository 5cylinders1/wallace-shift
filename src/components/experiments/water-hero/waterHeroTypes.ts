/** Shared types for the water-hero experiment. */
import type { Object3D, Quaternion, Vector3 } from 'three'

export type QualityTier = 'high' | 'medium' | 'low'

export interface QualitySettings {
  dprCap: number
  waterSegments: number
  reflectionSize: number
  refractionSize: number
  rippleSize: number
  detailOctaves: number
  particles: number
}

/**
 * A node's transform exactly as Blender authored it, captured once after
 * the clone and never written to.
 *
 * Animation adds offsets to these rather than assuming an identity
 * transform, which is what lets the emblem reassemble onto its real
 * baseline instead of onto [0,0,0] — the master pivot sits at
 * (0.18, 0, -0.17), so an assumed identity would visibly shift it.
 */
export interface CapturedTransform {
  position: Vector3
  quaternion: Quaternion
  scale: Vector3
}

export interface LogoNodes {
  /** The cloned glTF scene root. Not WS_Logo — that is `root`. */
  sceneRoot: Object3D
  /** A second clone, rendered only into the water's reflection. */
  proxyRoot: Object3D
  proxyLeft: Object3D
  proxyRight: Object3D
  root: Object3D
  left: Object3D
  right: Object3D
  baseline: {
    root: CapturedTransform
    left: CapturedTransform
    right: CapturedTransform
  }
  /** Measured in the presentation group's world space, at rise 0. */
  metrics: LogoMetrics
}

export interface LogoMetrics {
  width: number
  height: number
  depth: number
  /** Uniform scale taking the authored model to LOGO_TARGET_WIDTH. */
  scale: number
  /**
   * Presentation offset applied to the group that wraps the cloned graph,
   * placing the measured centre of the emblem on the rig's origin.
   * Never applied to WS_Logo itself — the Blender pivot stays as authored.
   */
  orientOffset: Vector3
  /** World Y of the rig at which the logo's underside just clears water. */
  emergedRiseY: number
  /** World Y of the rig at which the logo's top is fully under. */
  submergedRiseY: number
  /** Footprint half-width of each child, projected onto the plane. */
  leftFootprint: [number, number]
  rightFootprint: [number, number]
}

/** Everything the scene needs to know about scroll, without React state. */
export interface ProgressSource {
  /** Normalized narrative progress, 0-1. Written by ScrollTrigger. */
  current: number
}

/** Live numbers the debug overlay samples. Written every frame. */
export interface DebugTelemetry {
  progress: number
  logoWorldY: number
  boundsMin: number
  boundsMax: number
  submersion: number
  verticalVelocity: number
  rippleEnergy: number
  tier: QualityTier
  fps: number
  nodesFound: boolean
  discoveredNames: string[]
  /** Camera world position, for validating the authored path. */
  cameraPosition: [number, number, number]
  /** Where the camera is aimed. */
  cameraTarget: [number, number, number]
  /** Corridor centre in world space, and the camera's distance to it. */
  passageWorld: [number, number, number]
  passageDistance: number
  /** World units the camera covers per 1% of progress. */
  travelPerPercent: number
  /** 0-1, how revealed the destination is. */
  destinationReveal: number
}

/**
 * Debug-only overrides. `null` on a field means scroll is in control of it.
 *
 * `submersion` replaces only the emblem's height, leaving the camera and
 * DOM on the scroll-driven narrative — that is what makes the submersion
 * presets an inspection of the real scene rather than a separate one.
 * `progress` pins the whole narrative, which is how a specific moment can
 * be examined without holding a scroll position.
 */
export interface DebugOverride {
  value: number | null
  progress: number | null
}

/** One persistent contact patch, in world XZ. Consumed by the water shader. */
export interface SurfaceContact {
  x: number
  z: number
  radius: number
  /** 0 when the part is clear of the surface or wholly beneath it. */
  strength: number
  /**
   * How hard this part is pushing the surface from below while still
   * fully submerged. Complementary to `strength`: one of the two is
   * always fading in as the other fades out.
   */
  pressure: number
}

/** One transient impulse for the ripple field. Signed by travel direction. */
export interface SurfaceImpulse {
  x: number
  z: number
  amplitude: number
}

/**
 * The channel between the logo rig and the water.
 *
 * A plain mutable object rather than React state: it is written and read
 * every frame, and routing that through a re-render would be both wasteful
 * and a frame late.
 */
export interface SceneState {
  contacts: [SurfaceContact, SurfaceContact]
  impulses: SurfaceImpulse[]
  submersion: number
  logoWorldY: number
  boundsMin: number
  boundsMax: number
  verticalVelocity: number
  /** 0 closed, 1 fully open. Drives the seam light and the water. */
  separation: number
}

export function createSceneState(): SceneState {
  return {
    contacts: [
      { x: 0, z: 0, radius: 1, strength: 0, pressure: 0 },
      { x: 0, z: 0, radius: 1, strength: 0, pressure: 0 },
    ],
    impulses: [],
    submersion: 0,
    logoWorldY: 0,
    boundsMin: 0,
    boundsMax: 0,
    verticalVelocity: 0,
    separation: 0,
  }
}
