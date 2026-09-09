import { useFrame, useThree } from '@react-three/fiber'
import { BackSide, BoxGeometry, Mesh, PerspectiveCamera, ShaderMaterial, Vector2, Vector3 } from 'three'
import { useDisposable } from './useDisposable'
import { FOREGROUND_FOG_STEPS, layoutForegroundFog } from './foregroundFogField'
import { sampleDescent } from './sceneDirector'
import { sampleSurfaceFog, SURFACE_FOG_LAYER } from './surfaceFogField'
import type { QualityTier, SceneState, SurfaceFogDepth } from './waterHeroTypes'

const vertexShader = /* glsl */ `
varying vec3 vWorldPosition;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragmentShader = /* glsl */ `
#include <packing>
uniform sampler2D uOpaqueDepth;
uniform vec2 uResolution;
uniform vec2 uCameraRange;
uniform vec2 uLayout;
uniform vec3 uBoundsMin;
uniform vec3 uBoundsMax;
uniform float uTime;
uniform float uVisibility;
uniform float uLogoY;
varying vec3 vWorldPosition;

float mistHash(vec3 p) {
  p = fract(p * .1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float mistNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(mistHash(i), mistHash(i + vec3(1,0,0)), f.x),
        mix(mistHash(i + vec3(0,1,0)), mistHash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(mistHash(i + vec3(0,0,1)), mistHash(i + vec3(1,0,1)), f.x),
        mix(mistHash(i + vec3(0,1,1)), mistHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float pocket(vec2 p, vec2 center, vec2 radius) {
  vec2 q = (p - center) / radius;
  return exp(-dot(q, q) * 1.6);
}
float mistDensity(vec3 world) {
  vec3 p = vec3(world.x / uLayout.x, world.y, world.z - uLayout.y);
  if (p.y <= .006 || p.y >= .73) return 0.0;
  // Full, unequal pockets extend through the opening instead of collecting
  // only at its edges. Their slow drift lets mist pass softly across the base
  // while the different heights and clear reaches remain world anchored.
  float drift = sin(uTime * .045 + p.z * .7) * .16;
  vec2 pocketPosition = p.xz - vec2(drift, 0.0);
  float rear = pocket(pocketPosition, vec2(-1.85, 2.8), vec2(1.8, 1.8));
  float middle = pocket(pocketPosition, vec2(1.18, 4.95), vec2(1.75, 1.45));
  float nearLeft = pocket(pocketPosition, vec2(-.82, 6.75), vec2(.95, .90));
  float nearRight = pocket(pocketPosition, vec2(.78, 7.25), vec2(.80, .65));
  float envelope = rear * .75 + middle * .85 + nearLeft + nearRight * .80;
  if (envelope < .012) return 0.0;

  vec3 flow = p * vec3(1.25, 4.0, 1.05)
    + vec3(-uTime * .060, -uTime * .008, uTime * .025);
  float broad = mistNoise(flow);
  vec3 warped = flow * 2.03 + vec3((broad - .5) * 1.2, 5.7, -3.1);
  float detail = mistNoise(warped);
  float thread = mistNoise(warped * 1.97 + vec3(7.2, -uTime * .012, 3.4));
  float cloud = broad * .52 + detail * .33 + thread * .15;
  float height = .042 + rear * .12 + middle * .055 + nearRight * .060 + (broad - .5) * .095;
  float thickness = .038 + broad * .095 + rear * .055 + middle * .015;
  float low = (p.y - height) / thickness;
  float curl = (p.y - height - .11 - detail * .09) / (.060 + detail * .070);
  float body = exp(-low * low)
    + .38 * exp(-curl * curl) * smoothstep(.43, .70, detail);
  float erosion = smoothstep(.25, .70, cloud);
  float floorFade = smoothstep(.006, .038, p.y);
  float ceilingFade = 1.0 - smoothstep(.46, .73, p.y);
  float edge = smoothstep(uBoundsMin.z, uBoundsMin.z + .40, world.z)
    * (1.0 - smoothstep(uBoundsMax.z - .30, uBoundsMax.z, world.z));
  return envelope * body * erosion * floorFade * ceilingFade * edge;
}
void main() {
  vec3 ray = normalize(vWorldPosition - cameraPosition);
  // Signed epsilon keeps axis-aligned rays finite without changing direction.
  vec3 safeRay = mix(vec3(-1.0), vec3(1.0), step(vec3(0.0), ray)) * max(abs(ray), vec3(.00001));
  vec3 a = (uBoundsMin - cameraPosition) / safeRay;
  vec3 b = (uBoundsMax - cameraPosition) / safeRay;
  vec3 nearHit = min(a, b), farHit = max(a, b);
  float start = max(0.0, max(nearHit.x, max(nearHit.y, nearHit.z)));
  float end = min(farHit.x, min(farHit.y, farHit.z));

  // The water-free depth target supplies the logo/opaque intersections.
  // Water is clipped analytically because it is absent from that target.
  float depth = texture2D(uOpaqueDepth, gl_FragCoord.xy / uResolution).x;
  float viewZ = perspectiveDepthToViewZ(depth, uCameraRange.x, uCameraRange.y);
  vec3 viewRay = mat3(viewMatrix) * ray;
  end = min(end, viewZ / min(viewRay.z, -.00001));
  if (ray.y < -.00001) end = min(end, -cameraPosition.y / ray.y);
  if (end <= start) discard;

  float stepLength = (end - start) / float(FOG_STEPS);
  float transmittance = 1.0;
  vec3 radiance = vec3(0.0);
  for (int i = 0; i < FOG_STEPS; i++) {
    vec3 p = cameraPosition + ray * (start + (float(i) + .5) * stepLength);
    float density = mistDensity(p);
    float extinction = density * 1.55 * uVisibility;
    float opacity = 1.0 - exp(-extinction * stepLength);
    // Soft silver sky illumination, with denser curls retaining shadow.
    float lighting = .78 + .24 * exp(-density * 2.0) + .12 * smoothstep(.02, .26, p.y);
    vec3 color = vec3(.19, .225, .25) * lighting;
    vec3 lightDistance = (p - vec3(0.0, uLogoY, 0.0)) * vec3(.65, 2.2, .42);
    color += vec3(.035, .070, .095) * exp(-dot(lightDistance, lightDistance));
    radiance += transmittance * opacity * color;
    transmittance *= 1.0 - opacity;
    if (transmittance < .025) break;
  }
  float alpha = 1.0 - transmittance;
  if (alpha < .002) discard;
  // Straight-alpha output; divide integrated radiance exactly once.
  gl_FragColor = vec4(radiance / max(alpha, .0001), alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/** A bounded volume, integrated in depth rather than painted on flat slices. */
export function ForegroundMist({ sceneState, reducedMotion, tier, fogDepth }: {
  sceneState: SceneState
  reducedMotion: boolean
  tier: QualityTier
  fogDepth: SurfaceFogDepth
}) {
  const aspect = useThree(state => state.size.width / Math.max(1, state.size.height))
  const resources = useDisposable(() => {
    const layout = layoutForegroundFog(aspect, sampleDescent(0, aspect).camera[2])
    const min = new Vector3(...layout.min), max = new Vector3(...layout.max)
    const geometry = new BoxGeometry(1, 1, 1)
    const material = new ShaderMaterial({
      vertexShader, fragmentShader, defines: { FOG_STEPS: FOREGROUND_FOG_STEPS[tier] },
      side: BackSide, transparent: true, depthWrite: false, depthTest: false,
      uniforms: {
        uOpaqueDepth: { value: null }, uResolution: { value: new Vector2(1, 1) },
        uCameraRange: { value: new Vector2(.025, 400) },
        uLayout: { value: new Vector2(layout.widthScale, layout.depthOffset) },
        uBoundsMin: { value: min }, uBoundsMax: { value: max },
        uTime: { value: 0 }, uVisibility: { value: 0 }, uLogoY: { value: .54 },
      },
    })
    const mesh = new Mesh(geometry, material)
    mesh.position.copy(min).add(max).multiplyScalar(.5)
    mesh.scale.copy(max).sub(min)
    mesh.layers.set(SURFACE_FOG_LAYER)
    mesh.renderOrder = 3
    mesh.frustumCulled = false
    mesh.onBeforeRender = renderer => { renderer.getDrawingBufferSize(material.uniforms.uResolution.value) }
    return { geometry, material, mesh }
  }, value => { value.geometry.dispose(); value.material.dispose() }, [aspect, tier])
  useFrame(({ clock, camera }) => {
    if (!resources) return
    const fog = sampleSurfaceFog(sceneState.underwater, sceneState.lightLevel, clock.elapsedTime, reducedMotion)
    resources.mesh.visible = fog.visible && fogDepth.texture !== null
    resources.material.uniforms.uOpaqueDepth.value = fogDepth.texture
    resources.material.uniforms.uTime.value = fog.time
    resources.material.uniforms.uVisibility.value = fog.gain
    resources.material.uniforms.uLogoY.value = sceneState.logoWorldY
    const view = camera as PerspectiveCamera
    resources.material.uniforms.uCameraRange.value.set(view.near, view.far)
  })
  return resources ? <primitive object={resources.mesh} /> : null
}
