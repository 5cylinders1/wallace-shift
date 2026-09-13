import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box3, Vector3, type Group, type Plane, type Texture, type PerspectiveCamera } from 'three'
import { INTERACTION, WATER_LEVEL, type LogoAppearance } from './waterHeroConfig'
import { sampleDescent, smoothRange } from './sceneDirector'
import { logoGlassUniforms, updateGlassRim, updateGlassTurnSoftness, updateLEDLighting } from './logoMaterial'
import { updateChromeLighting } from './logoChrome'
import { updateFrostedLighting } from './logoFrosted'
import { updatePearlLighting } from './logoPearl'
import { updateMercuryLighting } from './logoMercury'
import { updateLogoOpening } from './logoOpening'
import { logoVariantMaterials, selectLogoAppearance } from './logoMaterialVariants'
import { applyLogoSplit, createLogoSplitScratch, restoreLogoHalves } from './logoSplit'
import { ORIENT_X } from './useLogoModel'
import type { DebugTelemetry, LogoNodes, ProgressSource, SceneState, DebugOverride } from './waterHeroTypes'

interface WSLogoProps {
  nodes: LogoNodes
  progress: ProgressSource
  override: DebugOverride
  scene: SceneState
  telemetry: DebugTelemetry
  reducedMotion: boolean
  reflectionEnvironment: Texture
  crystalEnvironment: Texture | null
  reflectionClip: Plane
  appearance: LogoAppearance
}

/** Move the presentation rig; preserve every authored transform inside WS. */
export function WSLogo({ nodes, progress, override, scene, telemetry, reducedMotion, reflectionEnvironment, crystalEnvironment, reflectionClip, appearance }: WSLogoProps) {
  const rig = useRef<Group>(null)
  const previous = useRef<{ progress: number; y: number } | null>(null)
  const scratch = useMemo(() => ({ box: new Box3(), center: new Vector3(), size: new Vector3() }), [])
  const { metrics } = nodes
  const splitScratch = useMemo(() => createLogoSplitScratch(), [])
  const materials = useMemo(() => [...logoVariantMaterials(nodes.sceneRoot), ...logoVariantMaterials(nodes.proxyRoot)], [nodes])

  useEffect(() => {
    restoreLogoHalves(nodes)
    return () => restoreLogoHalves(nodes)
  }, [nodes])

  useEffect(() => {
    const proxyMaterials = logoVariantMaterials(nodes.proxyRoot)
    const previous = proxyMaterials.map(material => ({ envMap: material.envMap, clippingPlanes: material.clippingPlanes }))
    proxyMaterials.forEach(material => {
      const crystal = (logoGlassUniforms(material)?.uGlassCrystalProfile.value ?? 0) > .5
      material.envMap = crystal ? crystalEnvironment ?? reflectionEnvironment : reflectionEnvironment
      material.clippingPlanes = [reflectionClip]
      material.needsUpdate = true
    })
    return () => {
      proxyMaterials.forEach((material, i) => {
        material.envMap = previous[i].envMap
        material.clippingPlanes = previous[i].clippingPlanes
        material.needsUpdate = true
      })
    }
  }, [nodes, reflectionEnvironment, crystalEnvironment, reflectionClip])

  useFrame(({ camera, size, clock }, delta) => {
    if (!rig.current) return
    const pose = sampleDescent(progress.current)
    selectLogoAppearance(nodes.sceneRoot, appearance)
    selectLogoAppearance(nodes.proxyRoot, appearance)
    const time = reducedMotion ? 0 : clock.elapsedTime
    const underwater = reducedMotion ? 0 : pose.underwater
    updateLEDLighting(materials, time, underwater, appearance)
    if (appearance === 'chrome') updateChromeLighting(materials, time, underwater)
    if (appearance === 'frosted') updateFrostedLighting(materials, time, underwater)
    if (appearance === 'pearl') updatePearlLighting(materials, reducedMotion ? 0 : pose.yaw)
    if (appearance === 'mercury') updateMercuryLighting(materials, time)
    updateLogoOpening(materials, progress.current, reducedMotion)
    if (appearance === 'glass') {
      updateGlassRim(materials, time, underwater)
      updateGlassTurnSoftness(materials, reducedMotion ? 0 : pose.yaw)
    }
    const y = override.value === null ? pose.logoY : WATER_LEVEL + metrics.height * (.5 - override.value)
    rig.current.position.y = y
    rig.current.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ')
    applyLogoSplit(nodes, rig.current, camera as PerspectiveCamera, reducedMotion ? 0 : pose.split, splitScratch, size.width)
    scene.logoReveal = splitScratch.reveal
    const jumped = previous.current === null || Math.abs(pose.progress - previous.current.progress) > .07
    const velocity = jumped || reducedMotion ? 0 : Math.max(-3, Math.min(3, (y - previous.current!.y) / Math.max(delta, 1/240)))
    previous.current = { progress: pose.progress, y }
    scene.resetRipples = jumped
    scene.impulses.length = 0
    scratch.box.setFromObject(nodes.sceneRoot)
    scene.logoWorldY = y
    scene.boundsMin = scratch.box.min.y
    scene.boundsMax = scratch.box.max.y
    scene.submersion = Math.min(1, Math.max(0, (WATER_LEVEL - scratch.box.min.y) / Math.max(scratch.box.max.y - scratch.box.min.y, .001)))
    scene.verticalVelocity = velocity
    const children = [nodes.left, nodes.right]
    for (let i = 0; i < 2; i++) {
      scratch.box.setFromObject(children[i])
      scratch.box.getCenter(scratch.center)
      scratch.box.getSize(scratch.size)
      const above = scratch.box.max.y - WATER_LEVEL
      const below = WATER_LEVEL - scratch.box.min.y
      const margin = Math.max(scratch.size.y * .08, .001)
      const straddle = smoothRange(0, margin, above) * smoothRange(0, margin, below)
      const contact = scene.contacts[i]
      contact.x = scratch.center.x
      contact.z = scratch.center.z
      contact.radius = INTERACTION.contactRadius * metrics.width
      contact.strength = straddle
      // A small depression communicates attraction before release; no
      // underwater pressure dome follows the descending logo afterward.
      contact.pressure = reducedMotion ? 0 : -.7 * pose.tension * (1 - straddle)
      if (!jumped && !reducedMotion && Math.abs(velocity) > .001 && straddle > .001) {
        scene.impulses.push({
          x: contact.x, z: contact.z,
          amplitude: Math.sign(velocity) * Math.min(INTERACTION.impulseClamp,
            Math.abs(velocity) / INTERACTION.velocitySaturation * INTERACTION.impulseGain * straddle * delta * 60),
        })
      }
    }
    telemetry.progress = pose.progress
    telemetry.logoWorldY = y
    telemetry.boundsMin = scene.boundsMin
    telemetry.boundsMax = scene.boundsMax
    telemetry.submersion = scene.submersion
    telemetry.verticalVelocity = velocity
  }, -2)

  return (
    <group ref={rig} position-y={sampleDescent(0).logoY}>
      <group rotation-x={ORIENT_X} scale={metrics.scale} position={metrics.orientOffset}>
        <primitive object={nodes.sceneRoot} />
        <primitive object={nodes.proxyRoot} />
      </group>
    </group>
  )
}
