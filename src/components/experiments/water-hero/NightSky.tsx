import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, BoxGeometry, Mesh, ShaderMaterial, Vector3, Vector4 } from 'three'
import { milkyWayGLSL, nightFogGLSL, nightStarGLSL } from './shaders/nightSky'
import { shootingStarGLSL } from './shaders/shootingStar'
import { advanceShootingStar, createShootingStarState, resetShootingStar } from './shootingStar'
import { sampleNightSky } from './nightSkyState'
import { sampleSurfaceFog } from './surfaceFogField'
import { useDisposable } from './useDisposable'
import type { StudioEnvironment } from './studioEnvironment'
import type { SceneState } from './waterHeroTypes'

const vertexShader = /* glsl */ `
varying vec3 vSkyDirection;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vSkyDirection = world.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`
const fragmentShader = /* glsl */ `
uniform samplerCube uSky;
uniform float uGalaxyLevel;
uniform float uSkyLevel;
uniform float uStarLevel;
uniform float uFogLevel;
uniform float uFogTime;
uniform float uUnderwater;
uniform float uDepthLevel;
varying vec3 vSkyDirection;
${milkyWayGLSL}
${nightStarGLSL}
${nightFogGLSL}
${shootingStarGLSL}
void main() {
  vec3 direction = normalize(vSkyDirection);
  vec3 color = textureCube(uSky, direction).rgb * uSkyLevel
    + milkyWay(direction) * uGalaxyLevel
    + nightStars(direction) * uStarLevel
    + nightFog(direction, uFogTime) * uFogLevel
    + shootingStar(direction);
  // Dim directional blue-green water haze gives distant matter separation
  // from the void. It fades with the authored descent light, before black.
  vec2 leftOffset = vec2((direction.x + .57) / .52, (direction.y + .23) / .65);
  vec2 rightOffset = vec2((direction.x - .66) / .40, (direction.y - .14) / .75);
  float leftWash = exp(-dot(leftOffset, leftOffset));
  float rightWash = exp(-dot(rightOffset, rightOffset));
  vec3 deepHaze = vec3(.0005, .0012, .0015)
    + vec3(.0015, .0050, .0068) * leftWash
    + vec3(.0008, .0035, .0025) * rightWash;
  color += deepHaze * uUnderwater * uDepthLevel;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/** Distant Earth-view sky follows camera translation, retaining its angular
 * position. Layer0 excludes fine stars from the logo's reflection pass. */
export function NightSky({ environment, sceneState, reducedMotion }: { environment: StudioEnvironment; sceneState: SceneState; reducedMotion: boolean }) {
  const mesh = useRef<Mesh>(null)
  const resources = useDisposable(() => ({
    geometry: new BoxGeometry(2, 2, 2),
    meteor: createShootingStarState(Math.floor(Math.random() * 4294967296)),
    material: new ShaderMaterial({
      vertexShader, fragmentShader, side: BackSide, depthWrite: false,
      uniforms: {
        uSky: { value: environment.background }, uSkyLevel: { value: 0 }, uStarLevel: { value: 0 },
        uGalaxyLevel: { value: 0 }, uFogLevel: { value: 0 }, uFogTime: { value: 0 },
        uUnderwater: { value: 0 }, uDepthLevel: { value: 0 },
        uMeteorStart: { value: new Vector3() }, uMeteorTangent: { value: new Vector3() },
        uMeteor: { value: new Vector4() },
      },
    }),
  }), value => { value.geometry.dispose(); value.material.dispose() }, [environment])
  useEffect(() => {
    if (!resources) return
    const reset = () => {
      if (document.visibilityState === 'hidden') resetShootingStar(resources.meteor)
    }
    document.addEventListener('visibilitychange', reset)
    return () => document.removeEventListener('visibilitychange', reset)
  }, [resources])
  useFrame(({ camera, scene, clock, size }) => {
    if (!mesh.current || !resources) return
    mesh.current.position.copy(camera.position)
    const sky = sampleNightSky(sceneState.underwater, sceneState.lightLevel, clock.elapsedTime, reducedMotion)
    const surfaceFog = sampleSurfaceFog(sceneState.underwater, sceneState.lightLevel, clock.elapsedTime, reducedMotion)
    mesh.current.visible = sky.visible || (sceneState.underwater > 0 && sceneState.lightLevel > .001)
    const elevation = -camera.matrixWorld.elements[9]
    const lookUp = Math.max(0, Math.min(1, (elevation - .10) / .32))
    resources.material.uniforms.uGalaxyLevel.value = (.26 + lookUp * .42)
      * (1 - sceneState.underwater) ** 2 * sceneState.lightLevel
    resources.material.uniforms.uSkyLevel.value = scene.backgroundIntensity
    resources.material.uniforms.uStarLevel.value = sky.stars
    // Real world-space banks now supply most of the depth. This distant
    // trace only joins them to the horizon and vanishes before submersion.
    resources.material.uniforms.uFogLevel.value = surfaceFog.gain * scene.backgroundIntensity * .4
    resources.material.uniforms.uFogTime.value = sky.fogTime
    resources.material.uniforms.uUnderwater.value = sceneState.underwater
    resources.material.uniforms.uDepthLevel.value = sceneState.lightLevel
    const meteor = resources.meteor
    advanceShootingStar(meteor, clock.elapsedTime,
      !reducedMotion && document.visibilityState !== 'hidden' && sky.visible,
      size.width / Math.max(1, size.height))
    resources.material.uniforms.uMeteorStart.value.fromArray(meteor.start)
    resources.material.uniforms.uMeteorTangent.value.fromArray(meteor.tangent)
    resources.material.uniforms.uMeteor.value.set(meteor.progress, meteor.travel, meteor.tail,
      meteor.gain * (1 - sceneState.underwater) ** 2 * sceneState.lightLevel)
  })
  if (!resources) return null
  return <mesh ref={mesh} geometry={resources.geometry} material={resources.material} scale={90} renderOrder={-1000} frustumCulled={false} />
}
