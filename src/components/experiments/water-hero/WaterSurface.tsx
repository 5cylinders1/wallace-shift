import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  DepthFormat,
  DepthTexture,
  DoubleSide,
  HalfFloatType,
  Matrix4,
  Mesh,
  NearestFilter,
  PerspectiveCamera,
  PlaneGeometry,
  ShaderMaterial,
  UnsignedIntType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} from 'three'
import { RippleField } from './RippleField'
import { REFLECTION_LAYER } from './useLogoModel'
import { useDisposable } from './useDisposable'
import { waterFragmentShader, waterVertexShader } from './shaders/waterShader'
import { createReflectionScratch, updateWaterReflectionCamera } from './waterReflectionCamera'
import { createWaterReflectionTarget } from './waterReflectionTarget'
import { refractionLayerMask } from './waterRenderLayers'
import { createLEDGlow, renderLEDGlow } from './logoLEDGlow'
import { OPENING_REVEAL } from './openingReveal'
import { captureGlassScene, createGlassSceneCapture } from './glassSceneCapture'
import { bindGlassScene, logoMaterials } from './logoMaterial'
import {
  ENVIRONMENT,
  INTERACTION,
  LOGO_CENTER_XZ,
  LOGO_TARGET_WIDTH,
  STUDIO_SOURCES,
  WATER,
  WATER_LEVEL,
  type LogoAppearance,
} from './waterHeroConfig'
import type { StudioEnvironment } from './studioEnvironment'
import type {
  DebugTelemetry,
  QualitySettings,
  SceneState,
  SurfaceFogDepth,
  LogoNodes,
} from './waterHeroTypes'

interface WaterSurfaceProps {
  sceneState: SceneState
  telemetry: DebugTelemetry
  quality: QualitySettings
  environment: StudioEnvironment
  /** Development channel isolator; 0 is the composite. */
  channel: number
  reducedMotion: boolean
  fogDepth: SurfaceFogDepth
  logoNodes: LogoNodes
  appearance: LogoAppearance
}

/**
 * A grid whose quads grow with distance from the origin.
 *
 * A uniform 900-unit plane dense enough to resolve a 1.7-unit wavelength
 * near the camera would need millions of vertices, and almost all of them
 * would land in fog. Chebyshev rings placed at radius R·m^2.6 put roughly
 * 13cm quads under the emblem and 3.7m quads at the horizon, for 100k
 * vertices total.
 */
function createWaterGeometry(segments: number) {
  const geometry = new PlaneGeometry(2, 2, segments, segments)
  geometry.rotateX(-Math.PI / 2)

  const radius = WATER.size * 0.5
  const power = 2.6
  const position = geometry.attributes.position

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const m = Math.max(Math.abs(x), Math.abs(z))
    if (m < 1e-6) continue
    const factor = radius * Math.pow(m, power - 1)
    position.setX(i, x * factor)
    position.setZ(i, z * factor)
  }

  position.needsUpdate = true
  geometry.computeBoundingSphere()
  return geometry
}

export function WaterSurface({
  sceneState,
  telemetry,
  quality,
  environment,
  channel,
  reducedMotion,
  fogDepth,
  logoNodes,
  appearance,
}: WaterSurfaceProps) {
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)

  const meshRef = useRef<Mesh>(null)

  const geometry = useDisposable(
    () => createWaterGeometry(quality.waterSegments),
    (value) => value.dispose(),
    [quality.waterSegments],
  )

  /* --- Offscreen targets ------------------------------------------- */

  const bufferSize = useMemo(() => {
    const width = Math.max(1, Math.round(size.width * dpr))
    const height = Math.max(1, Math.round(size.height * dpr))
    return { width, height }
  }, [size.width, size.height, dpr])

  const targets = useDisposable(() => {
    const fit = (cap: number) => {
      const scale = Math.min(1, cap / Math.max(bufferSize.width, bufferSize.height))
      return {
        width: Math.max(2, Math.round(bufferSize.width * scale)),
        height: Math.max(2, Math.round(bufferSize.height * scale)),
      }
    }

    const reflectionSize = fit(quality.reflectionSize)
    const refractionSize = fit(quality.refractionSize)

    // Half float, because the studio sources are well above 1.0 and a
    // byte target would clip every highlight the metal is meant to catch
    // before the water ever samples it.
    const reflection = createWaterReflectionTarget(reflectionSize.width, reflectionSize.height)

    const refraction = new WebGLRenderTarget(
      refractionSize.width,
      refractionSize.height,
      { type: HalfFloatType, depthBuffer: true, stencilBuffer: false },
    )

    const depth = new DepthTexture(refractionSize.width, refractionSize.height)
    depth.type = UnsignedIntType
    depth.format = DepthFormat
    depth.minFilter = NearestFilter
    depth.magFilter = NearestFilter
    refraction.depthTexture = depth

    const glowSize = fit(quality.refractionSize * .5)
    const glow = createLEDGlow(glowSize.width, glowSize.height)
    return { reflection, refraction, depth, glow }
  }, (value) => {
    value.reflection.dispose()
    value.refraction.dispose()
    value.depth.dispose()
    value.glow.dispose()
  }, [bufferSize, quality.reflectionSize, quality.refractionSize])

  // Both crystal looks share a capture lifetime while retaining separate
  // material bindings. The established water/glow targets remain mounted.
  const glassEnabled = appearance === 'glass' || appearance === 'frosted' || appearance === 'copper'
  const glassCapture = useDisposable(() => {
    if (!glassEnabled) return null
    const scale = Math.min(1, quality.refractionSize / Math.max(bufferSize.width, bufferSize.height))
    const capture = createGlassSceneCapture(
      Math.max(2, Math.round(bufferSize.width * scale)),
      Math.max(2, Math.round(bufferSize.height * scale)),
    )
    return { ...capture, boundMaterials: [] as ReturnType<typeof logoMaterials> }
  }, value => {
    if (!value) return
    // Clear the exact materials bound by this capture, even if the selected
    // logo materials have already changed or a resize replaced its targets.
    bindGlassScene(value.boundMaterials, null)
    value.dispose()
  }, [glassEnabled, bufferSize, quality.refractionSize])

  useEffect(() => {
    fogDepth.texture = targets?.depth ?? null
    return () => {
      if (fogDepth.texture === targets?.depth) fogDepth.texture = null
    }
  }, [targets, fogDepth])

  const ripple = useDisposable(
    () => new RippleField(gl, quality.rippleSize),
    (value) => value.dispose(),
    [gl, quality.rippleSize],
  )

  const reflectionCamera = useMemo(() => new PerspectiveCamera(), [])

  // Deliberately independent of the render targets and the ripple field.
  // Both are rebound every frame below, and both change on resize — having
  // them here would recompile the water shader on every resize frame,
  // which is exactly when the frame budget is already under pressure.
  const material = useDisposable(() => {
    return new ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      side: DoubleSide,
      transparent: false,
      defines: { DETAIL_OCTAVES: quality.detailOctaves },
      uniforms: {
        uTime: { value: 0 },
        uSwellAmp: { value: WATER.swellAmplitude },
        uFlowSpeed: { value: WATER.flowSpeed },
        uMicroAmp: { value: WATER.microAmplitude },
        uMicroScale: { value: WATER.microScale },
        uMicroAnisotropy: { value: new Vector2(...WATER.microAnisotropy) },

        uRipple: { value: null },
        uRippleCenter: { value: new Vector2(...LOGO_CENTER_XZ) },
        uRippleExtent: { value: INTERACTION.extent },
        uRippleDisplacement: { value: INTERACTION.rippleDisplacement },
        uRippleResolution: { value: quality.rippleSize },
        uRippleNormalGain: { value: INTERACTION.rippleNormalGain },

        uContacts: { value: [new Vector4(0, 0, 1, 0), new Vector4(0, 0, 1, 0)] },
        uContactAmp: { value: INTERACTION.contactAmplitude },
        uPressure: { value: new Vector2(0, 0) },
        uPressureAmp: { value: INTERACTION.pressureAmplitude },
        uPressureRadius: { value: 1 },
        uContactDarkening: { value: INTERACTION.contactDarkening },

        uReflectMatrix: { value: new Matrix4() },
        uReflection: { value: null },
        uRefraction: { value: null },
        uRefractionDepth: { value: null },
        uEnvMap: { value: environment.background },

        uResolution: { value: new Vector2(1, 1) },
        uCameraNear: { value: 0.1 },
        uCameraFar: { value: 100 },

        uF0: { value: WATER.fresnelF0 },
        uReflectionDistortion: { value: WATER.reflectionDistortion },
        uReflectionRolloff: { value: WATER.reflectionRolloff },
        uReflectionBlur: { value: new Vector2(...WATER.reflectionBlur) },
        uReflectionAttenuation: { value: WATER.reflectionAttenuation },
        uLogoCenter: { value: new Vector2(...LOGO_CENTER_XZ) },
        uLogoHalfWidth: { value: LOGO_TARGET_WIDTH * .5 },
        uReflectionFocus: { value: WATER.reflectionFocus },
        uRefractionDistortion: { value: WATER.refractionDistortion },
        uExtinction: { value: new Vector3(...WATER.extinction) },
        uDeepColor: { value: new Vector3(...WATER.deepColor) },
        uScatterColor: { value: new Vector3(...WATER.scatterColor) },
        uFogDensity: { value: WATER.fogDensity },
        uBackgroundIntensity: { value: ENVIRONMENT.backgroundIntensity },
        uSkyBehindIntensity: { value: ENVIRONMENT.backgroundIntensity },
        uUnderwater: { value: 0 },
        uLightLevel: { value: 1 },
        uSurfaceVisibility: { value: 1 },

        uKeyDirection: { value: keyLightDirection() },
        uKeyColor: { value: waterSpecularColor() },
        uSpecularRoughness: { value: WATER.specularRoughness },
        uSpecularStrength: { value: WATER.specularStrength },
        uChannel: { value: 0 },
      },
    })
  }, (value) => value.dispose(), [
    quality.detailOctaves,
    quality.rippleSize,
    environment,
  ])

  /* --- Frame ------------------------------------------------------- */

  const frameTimes = useRef<number[]>([])
  const wasSurfaceVisible = useRef(true)
  const drawingBuffer = useRef(new Vector2())
  const textureMatrix = useMemo(() => new Matrix4(), [])
  const scratch = useMemo(() => createReflectionScratch(), [])

  useFrame((state, delta) => {
    const mesh = meshRef.current
    if (!mesh || !material || !targets || !ripple) return

    const { scene, camera } = state
    const uniforms = material.uniforms

    // This component owns the final frame even when the water is absent.
    // A positive useFrame priority disables R3F's automatic render.
    const surfaceVisible = reducedMotion || sceneState.progress < 0.57
    const openingGlow = !reducedMotion && sceneState.progress > OPENING_REVEAL.traceStart
      && sceneState.progress < OPENING_REVEAL.surfaceEnd
    const glowEnabled = appearance === 'led' || appearance === 'electric'
      || appearance === 'chrome' || appearance === 'frosted' || appearance === 'cutlight' || openingGlow
    if (sceneState.resetRipples || (!surfaceVisible && wasSurfaceVisible.current)) {
      ripple.reset()
    }
    wasSurfaceVisible.current = surfaceVisible
    mesh.visible = surfaceVisible

    if (glassEnabled && (reducedMotion || sceneState.progress < .98)) {
      if (!glassCapture) return
      // WSLogo selects the active materials earlier in the frame. Capture
      // before both the water refraction and final beauty draws, and never
      // bind a beauty-camera texture to the mirrored reflection proxy.
      // Switching glass finishes retains these targets. Release the previous
      // material binding before capturing, including when the next draw fails.
      bindGlassScene(glassCapture.boundMaterials, null)
      glassCapture.boundMaterials = logoMaterials(logoNodes.sceneRoot)
      const background = captureGlassScene(gl, scene, camera, glassCapture, logoNodes, mesh)
      bindGlassScene(glassCapture.boundMaterials, background,
        glassCapture.colorTarget.width, glassCapture.colorTarget.height)
    }

    const times = frameTimes.current
    times.push(delta)
    if (times.length > 45) times.shift()
    const mean = times.reduce((sum, value) => sum + value, 0) / times.length
    telemetry.fps = mean > 0 ? 1 / mean : 0

    if (!surfaceVisible) {
      // The underside has already faded to this exact water-free image.
      // No surface or ripple work remains; draw the underwater scene directly.
      gl.setRenderTarget(null)
      gl.render(scene, camera)
      if (glowEnabled && sceneState.progress < .98) renderLEDGlow(gl, scene, camera, targets.glow, logoNodes, mesh)
      telemetry.rippleEnergy = 0
      return
    }

    /* 1 — Local residual waves have their own clock. */
    if (!reducedMotion) {
      for (const impulse of sceneState.impulses) {
        const u = (impulse.x - LOGO_CENTER_XZ[0]) / INTERACTION.extent + 0.5
        const v = (impulse.z - LOGO_CENTER_XZ[1]) / INTERACTION.extent + 0.5
        ripple.addImpulse(u, v, impulse.amplitude)
      }
      ripple.step(delta)
    }

    /* 2 — Uniforms. */
    uniforms.uChannel.value = channel
    uniforms.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime
    uniforms.uUnderwater.value = sceneState.underwater
    uniforms.uLightLevel.value = sceneState.lightLevel
    uniforms.uSkyBehindIntensity.value = scene.backgroundIntensity
    uniforms.uSurfaceVisibility.value = reducedMotion
      ? 1
      : 1 - smoothstep(0.50, 0.57, sceneState.progress)
    uniforms.uRipple.value = ripple.texture
    uniforms.uReflection.value = targets.reflection.texture
    uniforms.uRefraction.value = targets.refraction.texture
    uniforms.uRefractionDepth.value = targets.depth

    const contactUniform = uniforms.uContacts.value as Vector4[]
    for (let i = 0; i < 2; i += 1) {
      const contact = sceneState.contacts[i]
      contactUniform[i].set(contact.x, contact.z, contact.radius, contact.strength)
    }
    ;(uniforms.uPressure.value as Vector2).set(
      sceneState.contacts[0].pressure,
      sceneState.contacts[1].pressure,
    )
    uniforms.uPressureRadius.value =
      sceneState.contacts[0].radius * INTERACTION.pressureRadiusScale

    gl.getDrawingBufferSize(drawingBuffer.current)
    ;(uniforms.uResolution.value as Vector2).copy(drawingBuffer.current)

    const perspective = camera as PerspectiveCamera
    uniforms.uCameraNear.value = perspective.near
    uniforms.uCameraFar.value = perspective.far

    /* 3 — Reflection: a mirrored camera, with the water hidden so it
           cannot appear in its own reflection, and the logo clipped to
           its above-water half so the submerged part is not mirrored
           into a surface that could not physically show it. */
    mesh.visible = false
    const beautyLayers = camera.layers.mask

    try {
      // Once the camera is fully underwater only the underside branch is
      // visible. It samples the sky directly and needs no planar reflection.
      if (sceneState.underwater < 1) {
        updateWaterReflectionCamera(perspective, reflectionCamera, WATER_LEVEL, scratch)
        reflectionCamera.layers.set(REFLECTION_LAYER)

        textureMatrix.set(
          0.5, 0, 0, 0.5,
          0, 0.5, 0, 0.5,
          0, 0, 0.5, 0.5,
          0, 0, 0, 1,
        )
        textureMatrix.multiply(reflectionCamera.projectionMatrix)
        textureMatrix.multiply(reflectionCamera.matrixWorldInverse)
        ;(uniforms.uReflectMatrix.value as Matrix4).copy(textureMatrix)

        // Only the proxy is on the reflection layer, so this pass draws the
        // controlled stand-in and never the production emblem. The proxy owns
        // its clipping plane permanently, which also means no material has to
        // be mutated per frame and no program is swapped in and out.
        gl.setRenderTarget(targets.reflection)
        gl.render(scene, reflectionCamera)
      }

      /* 4 — Refraction: the same view with the water absent, so everything
             beneath the surface is captured unoccluded. This is what makes
             the submerged half of the logo visible at all; the surface
             itself stays fully opaque. */
      gl.setRenderTarget(targets.refraction)
      // Air mist is beauty-only. Below the surface, transparent particles
      // are also beauty-only: they sit between the camera and the underside.
      // Baking them into its background would draw them twice above the
      // projected horizon, producing a visible color/brightness boundary.
      camera.layers.mask = refractionLayerMask(beautyLayers, camera.position.y, WATER_LEVEL)
      gl.render(scene, camera)
    } finally {
      camera.layers.mask = beautyLayers
      gl.setRenderTarget(null)
      mesh.visible = true
    }

    /* 5 — Beauty pass. */
    gl.render(scene, camera)
    if (glowEnabled) renderLEDGlow(gl, scene, camera, targets.glow, logoNodes, mesh)

    /* 6 — Telemetry. */
    telemetry.rippleEnergy = ripple.energy
  }, 1)

  useEffect(() => {
    gl.localClippingEnabled = true
  }, [gl])

  // The mesh is only mounted once every resource it draws with exists, so
  // the frame loop never has to render a half-built surface.
  if (!geometry || !material || !targets || !ripple) return null

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position-y={WATER_LEVEL}
      frustumCulled={false}
      renderOrder={1}
    />
  )
}

function smoothstep(start: number, end: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

/**
 * The source the water's specular lobe answers to.
 *
 * Deliberately the sky's own fill rather than the metal's key. The key is
 * no longer in the sky at all, so having the water glint off it would
 * reintroduce by hand exactly the ribbon the environment split removed.
 */
function waterSpecularSource() {
  return (
    STUDIO_SOURCES.find((source) => source.inSky && source.elevation > 0.5) ??
    STUDIO_SOURCES[0]
  )
}

function keyLightDirection() {
  const { azimuth, elevation } = waterSpecularSource()
  return new Vector3(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.cos(azimuth),
  ).normalize()
}

/** Hue only — the level lives in WATER.specularStrength. */
function waterSpecularColor() {
  const source = waterSpecularSource()
  const color = new Vector3(...source.color)
  return color.divideScalar(Math.max(color.x, color.y, color.z, 1e-4))
}
