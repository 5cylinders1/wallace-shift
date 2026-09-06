import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Box3,
  MeshStandardMaterial,
  Mesh,
  Vector3,
  type Group,
  type Plane,
  type Texture,
} from 'three'
import {
  INTERACTION,
  LOGO_MATERIAL,
  POINTER,
  REFLECTION_PROXY_MATERIAL,
  SPLIT,
  SEAM,
  WATER_LEVEL,
  WETNESS,
} from './waterHeroConfig'
import { applyWetness } from './logoWetness'
import { ORIENT_X } from './useLogoModel'
import {
  PITCH_CURVE,
  SPLIT_CURVE,
  YAW_CURVE,
  riseFraction,
  riseYForSubmersion,
  riseToWorldY,
  sampleCurve,
} from './sceneDirector'
import { REQUIRED_SPLIT_DISPLACEMENT as SPLIT_DISPLACEMENT } from './cameraPath'
import type {
  DebugTelemetry,
  LogoNodes,
  ProgressSource,
  SceneState,
  DebugOverride,
} from './waterHeroTypes'

interface WSLogoProps {
  nodes: LogoNodes
  progress: ProgressSource
  override: DebugOverride
  scene: SceneState
  telemetry: DebugTelemetry
  pointerEnabled: boolean
  /** Sky-only cube, so the proxy never sees the low key light. */
  skyEnvironment: Texture
  /** Keeps the proxy above the waterline in its own pass. */
  reflectionClip: Plane
}

const scratchBox = new Box3()
const scratchCenter = new Vector3()
const scratchSize = new Vector3()

/**
 * The emblem and its rig.
 *
 * The nesting is deliberate and load-bearing:
 *
 *   rise   — world Y, driven by scroll
 *   yaw    — world Y rotation, about the emblem's own centre
 *   pitch  — world X rotation
 *   orient — stands the model up, scales it, and centres it on the rig
 *   [cloned glTF scene] → WS_Logo → WS_Left / WS_Right
 *
 * Everything the narrative moves lives above the glTF, so WS_Logo keeps
 * the transform Blender gave it. That matters more than it looks: the
 * master pivot sits at (0.18, 0, -0.17), the split in phase 4 animates
 * WS_Left and WS_Right relative to that, and a rig that had written to
 * WS_Logo.position in order to raise the logo would have quietly
 * destroyed the frame those offsets are measured in.
 */
export function WSLogo({
  nodes,
  progress,
  override,
  scene,
  telemetry,
  pointerEnabled,
  skyEnvironment,
  reflectionClip,
}: WSLogoProps) {
  const riseRef = useRef<Group>(null)
  const yawRef = useRef<Group>(null)
  const pitchRef = useRef<Group>(null)

  const previousRise = useRef<number | null>(null)
  const smoothedVelocity = useRef(0)
  const pointerYaw = useRef(0)
  /**
   * The waterline's high-water mark, in the rig's own vertical space.
   *
   * Tracked in rig space rather than world space so it means the same
   * thing as the emblem moves: it is how far up the object the water has
   * recently reached, which is exactly what "still wet" means.
   */
  const wetCut = useRef(Number.POSITIVE_INFINITY)

  const { metrics } = nodes

  const contactRadius = useMemo(
    () => INTERACTION.contactRadius * metrics.width,
    [metrics.width],
  )

  // The cloned materials are ours to tune; the GLB is not touched.
  // Metalness and roughness are taken from the file exactly as authored.
  // Only reflectance is corrected — see LOGO_MATERIAL for why 0.0012 is
  // not a colour a metal can have.
  /**
   * Wetness is off.
   *
   * Three attempts, and it never became perceptible in normal playback on
   * a near-black metal under this lighting. It stays only because the seam
   * light shares the same material patch — passing `wet: false` compiles
   * the wetness branch out and leaves the seam, which does have a job to
   * do. Nothing here costs anything now beyond one uniform.
   */
  const wetness = useMemo(
    () => applyWetness(nodes.sceneRoot, WETNESS.fade, WETNESS.beadGain, false),
    [nodes],
  )

  useEffect(() => {
    nodes.sceneRoot.traverse((child) => {
      if (!(child instanceof Mesh)) return
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]
      materials.forEach((material) => {
        if (!(material instanceof MeshStandardMaterial)) return
        material.color.setScalar(LOGO_MATERIAL.baseColor)
        material.envMapIntensity = LOGO_MATERIAL.envMapIntensity
        material.needsUpdate = true
      })
    })

    // The proxy is the emblem as the water is allowed to see it: duller,
    // rougher, and — critically — lit from the sky cube alone, so the low
    // key that describes the real sidewalls never reaches it. That is what
    // removes the foreground lanes at source rather than fragmenting them.
    nodes.proxyRoot.traverse((child) => {
      if (!(child instanceof Mesh)) return
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material]
      materials.forEach((material) => {
        if (!(material instanceof MeshStandardMaterial)) return
        material.color.setScalar(REFLECTION_PROXY_MATERIAL.baseColor)
        material.roughness = REFLECTION_PROXY_MATERIAL.roughness
        material.envMapIntensity = REFLECTION_PROXY_MATERIAL.envMapIntensity
        material.envMap = skyEnvironment
        material.clippingPlanes = [reflectionClip]
        material.needsUpdate = true
      })
    })
  }, [nodes, skyEnvironment, reflectionClip])

  useFrame((state, delta) => {
    const rise = riseRef.current
    const yaw = yawRef.current
    const pitch = pitchRef.current
    if (!rise || !yaw || !pitch) return

    const narrative = progress.current

    // A debug override replaces the scroll-derived height only; every
    // other channel still follows progress, so the overlay inspects the
    // real scene rather than a separate one.
    const riseY =
      override.value === null
        ? riseToWorldY(riseFraction(narrative), metrics)
        : riseYForSubmersion(override.value, metrics, WATER_LEVEL)

    if (pointerEnabled) {
      const approach = Math.min(1, delta * POINTER.damping)
      pointerYaw.current +=
        (state.pointer.x * POINTER.logoYaw - pointerYaw.current) * approach
    }

    // Rise raises the object while the water stays put, so the waterline
    // slides *down* the object in its own frame. The wet line follows it
    // down at a fixed drain rate, and snaps back up the moment any part
    // goes under again.
    const localWaterline = WATER_LEVEL - riseY
    wetCut.current = Math.max(
      localWaterline,
      wetCut.current - WETNESS.drainRate * delta,
    )
    wetness.uWetWorldY.value = riseY + wetCut.current
    wetness.uWetTime.value = state.clock.elapsedTime

    rise.position.y = riseY
    yaw.rotation.y = sampleCurve(YAW_CURVE, narrative) + pointerYaw.current
    pitch.rotation.x = sampleCurve(PITCH_CURVE, narrative)

    /* --- The split -------------------------------------------------- */
    // Every offset is applied to the transform Blender authored, never to
    // an assumed identity — WS_Logo's pivot sits at (0.18, 0, -0.17), so
    // reassembling onto [0,0,0] would visibly shift the mark.
    const separation = sampleCurve(SPLIT_CURVE, narrative)
    const { left, right } = nodes.baseline
    const localShift = SPLIT_DISPLACEMENT / metrics.scale

    nodes.left.position.set(
      left.position.x - localShift * separation,
      left.position.y,
      left.position.z - (SPLIT.depthShift / metrics.scale) * separation,
    )
    nodes.right.position.set(
      right.position.x + localShift * separation,
      right.position.y,
      right.position.z + (SPLIT.depthShift / metrics.scale) * separation,
    )
    nodes.left.rotation.set(0, -SPLIT.rotation * separation, 0)
    nodes.right.rotation.set(0, SPLIT.rotation * separation, 0)

    // The proxy has to track it exactly, or the reflection would show an
    // emblem that is still closed while the real one is opening.
    nodes.proxyLeft.position.copy(nodes.left.position)
    nodes.proxyRight.position.copy(nodes.right.position)
    nodes.proxyLeft.rotation.copy(nodes.left.rotation)
    nodes.proxyRight.rotation.copy(nodes.right.rotation)

    scene.separation = separation

    // The seam sits on the split plane in world space and only exists once
    // the halves have actually parted.
    rise.updateMatrixWorld(true)
    wetness.uSeamX.value = rise.position.x
    wetness.uSeamFalloff.value = SEAM.falloff
    const seamLevel = SEAM.intensity * separation * separation
    wetness.uSeamColor.value.set(
      SEAM.color[0] * seamLevel,
      SEAM.color[1] * seamLevel,
      SEAM.color[2] * seamLevel,
    )

    rise.updateMatrixWorld(true)

    /* --- Measure, do not assume ------------------------------------- */

    scratchBox.setFromObject(nodes.sceneRoot)
    const boundsMin = scratchBox.min.y
    const boundsMax = scratchBox.max.y
    const span = Math.max(boundsMax - boundsMin, 1e-5)
    const submersion = Math.min(
      1,
      Math.max(0, (WATER_LEVEL - boundsMin) / span),
    )

    const step = Math.max(delta, 1 / 240)
    const rawVelocity =
      previousRise.current === null ? 0 : (riseY - previousRise.current) / step
    previousRise.current = riseY

    // Low-passed, because a single long frame otherwise reads as a lurch
    // and fires an impulse the user never asked for.
    smoothedVelocity.current +=
      (rawVelocity - smoothedVelocity.current) * Math.min(1, delta * 20)
    const velocity = smoothedVelocity.current

    scene.submersion = submersion
    scene.logoWorldY = riseY
    scene.boundsMin = boundsMin
    scene.boundsMax = boundsMax
    scene.verticalVelocity = velocity
    scene.impulses.length = 0

    /* --- Per-child contact and impulse ------------------------------ */

    const children = [nodes.left, nodes.right] as const

    for (let i = 0; i < children.length; i += 1) {
      scratchBox.setFromObject(children[i])
      scratchBox.getCenter(scratchCenter)
      scratchBox.getSize(scratchSize)

      const above = scratchBox.max.y - WATER_LEVEL
      const below = WATER_LEVEL - scratchBox.min.y
      const margin = Math.max(scratchSize.y * 0.08, 1e-4)

      // Persistent contact exists exactly while this part straddles the
      // surface — it is a fact about geometry, not about movement, so it
      // survives the scroll stopping.
      const straddle =
        smoothstep(0, margin, above) * smoothstep(0, margin, below)

      // Pressure is the other half of the same story, and it is graded by
      // depth rather than simply present or absent.
      //
      // Deep down it is a very faint, very broad indication — enough to
      // say a mass exists below without raising anything that could read
      // as a pedestal. Near the surface it builds into the dome that bends
      // the reflection ahead of the breach. The moment geometry actually
      // straddles the waterline it hands over to the contact collar, and
      // once the part is clear of the water it is zero: nothing broad may
      // survive into the beauty shot.
      const depthBelow = WATER_LEVEL - scratchBox.max.y
      const deepIndication =
        INTERACTION.deepPressureFloor *
        (1 - smoothstep(0, INTERACTION.deepPressureRange, depthBelow))
      const approaching =
        1 - smoothstep(0, INTERACTION.pressureRange, depthBelow)
      const pressure =
        depthBelow <= 0
          ? 0
          : Math.max(deepIndication, approaching) * (1 - straddle)

      const contact = scene.contacts[i]
      contact.x = scratchCenter.x
      contact.z = scratchCenter.z
      contact.radius = contactRadius
      contact.strength = straddle
      contact.pressure = pressure

      // Transient energy is a separate question: how fast is this part
      // moving, and is it near enough to the surface to matter?
      const gap = straddle > 0 ? 0 : Math.min(Math.abs(above), Math.abs(below))
      const proximity = 1 - smoothstep(0, INTERACTION.proximityRange, gap)

      if (proximity > 0.001 && Math.abs(velocity) > 0.001) {
        const normalized = Math.min(
          1,
          Math.abs(velocity) / INTERACTION.velocitySaturation,
        )
        // Scaled to a 60fps frame so a slower display injects fewer,
        // larger impulses rather than proportionally less energy.
        const magnitude = Math.min(
          INTERACTION.impulseClamp,
          normalized * INTERACTION.impulseGain * proximity * delta * 60,
        )
        scene.impulses.push({
          x: scratchCenter.x,
          z: scratchCenter.z,
          amplitude: Math.sign(velocity) * magnitude,
        })
      }
    }

    telemetry.progress = narrative
    telemetry.logoWorldY = riseY
    telemetry.boundsMin = boundsMin
    telemetry.boundsMax = boundsMax
    telemetry.submersion = submersion
    telemetry.verticalVelocity = velocity
  })

  return (
    <group ref={riseRef}>
      <group ref={yawRef}>
        <group ref={pitchRef}>
          <group
            rotation-x={ORIENT_X}
            scale={metrics.scale}
            position={metrics.orientOffset}
          >
            <primitive object={nodes.sceneRoot} />
            <primitive object={nodes.proxyRoot} />
          </group>
        </group>
      </group>
    </group>
  )
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / Math.max(edge1 - edge0, 1e-6)))
  return t * t * (3 - 2 * t)
}
