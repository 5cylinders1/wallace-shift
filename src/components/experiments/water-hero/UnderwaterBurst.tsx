import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three'
import { sampleDescent } from './sceneDirector'
import { CANOPY_COUNTS, createCanopySeeds, sampleCanopyLight } from './canopyField'
import { underwaterColorGLSL } from './shaders/underwaterColor'
import { SUBMERGED_PARTICLE_LAYER } from './waterRenderLayers'
import { useDisposable } from './useDisposable'
import { updatePointDrawScale } from './pointDrawScale'
import { particleDepthGLSL, updateParticleDepthPass } from './particleDepth'
import { glassParticleCaptureGLSL, updateGlassParticleCapture } from './glassSceneCapture'
import type { ProgressSource, QualityTier } from './waterHeroTypes'

const vertexShader = /* glsl */ `
attribute vec4 aDetail;
uniform float uTime;
uniform vec3 uColorOrigin;
uniform vec3 uPointer;
uniform float uPointScale;
uniform float uPixelRatio;
varying float vSoft;
varying float vAlpha;
varying float vWorldY;
varying float vWorldDiameter;
varying vec2 vWorldUp;
varying vec3 vTint;
varying float vPhase;
varying float vGrain;
varying float vDefocus;
${underwaterColorGLSL}
${particleDepthGLSL}
void main() {
  float phase = aDetail.y;
  vec3 p = position;
  // Neighboring particles share broad currents. Smaller independent eddies
  // keep their motion alive without revolving the whole cloud as one sheet.
  p.x += sin(p.y * 1.5 + p.z * .9 + uTime * .20) * .075
    + sin(phase + uTime * .36) * .024;
  p.y += sin(p.x * 1.2 + p.z * .8 - uTime * .17 + phase * .12) * .045;
  p.z += cos(position.x * 1.6 - position.y + uTime * .18) * .095;
  vec2 offset = p.xy - uPointer.xy;
  float distanceToPointer = length(offset);
  float push = .28 * (1.0 - smoothstep(0.0, .72, distanceToPointer))
    * uPointer.z / (1.0 + abs(p.z) * 1.3);
  p.x += offset.x / (distanceToPointer + .06) * push;
  p.y += offset.y / (distanceToPointer + .06) * push
    * (1.0 - smoothstep(-.40, -.08, p.y));
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  vSoft = aDetail.w;
  vec4 light = underwaterLight(p, uColorOrigin, uTime);
  float focusDistance = length(cameraPosition - uColorOrigin);
  float opticalDistance = particleOpticalDistance(length(view.xyz), focusDistance, uViewDepth);
  vDefocus = particleDefocus(-view.z, focusDistance, uViewDepth);
  float blurScale = 1.0 + vDefocus * .24;
  float pulseScale = mix(.90, 1.65, light.a);
  float nearAccent = smoothstep(.60, 2.8, p.z);
  vGrain = smoothstep(.024, .050, aDetail.x) * (1.0 - vSoft);
  float fineCap = mix(4.5, 8.0, nearAccent);
  float bodyCap = mix(7.0, 11.0, nearAccent);
  float grainCap = mix(fineCap, bodyCap, smoothstep(.025, .043, aDetail.x));
  grainCap = mix(grainCap, 16.0, smoothstep(.045, .065, aDetail.x));
  float pointDiameter = clamp(aDetail.x * pulseScale * blurScale * uPointScale / max(.1, -view.z), .6 * uPixelRatio,
    mix(grainCap * mix(1.0, 1.30, light.a) * blurScale, 80.0, vSoft) * uPixelRatio);
  gl_PointSize = max(1.0, pointDiameter);
  vWorldDiameter = gl_PointSize * max(.1, -view.z) / uPointScale;
  vWorldY = p.y;
  vWorldUp = vec2(viewMatrix[1][0], -viewMatrix[1][1]);
  vTint = light.rgb;
  vTint = mix(vTint, vec3(.82, .94, 1.0), pow(aDetail.z, 24.0) * .10);
  vPhase = phase + uTime * .12;
  float breath = .82 + .18 * sin(position.x * 1.2 + position.z * .8 + uTime * .48);
  // Distant layers recede between crests; arriving light briefly clarifies
  // them. Near grains spread their existing energy rather than adding glow.
  float transmission = particleTransmittance(opticalDistance, uViewDepth);
  transmission = mix(transmission, sqrt(transmission), light.a * .30 * uViewDepth);
  vAlpha = mix(.34 + aDetail.z * .36, .070 + aDetail.z * .040, vSoft)
    * breath * transmission / (blurScale * blurScale) * min(1.0, pointDiameter * pointDiameter);
}
`
const fragmentShader = /* glsl */ `
${glassParticleCaptureGLSL}
uniform float uLight;
uniform float uReflectionRadiance;
varying float vSoft;
varying float vAlpha;
varying float vWorldY;
varying float vWorldDiameter;
varying vec2 vWorldUp;
varying vec3 vTint;
varying float vPhase;
varying float vGrain;
varying float vDefocus;
void main() {
  if (glassCaptureRejectsParticle()) discard;
  float worldY = vWorldY + dot(gl_PointCoord - .5, vWorldUp) * vWorldDiameter;
  if (worldY >= -.025) discard;
  vec2 q = (gl_PointCoord - .5) * 2.0;
  float r = length(q);
  float shape = 1.0 - smoothstep(.08, 1.0, r);
  if (vSoft > .5) {
    // A sparse veil of small broken wisps softens the bright particulate
    // mass, without a single smooth oval or a ray-march slab boundary.
    float thread = .5 + .5 * sin(q.y * 9.0 + sin(q.x * 6.0 + vPhase) * 2.2);
    float ragged = sin(q.x * 10.0 + sin(q.y * 8.0 + vPhase)) * .09;
    shape = exp(-dot(q * vec2(.90, 1.45), q * vec2(.90, 1.45)) * 2.0)
      * (.32 + thread * .68) * (1.0 - smoothstep(.65, 1.0, r + ragged));
  }
  float grainShape = shape * shape;
  if (vSoft < .5) {
    float disc = 1.0 - smoothstep(.55, .98, r);
    float rim = exp(-pow((r - .66) * 9.0, 2.0)) * .28;
    float cap = exp(-dot(q - vec2(-.25, .28), q - vec2(-.25, .28)) * 24.0) * .55;
    grainShape = mix(grainShape, disc * .38 + rim + cap, vGrain);
    float softGrain = exp(-dot(q, q) * 3.6) * (1.0 - smoothstep(.72, 1.0, r));
    grainShape = mix(grainShape, softGrain, vDefocus * .82);
  } else grainShape = shape;
  float alpha = grainShape * vAlpha * uLight
    * (1.0 - smoothstep(-.13, -.025, worldY));
  if (alpha < .003) discard;
  // Keep the saturated fronts intact instead of bleaching each overlapping
  // grain through the scene's high-exposure metal tone mapping.
  vec3 coloredLight = vTint / (1.0 + max(vTint.r, max(vTint.g, vTint.b)) * .34);
  gl_FragColor = vec4(coloredLight * mix(1.15, .90, vSoft) * uReflectionRadiance, alpha);
  #include <colorspace_fragment>
}
`

/** Fixed, tapered particle formations at staggered depths around the camera path.
 * GPU motion avoids a per-frame CPU loop over the fine particle population. */
export function UnderwaterBurst({ progress, tier, reducedMotion, pointer }: {
  progress: ProgressSource; tier: QualityTier; reducedMotion: boolean; pointer: Vector3
}) {
  const points = useRef<Points>(null)
  const size = useThree(state => state.size)
  const viewport = useMemo(() => new Vector4(), [])
  const aspect = size.width / Math.max(1, size.height)
  const resources = useDisposable(() => {
    const entry = sampleDescent(.475, aspect).camera
    const desktopEntry = sampleDescent(.475).camera
    const depth = Math.max(0, sampleDescent(.54, aspect).camera[2] - entry[2]
      - (sampleDescent(.54).camera[2] - desktopEntry[2]))
    const drift = sampleDescent(.54, aspect).camera[0] - entry[0]
      - (sampleDescent(.54).camera[0] - desktopEntry[0])
    const seeds = createCanopySeeds(CANOPY_COUNTS[tier], entry[0] - desktopEntry[0], entry[2] - desktopEntry[2], depth, drift)
    const geometry = new BufferGeometry()
    const positions = new Float32Array(seeds.length * 3)
    const detail = new Float32Array(seeds.length * 4)
    seeds.forEach((seed, i) => {
      positions.set([seed.x, seed.y, seed.z], i * 3)
      detail.set([seed.size, seed.phase, seed.light, seed.soft], i * 4)
    })
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aDetail', new BufferAttribute(detail, 4))
    const material = new ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false,
      uniforms: {
        uGlassFrontDepth: { value: null }, uGlassCaptureResolution: { value: new Vector2(1, 1) }, uGlassCaptureActive: { value: 0 }, uGlassFallbackDepth: { value: 1 },
        uLight: { value: 0 }, uTime: { value: 0 }, uColorOrigin: { value: new Vector3() }, uPointer: { value: pointer }, uPointScale: { value: 1 }, uPixelRatio: { value: 1 }, uViewDepth: { value: 1 }, uReflectionRadiance: { value: 1 },
      },
    })
    return { geometry, material }
  }, value => { value.geometry.dispose(); value.material.dispose() }, [tier, pointer, aspect])
  useFrame(({ clock }) => {
    if (!resources || !points.current) return
    const pose = sampleDescent(progress.current)
    const light = sampleCanopyLight(pose.progress)
    points.current.visible = !reducedMotion && light > .001
    if (!points.current.visible) return
    const u = resources.material.uniforms
    u.uLight.value = light
    u.uTime.value = clock.elapsedTime
    u.uColorOrigin.value.set(0, pose.logoY + .35, 0)
  })
  if (!resources || reducedMotion) return null
  return <points ref={points} geometry={resources.geometry} material={resources.material}
    layers-mask={1 << SUBMERGED_PARTICLE_LAYER} frustumCulled={false}
    onBeforeRender={(renderer, _scene, camera) => {
      updatePointDrawScale(renderer, camera, resources.material.uniforms, viewport, size.height)
      updateParticleDepthPass(camera, resources.material.uniforms)
      updateGlassParticleCapture(camera, resources.material.uniforms)
      resources.material.uniforms.uReflectionRadiance.value = camera.userData.particleReflection ? 1.6 : 1
      resources.material.uniformsNeedUpdate = true
    }} />
}
