import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import {
  Box3,
  Matrix4,
  Vector3,
  type Object3D,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  EMERGED_CLEARANCE,
  LOGO_TARGET_WIDTH,
  NODE_NAMES,
  SUBMERGED_CLEARANCE,
  WATER_LEVEL,
  WS_LOGO_URL,
} from './waterHeroConfig'
import type { CapturedTransform, LogoMetrics, LogoNodes } from './waterHeroTypes'
import { createLogoMaterialVariants, disposeLogoMaterialVariants } from './logoMaterialVariants'

/** Everything the camera sees directly. */
export const SCENE_LAYER = 0
/** Everything only the planar reflection camera sees. */
export const REFLECTION_LAYER = 1

/**
 * The rotation that stands the emblem up.
 *
 * Blender authored the logo lying flat: it was drawn in the XY plane and
 * extruded along Z, and glTF's Z-up-to-Y-up conversion turns that into a
 * plate lying in the XZ plane with the 64mm extrusion running along Y.
 * A quarter turn about X maps the extrusion's front face to +Z and the
 * logo's own up direction to +Y, leaving X — and therefore left and
 * right — untouched.
 *
 * This lives on an outer presentation group, never on WS_Logo, so the
 * master pivot Blender created survives intact.
 */
const ORIENT_X = Math.PI / 2

export interface LogoModelResult {
  nodes: LogoNodes | null
  error: string | null
  /** Every node name found in the file. Reported when a lookup fails. */
  discovered: string[]
}

function capture(object: Object3D): CapturedTransform {
  return {
    position: object.position.clone(),
    quaternion: object.quaternion.clone(),
    scale: object.scale.clone(),
  }
}

function isDescendantOf(child: Object3D, ancestor: Object3D): boolean {
  let parent = child.parent
  while (parent) {
    if (parent === ancestor) return true
    parent = parent.parent
  }
  return false
}

/**
 * Loads the emblem, verifies the hierarchy the Blender export promises,
 * and measures everything the scene needs in world units.
 *
 * The returned graph is a clone. `useLoader` hands back one cached glTF
 * shared by every consumer and surviving unmount, so transforming it
 * directly would leave the next mount reading a model that had already
 * been moved — a bug that only shows up on the second visit to the route.
 */
export function useLogoModel(): LogoModelResult {
  const gltf = useLoader(GLTFLoader, WS_LOGO_URL)

  return useMemo(() => {
    const discovered: string[] = []
    gltf.scene.traverse((child) => {
      if (child.name) discovered.push(child.name)
    })

    const sceneRoot = gltf.scene.clone(true)

    // Independent planar-water proxy with the same diffuser and a quieter
    // light level so its rippled reflection retains detail.
    const proxyRoot = gltf.scene.clone(true)

    const root = sceneRoot.getObjectByName(NODE_NAMES.root)
    const left = sceneRoot.getObjectByName(NODE_NAMES.left)
    const right = sceneRoot.getObjectByName(NODE_NAMES.right)

    const proxyLeft = proxyRoot.getObjectByName(NODE_NAMES.left)
    const proxyRight = proxyRoot.getObjectByName(NODE_NAMES.right)

    const missing = [
      !root && NODE_NAMES.root,
      !left && NODE_NAMES.left,
      !right && NODE_NAMES.right,
    ].filter(Boolean)

    if (!root || !left || !right) {
      return {
        nodes: null,
        discovered,
        error:
          `${WS_LOGO_URL} is missing required node(s): ${missing.join(', ')}. ` +
          `Found: ${discovered.join(', ') || '(none)'}.`,
      }
    }

    if (!isDescendantOf(left, root) || !isDescendantOf(right, root)) {
      return {
        nodes: null,
        discovered,
        error:
          `${NODE_NAMES.left} and ${NODE_NAMES.right} must both sit beneath ` +
          `${NODE_NAMES.root}. The export's hierarchy has been flattened or ` +
          `re-parented; the split animation depends on it.`,
      }
    }

    // Layers keep the two apart without either pass having to walk the
    // scene and toggle visibility every frame: the beauty and refraction
    // passes see only the real emblem, the planar reflection pass sees
    // only the proxy.
    sceneRoot.traverse((child) => child.layers.set(SCENE_LAYER))
    proxyRoot.traverse((child) => child.layers.set(REFLECTION_LAYER))

    /* --- Measurement ------------------------------------------------ */

    sceneRoot.updateMatrixWorld(true)
    const rawBounds = new Box3().setFromObject(sceneRoot)
    const rawSize = rawBounds.getSize(new Vector3())
    const rawCenter = rawBounds.getCenter(new Vector3())

    // Standing the model up swaps which axis is which.
    const scale = LOGO_TARGET_WIDTH / Math.max(rawSize.x, 1e-6)
    const width = rawSize.x * scale
    const height = rawSize.z * scale
    const depth = rawSize.y * scale
    createLogoMaterialVariants(sceneRoot, depth)
    createLogoMaterialVariants(proxyRoot, depth, true)

    const orient = new Matrix4().makeRotationX(ORIENT_X)
    const orientedCenter = rawCenter.clone().applyMatrix4(orient).multiplyScalar(scale)

    // Places the measured centre of the emblem on the rig's origin, so the
    // rig's rotation is about the logo rather than about a pivot 1.1 units
    // away. This is a presentation offset on an outer group; WS_Logo's own
    // transform is never written to.
    const orientOffset = orientedCenter.clone().negate()

    const halfHeight = height * 0.5
    const emergedRiseY = WATER_LEVEL + EMERGED_CLEARANCE * height + halfHeight
    const submergedRiseY = WATER_LEVEL - SUBMERGED_CLEARANCE * height - halfHeight

    // Each child's footprint, in the rig's own space. The interaction
    // field uses two emitters rather than one centred on the whole
    // emblem: a single circular ripple around a two-part object reads as
    // a decal, not as contact.
    const childFootprint = (node: Object3D): [number, number] => {
      const box = new Box3().setFromObject(node)
      const center = box.getCenter(new Vector3())
      const size = box.getSize(new Vector3())
      return [
        center.x * scale + orientOffset.x,
        Math.max(size.x, size.z) * scale * 0.5,
      ]
    }

    const metrics: LogoMetrics = {
      width,
      height,
      depth,
      scale,
      orientOffset,
      emergedRiseY,
      submergedRiseY,
      leftFootprint: childFootprint(left),
      rightFootprint: childFootprint(right),
    }

    return {
      nodes: {
        sceneRoot,
        proxyRoot,
        proxyLeft: proxyLeft!,
        proxyRight: proxyRight!,
        root,
        left,
        right,
        baseline: {
          root: capture(root),
          left: capture(left),
          right: capture(right),
        },
        metrics,
      },
      error: null,
      discovered,
    }
  }, [gltf])
}

export function preloadLogo() {
  useLoader.preload(GLTFLoader, WS_LOGO_URL)
}

/** Frees only what this module allocated: the per-instance materials. */
export function disposeLogoInstance(nodes: LogoNodes) {
  for (const graph of [nodes.sceneRoot, nodes.proxyRoot]) {
    disposeLogoMaterialVariants(graph)
  }
}

export { ORIENT_X }
