import { Box3, Color, Group, LineSegments, Matrix4, Mesh, Texture, Vector3,
  type Material, type MeshPhysicalMaterial, type Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createLogoChromeMaterial, logoChromeUniforms } from '../experiments/water-hero/logoChrome'
import { createOpeningFrame } from '../experiments/water-hero/logoOpening'
import { NODE_NAMES, WS_LOGO_URL } from '../experiments/water-hero/waterHeroConfig'
import { createJourneyGather } from './journeyGather'
import { createJourneyPlates } from './journeyPlates'
import { createJourneySpinGlass } from './journeySpinGlass'
import { createJourneyBlueprintEdges, createJourneySurfaceUniforms, finite,
  journeyBlueprintOutput, journeySurfaceComposite, journeySurfacePars, unit,
  updateJourneySurfaceUniforms, type JourneySurfaceReveal } from './journeySkins'

export type { JourneySurfaceReveal } from './journeySkins'

/** What the reader has committed to in the quiz, and how to size its motes.
 * `presence` is how much of the quiz chapter currently owns the mark. */
export interface JourneyCharge {
  power: number
  surge: number
  presence: number
  pixelRatio: number
}

const DARK_FACE = new Color().setRGB(.065, .081, .10)
const SERVICES_FACE = new Color('#dce5e8')
const CRYSTAL_FACE = new Color().setRGB(.40, .52, .60)
const COOL_LIGHT = new Color().setRGB(.64, .84, 1)

function disposeGraph(root: Object3D) {
  const geometries = new Set<Mesh['geometry']>()
  const materials = new Set<Material>()
  const textures = new Set<Texture>()
  root.traverse(child => {
    if (!(child instanceof Mesh) && !(child instanceof LineSegments)) return
    geometries.add(child.geometry)
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value)
    }
  })
  geometries.forEach(geometry => geometry.dispose())
  materials.forEach(material => material.dispose())
  textures.forEach(texture => texture.dispose())
}

/** Private parse, not the experiment's cached graph. Authored geometry,
 * normals and transforms are retained; presentation pivots wrap each part. */
export function prepareJourneyModel(scene: Object3D) {
  scene.updateMatrixWorld(true)
  const authoredRoot = scene.getObjectByName(NODE_NAMES.root)
  const parts = [scene.getObjectByName(NODE_NAMES.left), scene.getObjectByName(NODE_NAMES.right)]
  if (!authoredRoot || parts.some(part => !part || !part.parent)) {
    throw new Error('The journey logo requires WS_Logo, WS_Left and WS_Right.')
  }
  for (const part of parts) {
    let ancestor = part!.parent
    while (ancestor && ancestor !== authoredRoot) ancestor = ancestor.parent
    if (!ancestor) throw new Error('The journey logo halves must remain beneath WS_Logo.')
  }
  const bounds = new Box3().setFromObject(scene)
  const size = bounds.getSize(new Vector3())
  const center = bounds.getCenter(new Vector3())
  if (size.x <= 0 || !Number.isFinite(size.x)) throw new Error('The journey logo has no measurable width.')
  const scale = 1 / size.x
  const materials: MeshPhysicalMaterial[] = []
  const surfaceUniforms = createJourneySurfaceUniforms()
  const plates = createJourneyPlates(surfaceUniforms)
  const blueprintEdges: ReturnType<typeof createJourneyBlueprintEdges>[] = []
  const spinGlassParts: { partIndex: number; glass: ReturnType<typeof createJourneySpinGlass> }[] = []
  const originals = new Set<Material>()
  const authoredMeshes: Mesh[] = []
  scene.traverse(child => {
    if (child instanceof Mesh) authoredMeshes.push(child)
  })
  // Build from a fixed list: screen-space drafting lines are themselves
  // meshes and must not be traversed as additional authored logo halves.
  const prepareMesh = (child: Mesh) => {
    const frame = createOpeningFrame(child, authoredRoot)
    const source = Array.isArray(child.material) ? child.material : [child.material]
    const partIndex = parts.findIndex(part => {
      for (let node: Object3D | null = child; node; node = node.parent) if (node === part) return true
      return false
    })
    if (partIndex < 0) throw new Error('Journey surface geometry must belong to one of the two logo halves.')
    const glass = createJourneySpinGlass(source[0], child.geometry, surfaceUniforms, frame)
    spinGlassParts.push({ partIndex, glass })
    const owned = source.map(material => {
      originals.add(material)
      const next = createLogoChromeMaterial(material, frame, child.geometry)
      next.name = 'HomepageJourney_ChromeCrystal'
      next.transparent = true
      next.roughness = .24
      next.clearcoat = .55
      next.clearcoatRoughness = .25
      next.iridescence = .05
      next.iridescenceIOR = 1.3
      next.iridescenceThicknessRange = [170, 300]
      next.envMapIntensity = .5
      logoChromeUniforms(next)!.uChromeSeamColor.value.copy(COOL_LIGHT)
      const crystal = { value: 0 }
      const servicesSurface = { value: 0 }
      next.userData.journeyCrystal = crystal
      next.userData.journeyServicesSurface = servicesSurface
      next.userData.journeySurface = surfaceUniforms
      next.userData.journeySpinGlass = glass.uniform
      const compile = next.onBeforeCompile
      next.onBeforeCompile = (shader, renderer) => {
        compile(shader, renderer)
        shader.uniforms.uJourneyCrystal = crystal
        shader.uniforms.uJourneyServicesSurface = servicesSurface
        shader.uniforms.uJourneySpinGlass = glass.uniform
        Object.assign(shader.uniforms, surfaceUniforms)
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vJourneyAxis;')
          .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvJourneyAxis = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));')
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\nuniform float uJourneyCrystal;\nuniform float uJourneyServicesSurface;\nuniform float uJourneySpinGlass;\nvarying vec3 vJourneyAxis;\n${journeySurfacePars}`)
          .replace('#include <opaque_fragment>', /* glsl */ `
            // A second dielectric interface gives the crystal volume. Both
            // interfaces use the same soft photographic environment.
            vec3 journeyRear = vec3(0.0);
            #if defined(USE_ENVMAP) && defined(ENVMAP_TYPE_CUBE_UV)
              vec3 axis = normalize(vJourneyAxis);
              axis *= dot(axis, normal) < 0.0 ? -1.0 : 1.0;
              vec3 inside = refract(-normalize(vViewPosition), normal, 1.0 / 1.48);
              vec3 rearNormal = normalize(2.0 * dot(normal, axis) * axis - normal);
              journeyRear = getIBLRadiance(-inside, rearNormal, max(.25, roughness));
            #endif
            float journeyEdge = pow(1.0 - chromeNoV, 2.0);
            vec3 journeyCrystal = totalSpecular + journeyRear * vec3(.13, .18, .20)
              * (.30 + journeyEdge * .70) + chromeStudio * .18
              + vec3(.014, .026, .037) * (.40 + chromeFace * .60) + chromeSeam;
            outgoingLight = mix(outgoingLight, journeyCrystal, uJourneyCrystal);
            // Pale silver separates the services mark from its dark heading
            // band. Broad reflected light gently describes the face, with
            // a darker edge plane and bounded highlights instead of white rims.
            float journeyServicesRadiance = dot(max(outgoingLight, vec3(0.0)),
              vec3(.2126, .7152, .0722));
            float journeyServicesHighlight = .18 *
              (1.0 - exp(-journeyServicesRadiance * 1.8));
            vec3 journeyServicesBody = vec3(.64, .70, .73) * mix(.55, 1.0, chromeFace)
              + vec3(.96, .99, 1.0) * journeyServicesHighlight
              + chromeCard * chromeFace * .16;
            outgoingLight = mix(outgoingLight, journeyServicesBody, uJourneyServicesSurface);
            ${journeySurfaceComposite}
            #include <opaque_fragment>
          `)
          .replace('#include <colorspace_fragment>', `#include <colorspace_fragment>\n${journeyBlueprintOutput}
            // One material owns each pixel: the original skins yield only
            // from Make through Launch once this half becomes real Glass.
            float journeyGlassOwnership = uJourneySpinGlass * journeyPassedEdge(uJourneyMakeEdge);
            // On exit, expose the original surface under a smoothly fading
            // Glass layer instead of changing the whole mark at 50% progress.
            if (journeyGlassOwnership > .5 && uJourneySurfaceAmount >= .999) discard;
          `)
      }
      next.customProgramCacheKey = () => 'homepage-journey-panel-skins-v8'
      materials.push(next)
      return next
    })
    child.material = Array.isArray(child.material) ? owned : owned[0]
    child.castShadow = child.receiveShadow = false
    const edges = createJourneyBlueprintEdges(child.geometry, surfaceUniforms)
    child.add(edges)
    child.add(glass.mesh)
    plates.attach(child, child.geometry)
    blueprintEdges.push(edges)
  }
  try {
    authoredMeshes.forEach(prepareMesh)
  } catch (error) {
    // Uniform-held backdrop textures are outside disposeGraph's material
    // maps. Release even a half that was prepared before a later half failed.
    plates.dispose()
    spinGlassParts.forEach(({ glass }) => {
      glass.dispose()
      glass.mesh.removeFromParent()
      glass.mesh.geometry.dispose()
      glass.mesh.material.dispose()
    })
    originals.forEach(material => material.dispose())
    throw error
  }
  originals.forEach(material => material.dispose())
  // The centre is mutated below when the orientation group is placed, and the
  // pivots restructure the graph, so capture both before either happens.
  const markCenter = center.clone()
  let gather: ReturnType<typeof createJourneyGather>
  try {
    gather = createJourneyGather(authoredMeshes, markCenter, size.x * .5)
  } catch (error) {
    plates.dispose()
    spinGlassParts.forEach(({ glass }) => glass.dispose())
    throw error
  }

  const pivots = parts.map(part => {
    const parent = part!.parent!
    const midpoint = new Box3().setFromObject(part!).getCenter(new Vector3())
    parent.worldToLocal(midpoint)
    const pivot = new Group()
    pivot.name = `${part!.name}_JourneyPivot`
    pivot.position.copy(midpoint)
    parent.add(pivot)
    pivot.add(part!)
    part!.position.sub(midpoint)
    return { pivot, position: midpoint.clone() }
  })
  const orientation = new Group()
  orientation.rotation.x = Math.PI / 2
  orientation.scale.setScalar(scale)
  orientation.position.copy(center.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2)).multiplyScalar(-scale))
  orientation.add(scene)
  orientation.add(gather.points)
  const rig = new Group()
  rig.add(orientation)
  let disposed = false

  return {
    rig,
    height: size.z * scale,
    materials,
    setEnvironment(texture: Texture) {
      for (const material of materials) {
        material.envMap = texture
        material.needsUpdate = true
      }
      spinGlassParts.forEach(({ glass }) => glass.setEnvironment(texture))
    },
    update(finish: number, charge: number, split: number, partTurn: number, visible: number, time: number, servicesSurface = 0,
      reveal?: JourneySurfaceReveal, quizCharge?: JourneyCharge) {
      const services = Number.isFinite(servicesSurface) ? Math.max(0, Math.min(1, servicesSurface)) : 0
      // Already gated by the quiz chapter upstream, so these lifts are zero
      // everywhere the panels own the surface.
      const power = unit(quizCharge?.power)
      gather.update({
        visible: visible * unit(quizCharge?.presence),
        power, surge: unit(quizCharge?.surge), time,
        pixelRatio: finite(quizCharge?.pixelRatio, 1),
      })
      const surfaceAmount = unit(reveal?.amount)
      updateJourneySurfaceUniforms(surfaceUniforms, reveal)
      plates.update(unit(reveal?.register), visible,
        finite(reveal?.markWidth, 0), finite(reveal?.aspect, 1))
      blueprintEdges.forEach(edges => {
        edges.visible = surfaceAmount > 0 && visible > 0
        edges.material.opacity = visible
      })
      pivots.forEach(({ pivot, position }, index) => {
        const direction = index === 0 ? -1 : 1
        pivot.position.copy(position)
        pivot.position.x += direction * split / (2 * scale)
        // Native Z becomes upright -Y after the shared quarter turn.
        const originalTurn = -direction * partTurn
        const revealTurn = index === 0 ? reveal?.leftTurn : reveal?.rightTurn
        const surfaceTurn = -finite(revealTurn, -originalTurn)
        // The process can finish at -2pi where the legacy pose is +2pi.
        // Those are the same assembly, so fade toward its nearest equivalent
        // angle instead of adding two accidental turns during the quiz.
        const nearestOriginal = surfaceTurn + Math.atan2(
          Math.sin(originalTurn - surfaceTurn), Math.cos(originalTurn - surfaceTurn),
        )
        pivot.rotation.z = surfaceAmount === 0 ? originalTurn
          : surfaceTurn * surfaceAmount + nearestOriginal * (1 - surfaceAmount)
        pivot.scale.setScalar(1 + (Math.max(.01, finite(reveal?.partScale, 1)) - 1) * surfaceAmount)
      })
      spinGlassParts.forEach(({ partIndex, glass }) => {
        const turn = partIndex === 0 ? reveal?.leftTurn : reveal?.rightTurn
        glass.update(finite(turn, 0), rig.scale.x * scale * pivots[partIndex].pivot.scale.x,
          visible, surfaceAmount > 0 && finite(reveal?.makeEdge, 2) < 1)
      })
      for (const material of materials) {
        // The late Glass pass can blend over this underlay without its
        // original, slightly different bevel depth occluding the fade.
        material.depthWrite = !(material.userData.journeySpinGlass.value > 0
          && surfaceAmount > 0 && surfaceAmount < .999)
        material.color.copy(DARK_FACE).lerp(CRYSTAL_FACE, finish).lerp(SERVICES_FACE, services)
        material.metalness = (.94 - finish * .80) * (1 - services) + .97 * services
        material.roughness = (.24 - finish * .035) * (1 - services) + .36 * services
        material.clearcoat = (.55 + finish * .35) * (1 - services) + .08 * services
        material.clearcoatRoughness = .25 + services * .13 - .14 * power
        material.envMapIntensity = .5 - services * .18 + .55 * power
        material.iridescence = (.05 + finish * .13 + .34 * power) * (1 - services)
        material.opacity = visible * (1 - finish * .08)
        // A softly luminous crystal interior; no white LED plate or texture.
        // The answered quiz brings that interior the rest of the way up, and
        // each answer drives one bright pulse through it.
        material.emissive.setRGB(.045, .074, .095)
          .multiplyScalar(finish * (1 + 2.6 * power + 1.4 * unit(quizCharge?.surge)))
        material.userData.journeyCrystal.value = finish
        material.userData.journeyServicesSurface.value = services
        const uniforms = logoChromeUniforms(material)!
        uniforms.uChromeTime.value = time
        uniforms.uChromeSeamIntensity.value = (.05 + charge * 1.4) * (1 - services)
        uniforms.uChromeUnderwater.value = 0
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      // The PMREM environment is owned by the renderer, not this graph.
      gather.dispose()
      plates.dispose()
      materials.forEach(material => { material.envMap = null })
      spinGlassParts.forEach(({ glass }) => { glass.mesh.material.envMap = null; glass.dispose() })
      disposeGraph(scene)
      rig.clear()
    },
  }
}

export type JourneyModel = ReturnType<typeof prepareJourneyModel>

export async function loadJourneyModel(signal: AbortSignal): Promise<JourneyModel> {
  signal.throwIfAborted()
  const response = await fetch(WS_LOGO_URL, { signal })
  if (!response.ok) throw new Error(`Could not load journey logo (${response.status}).`)
  const buffer = await response.arrayBuffer()
  signal.throwIfAborted()
  const gltf = await new GLTFLoader().parseAsync(buffer, '/models/')
  if (signal.aborted) {
    disposeGraph(gltf.scene)
    signal.throwIfAborted()
  }
  try {
    return prepareJourneyModel(gltf.scene)
  } catch (error) {
    disposeGraph(gltf.scene)
    throw error
  }
}
