import { Plane, Vector3 } from 'three'
import { WATER_LEVEL } from './waterHeroConfig'

/**
 * Keeps the reflection proxy above the waterline.
 *
 * Shared rather than defined at each use so the proxy's material and the
 * reflection pass cannot end up disagreeing about where the surface is.
 * Local clipping on the proxy, never `renderer.clippingPlanes`: a global
 * plane would also cut the background cube, which follows the camera and
 * would be sliced in half, leaving the reflection black below the horizon.
 */
export const REFLECTION_CLIP = new Plane(new Vector3(0, 1, 0), -WATER_LEVEL)
