import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, DoubleSide, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, ShaderMaterial, Vector2 } from 'three'
import { useDisposable } from './useDisposable'
import { sampleSurfaceFog, SURFACE_FOG_BANKS, SURFACE_FOG_LAYER } from './surfaceFogField'
import { GLASS_BACKGROUND_LAYER, glassParticleCaptureGLSL, updateGlassParticleCapture } from './glassSceneCapture'
import type { SceneState } from './waterHeroTypes'

const vertexShader = /* glsl */ `
attribute float aBankSeed;
attribute float aBankOpacity;
attribute float aBankWidth;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vBankSeed;
varying float vBankOpacity;
varying float vBankWidth;
void main() {
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vUv = uv;
  vWorldPosition = world.xyz;
  vBankSeed = aBankSeed;
  vBankOpacity = aBankOpacity;
  vBankWidth = aBankWidth;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`
const fragmentShader = /* glsl */ `
${glassParticleCaptureGLSL}
uniform float uTime;
uniform float uVisibility;
uniform float uLogoY;
uniform vec3 uFogColor;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vBankSeed;
varying float vBankOpacity;
varying float vBankWidth;
float fogHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float fogNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fogHash(i), fogHash(i + vec2(1,0)), f.x),
    mix(fogHash(i + vec2(0,1)), fogHash(i + vec2(1,1)), f.x), f.y);
}
void main() {
  if (glassCaptureRejectsParticle()) discard;
  if (vWorldPosition.y <= 0.0) discard;
  vec2 p = vec2(vUv.x * vBankWidth * .38 + uTime * (.025 + vBankSeed * .0007), vUv.y * 2.8);
  p += vec2(vBankSeed, vBankSeed * .73);
  float broad = fogNoise(p);
  float fine = fogNoise(p * 2.13 + vec2(-uTime * .019, 4.7));
  float curl = fogNoise(p * 4.27 + vec2(2.9, uTime * .012));
  float cloud = broad * .55 + fine * .30 + curl * .15;
  // Broad coverage shapes fuller banks instead of erasing their bodies.
  // Unequal lifted curls and slow clear reaches break their horizontal edges.
  float coverage = fogNoise(vec2(vUv.x * vBankWidth * .14 + vBankSeed - uTime * .006,
    vUv.y * .65 + vBankSeed * .31));
  float centre = .36 + (broad - .5) * .22;
  float thickness = .14 + fine * .12;
  float heightOffset = (vUv.y - centre) / thickness;
  float liftedOffset = (vUv.y - centre - .17) / (.075 + fine * .08);
  float bank = exp(-heightOffset * heightOffset)
    + .24 * exp(-liftedOffset * liftedOffset) * smoothstep(.46, .73, fine);
  float holes = smoothstep(.24, .69, cloud)
    * mix(.68, 1.10, smoothstep(.20, .70, coverage));
  float edges = smoothstep(0.0, .13, vUv.x) * (1.0 - smoothstep(.86, 1.0, vUv.x));
  edges *= smoothstep(0.0, .08, vUv.y) * (1.0 - smoothstep(.78, 1.0, vUv.y));
  float waterline = smoothstep(.008, .065, vWorldPosition.y);
  float alpha = bank * holes * edges * waterline * vBankOpacity * uVisibility;
  if (alpha < .002) discard;
  vec3 color = uFogColor * (.78 + cloud * .24 + coverage * .06);
  // A local hint of the LED diffuser catches the closest bank behind the
  // mark. Distant horizon fog receives no screen-wide exposure boost.
  vec3 lightDistance = (vWorldPosition - vec3(0.0, uLogoY, 0.0)) * vec3(.65, 2.2, .42);
  color += vec3(.035, .070, .095) * exp(-dot(lightDistance, lightDistance));
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/** Thin, irregular fog at actual near/mid/far world depths. The logo and
 * water depth-test against these banks; no screen-sized grey overlay. */
export function SurfaceFog({ sceneState, reducedMotion }: { sceneState: SceneState; reducedMotion: boolean }) {
  const camera = useThree(state => state.camera)
  useEffect(() => {
    const enabled = camera.layers.isEnabled(SURFACE_FOG_LAYER)
    camera.layers.enable(SURFACE_FOG_LAYER)
    return () => { if (!enabled) camera.layers.disable(SURFACE_FOG_LAYER) }
  }, [camera])
  const resources = useDisposable(() => {
    const banks = SURFACE_FOG_BANKS
    const geometry = new PlaneGeometry(1, 1)
    const opacity = new InstancedBufferAttribute(Float32Array.from(banks, bank => bank.opacity), 1)
    geometry.setAttribute('aBankSeed', new InstancedBufferAttribute(Float32Array.from(banks, bank => bank.seed), 1))
    geometry.setAttribute('aBankOpacity', opacity)
    geometry.setAttribute('aBankWidth', new InstancedBufferAttribute(Float32Array.from(banks, bank => bank.width), 1))
    const material = new ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthWrite: false, depthTest: true, side: DoubleSide,
      uniforms: {
        uGlassFrontDepth: { value: null }, uGlassCaptureResolution: { value: new Vector2(1, 1) }, uGlassCaptureActive: { value: 0 }, uGlassFallbackDepth: { value: 1 },
        uTime: { value: 0 }, uVisibility: { value: 0 }, uLogoY: { value: .54 }, uFogColor: { value: new Color().setRGB(.14, .18, .21) },
      },
    })
    const mesh = new InstancedMesh(geometry, material, banks.length)
    const matrix = new Matrix4(), scale = new Matrix4()
    banks.forEach((bank, index) => {
      matrix.makeRotationY(bank.yaw)
      scale.makeScale(bank.width, bank.height, 1)
      matrix.multiply(scale)
      // Every vertex begins at least .018 world units above the plane;
      // the fragment mask softly feathers the remaining water contact.
      matrix.setPosition(bank.x, bank.height * .5 + .018, bank.z)
      mesh.setMatrixAt(index, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
    mesh.renderOrder = 2
    mesh.layers.set(SURFACE_FOG_LAYER)
    mesh.layers.enable(GLASS_BACKGROUND_LAYER)
    mesh.onBeforeRender = (_renderer, _scene, camera) => {
      updateGlassParticleCapture(camera, material.uniforms)
      material.uniformsNeedUpdate = true
    }
    return { geometry, material, mesh }
  }, value => { value.geometry.dispose(); value.material.dispose(); value.mesh.dispose() }, [])

  useFrame(({ clock }) => {
    if (!resources) return
    const fog = sampleSurfaceFog(sceneState.underwater, sceneState.lightLevel, clock.elapsedTime, reducedMotion)
    resources.mesh.visible = fog.visible
    resources.material.uniforms.uVisibility.value = fog.gain
    resources.material.uniforms.uLogoY.value = sceneState.logoWorldY
    resources.material.uniforms.uTime.value = fog.time
  })
  if (!resources) return null
  return <primitive object={resources.mesh} />
}
