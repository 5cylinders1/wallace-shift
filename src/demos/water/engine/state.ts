/** What the page asks of the 3D scene. The engine eases toward it, so nothing ever snaps. */

export type Mode = 'none' | 'tap' | 'whole'
export type TracerId = 'sediment' | 'chlorine' | 'chloramine' | 'vocs' | 'pfas' | 'hardness' | 'lead' | 'bacteria'
export type RoomEffect = 'none' | 'kitchen' | 'shower'
export type World = 'house' | 'study'

export interface CameraTarget {
  azimuth: number
  elevation: number
  distance: number
  target: [number, number, number]
  /** Shifts the subject sideways as a fraction of the viewport, to clear room for copy. */
  offsetX: number
  offsetY: number
  fov: number
}

export interface SceneTarget {
  world: World
  camera: CameraTarget
  drift: number
  mode: Mode
  /** Dims the baked house so a subject in front of it can carry the frame. */
  dim: number
  /** How far the tank shells have lifted away. */
  open: number
  tracer: TracerId | 'all' | null
  focusTank: number
  effect: RoomEffect
  years: number
  hardness: number
  /** Reveal of the year-of-water block beside the house. */
  volume: number
  people: number
}

export const baseTarget: SceneTarget = {
  world: 'house',
  camera: { azimuth: -7, elevation: 5, distance: 46, target: [-0.6, 1.9, 0], offsetX: 0, offsetY: 0, fov: 28 },
  drift: 1,
  mode: 'none',
  dim: 0,
  open: 0,
  tracer: null,
  focusTank: -1,
  effect: 'none',
  years: 8,
  hardness: 15,
  volume: 0,
  people: 4,
}
