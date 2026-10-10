import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping, FogExp2, Vector3 } from 'three'
import { CameraRig } from './CameraRig'
import { NightSky } from './NightSky'
import { REFLECTION_CLIP } from './reflectionPlane'
import { WSLogo } from './WSLogo'
import { LogoParticleReflection } from './LogoParticleReflection'
import { UnderwaterFlow } from './UnderwaterFlow'
import { UnderwaterBurst } from './UnderwaterBurst'
import { WaterSurface } from './WaterSurface'
import { SurfaceFog } from './SurfaceFog'
import { ForegroundMist } from './ForegroundMist'
import { createStudioEnvironment } from './studioEnvironment'
import { createCrystalEnvironment } from './crystalEnvironment'
import { SUBMERGED_PARTICLE_LAYER } from './waterRenderLayers'
import { useDisposable } from './useDisposable'
import { disposeLogoInstance, useLogoModel } from './useLogoModel'
import { ENVIRONMENT, LED_LOGO_MATERIAL, QUALITY, type LogoAppearance } from './waterHeroConfig'
import type { DebugTelemetry, ProgressSource, QualityTier, SceneState, DebugOverride, SurfaceFogDepth } from './waterHeroTypes'

interface WaterSceneProps {
  progress: ProgressSource
  override: DebugOverride
  sceneState: SceneState
  telemetry: DebugTelemetry
  tier: QualityTier
  reducedMotion: boolean
  channel: number
  appearance: LogoAppearance
}

export function WaterScene({ progress, override, sceneState, telemetry, tier, reducedMotion, channel, appearance }: WaterSceneProps) {
  const gl = useThree(state => state.gl)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const { nodes, error, discovered } = useLogoModel()
  const particlePointer = useMemo(() => new Vector3(), [])
  const fogDepth = useMemo<SurfaceFogDepth>(() => ({ texture: null }), [])
  const fog = useMemo(() => new FogExp2(0x000000, 0), [])
  const environment = useDisposable(() => createStudioEnvironment(gl), value => value.dispose(), [gl])
  const glassEnabled = appearance === 'glass' || appearance === 'frosted' || appearance === 'copper' || appearance === 'studio'
  const crystalProfile = appearance === 'glass' ? 'soft-glass' : appearance === 'studio' ? 'studio' : 'original'
  const crystalEnvironment = useDisposable(() => glassEnabled ? createCrystalEnvironment(gl, crystalProfile) : null,
    value => value?.dispose(), [gl, glassEnabled, crystalProfile])
  const activeCrystalEnvironment = glassEnabled && crystalEnvironment?.profile === crystalProfile
    ? crystalEnvironment : null

  useEffect(() => {
    const enabled = camera.layers.isEnabled(SUBMERGED_PARTICLE_LAYER)
    camera.layers.enable(SUBMERGED_PARTICLE_LAYER)
    return () => { if (!enabled) camera.layers.disable(SUBMERGED_PARTICLE_LAYER) }
  }, [camera])

  useEffect(() => {
    telemetry.tier = tier
    telemetry.nodesFound = nodes !== null
    telemetry.discoveredNames = discovered
  }, [telemetry, tier, nodes, discovered])
  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping
    gl.toneMappingExposure = ENVIRONMENT.toneMappingExposure
  }, [gl])
  useEffect(() => {
    if (!environment) return
    scene.background = environment.background
    scene.environment = environment.environment
    scene.fog = fog
    return () => { scene.background = null; scene.environment = null; scene.fog = null }
  }, [scene, environment, fog])
  useEffect(() => { if (nodes) return () => disposeLogoInstance(nodes) }, [nodes])

  useFrame(() => {
    const { underwater, lightLevel } = sceneState
    scene.backgroundIntensity = ENVIRONMENT.backgroundIntensity * (1 - underwater * .985) * lightLevel
    // The light briefly strengthens on entry, then recedes with depth.
    scene.environmentIntensity = ENVIRONMENT.environmentIntensity * LED_LOGO_MATERIAL.envMapIntensity * 1.22 * (1 + underwater * .16) * lightLevel
    fog.density = underwater * (.032 + (1 - lightLevel) * .055)
  }, -1)

  if (error) throw new Error(error)
  if (!nodes || !environment) return null
  return <>
    <CameraRig progress={progress} telemetry={telemetry} sceneState={sceneState} reducedMotion={reducedMotion} override={override} />
    <NightSky environment={environment} sceneState={sceneState} reducedMotion={reducedMotion} />
    <WSLogo nodes={nodes} progress={progress} override={override} scene={sceneState}
      telemetry={telemetry} reducedMotion={reducedMotion} appearance={appearance}
      crystalEnvironment={activeCrystalEnvironment?.environment ?? null}
      reflectionEnvironment={environment.environment} reflectionClip={REFLECTION_CLIP} />
    <LogoParticleReflection nodes={nodes} sceneState={sceneState} environment={environment.environment}
      crystalEnvironment={activeCrystalEnvironment} appearance={appearance}
      tier={tier} reducedMotion={reducedMotion} />
    <UnderwaterFlow progress={progress} tier={tier} reducedMotion={reducedMotion} pointer={particlePointer} />
    <UnderwaterBurst progress={progress} tier={tier} reducedMotion={reducedMotion} pointer={particlePointer} />
    <SurfaceFog sceneState={sceneState} reducedMotion={reducedMotion} />
    <ForegroundMist sceneState={sceneState} reducedMotion={reducedMotion} tier={tier} fogDepth={fogDepth} />
    <WaterSurface sceneState={sceneState} telemetry={telemetry} quality={QUALITY[tier]}
      environment={environment} channel={channel} reducedMotion={reducedMotion} fogDepth={fogDepth} logoNodes={nodes} appearance={appearance} />
  </>
}
