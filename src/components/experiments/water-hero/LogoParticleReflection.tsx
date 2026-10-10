import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type Texture } from 'three'
import { logoGlassUniforms } from './logoMaterial'
import { BLACK_CHROME_MATERIAL, logoChromeUniforms } from './logoChrome'
import { FROSTED_CRYSTAL_MATERIAL, logoFrostedUniforms } from './logoFrosted'
import { PEARL_CERAMIC_MATERIAL, logoPearlUniforms } from './logoPearl'
import { SMOKED_COPPER_MATERIAL, logoCopperUniforms } from './logoCopper'
import { LIQUID_MERCURY_MATERIAL, logoMercuryUniforms } from './logoMercury'
import { CUT_LIGHT_MATERIAL, logoCutLightUniforms } from './logoCutLight'
import { STUDIO_ALUMINUM_MATERIAL, STUDIO_BLUE_CRYSTAL_MATERIAL, logoStudioFinish } from './logoStudio'
import { logoVariantMaterials } from './logoMaterialVariants'
import { captureParticleReflection, createParticleReflection, particleReflectionActive, particleReflectionDue } from './particleReflection'
import { useDisposable } from './useDisposable'
import type { CrystalEnvironment } from './crystalEnvironment'
import { ENVIRONMENT, GLASSMORPH_LOGO_MATERIAL, type LogoAppearance } from './waterHeroConfig'
import type { LogoNodes, QualityTier, SceneState } from './waterHeroTypes'

export function LogoParticleReflection({ nodes, sceneState, environment, crystalEnvironment, appearance, tier, reducedMotion }: {
  nodes: LogoNodes; sceneState: SceneState; environment: Texture; crystalEnvironment: CrystalEnvironment | null
  appearance: LogoAppearance; tier: QualityTier; reducedMotion: boolean
}) {
  const gl = useThree(state => state.gl)
  const materials = useMemo(() => logoVariantMaterials(nodes.sceneRoot), [nodes])
  const position = useMemo(() => new Vector3(), [])
  const capturedEnvironment = useRef<Texture | null>(null)
  const probe = useDisposable(() => reducedMotion ? null : createParticleReflection(gl, tier),
    value => value?.dispose(), [gl, tier, reducedMotion])

  useEffect(() => {
    const previous = materials.map(material => ({ map: material.envMap, intensity: material.envMapIntensity }))
    return () => {
      materials.forEach((material, i) => {
        material.envMap = previous[i].map
        material.envMapIntensity = previous[i].intensity
        material.needsUpdate = true
      })
    }
  }, [materials, probe])

  // Particle transforms/uniforms update at priority 0; capture afterwards,
  // then WaterSurface owns the final scene render at priority 1.
  useFrame(({ clock, scene }) => {
    const { progress, underwater, logoWorldY } = sceneState
    const active = probe && particleReflectionActive(progress, underwater, reducedMotion)
    const glass = appearance === 'glass' || appearance === 'frosted' || appearance === 'copper' || appearance === 'studio'
    const background = glass && crystalEnvironment ? crystalEnvironment.radiance : environment
    if (active && (capturedEnvironment.current !== background || particleReflectionDue(clock.elapsedTime, probe.lastCapture, tier))) {
      position.set(0, logoWorldY, 0)
      captureParticleReflection(gl, scene, probe, background, position)
      capturedEnvironment.current = background
      probe.lastCapture = clock.elapsedTime
      probe.capturedProgress = progress
    }
    // During a large scrub jump use the studio until the next bounded
    // capture, rather than reflecting a cloud sampled at the old depth.
    const reflected = active && capturedEnvironment.current === background && Math.abs(probe.capturedProgress - progress) < .06
      ? probe.filtered?.texture ?? null : null
    for (const material of materials) {
      const crystal = (logoGlassUniforms(material)?.uGlassCrystalProfile.value ?? 0) > .5
      const chrome = !!logoChromeUniforms(material)
      const frosted = !!logoFrostedUniforms(material)
      const copper = !!logoCopperUniforms(material)
      const pearl = !!logoPearlUniforms(material)
      const mercury = !!logoMercuryUniforms(material)
      const cutlight = !!logoCutLightUniforms(material)
      const studio = logoStudioFinish(material)
      // Explicit maps preserve the individual glass, metal and ceramic gains.
      // Three uses scene intensity when a material falls back to its map.
      const next = crystal
        ? glass ? reflected ?? crystalEnvironment?.environment ?? environment : environment
        : studio === 'aluminum' ? environment
          : chrome ? appearance === 'chrome' ? reflected ?? environment : environment
          : pearl ? appearance === 'pearl' ? reflected ?? environment : environment
            : mercury ? appearance === 'mercury' ? reflected ?? environment : environment
              : cutlight ? appearance === 'cutlight' ? reflected ?? environment : environment
          : glass ? null : reflected
      if (material.envMap !== next) {
        material.envMap = next
        material.needsUpdate = true
      }
      material.envMapIntensity = crystal
        ? ENVIRONMENT.environmentIntensity * (frosted ? FROSTED_CRYSTAL_MATERIAL.envMapIntensity
          : copper ? SMOKED_COPPER_MATERIAL.envMapIntensity
            : studio === 'crystal' ? STUDIO_BLUE_CRYSTAL_MATERIAL.envMapIntensity : GLASSMORPH_LOGO_MATERIAL.envMapIntensity)
          * (1 + underwater * .10) * sceneState.lightLevel
        : studio === 'aluminum' ? ENVIRONMENT.environmentIntensity * STUDIO_ALUMINUM_MATERIAL.envMapIntensity
          * (1 + underwater * .10) * sceneState.lightLevel
          : chrome ? ENVIRONMENT.environmentIntensity * BLACK_CHROME_MATERIAL.envMapIntensity
          * (1 + underwater * .10) * sceneState.lightLevel
          : pearl ? ENVIRONMENT.environmentIntensity * PEARL_CERAMIC_MATERIAL.envMapIntensity
            * (1 + underwater * .10) * sceneState.lightLevel
            : mercury ? ENVIRONMENT.environmentIntensity * LIQUID_MERCURY_MATERIAL.envMapIntensity
              * (1 + underwater * .10) * sceneState.lightLevel
              : cutlight ? ENVIRONMENT.environmentIntensity * CUT_LIGHT_MATERIAL.envMapIntensity
                * (1 + underwater * .10) * sceneState.lightLevel
          : scene.environmentIntensity
    }
  }, .5)
  return null
}
