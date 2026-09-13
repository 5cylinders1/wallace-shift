import { Color, DataTexture, FloatType, LinearSRGBColorSpace, Matrix4, Mesh, NearestFilter, RGBAFormat,
  type BufferGeometry, type Material, type Texture } from 'three'
import { buildGlassGeometry } from '../experiments/water-hero/glassGeometry'
import { bindGlassScene, createLogoCrystalMaterial, logoGlassUniforms,
  updateGlassTurnSoftness } from '../experiments/water-hero/logoMaterial'
import { finite, journeySurfacePars, unit, type createJourneySurfaceUniforms } from './journeySkins'

/** An owned instance of the approved Glass look. The Make panel has finished
 * covering the stage before either half starts turning, and that panel is a
 * uniform DOM color. Supply its linear radiance as the glass's background,
 * then follow the Launch panel's boundary with its own transmitted color.
 * An empty transparent WebGL capture would incorrectly transmit black. */
export function createJourneySpinGlass(source: Material, sourceGeometry: BufferGeometry,
  surfaceUniforms: ReturnType<typeof createJourneySurfaceUniforms>, openingFrame = new Matrix4()) {
  const positions = sourceGeometry.getAttribute('position')
  let minDepth = Infinity, maxDepth = -Infinity
  for (let i = 0; i < positions.count; i++) {
    minDepth = Math.min(minDepth, positions.getY(i))
    maxDepth = Math.max(maxDepth, positions.getY(i))
  }
  const nativeThickness = Math.max(.001, maxDepth - minDepth)
  const geometry = buildGlassGeometry(sourceGeometry)
  const material = createLogoCrystalMaterial(source, nativeThickness, 'iridescent')
  material.name = 'HomepageJourney_SpinGlass'
  // Optical transmission still comes from the approved glass shader. Alpha
  // only fades this layer into the original journey skin after Launch.
  material.transparent = true
  material.depthWrite = true
  // Aim the existing soft face card at this straight-on stage camera. The
  // material stays the hero's Glass; only its photographic lighting angle
  // changes so the settled face remains visible against the teal panel.
  material.envMapRotation.set(.08, .07, 0)
  const backgroundColor = new Color('#18353e')
  const background = new DataTexture(new Float32Array([
    backgroundColor.r, backgroundColor.g, backgroundColor.b, 1,
  ]), 1, 1, RGBAFormat, FloatType)
  background.name = 'HomepageJourney_MakeGlassBackground'
  background.colorSpace = LinearSRGBColorSpace
  background.minFilter = background.magFilter = NearestFilter
  background.generateMipmaps = false
  background.needsUpdate = true
  bindGlassScene([material], background, 1, 1)

  const uniform = { value: 0 }
  const logoFrame = { value: openingFrame.clone() }
  const launchBackground = { value: new Color('#202131') }
  material.userData.journeySpinGlass = uniform
  const compile = material.onBeforeCompile
  const originalCacheKey = material.customProgramCacheKey()
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer)
    Object.assign(shader.uniforms, surfaceUniforms)
    shader.uniforms.uJourneySpinGlass = uniform
    shader.uniforms.uJourneyGlassFrame = logoFrame
    shader.uniforms.uJourneyLaunchBackground = launchBackground
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform mat4 uJourneyGlassFrame;
        varying vec2 vJourneyGlassPlane;
      `)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vJourneyGlassPlane = (uJourneyGlassFrame * vec4(transformed, 1.0)).xz;
      `)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${journeySurfacePars}
        uniform float uJourneySpinGlass;
        uniform vec3 uJourneyLaunchBackground;
        varying vec2 vJourneyGlassPlane;
      `)
      // The hero's perspective rays must become parallel in this stage's
      // orthographic camera. Its refraction cannot shrink with camera Z.
      .replaceAll('normalize(vViewPosition)', '(isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vViewPosition))')
      .replace('/ max(.20, vViewPosition.z)', '/ (isOrthographic ? 1.0 : max(.20, vViewPosition.z))')
      .replace('crystalBody = crystalBackground * crystalTransmission * (1.0 - crystalFresnel);', `
        crystalBackground = mix(crystalBackground, uJourneyLaunchBackground,
          journeyPassedEdge(uJourneyLaunchEdge));
        crystalBody = crystalBackground * crystalTransmission * (1.0 - crystalFresnel);
      `)
      .replace('#include <opaque_fragment>', `
        float journeySpinGlassMask = uJourneySpinGlass * journeyPassedEdge(uJourneyMakeEdge);
        if (journeySpinGlassMask <= .5) discard;
        // One broad studio reflection travels through the assembled mark.
        // Both halves share its coordinates, so no seam appears at the cut.
        // The existing Glass still supplies the optical body and spectrum.
        float journeyLaunch = journeyPassedEdge(uJourneyLaunchEdge);
        float journeyLaunchFace = 1.0 - smoothstep(.004, .045, vGlassBevel);
        float journeyLaunchShoulder = smoothstep(.005, .05, vGlassBevel)
          * (1.0 - smoothstep(.60, .95, vGlassBevel));
        vec3 journeyLaunchReflection = reflect(-crystalView, normal);
        float journeyLaunchFacing = .30
          + .70 * pow(abs(journeyLaunchReflection.z), .7);
        float journeyLaunchCoordinate = vJourneyGlassPlane.x
          + vJourneyGlassPlane.y * .35 + journeyLaunchReflection.x * .08;
        float journeyLaunchTravel = mix(-.82, .82, uJourneyShimmer);
        float journeyLaunchEnvelope = smoothstep(0.0, .14, uJourneyShimmer)
          * (1.0 - smoothstep(.82, 1.0, uJourneyShimmer));
        float journeyLaunchSweep = exp(-pow(
          (journeyLaunchCoordinate - journeyLaunchTravel) / .24, 2.0))
          * journeyLaunchEnvelope * journeyLaunchFacing;
        vec3 journeyLaunchSweepColor = mix(vec3(.085, .22, .28),
          vec3(.17, .115, .27), smoothstep(.25, .85, uJourneyShimmer));
        // A quiet, stationary softbox and angled edge light remain after
        // the sweep. There is no white undercoat, flash, or time-based cycle.
        float journeyLaunchRest = exp(-pow((journeyLaunchCoordinate + .23) / .33, 2.0))
          * journeyLaunchFacing;
        float journeyLaunchRestRight = exp(-pow((journeyLaunchCoordinate - .29) / .30, 2.0))
          * journeyLaunchFacing;
        float journeyLaunchEdgeDirection = .30 + .70 * max(0.0,
          dot(normal, normalize(vec3(-.50, .60, .80))));
        vec3 journeyLaunchLight = journeyLaunchSweepColor * journeyLaunchSweep
          * (.60 * journeyLaunchFace + .90 * journeyLaunchShoulder) * 1.5;
        journeyLaunchLight += (vec3(.10, .145, .19) * journeyLaunchRest
          + vec3(.070, .058, .115) * journeyLaunchRestRight) * journeyLaunchFace;
        journeyLaunchLight += vec3(.020, .065, .085) * journeyLaunchShoulder
          * journeyLaunchEdgeDirection;
        outgoingLight += journeyLaunchLight * journeyLaunch;
        #include <opaque_fragment>
      `)
  }
  material.customProgramCacheKey = () => `${originalCacheKey}-journey-launch-glass-v3`
  const mesh = new Mesh(geometry, material)
  mesh.name = 'HomepageJourney_SpinGlass'
  mesh.renderOrder = 1
  mesh.visible = false
  mesh.castShadow = mesh.receiveShadow = false
  let disposed = false

  return {
    mesh,
    uniform,
    update(turn: number, worldScale: number, visible: number, active: boolean) {
      const angle = Math.abs(finite(turn, 0))
      uniform.value = active && angle >= Math.PI / 2 ? 1 : 0
      mesh.visible = uniform.value > 0 && unit(visible) > 0
      material.opacity = unit(visible) * unit(surfaceUniforms.uJourneySurfaceAmount.value)
      // Optical transparency is already composed in the shader. Opaque
      // Glass must still occlude its concave walls and the other spinning
      // half; only the final underlay blend needs depth writes disabled.
      material.depthWrite = material.opacity >= .999
      // Measure the extrusion along its native axis, not a rotated world
      // bounding box, so absorption does not change as the half turns.
      logoGlassUniforms(material)!.uGlassWorldThickness.value =
        nativeThickness * Math.max(.001, Math.abs(finite(worldScale, 1)))
      // Both spin directions get the same softened grazing reflections.
      const wrapped = angle % (Math.PI * 2)
      const facingAngle = Math.min(wrapped, Math.PI * 2 - wrapped)
      updateGlassTurnSoftness([material], facingAngle)
    },
    setEnvironment(texture: Texture) {
      if (material.envMap === texture) return
      material.envMap = texture
      material.needsUpdate = true
    },
    /** The model graph owns material and rounded geometry disposal. This
     * uniform-held texture is not a material map, so release it separately. */
    dispose() {
      if (disposed) return
      disposed = true
      bindGlassScene([material], null)
      background.dispose()
    },
  }
}
