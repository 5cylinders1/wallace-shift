import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Plane, Points, Raycaster, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three'
import { sampleDescent, smoothRange } from './sceneDirector'
import { createFlowSeeds, sampleFlowParticle } from './underwaterFlowField'
import { useDisposable } from './useDisposable'
import { updatePointDrawScale } from './pointDrawScale'
import { particleDepthGLSL, updateParticleDepthPass } from './particleDepth'
import { glassParticleCaptureGLSL, updateGlassParticleCapture } from './glassSceneCapture'
import { underwaterColorGLSL } from './shaders/underwaterColor'
import { SUBMERGED_PARTICLE_LAYER } from './waterRenderLayers'
import { QUALITY } from './waterHeroConfig'
import type { ProgressSource, QualityTier } from './waterHeroTypes'

const vertexShader = /* glsl */ `
attribute float aSize;
attribute float aVisibility;
attribute vec3 aTint;
attribute vec3 aFlow;
attribute float aStretch;
attribute float aHighlight;
uniform float uPointScale;
uniform float uPixelRatio;
uniform float uTime;
uniform vec3 uColorOrigin;
varying float vVisibility;
varying vec3 vTint;
varying vec2 vDirection;
varying float vStretch;
varying float vSoftness;
varying float vWorldY;
varying vec2 vWorldUp;
varying float vWorldDiameter;
${underwaterColorGLSL}
${particleDepthGLSL}
void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * view;
  vec4 light = underwaterLight(position, uColorOrigin, uTime);
  float focusDistance = length(cameraPosition - uColorOrigin);
  float opticalDistance = particleOpticalDistance(length(view.xyz), focusDistance, uViewDepth);
  float defocus = particleDefocus(-view.z, focusDistance, uViewDepth);
  float blurScale = 1.0 + defocus * .24;
  float pulseScale = mix(.92, 1.48, light.a);
  float nearAccent = smoothstep(.010, .012, aSize);
  float maxSize = aStretch > 1.1 ? 3.6 : mix(2.7, 5.5, nearAccent);
  float pointDiameter = clamp(aSize * pulseScale * aStretch * blurScale * uPointScale / max(.1, -view.z), .6 * uPixelRatio, maxSize * mix(1.0, 1.25, light.a) * blurScale * uPixelRatio);
  gl_PointSize = max(1.0, pointDiameter);
  vec2 direction = (mat3(modelViewMatrix) * aFlow).xy;
  vDirection = length(direction) > .0001 ? normalize(vec2(direction.x, -direction.y)) : vec2(0.0, 1.0);
  vStretch = aStretch;
  vSoftness = max(nearAccent * .35, defocus);
  vWorldY = (modelMatrix * vec4(position, 1.0)).y;
  vWorldUp = vec2(viewMatrix[1][0], -viewMatrix[1][1]);
  vWorldDiameter = gl_PointSize * max(.1, -view.z) / uPointScale;
  // Keep subpixel energy stable when small water targets are expanded.
  vVisibility = aVisibility * particleTransmittance(opticalDistance, uViewDepth)
    / (blurScale * blurScale) * min(1.0, pointDiameter * pointDiameter);
  vec3 waterLight = light.rgb;
  vTint = mix(aTint, waterLight, mix(.92, .20, aHighlight));
}
`
const fragmentShader = /* glsl */ `
${glassParticleCaptureGLSL}
uniform float uVisibility;
uniform float uReflectionRadiance;
uniform float uEntryLight;
uniform vec3 uEntryTint;
varying float vVisibility;
varying vec3 vTint;
varying vec2 vDirection;
varying float vStretch;
varying float vSoftness;
varying float vWorldY;
varying vec2 vWorldUp;
varying float vWorldDiameter;
void main() {
  if (glassCaptureRejectsParticle()) discard;
  float fragmentY = vWorldY + dot(gl_PointCoord - .5, vWorldUp) * vWorldDiameter;
  if (fragmentY >= -.008) discard;
  vec2 uv = (gl_PointCoord - .5) * 2.0;
  vec2 across = vec2(-vDirection.y, vDirection.x);
  float radius = length(vec2(dot(uv, vDirection), dot(uv, across) * vStretch));
  float edge = 1.0 - smoothstep(.12, 1.0, radius);
  float softEdge = exp(-radius * radius * 3.6) * (1.0 - smoothstep(.72, 1.0, radius));
  edge = mix(edge, softEdge, vSoftness);
  float alpha = edge * vVisibility * uVisibility;
  if (alpha < .005) discard;
  vec3 lit = mix(vTint, uEntryTint, uEntryLight);
  gl_FragColor = vec4(lit / (1.0 + max(lit.r, max(lit.g, lit.b)) * .34) * uReflectionRadiance, alpha);
  #include <colorspace_fragment>
}
`

/** Fine tinted matter inhabits the fixed water volume the camera travels through.
 * Independent near/far suspension and restrained silver accents supply depth. */
export function UnderwaterFlow({ progress, tier, reducedMotion, pointer }: {
  progress: ProgressSource
  tier: QualityTier
  reducedMotion: boolean
  pointer: Vector3
}) {
  const points = useRef<Points>(null)
  const size = useThree(state => state.size)
  const canvas = useThree(state => state.gl.domElement)
  const count = QUALITY[tier].particles
  const seeds = useMemo(() => createFlowSeeds(count), [count])
  const cursor = useRef({ active: false, ndc: new Vector2() })
  const scratch = useMemo(() => ({
    viewport: new Vector4(),
    raycaster: new Raycaster(), plane: new Plane(new Vector3(0, 0, 1), 0), hit: new Vector3(),
    field: { time: 0, cursorX: 0, cursorY: 0, cursorStrength: 0 },
    sample: { x: 0, y: 0, z: 0, alpha: 0, dx: 0, dy: 1, dz: 0 },
  }), [])
  useEffect(() => {
    if (reducedMotion) return
    const clear = () => { cursor.current.active = false }
    const start = (event: PointerEvent) => { if (event.pointerType === 'touch') clear() }
    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const inside = event.clientX >= rect.left && event.clientX <= rect.right
        && event.clientY >= rect.top && event.clientY <= rect.bottom
      cursor.current.active = inside && event.pointerType !== 'touch'
      if (cursor.current.active) cursor.current.ndc.set(
        (event.clientX - rect.left) / rect.width * 2 - 1,
        -(event.clientY - rect.top) / rect.height * 2 + 1,
      )
    }
    canvas.addEventListener('pointermove', move, { passive: true })
    canvas.addEventListener('pointerdown', start, { passive: true })
    canvas.addEventListener('pointercancel', clear)
    canvas.addEventListener('pointerleave', clear)
    window.addEventListener('blur', clear)
    return () => {
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerdown', start)
      canvas.removeEventListener('pointercancel', clear)
      canvas.removeEventListener('pointerleave', clear)
      window.removeEventListener('blur', clear)
      clear()
    }
  }, [canvas, reducedMotion])
  const resources = useDisposable(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage))
    geometry.setAttribute('aVisibility', new BufferAttribute(new Float32Array(count), 1).setUsage(DynamicDrawUsage))
    geometry.setAttribute('aFlow', new BufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage))
    geometry.setAttribute('aSize', new BufferAttribute(Float32Array.from(seeds, seed => seed.size), 1))
    geometry.setAttribute('aStretch', new BufferAttribute(Float32Array.from(seeds, seed => seed.stretch), 1))
    geometry.setAttribute('aHighlight', new BufferAttribute(Float32Array.from(seeds, seed => seed.highlight ? 1 : 0), 1))
    const tint = new Float32Array(count * 3)
    seeds.forEach((seed, i) => {
      const color = new Color(seed.warm ? '#d5c4ac' : '#d3e3e8')
      tint.set([color.r, color.g, color.b], i * 3)
    })
    geometry.setAttribute('aTint', new BufferAttribute(tint, 3))
    const material = new ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthWrite: false, toneMapped: false,
      uniforms: {
        uGlassFrontDepth: { value: null }, uGlassCaptureResolution: { value: new Vector2(1, 1) }, uGlassCaptureActive: { value: 0 }, uGlassFallbackDepth: { value: 1 },
        uVisibility: { value: 0 }, uPointScale: { value: 1 }, uPixelRatio: { value: 1 },
        uTime: { value: 0 }, uColorOrigin: { value: new Vector3() }, uViewDepth: { value: 1 }, uReflectionRadiance: { value: 1 },
        uEntryLight: { value: 0 }, uEntryTint: { value: new Color('#6bc0d8') },
      },
    })
    return { geometry, material }
  }, value => { value.geometry.dispose(); value.material.dispose() }, [count, seeds])

  useFrame(({ clock, camera }, delta) => {
    if (!resources || !points.current) return
    const pose = sampleDescent(progress.current)
    points.current.visible = !reducedMotion && pose.particles > .001
    if (!points.current.visible) {
      scratch.field.cursorStrength = 0
      pointer.z = 0
      return
    }
    const positions = resources.geometry.getAttribute('position') as BufferAttribute
    const visibility = resources.geometry.getAttribute('aVisibility') as BufferAttribute
    const flow = resources.geometry.getAttribute('aFlow') as BufferAttribute
    const field = scratch.field
    field.time = clock.elapsedTime
    let cursorTarget = 0
    if (cursor.current.active) {
      scratch.raycaster.setFromCamera(cursor.current.ndc, camera)
      if (scratch.raycaster.ray.intersectPlane(scratch.plane, scratch.hit)) {
        field.cursorX = scratch.hit.x
        field.cursorY = scratch.hit.y
        cursorTarget = 1
      }
    }
    // Smooth only input engagement. Particle positions have no accumulated
    // velocity, so scroll jumps and reversals still reconstruct their field.
    field.cursorStrength += (cursorTarget - field.cursorStrength) * (1 - Math.exp(-Math.min(delta, .1) * 12))
    pointer.set(field.cursorX, field.cursorY, field.cursorStrength)
    seeds.forEach((seed, i) => {
      sampleFlowParticle(seed, field, scratch.sample)
      const { x, y, z, alpha, dx, dy, dz } = scratch.sample
      positions.setXYZ(i, x, y, z)
      visibility.setX(i, alpha)
      flow.setXYZ(i, dx, dy, dz)
    })
    positions.needsUpdate = true
    visibility.needsUpdate = true
    flow.needsUpdate = true
    resources.material.uniforms.uVisibility.value = pose.particles
    resources.material.uniforms.uTime.value = field.time
    resources.material.uniforms.uColorOrigin.value.set(0, pose.logoY + .35, 0)
    resources.material.uniforms.uEntryLight.value = (1 - smoothRange(.52, .65, pose.progress)) * .38
  })
  if (!resources || reducedMotion) return null
  return <points ref={points} geometry={resources.geometry} material={resources.material} frustumCulled={false}
    layers-mask={1 << SUBMERGED_PARTICLE_LAYER}
    onBeforeRender={(renderer, _scene, camera) => {
      updatePointDrawScale(renderer, camera, resources.material.uniforms, scratch.viewport, size.height)
      updateParticleDepthPass(camera, resources.material.uniforms)
      updateGlassParticleCapture(camera, resources.material.uniforms)
      resources.material.uniforms.uReflectionRadiance.value = camera.userData.particleReflection ? 1.6 : 1
      resources.material.uniformsNeedUpdate = true
    }} />
}
