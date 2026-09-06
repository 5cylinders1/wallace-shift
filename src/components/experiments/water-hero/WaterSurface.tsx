import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  DepthFormat,
  DepthTexture,
  FrontSide,
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
import {
  ENVIRONMENT,
  INTERACTION,
  LOGO_CENTER_XZ,
  STUDIO_SOURCES,
  WATER,
  WATER_LEVEL,
} from './waterHeroConfig'
import type { StudioEnvironment } from './studioEnvironment'
import type {
  DebugTelemetry,
  QualitySettings,
  SceneState,
} from './waterHeroTypes'

interface WaterSurfaceProps {
  sceneState: SceneState
  telemetry: DebugTelemetry
  quality: QualitySettings
  environment: StudioEnvironment
  /** Development channel isolator; 0 is the composite. */
  channel: number
  /** Logo materials, clipped to above-water during the reflection pass. */
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

const PLANE_NORMAL = new Vector3(0, 1, 0)
const PLANE_ORIGIN = new Vector3(0, WATER_LEVEL, 0)

export function WaterSurface({
  sceneState,
  telemetry,
  quality,
  environment,
  channel,
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
    const reflection = new WebGLRenderTarget(
      reflectionSize.width,
      reflectionSize.height,
      { type: HalfFloatType, depthBuffer: true, stencilBuffer: false },
    )

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

    return { reflection, refraction, depth }
  }, (value) => {
    value.reflection.dispose()
    value.refraction.dispose()
    value.depth.dispose()
  }, [bufferSize, quality.reflectionSize, quality.refractionSize])

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
      side: FrontSide,
      transparent: false,
      defines: { DETAIL_OCTAVES: quality.detailOctaves },
      uniforms: {
        uTime: { value: 0 },
        uSwellAmp: { value: WATER.swellAmplitude },
        uFlowSpeed: { value: WATER.flowSpeed },
        uMicroAmp: { value: WATER.microAmplitude },
        uMicroScale: { value: WATER.microScale },

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
        uLogoCenter: { value: new Vector2(...LOGO_CENTER_XZ) },
        uReflectionFocus: { value: WATER.reflectionFocus },
        uRefractionDistortion: { value: WATER.refractionDistortion },
        uExtinction: { value: new Vector3(...WATER.extinction) },
        uDeepColor: { value: new Vector3(...WATER.deepColor) },
        uScatterColor: { value: new Vector3(...WATER.scatterColor) },
        uFogDensity: { value: WATER.fogDensity },
        uBackgroundIntensity: { value: ENVIRONMENT.backgroundIntensity },

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
  const drawingBuffer = useRef(new Vector2())
  const textureMatrix = useMemo(() => new Matrix4(), [])
  const scratch = useMemo(
    () => ({
      cameraWorld: new Vector3(),
      view: new Vector3(),
      target: new Vector3(),
      lookAt: new Vector3(),
      rotation: new Matrix4(),
    }),
    [],
  )

  useFrame((state, delta) => {
    const mesh = meshRef.current
    if (!mesh || !material || !targets || !ripple) return

    const { scene, camera } = state
    const uniforms = material.uniforms

    /* 1 — Interaction, on its own clock and never gated by scroll. */
    for (const impulse of sceneState.impulses) {
      const u = (impulse.x - LOGO_CENTER_XZ[0]) / INTERACTION.extent + 0.5
      const v = (impulse.z - LOGO_CENTER_XZ[1]) / INTERACTION.extent + 0.5
      ripple.addImpulse(u, v, impulse.amplitude)
    }
    ripple.step(delta)

    /* 2 — Uniforms. */
    uniforms.uChannel.value = channel
    uniforms.uTime.value = state.clock.elapsedTime
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

    scratch.cameraWorld.setFromMatrixPosition(camera.matrixWorld)
    scratch.view
      .subVectors(scratch.cameraWorld, PLANE_ORIGIN)
      .reflect(PLANE_NORMAL)
      .negate()
      .add(PLANE_ORIGIN)

    scratch.rotation.extractRotation(camera.matrixWorld)
    scratch.lookAt.set(0, 0, -1).applyMatrix4(scratch.rotation)
    scratch.target
      .copy(scratch.cameraWorld)
      .add(scratch.lookAt)
      .sub(PLANE_ORIGIN)
      .reflect(PLANE_NORMAL)
      .negate()
      .add(PLANE_ORIGIN)

    reflectionCamera.position.copy(scratch.view)
    reflectionCamera.up.set(0, 1, 0).applyMatrix4(scratch.rotation).reflect(PLANE_NORMAL)
    reflectionCamera.lookAt(scratch.target)
    reflectionCamera.near = perspective.near
    reflectionCamera.far = perspective.far
    reflectionCamera.fov = perspective.fov
    reflectionCamera.aspect = perspective.aspect
    reflectionCamera.updateProjectionMatrix()
    reflectionCamera.projectionMatrix.copy(perspective.projectionMatrix)
    reflectionCamera.updateMatrixWorld()
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

    /* 4 — Refraction: the same view with the water absent, so everything
           beneath the surface is captured unoccluded. This is what makes
           the submerged half of the logo visible at all; the surface
           itself stays fully opaque. */
    gl.setRenderTarget(targets.refraction)
    gl.render(scene, camera)

    /* 5 — Beauty pass. */
    gl.setRenderTarget(null)
    mesh.visible = true
    gl.render(scene, camera)

    /* 6 — Telemetry. */
    telemetry.rippleEnergy = ripple.energy
    const times = frameTimes.current
    times.push(delta)
    if (times.length > 45) times.shift()
    const mean = times.reduce((sum, value) => sum + value, 0) / times.length
    telemetry.fps = mean > 0 ? 1 / mean : 0
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
