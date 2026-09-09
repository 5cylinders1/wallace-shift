import {
  BackSide,
  BoxGeometry,
  CubeCamera,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLCubeRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three'
import {
  environmentFragmentShader,
  environmentVertexShader,
} from './shaders/environmentShader'
import { ENVIRONMENT, STUDIO_SOURCES, type StudioSource } from './waterHeroConfig'

export interface StudioEnvironment {
  /**
   * The sky. What the camera sees and what the planar reflection pass
   * renders — deliberately missing the low sources that describe the
   * metal, so they cannot streak across the water.
   */
  background: Texture
  /** Roughness-prefiltered, every source included. Lights the metal. */
  environment: Texture
  dispose: () => void
}

function sourceBasis(source: StudioSource) {
  const forward = new Vector3(
    Math.cos(source.elevation) * Math.sin(source.azimuth),
    Math.sin(source.elevation),
    Math.cos(source.elevation) * Math.cos(source.azimuth),
  ).normalize()

  // Any source pointing straight up or down would make this degenerate;
  // none of the rig's elevations come close, and a source that did would
  // have no meaningful orientation anyway.
  const right = new Vector3(0, 1, 0).cross(forward).normalize()
  const up = forward.clone().cross(right).normalize()

  return { forward, right, up }
}

/** Renders one cube map from the given subset of the rig. */
function renderCube(
  renderer: WebGLRenderer,
  sources: StudioSource[],
  lighting = false,
): WebGLCubeRenderTarget {
  const bases = sources.map(sourceBasis)
  const base = lighting ? ENVIRONMENT.lightingBase : ENVIRONMENT

  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    defines: { SOURCE_COUNT: Math.max(sources.length, 1) },
    vertexShader: environmentVertexShader,
    fragmentShader: environmentFragmentShader,
    uniforms: {
      uZenith: { value: new Vector3(...base.zenith) },
      uHorizon: { value: new Vector3(...base.horizon) },
      uNadir: { value: new Vector3(...base.nadir) },
      uHorizonGlow: { value: new Vector3(...base.horizonGlow) },
      uHorizonFalloff: { value: base.horizonFalloff },
      uNightSky: { value: lighting ? 0 : 1 },
      uSourceForward: { value: bases.map((b) => b.forward) },
      uSourceRight: { value: bases.map((b) => b.right) },
      uSourceUp: { value: bases.map((b) => b.up) },
      uSourceColor: {
        value: sources.map((source) => new Vector3(...source.color)),
      },
      uSourceHalf: {
        value: sources.map(
          (source) => new Vector2(source.angularSize, source.angularSize * (source.aspectRatio ?? .45)),
        ),
      },
      uSourceIntensity: {
        value: sources.map(source => lighting ? source.lightingIntensity ?? source.intensity : source.intensity),
      },
    },
  })

  const geometry = new BoxGeometry(4, 4, 4)
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false

  const scene = new Scene()
  scene.add(mesh)

  const target = new WebGLCubeRenderTarget(ENVIRONMENT.cubeSize, {
    type: HalfFloatType,
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
  })

  const camera = new CubeCamera(0.1, 10, target)
  const previous = renderer.getRenderTarget()
  camera.update(renderer, scene)
  renderer.setRenderTarget(previous)

  geometry.dispose()
  material.dispose()
  scene.clear()

  return target
}

/**
 * Renders the studio into two cube maps, once.
 *
 * Two, not one, and for a reason that is the whole fix for the foreground
 * ribbons: the light that has to describe the black metal and the sky that
 * the water is allowed to reflect cannot be the same environment. See
 * `STUDIO_SOURCES` for the geometry behind that.
 *
 * The lighting cube is additionally prefiltered, because the polished
 * metal needs a soft source to arrive as a soft highlight rather than as a
 * hard-edged rectangle.
 */
export function createStudioEnvironment(
  renderer: WebGLRenderer,
): StudioEnvironment {
  const skyTarget = renderCube(
    renderer,
    STUDIO_SOURCES.filter((source) => source.inSky),
  )
  const lightingTarget = renderCube(renderer, STUDIO_SOURCES, true)

  const pmrem = new PMREMGenerator(renderer)
  const prefiltered = pmrem.fromCubemap(lightingTarget.texture)
  pmrem.dispose()

  return {
    background: skyTarget.texture,
    environment: prefiltered.texture,
    dispose() {
      skyTarget.dispose()
      lightingTarget.dispose()
      prefiltered.dispose()
    },
  }
}
