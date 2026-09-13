import { Color, Mesh, ShaderMaterial, Vector2, type BufferGeometry } from 'three'
import { journeySurfacePars, unit, type createJourneySurfaceUniforms } from './journeySkins'

/** Misregistration is measured in CSS pixels, then converted to normalized
 * device coordinates so a plate slips the same visible distance on every
 * screen. Each direction is a unit vector scaled by the mark's own width. */
interface PlateDefinition {
  tint: string
  direction: [number, number]
  slip: number
  weight: number
}

// Three off-register plates. Cyan and violet slip opposite one another so the
// mark reads as a colour separation rather than a drop shadow; the pale plate
// travels almost vertically and closes last, carrying the final alignment.
const PLATES: PlateDefinition[] = [
  { tint: '#2ba3bd', direction: [-.92, .40], slip: .175, weight: .70 },
  { tint: '#6a4fb8', direction: [.86, -.51], slip: .150, weight: .64 },
  { tint: '#93a8b4', direction: [.16, .99], slip: .096, weight: .40 },
]

// The Make panel's own background. Plates lay ink over this exact surface.
const MAKE_PANEL = '#18353e'

type SurfaceUniforms = ReturnType<typeof createJourneySurfaceUniforms>

/** One additive colour separation of the authored halves. The plates share
 * each half's existing geometry and its real pivot, so they inherit the
 * independent turns exactly; only a clip-space slip separates them. The
 * whole set belongs to the Make panel and collapses as register reaches 1. */
export function createJourneyPlates(surfaceUniforms: SurfaceUniforms) {
  const shared = {
    uPlateRegister: { value: 0 },
    uPlateVisible: { value: 0 },
    uPlateSlip: { value: new Vector2(1, 1) },
  }
  const materials = PLATES.map(plate => {
    const material = new ShaderMaterial({
      name: 'HomepageJourney_RegisterPlate',
      transparent: true,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        ...surfaceUniforms,
        ...shared,
        uPlateTint: { value: new Color(plate.tint) },
        uPlatePanel: { value: new Color(MAKE_PANEL) },
        uPlateDirection: { value: new Vector2(...plate.direction) },
        uPlateDistance: { value: plate.slip },
        uPlateWeight: { value: plate.weight },
      },
      vertexShader: /* glsl */ `
        uniform vec2 uPlateDirection;
        uniform vec2 uPlateSlip;
        uniform float uPlateDistance;
        uniform float uPlateRegister;
        varying vec3 vPlateNormal;
        void main() {
          vPlateNormal = normalize(normalMatrix * normal);
          vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          // The slip is a screen offset, not a model transform: a plate keeps
          // the half's own silhouette while sitting off its register mark.
          clip.xy += uPlateDirection * uPlateSlip * uPlateDistance
            * (1.0 - uPlateRegister) * clip.w;
          gl_Position = clip;
        }
      `,
      fragmentShader: /* glsl */ `
        ${journeySurfacePars}
        uniform vec3 uPlateTint;
        uniform vec3 uPlatePanel;
        uniform float uPlateWeight;
        uniform float uPlateRegister;
        uniform float uPlateVisible;
        varying vec3 vPlateNormal;
        void main() {
          float panel = journeyPassedEdge(uJourneyMakeEdge)
            * (1.0 - journeyPassedEdge(uJourneyLaunchEdge))
            * uJourneySurfaceAmount * uPlateVisible;
          if (panel < .001) discard;
          // A plate is ink on a press, not a lit solid: the flat face stays
          // quiet while the silhouette edge carries most of the colour.
          float edge = 1.0 - abs(normalize(vPlateNormal).z);
          float ink = .26 + .74 * pow(clamp(edge, 0.0, 1.0), 1.25);
          // Fully registered plates have nothing left to show. Fade them out
          // slightly ahead of alignment so nothing lingers over the finish.
          float remaining = 1.0 - smoothstep(.72, 1.0, uPlateRegister);
          // This canvas is transparent over a solid DOM panel, so additive
          // blending would replace the panel instead of adding to it. Carry
          // the panel's own colour and blend normally: the result is exactly
          // panel + tint * strength, which is the ink a press would lay down.
          float strength = clamp(ink * uPlateWeight * remaining, 0.0, 1.0) * panel;
          gl_FragColor = vec4((uPlatePanel + uPlateTint) * strength, strength);
        }
      `,
    })
    material.customProgramCacheKey = () => 'homepage-journey-register-plate-v2'
    return material
  })
  const meshes: Mesh[] = []
  let disposed = false

  return {
    /** Adds one plate per separation beneath an authored half. The caller
     * keeps ownership of the geometry; plates never clone or modify it. */
    attach(host: Mesh, geometry: BufferGeometry) {
      for (const material of materials) {
        const plate = new Mesh(geometry, material)
        plate.name = 'HomepageJourney_RegisterPlate'
        plate.renderOrder = -2
        plate.frustumCulled = false
        plate.castShadow = plate.receiveShadow = false
        plate.visible = false
        host.add(plate)
        meshes.push(plate)
      }
    },
    update(register: number, visible: number, markWidth: number, aspect: number) {
      if (disposed) return
      const amount = unit(visible) * unit(surfaceUniforms.uJourneySurfaceAmount.value)
      const showing = amount > .001 && unit(register) < .999
        && surfaceUniforms.uJourneyMakeEdge.value < 1
        && surfaceUniforms.uJourneyLaunchEdge.value > 0
      for (const plate of meshes) plate.visible = showing
      if (!showing) return
      shared.uPlateRegister.value = unit(register)
      shared.uPlateVisible.value = amount
      // Clip space spans two units across and down. Dividing the mark's world
      // width by the horizontal half-extent keeps the slip proportional to
      // the mark at any viewport, and square rather than stretched by aspect.
      const width = Math.max(.001, markWidth) / Math.max(.001, aspect)
      shared.uPlateSlip.value.set(width, width * Math.max(.001, aspect))
    },
    dispose() {
      if (disposed) return
      disposed = true
      for (const plate of meshes) {
        plate.visible = false
        plate.removeFromParent()
      }
      meshes.length = 0
      materials.forEach(material => material.dispose())
    },
  }
}

export type JourneyPlates = ReturnType<typeof createJourneyPlates>
