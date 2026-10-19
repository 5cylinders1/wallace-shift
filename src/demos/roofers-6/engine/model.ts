import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Color, DoubleSide, Group, InstancedMesh, Matrix4, Mesh,
  MeshStandardMaterial, Object3D, Plane, PlaneGeometry, Quaternion, SRGBColorSpace, Vector2, Vector3, type Material,
} from 'three'
import { colorFor, finishById, type FinishFamily, type RoofConfig, type Upgrades } from '../catalog'
import { beamGeometry, buildRoof, capUp, clip2D, fromPlane, planeOutline, slabGeometry, slopeLines, wallGeometry, type Roof, type RoofPlane, type Segment } from './roof'
import { box, cylinder, merge, orient, worldUV } from './geometry'
import { glowTexture, seeded, washTexture, type SurfaceLibrary } from './textures'
import { CHIMNEY, GARAGE, MAIN, PORCH, garagePitchFor, measureRoof, type RoofMetrics } from './measure'

export const LAYERS = ['rafters', 'deck', 'drip', 'icewater', 'underlayment', 'starter', 'finish', 'flashing', 'ridge'] as const
export type LayerKey = typeof LAYERS[number]

export interface Anchor { position: Vector3; normal: Vector3 }

export interface ModelState {
  explode: number
  focus: number
  build: number
  damage: number
  night: number
  upgrades: Upgrades
}

const LIFT_SPACING = 0.5
const OFF = 1e4

const finishThickness: Record<FinishFamily, number> = { shingle: 0.03, seam: 0.018, slate: 0.035, clay: 0.06, shake: 0.04 }

/** Stack heights of each layer above the rafter plane. */
const layerLift: Record<LayerKey, number> = {
  rafters: 0, deck: 0, drip: 0.018, icewater: 0.02, underlayment: 0.024, starter: 0.028, finish: 0.034, flashing: 0.034, ridge: 0.034,
}

const copper = new Color('#b9733f')
const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function interiorTexture(): CanvasTexture {
  const element = document.createElement('canvas')
  element.width = 64
  element.height = 128
  const context = element.getContext('2d')!
  const gradient = context.createLinearGradient(0, 0, 0, 128)
  gradient.addColorStop(0, '#ffe2b8')
  gradient.addColorStop(0.5, '#e9a868')
  gradient.addColorStop(1, '#6b3d22')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 128)
  const texture = new CanvasTexture(element)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function solarTexture(): CanvasTexture {
  const element = document.createElement('canvas')
  element.width = 128
  element.height = 256
  const context = element.getContext('2d')!
  context.fillStyle = '#0d1624'
  context.fillRect(0, 0, 128, 256)
  context.strokeStyle = 'rgba(170,190,215,0.45)'
  context.lineWidth = 1.2
  for (let x = 0; x <= 128; x += 21.3) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 256); context.stroke() }
  for (let y = 0; y <= 256; y += 21.3) { context.beginPath(); context.moveTo(0, y); context.lineTo(128, y); context.stroke() }
  const texture = new CanvasTexture(element)
  texture.colorSpace = SRGBColorSpace
  return texture
}

type Mat = MeshStandardMaterial

export class HouseModel {
  readonly group = new Group()
  readonly layers = Object.fromEntries(LAYERS.map(key => [key, new Group()])) as Record<LayerKey, Group>
  readonly anchors = new Map<string, Anchor>()
  private readonly layerAnchorBase = new Map<LayerKey, Vector3>()
  private readonly library: SurfaceLibrary
  private readonly shell = new Group()
  private readonly fixed = new Group()
  private readonly roofs = new Group()
  private readonly extras = new Group()
  private readonly upgradeGroups = { skylights: new Group(), solar: new Group(), snowGuards: new Group(), lighting: new Group(), gutterGuards: new Group() }
  private readonly damageGroup = new Group()
  private readonly clips: Record<string, Plane> = {}
  private readonly materials: Record<string, Mat> = {}
  private readonly baseColors = new Map<Mat, Color>()
  private finishMaterial!: Mat
  private finishEdge!: Mat
  private capMaterial!: Mat
  private ribMaterial!: Mat
  /** Garage and porch finish: shares textures, never cut away by the anatomy view. */
  private secondary!: { finish: Mat; edge: Mat; rib: Mat }
  private step = 1.6
  private stepOrigin = -7.75
  private main!: Roof
  private garage!: Roof
  private porch!: Roof
  private config!: RoofConfig
  private samples: Anchor[] = []
  private gutterRuns: Segment[] = []
  private solarPanels: Object3D[] = []
  private ranges = { xMin: -8, xMax: 14.5, yLow: 2.6, yHigh: 10 }
  private readonly glow = glowTexture()
  private readonly wash = washTexture()
  private readonly interior = interiorTexture()
  private readonly solar = solarTexture()

  constructor(library: SurfaceLibrary) {
    this.library = library
    this.createMaterials()
    this.group.add(this.fixed, this.shell, this.roofs, this.extras, this.damageGroup)
    this.porch = buildRoof({ kind: 'shed', x0: PORCH.x0, x1: PORCH.x1, z0: PORCH.z0, z1: PORCH.z1, eave: PORCH.top, pitch: PORCH.pitch, overhang: PORCH.overhang })
    this.buildOpenings()
    this.buildPorch()
    for (const key of LAYERS) this.roofs.add(this.layers[key])
    for (const upgrade of Object.values(this.upgradeGroups)) this.extras.add(upgrade)
  }

  /* -------------------------------------------------------------- */
  /* Materials                                                       */
  /* -------------------------------------------------------------- */

  private clip(name: string): Plane[] {
    const plane = (this.clips[name] ??= new Plane(new Vector3(-1, 0, 0), OFF))
    return [plane]
  }

  private mat(name: string, options: ConstructorParameters<typeof MeshStandardMaterial>[0], clipName?: string): Mat {
    const material = new MeshStandardMaterial(options)
    if (clipName) material.clippingPlanes = this.clip(clipName)
    this.materials[name] = material
    this.baseColors.set(material, material.color.clone())
    return material
  }

  private createMaterials() {
    const batten = this.library.get('batten', ['#eeebe4'])
    batten.albedo.repeat.set(1 / batten.size[0], 1 / batten.size[1])
    batten.normal.repeat.copy(batten.albedo.repeat)
    const stone = this.library.get('stone')
    stone.albedo.repeat.set(1 / stone.size[0], 1 / stone.size[1])
    stone.normal.repeat.copy(stone.albedo.repeat)
    const deck = this.library.get('deck')
    deck.albedo.repeat.set(1 / deck.size[0], 1 / deck.size[1])
    deck.normal.repeat.copy(deck.albedo.repeat)
    const under = this.library.get('underlayment')
    under.albedo.repeat.set(1 / under.size[0], 1 / under.size[1])
    under.normal.repeat.copy(under.albedo.repeat)
    const ice = this.library.get('icewater')
    ice.albedo.repeat.set(1 / ice.size[0], 1 / ice.size[1])
    ice.normal.repeat.copy(ice.albedo.repeat)
    const garage = this.library.get('garage')

    this.mat('wall', { map: batten.albedo, normalMap: batten.normal, roughness: 0.82, side: DoubleSide })
    this.mat('trim', { color: '#f3f1ec', roughness: 0.65 }, 'deck')
    this.mat('trimStatic', { color: '#f3f1ec', roughness: 0.65 })
    this.mat('frame', { color: '#15181b', roughness: 0.42, metalness: 0.25 })
    this.mat('glassLit', { color: '#0b1016', roughness: 0.05, metalness: 0.2, emissive: new Color('#ffc890'), emissiveMap: this.interior, emissiveIntensity: 0, envMapIntensity: 1.4 })
    this.mat('glassDim', { color: '#0b1016', roughness: 0.05, metalness: 0.2, emissive: new Color('#ff9f58'), emissiveMap: this.interior, emissiveIntensity: 0, envMapIntensity: 1.4 })
    this.mat('door', { color: '#6a4529', roughness: 0.6 })
    this.mat('post', { color: '#8d6a4a', roughness: 0.75 })
    this.mat('decking', { color: '#5a5149', roughness: 0.85 })
    this.mat('foundation', { map: stone.albedo, normalMap: stone.normal, color: '#8c877f', roughness: 0.9 })
    this.mat('steps', { color: '#a9a49b', roughness: 0.9 })
    this.mat('chimney', { map: stone.albedo, normalMap: stone.normal, roughness: 0.9, transparent: true })
    this.mat('garageDoor', { map: garage.albedo, normalMap: garage.normal, roughness: 0.6 })
    this.mat('chimneyCap', { color: '#1b1d20', roughness: 0.45, metalness: 0.6 })
    this.mat('gutter', { color: '#1b1d20', roughness: 0.42, metalness: 0.45 }, 'gutter')
    this.mat('drip', { color: '#1b1d20', roughness: 0.42, metalness: 0.45 }, 'drip')
    this.mat('attic', { color: '#d9c7a4', roughness: 1 })
    this.mat('rafter', { color: '#c79e69', roughness: 0.85 }, 'rafters')
    this.mat('deck', { map: deck.albedo, normalMap: deck.normal, roughness: 0.92 }, 'deck')
    this.mat('icewater', { map: ice.albedo, normalMap: ice.normal, roughness: 0.75 }, 'icewater')
    this.mat('underlayment', { map: under.albedo, normalMap: under.normal, roughness: 0.7 }, 'underlayment')
    this.mat('starter', { color: '#2a2c2f', roughness: 0.95 }, 'starter')
    this.mat('flashing', { color: '#a5abb0', roughness: 0.32, metalness: 0.8 })
    this.mat('lightFixture', { color: '#1a1a1a', emissive: new Color('#ffcf94'), emissiveIntensity: 0, roughness: 0.4 })
    this.mat('skyFrame', { color: '#202326', roughness: 0.4, metalness: 0.5 })
    this.mat('skyGlass', { color: '#13202b', roughness: 0.03, metalness: 0.3, envMapIntensity: 1.6 })
    this.mat('solarCell', { map: this.solar, roughness: 0.18, metalness: 0.4, envMapIntensity: 1.3 })
    this.mat('solarFrame', { color: '#c7ccd0', roughness: 0.3, metalness: 0.9 })
    this.mat('guard', { color: '#9aa1a6', roughness: 0.35, metalness: 0.8 })
    this.mat('mesh', { color: '#5d6266', roughness: 0.5, metalness: 0.6, transparent: true, opacity: 0 })
    this.mat('bruise', { color: '#0a0a0a', alphaMap: this.glow, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 1 })
    this.mat('wash', { color: '#000000', emissive: new Color('#ffbf80'), emissiveMap: this.wash, alphaMap: this.wash, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending })
  }

  private setFinishMaterials(config: RoofConfig) {
    const finish = finishById(config.finish)
    const color = colorFor(config)
    const old = [this.finishMaterial, this.finishEdge, this.capMaterial, this.ribMaterial, ...(this.secondary ? Object.values(this.secondary) : [])]
    const edgeColor = new Color(color.swatch).multiplyScalar(0.55)
    if (finish.id === 'seam') {
      const surface = this.library.get(`seam:${color.id}`, color.palette)
      surface.albedo.repeat.set(1 / surface.size[0], 1 / surface.size[1])
      surface.normal.repeat.copy(surface.albedo.repeat)
      const metal = color.metal!
      this.finishMaterial = new MeshStandardMaterial({ map: surface.albedo, normalMap: surface.normal, metalness: metal.metalness, roughness: metal.roughness, envMapIntensity: 1.25 })
      this.ribMaterial = new MeshStandardMaterial({ color: metal.color, metalness: metal.metalness, roughness: metal.roughness * 0.85, envMapIntensity: 1.3 })
      this.capMaterial = this.ribMaterial.clone()
      edgeColor.set(metal.color)
    } else {
      const surface = this.library.get(`${finish.id}:${color.id}` as `shingle:${string}`, color.palette)
      surface.albedo.repeat.set(1 / surface.size[0], 1 / surface.size[1])
      surface.normal.repeat.copy(surface.albedo.repeat)
      const roughness = { shingle: 0.93, slate: 0.55, clay: 0.72, shake: 0.88 }[finish.id]
      this.finishMaterial = new MeshStandardMaterial({ map: surface.albedo, normalMap: surface.normal, roughness, envMapIntensity: finish.id === 'slate' ? 1 : 0.65 })
      this.ribMaterial = this.finishMaterial
      this.capMaterial = finish.id === 'clay' ? new MeshStandardMaterial({ color: color.swatch, roughness: 0.7 }) : this.finishMaterial.clone()
    }
    this.finishEdge = new MeshStandardMaterial({ color: edgeColor, roughness: 0.8 })
    const clipFinish = this.clip('finish')
    this.finishMaterial.clippingPlanes = clipFinish
    this.finishEdge.clippingPlanes = clipFinish
    this.ribMaterial.clippingPlanes = clipFinish
    this.capMaterial.clippingPlanes = this.clip('ridge')
    for (const material of [this.finishMaterial, this.finishEdge, this.capMaterial, this.ribMaterial]) this.baseColors.set(material, material.color.clone())
    const clipSecondary = this.clip('finish2')
    const secondaryFinish = this.finishMaterial.clone()
    const secondaryEdge = this.finishEdge.clone()
    const secondaryRib = this.ribMaterial === this.finishMaterial ? secondaryFinish : this.ribMaterial.clone()
    for (const material of [secondaryFinish, secondaryEdge, secondaryRib]) material.clippingPlanes = clipSecondary
    this.secondary = { finish: secondaryFinish, edge: secondaryEdge, rib: secondaryRib }
    const current = new Set([this.finishMaterial, this.finishEdge, this.capMaterial, this.ribMaterial, secondaryFinish, secondaryEdge, secondaryRib])
    for (const material of new Set(old)) if (material && !current.has(material)) { this.baseColors.delete(material); material.dispose() }
  }

  /* -------------------------------------------------------------- */
  /* Build                                                           */
  /* -------------------------------------------------------------- */

  configure(config: RoofConfig) {
    this.config = config
    this.disposeChildren(this.shell)
    // Empty each layer group itself; the groups stay in the scene. Detaching
    // only the groups left every earlier roof inside them, still rendering.
    for (const key of LAYERS) { this.disposeChildren(this.layers[key]); this.layers[key].position.set(0, 0, 0) }
    this.disposeChildren(this.damageGroup)
    for (const upgrade of Object.values(this.upgradeGroups)) this.disposeChildren(upgrade)
    this.anchors.clear()
    this.solarPanels = []

    this.setFinishMaterials(config)
    this.main = buildRoof({ kind: config.style, x0: MAIN.x0, x1: MAIN.x1, z0: MAIN.z0, z1: MAIN.z1, eave: MAIN.eave, pitch: config.pitch, overhang: MAIN.overhang })
    const garagePitch = garagePitchFor(config.pitch)
    this.garage = buildRoof({ kind: 'gable', x0: GARAGE.x0, x1: GARAGE.x1, z0: GARAGE.z0, z1: GARAGE.z1, eave: GARAGE.eave, pitch: garagePitch, overhang: GARAGE.overhang, rake: [0, GARAGE.overhang] })
    this.ranges = { xMin: MAIN.x0 - 1, xMax: GARAGE.x1 + 1, yLow: this.porch.eaveY - 0.3, yHigh: this.main.ridgeY + 0.6 }

    this.buildWalls()
    this.buildChimney()
    this.buildMainRoof()
    this.buildSecondaryRoof(this.garage, 'garage')
    this.buildSecondaryRoof(this.porch, 'porch')
    this.buildGutters()
    this.buildUpgrades()
    this.buildDamage()
    this.buildAnchors()
    this.buildSamples()
  }

  private add(parent: Group, geometry: BufferGeometry, material: Material | Material[], cast = true, receive = true): Mesh {
    const mesh = new Mesh(geometry, material)
    mesh.castShadow = cast
    mesh.receiveShadow = receive
    parent.add(mesh)
    return mesh
  }

  private buildWalls() {
    const m = this.materials
    const { x0, x1, z0, z1, base, eave } = MAIN
    const gable = this.config.style === 'gable'
    const ridge = this.main.spec.eave + ((z1 - z0) / 2) * this.main.slope
    const X = new Vector3(1, 0, 0)
    const Z = new Vector3(0, 0, 1)
    const v = (x: number, y: number, z: number) => new Vector3(x, y, z)
    const walls = [
      wallGeometry([v(x0, base, z1), v(x1, base, z1), v(x1, eave, z1), v(x0, eave, z1)], Z, X),
      wallGeometry([v(x1, base, z0), v(x0, base, z0), v(x0, eave, z0), v(x1, eave, z0)], Z.clone().negate(), X),
      wallGeometry(gable ? [v(x0, base, z0), v(x0, base, z1), v(x0, eave, z1), v(x0, ridge, 0), v(x0, eave, z0)] : [v(x0, base, z0), v(x0, base, z1), v(x0, eave, z1), v(x0, eave, z0)], X.clone().negate(), Z),
      wallGeometry(gable ? [v(x1, base, z1), v(x1, base, z0), v(x1, eave, z0), v(x1, ridge, 0), v(x1, eave, z1)] : [v(x1, base, z1), v(x1, base, z0), v(x1, eave, z0), v(x1, eave, z1)], X, Z),
    ]
    const g = GARAGE
    const gRidge = g.eave + ((g.z1 - g.z0) / 2) * this.garage.slope
    const gzc = (g.z0 + g.z1) / 2
    walls.push(
      wallGeometry([v(g.x0, base, g.z1), v(g.x1, base, g.z1), v(g.x1, g.eave, g.z1), v(g.x0, g.eave, g.z1)], Z, X),
      wallGeometry([v(g.x1, base, g.z0), v(g.x0, base, g.z0), v(g.x0, g.eave, g.z0), v(g.x1, g.eave, g.z0)], Z.clone().negate(), X),
      wallGeometry([v(g.x1, base, g.z1), v(g.x1, base, g.z0), v(g.x1, g.eave, g.z0), v(g.x1, gRidge, gzc), v(g.x1, g.eave, g.z1)], X, Z),
    )
    this.add(this.shell, merge(walls), m.wall)

    // Foundation band, corner boards and attic floors.
    const f: BufferGeometry[] = [
      box(0, base / 2, z1 + 0.02, x1 - x0 + 0.08, base, 0.06), box(0, base / 2, z0 - 0.02, x1 - x0 + 0.08, base, 0.06),
      box(x0 - 0.02, base / 2, 0, 0.06, base, z1 - z0 + 0.08), box((g.x0 + g.x1) / 2, base / 2, g.z1 + 0.02, g.x1 - g.x0, base, 0.06),
      box(g.x1 + 0.02, base / 2, gzc, 0.06, base, g.z1 - g.z0 + 0.08), box((g.x0 + g.x1) / 2, base / 2, g.z0 - 0.02, g.x1 - g.x0, base, 0.06),
    ]
    this.add(this.shell, worldUV(merge(f)), m.foundation)
    const corner = 0.16
    const trims: BufferGeometry[] = []
    for (const [x, z] of [[x0, z1], [x1, z1], [x0, z0], [x1, z0]]) trims.push(box(x, (base + eave) / 2, z, corner, eave - base, corner))
    for (const [x, z] of [[g.x1, g.z1], [g.x1, g.z0]]) trims.push(box(x, (base + g.eave) / 2, z, corner, g.eave - base, corner))
    // Frieze boards under the eaves.
    trims.push(box(0, eave - 0.12, z1 + 0.03, x1 - x0, 0.24, 0.04), box(0, eave - 0.12, z0 - 0.03, x1 - x0, 0.24, 0.04))
    trims.push(box((g.x0 + g.x1) / 2, g.eave - 0.1, g.z1 + 0.03, g.x1 - g.x0, 0.2, 0.04), box((g.x0 + g.x1) / 2, g.eave - 0.1, g.z0 - 0.03, g.x1 - g.x0, 0.2, 0.04))
    // A belly band between floors ties the elevation together.
    trims.push(box(0, 3.3, z1 + 0.03, x1 - x0, 0.14, 0.04), box(x0 - 0.03, 3.3, 0, 0.04, 0.14, z1 - z0))
    this.add(this.shell, merge(trims), m.trimStatic)
    this.add(this.shell, merge([box(0, eave + 0.01, 0, x1 - x0 - 0.05, 0.02, z1 - z0 - 0.05), box((g.x0 + g.x1) / 2, g.eave + 0.01, gzc, g.x1 - g.x0 - 0.05, 0.02, g.z1 - g.z0 - 0.05)]), m.attic, false, true)
    if (gable) {
      // Louvered gable vents.
      const vents = [box(x0 - 0.03, ridge - 1.05, 0, 0.05, 0.62, 0.62), box(x1 + 0.03, ridge - 1.05, 0, 0.05, 0.62, 0.62)]
      this.add(this.shell, merge(vents), m.frame)
    }
  }

  private buildOpenings() {
    const m = this.materials
    const frames: BufferGeometry[] = []
    const lit: BufferGeometry[] = []
    const dim: BufferGeometry[] = []
    const sills: BufferGeometry[] = []
    const random = seeded(42)
    type Face = 'front' | 'back' | 'left' | 'right'
    const place = (geometry: BufferGeometry, face: Face, plane: number, along: number, y: number) => {
      if (face === 'front') geometry.translate(along, y, plane)
      else if (face === 'back') { geometry.rotateY(Math.PI); geometry.translate(along, y, plane) }
      else if (face === 'left') { geometry.rotateY(-Math.PI / 2); geometry.translate(plane, y, along) }
      else { geometry.rotateY(Math.PI / 2); geometry.translate(plane, y, along) }
      return geometry
    }
    const window = (face: Face, plane: number, along: number, y0: number, w: number, h: number, mullions = 1) => {
      const t = 0.07
      const d = 0.09
      const parts = [
        box(0, h / 2, d / 2, w, t, d), box(0, -h / 2, d / 2, w, t, d),
        box(-w / 2 + t / 2, 0, d / 2, t, h, d), box(w / 2 - t / 2, 0, d / 2, t, h, d),
      ]
      for (let i = 1; i <= mullions; i++) parts.push(box(-w / 2 + (w * i) / (mullions + 1), 0, d / 2 - 0.01, 0.035, h, 0.05))
      for (const part of parts) frames.push(place(part, face, plane, along, y0 + h / 2))
      const glass = box(0, 0, 0.025, w - t, h - t, 0.01)
      ;(random() < 0.72 ? lit : dim).push(place(glass, face, plane, along, y0 + h / 2))
      sills.push(place(box(0, -h / 2 - 0.05, 0.06, w + 0.18, 0.05, 0.12), face, plane, along, y0 + h / 2))
      sills.push(place(box(0, h / 2 + 0.07, 0.04, w + 0.14, 0.09, 0.08), face, plane, along, y0 + h / 2))
    }
    const { z1, z0, x0, x1 } = MAIN
    // Front, ground floor (the porch shelters the entry).
    window('front', z1, -3.75, 1.0, 1.25, 1.75)
    window('front', z1, 0.35, 1.0, 1.25, 1.75)
    window('front', z1, 3.3, 1.0, 1.25, 1.75)
    window('front', z1, 5.4, 1.0, 1.25, 1.75)
    for (const x of [-5.5, -2.7, 0.15, 3.0, 5.6]) window('front', z1, x, 3.85, 1.05, 1.45)
    for (const x of [-5.0, -1.8, 1.8, 5.0]) { window('back', z0, x, 1.0, 1.2, 1.7); window('back', z0, x, 3.85, 1.05, 1.45) }
    for (const z of [-1.9, 1.9]) { window('left', x0, z, 1.0, 1.15, 1.7); window('left', x0, z, 3.85, 1.05, 1.45) }
    window('right', x1, -3.4, 3.85, 0.9, 1.3)
    window('right', GARAGE.x1, 0.6, 1.25, 1.0, 1.0)
    window('back', GARAGE.z0, 10.4, 1.25, 1.4, 1.0)

    // Entry door with sidelights, then the carriage door.
    const doorX = -1.7
    frames.push(box(doorX, 1.55, z1 + 0.05, 1.86, 0.1, 0.1).translate(0, 1.15, 0))
    frames.push(box(doorX - 0.93, 1.55, z1 + 0.05, 0.1, 2.3, 0.1), box(doorX + 0.93, 1.55, z1 + 0.05, 0.1, 2.3, 0.1))
    frames.push(box(doorX - 0.5, 1.55, z1 + 0.05, 0.07, 2.3, 0.1), box(doorX + 0.5, 1.55, z1 + 0.05, 0.07, 2.3, 0.1))
    this.add(this.fixed, box(doorX, 1.53, z1 + 0.03, 0.94, 2.24, 0.05), m.door)
    lit.push(box(doorX - 0.72, 1.55, z1 + 0.02, 0.34, 2.2, 0.01), box(doorX + 0.72, 1.55, z1 + 0.02, 0.34, 2.2, 0.01))
    const g = GARAGE
    this.add(this.fixed, box(10.4, 0.4 + 1.18, g.z1 + 0.025, 4.9, 2.36, 0.04), m.garageDoor)
    frames.push(box(10.4, 0.4 + 2.42, g.z1 + 0.05, 5.15, 0.14, 0.1), box(10.4 - 2.52, 1.62, g.z1 + 0.05, 0.12, 2.5, 0.1), box(10.4 + 2.52, 1.62, g.z1 + 0.05, 0.12, 2.5, 0.1))
    // Entry sconces.
    const fixtures = [box(doorX - 1.15, 2.25, z1 + 0.09, 0.14, 0.3, 0.12), box(doorX + 1.15, 2.25, z1 + 0.09, 0.14, 0.3, 0.12), box(7.6, 2.7, g.z1 + 0.09, 0.14, 0.3, 0.12), box(13.2, 2.7, g.z1 + 0.09, 0.14, 0.3, 0.12)]
    this.add(this.fixed, merge(fixtures), m.lightFixture, false, false)
    const washes = new Group()
    for (const [x, y, z] of [[doorX - 1.15, 1.2, z1 + 0.04], [doorX + 1.15, 1.2, z1 + 0.04], [7.6, 1.65, g.z1 + 0.04], [13.2, 1.65, g.z1 + 0.04]]) {
      const plane = new Mesh(new PlaneGeometry(1.4, 2.6), m.wash)
      plane.position.set(x, y, z)
      washes.add(plane)
    }
    this.fixed.add(washes)

    this.add(this.fixed, merge(frames), m.frame)
    this.add(this.fixed, merge(sills), m.trimStatic)
    this.add(this.fixed, merge(lit), m.glassLit, false, false)
    this.add(this.fixed, merge(dim), m.glassDim, false, false)
  }

  private buildPorch() {
    const m = this.materials
    const p = PORCH
    const zf = p.z1
    const posts = [-4.85, -1.65, 1.45]
    const beamY = this.porch.heightAt(0, zf - 0.15)! - 0.03
    this.add(this.fixed, box((p.x0 + p.x1) / 2, 0.3, (p.z0 + zf) / 2 + 0.05, p.x1 - p.x0 + 0.1, 0.2, zf - p.z0 + 0.1), m.decking)
    this.add(this.fixed, merge([box(-1.7, 0.2, zf + 0.35, 2.4, 0.2, 0.4), box(-1.7, 0.08, zf + 0.75, 2.4, 0.16, 0.4)]), m.steps)
    const parts: BufferGeometry[] = posts.map(x => box(x, (0.4 + beamY) / 2, zf - 0.15, 0.2, beamY - 0.4, 0.2))
    parts.push(box((p.x0 + p.x1) / 2, beamY - 0.12, zf - 0.15, p.x1 - p.x0 + 0.1, 0.24, 0.2))
    // Knee braces.
    for (const x of posts) {
      if (x > p.x0 + 0.2) parts.push(beamGeometry(new Vector3(x - 0.1, beamY - 0.65, zf - 0.15), new Vector3(x - 0.62, beamY - 0.2, zf - 0.15), 0.1, 0.1))
      if (x < p.x1 - 0.2) parts.push(beamGeometry(new Vector3(x + 0.1, beamY - 0.65, zf - 0.15), new Vector3(x + 0.62, beamY - 0.2, zf - 0.15), 0.1, 0.1))
    }
    this.add(this.fixed, merge(parts), m.post)
  }

  private buildChimney() {
    const c = CHIMNEY
    let top = 0
    for (const x of [c.x0, c.x1]) for (const z of [c.z0, c.z1]) top = Math.max(top, this.main.heightAt(x, z) ?? 0)
    top += 0.95
    const bottom = MAIN.eave - 0.2
    const body = box((c.x0 + c.x1) / 2, (top + bottom) / 2, (c.z0 + c.z1) / 2, c.x1 - c.x0, top - bottom, c.z1 - c.z0)
    // Remap UVs to metres for the stone texture.
    const pos = body.attributes.position
    const nor = body.attributes.normal
    const uv = body.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const horizontal = Math.abs(nor.getX(i)) > 0.5 ? pos.getZ(i) : pos.getX(i)
      uv.setXY(i, horizontal, pos.getY(i))
    }
    const mesh = this.add(this.shell, body, this.materials.chimney)
    mesh.name = 'chimney'
    const cap = [box((c.x0 + c.x1) / 2, top + 0.05, (c.z0 + c.z1) / 2, c.x1 - c.x0 + 0.16, 0.1, c.z1 - c.z0 + 0.16), cylinder(0.09, 0.09, 0.4)]
    cap[1].translate((c.x0 + c.x1) / 2 - 0.2, top + 0.3, (c.z0 + c.z1) / 2)
    const capMesh = this.add(this.shell, merge(cap), this.materials.chimneyCap)
    capMesh.name = 'chimneyCap'
  }

  /** Slabs for every plane, sized by the layer they represent. */
  private slabs(roof: Roof, parent: Group, lift: number, thickness: number, materials: Material[], polygon?: (plane: RoofPlane) => Vector2[]) {
    for (const plane of roof.planes) {
      const outline = polygon ? polygon(plane) : planeOutline(plane)
      if (outline.length < 3) continue
      this.add(parent, slabGeometry(plane, outline, thickness, lift), materials)
    }
  }

  private fascia(roof: Roof, parent: Group) {
    const parts: BufferGeometry[] = []
    for (const [a, b] of [...roof.eaves, ...roof.rakes]) parts.push(beamGeometry(a.clone().setY(a.y - 0.2), b.clone().setY(b.y - 0.2), 0.05, 0.2))
    this.add(parent, merge(parts), this.materials.trim)
  }

  private caps(roof: Roof, parent: Group, lift: number) {
    const finish = this.config.finish
    const parts: BufferGeometry[] = []
    for (const segment of [...roof.ridges, ...roof.hips]) {
      const up = capUp(segment)
      const a = segment[0].clone().addScaledVector(up, lift + finishThickness[finish] - 0.02)
      const b = segment[1].clone().addScaledVector(up, lift + finishThickness[finish] - 0.02)
      if (finish === 'clay') {
        const axis = b.clone().sub(a)
        const length = axis.length()
        const tube = cylinder(0.13, 0.13, length, 14, false)
        tube.scale(1, 1, 0.72)
        const x = axis.normalize()
        orient(tube, a.clone().add(b).multiplyScalar(0.5), new Vector3().crossVectors(x, up), x, up)
        parts.push(tube)
      } else {
        parts.push(beamGeometry(a, b, finish === 'seam' ? 0.3 : 0.34, finish === 'seam' ? 0.06 : 0.07, up))
      }
    }
    if (parts.length) this.add(parent, merge(parts), this.capMaterial)
  }

  private ribs(roof: Roof, parent: Group, lift: number, material: Mat) {
    if (this.config.finish !== 'seam') return
    const parts: BufferGeometry[] = []
    for (const plane of roof.planes) {
      for (const [p, q] of slopeLines(plane, 0.4064, 0.12)) {
        parts.push(beamGeometry(fromPlane(plane, p.x, p.y + 0.02, lift), fromPlane(plane, q.x, q.y - 0.06, lift), 0.024, 0.04, plane.normal))
      }
    }
    if (parts.length) this.add(parent, merge(parts), material, true, true)
  }

  private buildMainRoof() {
    const m = this.materials
    const roof = this.main
    const L = this.layers
    const finish = this.config.finish

    // Rafters on 24-inch centres, ridge board and hip rafters.
    const rafters: BufferGeometry[] = []
    for (const plane of roof.planes) {
      for (const [p, q] of slopeLines(plane, 0.6096, 0.15)) {
        rafters.push(beamGeometry(fromPlane(plane, p.x, p.y, -0.2), fromPlane(plane, q.x, q.y - 0.05, -0.2), 0.05, 0.2, plane.normal))
      }
    }
    for (const segment of [...roof.ridges, ...roof.hips]) {
      rafters.push(beamGeometry(segment[0].clone().setY(segment[0].y - 0.28), segment[1].clone().setY(segment[1].y - 0.28), 0.05, 0.26, capUp(segment)))
    }
    this.add(L.rafters, merge(rafters), m.rafter)

    this.slabs(roof, L.deck, layerLift.deck, 0.018, [m.deck, m.trim])
    this.fascia(roof, L.deck)

    const drip: BufferGeometry[] = []
    for (const [a, b] of [...roof.eaves, ...roof.rakes]) drip.push(beamGeometry(a.clone().setY(a.y - 0.05), b.clone().setY(b.y - 0.05), 0.06, 0.09))
    this.add(L.drip, merge(drip), m.drip)

    this.slabs(roof, L.icewater, layerLift.icewater, 0.003, [m.icewater, m.icewater], plane => clip2D(planeOutline(plane), 0, -1, 0.92))
    this.slabs(roof, L.underlayment, layerLift.underlayment, 0.003, [m.underlayment, m.underlayment])
    this.slabs(roof, L.starter, layerLift.starter, 0.006, [m.starter, m.starter], plane => clip2D(planeOutline(plane), 0, -1, 0.24))
    this.slabs(roof, L.finish, layerLift.finish, finishThickness[finish], [this.finishMaterial, this.finishEdge])
    this.ribs(roof, L.finish, layerLift.finish + finishThickness[finish], this.ribMaterial)
    this.caps(roof, L.ridge, layerLift.ridge)

    // Penetrations and flashing.
    const front = roof.planes[0]
    const flashing: BufferGeometry[] = []
    const top = layerLift.finish + finishThickness[finish]
    const { u: pu, v: pv } = this.onFront(2.6, 2.3)
    const pipeBase = fromPlane(front, pu, pv, top)
    const pipe = cylinder(0.055, 0.055, 0.42)
    pipe.translate(pipeBase.x, pipeBase.y + 0.2, pipeBase.z)
    const boot = cylinder(0.09, 0.2, 0.08, 18)
    orient(boot, pipeBase.clone().addScaledVector(front.normal, 0.03), front.u, front.normal, new Vector3().crossVectors(front.u, front.normal))
    flashing.push(pipe, boot)
    const vent = this.onFront(3.4, 1.2)
    const ventBase = fromPlane(front, vent.u, vent.v, top)
    const ventBox = box(0, 0.11, 0, 0.42, 0.22, 0.42)
    orient(ventBox, ventBase, front.u, front.normal, new Vector3().crossVectors(front.u, front.normal))
    const ventFlange = box(0, 0.01, 0, 0.62, 0.02, 0.62)
    orient(ventFlange, ventBase, front.u, front.normal, new Vector3().crossVectors(front.u, front.normal))
    flashing.push(ventBox, ventFlange)
    // Chimney apron, side steps and back saddle.
    const c = CHIMNEY
    const low = this.onFront((c.x0 + c.x1) / 2, c.z1)
    const high = this.onFront((c.x0 + c.x1) / 2, c.z0)
    const half = (c.x1 - c.x0) / 2
    const at = (u: number, v: number, l = top) => fromPlane(front, u, v, l)
    flashing.push(beamGeometry(at(low.u - half - 0.12, low.v + 0.08), at(low.u + half + 0.12, low.v + 0.08), 0.2, 0.16, front.normal))
    flashing.push(beamGeometry(at(low.u - half - 0.06, low.v), at(low.u - half - 0.06, high.v), 0.14, 0.14, front.normal))
    flashing.push(beamGeometry(at(low.u + half + 0.06, low.v), at(low.u + half + 0.06, high.v), 0.14, 0.14, front.normal))
    flashing.push(beamGeometry(at(low.u - half - 0.1, high.v - 0.12), at(low.u + half + 0.1, high.v - 0.12), 0.32, 0.2, front.normal))
    this.add(L.flashing, merge(flashing), m.flashing)

    // The anatomy view cuts each layer back by one step so a strip of the
    // layer beneath stays visible. Labels point at the middle of each strip.
    this.layerAnchorBase.clear()
    this.stepOrigin = front.origin.x
    this.step = (front.points[1].x - front.origin.x) / 9.6
    const strip = (k: number, lift: number) => {
      const u = this.step * (k + 0.1)
      const [low, high] = spanAt(front, u)
      return fromPlane(front, u, low + (high - low) * 0.42, lift)
    }
    this.layerAnchorBase.set('rafters', strip(-0.15, -0.1))
    this.layerAnchorBase.set('deck', strip(1, layerLift.deck + 0.02))
    const eave = roof.eaves[0]
    this.layerAnchorBase.set('drip', eave[0].clone().lerp(eave[1], (this.step * 2.1) / eave[0].distanceTo(eave[1])).setY(roof.eaveY - 0.04))
    this.layerAnchorBase.set('icewater', fromPlane(front, this.step * 3.1, 0.4, layerLift.icewater))
    this.layerAnchorBase.set('underlayment', strip(4, layerLift.underlayment))
    this.layerAnchorBase.set('starter', fromPlane(front, this.step * 5.1, 0.12, layerLift.starter))
    this.layerAnchorBase.set('finish', strip(6.4, top))
    this.layerAnchorBase.set('flashing', at(low.u - half - 0.1, low.v + 0.1))
    const ridge = roof.ridges[0] ?? roof.hips[0]
    this.layerAnchorBase.set('ridge', ridge[1].clone().lerp(ridge[0], 0.25).setY(roof.ridgeY + 0.1))
  }

  /** Main front plane (u, v) for a footprint position. */
  private onFront(x: number, z: number) {
    const front = this.main.planes[0]
    const y = this.main.heightAt(x, z) ?? this.main.ridgeY
    const p = new Vector3(x, y, z).sub(front.origin)
    return { u: p.dot(front.u), v: p.dot(front.v) }
  }

  private buildSecondaryRoof(roof: Roof, kind: 'garage' | 'porch') {
    const m = this.materials
    const group = this.shell
    const finish = this.config.finish
    this.slabs(roof, group, 0, 0.018, [m.deck, m.trim])
    this.fascia(roof, group)
    this.slabs(roof, group, layerLift.finish, finishThickness[finish], [this.secondary.finish, this.secondary.edge])
    this.ribs(roof, group, layerLift.finish + finishThickness[finish], this.secondary.rib)
    this.caps(roof, group, layerLift.ridge)
    const drip: BufferGeometry[] = []
    for (const [a, b] of [...roof.eaves, ...roof.rakes]) drip.push(beamGeometry(a.clone().setY(a.y - 0.05), b.clone().setY(b.y - 0.05), 0.06, 0.09))
    this.add(group, merge(drip), m.drip)
    // Step flashing where the roof meets a wall.
    const steps: BufferGeometry[] = []
    const plane = roof.planes[0]
    for (const [a, b] of roof.walls) {
      const dir = kind === 'garage' ? new Vector3(0.05, 0, 0) : new Vector3(0, 0, 0.05)
      steps.push(beamGeometry(a.clone().add(dir).addScaledVector(plane.normal, 0.04), b.clone().add(dir).addScaledVector(plane.normal, 0.04), 0.16, 0.14))
    }
    if (steps.length) this.add(group, merge(steps), m.flashing)
  }

  private buildGutters() {
    const runs: { segment: Segment; out: Vector3; spouts: number[]; reach: number }[] = []
    const main = this.main
    const outward = (segment: Segment, center: Vector3) => {
      const dir = segment[1].clone().sub(segment[0])
      const out = new Vector3(dir.z, 0, -dir.x).normalize()
      const mid = segment[0].clone().add(segment[1]).multiplyScalar(0.5)
      if (out.dot(mid.clone().sub(center).setY(0)) < 0) out.negate()
      return out
    }
    const center = new Vector3(0, 0, 0)
    const front = main.eaves[0]
    runs.push({ segment: front, out: outward(front, center), spouts: [MAIN.x0 + 0.25, 6.0], reach: MAIN.overhang - 0.04 })
    const back = main.eaves[this.config.style === 'gable' ? 1 : 2]
    runs.push({ segment: back, out: outward(back, center), spouts: [MAIN.x0 + 0.25, MAIN.x1 - 0.25], reach: MAIN.overhang - 0.04 })
    if (this.config.style === 'hip') runs.push({ segment: main.eaves[3], out: outward(main.eaves[3], center), spouts: [], reach: 0 })
    const gc = new Vector3((GARAGE.x0 + GARAGE.x1) / 2, 0, (GARAGE.z0 + GARAGE.z1) / 2)
    runs.push({ segment: this.garage.eaves[0], out: outward(this.garage.eaves[0], gc), spouts: [GARAGE.x1 - 0.2], reach: GARAGE.overhang - 0.04 })
    runs.push({ segment: this.garage.eaves[1], out: outward(this.garage.eaves[1], gc), spouts: [GARAGE.x1 - 0.2], reach: GARAGE.overhang - 0.04 })
    runs.push({ segment: this.porch.eaves[0], out: new Vector3(0, 0, 1), spouts: [1.45], reach: 0.14 })

    const gutters: BufferGeometry[] = []
    const guards: BufferGeometry[] = []
    this.gutterRuns = []
    for (const run of runs) {
      const [a, b] = run.segment
      const pa = a.clone().addScaledVector(run.out, 0.1).setY(a.y - 0.17)
      const pb = b.clone().addScaledVector(run.out, 0.1).setY(b.y - 0.17)
      gutters.push(beamGeometry(pa, pb, 0.14, 0.14))
      guards.push(beamGeometry(pa.clone().setY(pa.y + 0.14), pb.clone().setY(pb.y + 0.14), 0.15, 0.012))
      this.gutterRuns.push([pa, pb])
      for (const along of run.spouts) {
        const horizontal = Math.abs(b.x - a.x) > Math.abs(b.z - a.z)
        const t = horizontal ? (along - a.x) / (b.x - a.x) : (along - a.z) / (b.z - a.z)
        const top = pa.clone().lerp(pb, Math.max(0, Math.min(1, t)))
        // Elbow back to the wall, then down to grade.
        const wallSide = run.out.clone().multiplyScalar(-1)
        const atWall = top.clone().addScaledVector(wallSide, run.reach).setY(top.y - 0.55)
        gutters.push(beamGeometry(top, atWall, 0.08, 0.08))
        gutters.push(beamGeometry(atWall, atWall.clone().setY(0.08), 0.08, 0.08, run.out))
        gutters.push(beamGeometry(atWall.clone().setY(0.18), atWall.clone().setY(0.06).addScaledVector(run.out, 0.35), 0.09, 0.09))
      }
    }
    this.add(this.shell, merge(gutters), this.materials.gutter)
    this.add(this.upgradeGroups.gutterGuards, merge(guards), this.materials.mesh, false, false)
  }

  private buildUpgrades() {
    const m = this.materials
    const front = this.main.planes[0]
    const top = layerLift.finish + finishThickness[this.config.finish]
    const frame = (plane: RoofPlane, u: number, v: number, lift: number) => ({
      origin: fromPlane(plane, u, v, lift), x: plane.u.clone(), y: plane.normal.clone(), z: plane.v.clone().negate(),
    })

    for (const x of [-0.75, 0.65]) {
      const at = this.onFront(x, 2.2)
      const f = frame(front, at.u, at.v, top)
      const group = new Group()
      const curb = merge([box(0, 0.09, 0, 0.86, 0.18, 1.32)])
      const glass = box(0, 0.2, 0, 0.74, 0.04, 1.2)
      group.add(new Mesh(curb, m.skyFrame), new Mesh(glass, m.skyGlass))
      group.children.forEach(child => { child.castShadow = true; child.receiveShadow = true })
      group.matrixAutoUpdate = false
      group.userData.base = new Matrix4().makeBasis(f.x, f.y, f.z).setPosition(f.origin)
      group.userData.normal = f.y
      this.upgradeGroups.skylights.add(group)
    }

    const gf = this.garage.planes[0]
    const gTop = layerLift.finish + finishThickness[this.config.finish]
    for (let row = 0; row < 2; row++) {
      for (let column = 0; column < 5; column++) {
        const u = 0.75 + column * 1.04 + 0.5
        const v = 0.55 + row * 1.74 + 0.85
        const f = frame(gf, u, v, gTop + 0.08)
        const panel = new Group()
        const cell = box(0, 0.02, 0, 0.98, 0.012, 1.68)
        panel.add(new Mesh(cell, m.solarCell), new Mesh(merge([box(0, 0, 0.84, 1.0, 0.045, 0.03), box(0, 0, -0.84, 1.0, 0.045, 0.03), box(0.49, 0, 0, 0.03, 0.045, 1.7), box(-0.49, 0, 0, 0.03, 0.045, 1.7)]), m.solarFrame))
        panel.children.forEach(child => { child.castShadow = true })
        panel.matrixAutoUpdate = false
        panel.userData.base = new Matrix4().makeBasis(f.x, f.y, f.z).setPosition(f.origin)
        panel.userData.normal = f.y
        panel.userData.order = row * 5 + column
        this.upgradeGroups.solar.add(panel)
        this.solarPanels.push(panel)
      }
    }

    const guardPositions: Matrix4[] = []
    const outline = planeOutline(front)
    for (const z of [MAIN.z1 - 0.15, MAIN.z1 - 0.95]) {
      const row = this.onFront(0, z)
      const span = clip2D(clip2D(outline, 0, 1, -(row.v - 0.01)), 0, -1, row.v + 0.01)
      if (span.length < 2) continue
      const minU = Math.min(...span.map(p => p.x)) + 0.35
      const maxU = Math.max(...span.map(p => p.x)) - 0.35
      for (let u = minU; u <= maxU; u += 0.61) {
        const p = fromPlane(front, u, row.v, top)
        const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(front.u, front.normal, front.v.clone().negate()))
        guardPositions.push(new Matrix4().compose(p, q, new Vector3(1, 1, 1)))
      }
    }
    if (guardPositions.length) {
      const guard = new InstancedMesh(merge([box(0, 0.035, 0, 0.06, 0.07, 0.1), box(0, 0.06, -0.05, 0.08, 0.02, 0.03)]), m.guard, guardPositions.length)
      guardPositions.forEach((matrix, index) => guard.setMatrixAt(index, matrix))
      guard.userData.base = guardPositions
      guard.castShadow = true
      this.upgradeGroups.snowGuards.add(guard)
    }

    // Soffit downlights and their washes on the facade.
    const lights: BufferGeometry[] = []
    const washes = new Group()
    for (const x of [-6.2, -3.8, -0.6, 2.4, 4.6, 6.6]) {
      lights.push(box(x, MAIN.eave - MAIN.overhang * this.main.slope * 0.5 - 0.02, MAIN.z1 + MAIN.overhang * 0.5, 0.12, 0.02, 0.12))
      const plane = new Mesh(new PlaneGeometry(1.6, 3.2), m.wash)
      plane.position.set(x, MAIN.eave - 1.85, MAIN.z1 + 0.05)
      washes.add(plane)
    }
    for (const x of [8.4, 10.4, 12.4]) {
      lights.push(box(x, GARAGE.eave - GARAGE.overhang * this.garage.slope * 0.5 - 0.02, GARAGE.z1 + GARAGE.overhang * 0.5, 0.12, 0.02, 0.12))
      const plane = new Mesh(new PlaneGeometry(1.4, 2.4), m.wash)
      plane.position.set(x, GARAGE.eave - 1.45, GARAGE.z1 + 0.05)
      washes.add(plane)
    }
    const lightMaterial = m.lightFixture.clone()
    this.materials.soffitLight = lightMaterial
    this.add(this.upgradeGroups.lighting, merge(lights), lightMaterial, false, false)
    washes.userData.soffit = true
    this.upgradeGroups.lighting.add(washes)
    const soffitWash = m.wash.clone()
    this.materials.soffitWash = soffitWash
    washes.children.forEach(child => { (child as Mesh).material = soffitWash })
  }

  private buildDamage() {
    const front = this.main.planes[0]
    const top = layerLift.finish + finishThickness[this.config.finish] + 0.004
    const random = seeded(9)
    const spots: BufferGeometry[] = []
    const cluster = (x: number, z: number, count: number, spread: number) => {
      for (let i = 0; i < count; i++) {
        const at = this.onFront(x + (random() - 0.5) * spread, z + (random() - 0.5) * spread * 0.6)
        const size = 0.12 + random() * 0.1
        const quad = new PlaneGeometry(size, size)
        quad.rotateX(-Math.PI / 2)
        orient(quad, fromPlane(front, at.u, at.v, top), front.u, front.normal, front.v.clone().negate())
        spots.push(quad)
      }
    }
    cluster(-4.6, 2.5, 14, 2.4)
    cluster(1.4, 3.1, 8, 2.0)
    cluster(4.4, 2.0, 6, 1.6)
    const spotsMesh = new Mesh(merge(spots), this.materials.bruise)
    spotsMesh.renderOrder = 2
    this.damageGroup.add(spotsMesh)

    // A wind-lifted tab, standing proud of its course.
    const lifted = this.onFront(5.1, 2.9)
    const tab = box(0, 0, 0.08, 0.36, 0.012, 0.16)
    tab.rotateX(-0.42)
    orient(tab, fromPlane(front, lifted.u, lifted.v, top + 0.01), front.u, front.normal, front.v.clone().negate())
    const tabMesh = new Mesh(tab, this.finishMaterial)
    tabMesh.castShadow = true
    tabMesh.name = 'liftedTab'
    this.damageGroup.add(tabMesh)
  }

  private buildAnchors() {
    const front = this.main.planes[0]
    const top = layerLift.finish + finishThickness[this.config.finish]
    const set = (name: string, position: Vector3, normal = front.normal) => this.anchors.set(name, { position, normal: normal.clone() })
    const at = (x: number, z: number, lift = top) => { const p = this.onFront(x, z); return fromPlane(front, p.u, p.v, lift) }
    set('pipe', at(2.6, 2.3).add(new Vector3(0, 0.42, 0)))
    set('exhaust', at(3.4, 1.2, top + 0.22))
    set('chimney', at(-2.4, CHIMNEY.z1 + 0.05, top + 0.12))
    const wall = this.garage.walls[0]
    set('stepFlashing', wall[0].clone().lerp(wall[1], 0.55).add(new Vector3(0.1, 0.12, 0)), this.garage.planes[0].normal)
    const ridge = this.main.ridges[0] ?? this.main.hips[0]
    set('ridge', ridge[0].clone().lerp(ridge[1], 0.62).setY(this.main.ridgeY + 0.1), new Vector3(0, 1, 0))
    const gutter = this.gutterRuns[0]
    set('gutter', gutter[0].clone().lerp(gutter[1], 0.25).add(new Vector3(0, 0.07, 0.07)), new Vector3(0, 0.3, 1))
    set('soffit', new Vector3(4.0, MAIN.eave - 0.18, MAIN.z1 + 0.32), new Vector3(0, -0.2, 1))
    set('field', at(-0.4, 2.7))
    const porchWall = this.porch.walls[0]
    set('porchFlashing', porchWall[0].clone().lerp(porchWall[1], 0.7).add(new Vector3(0, 0.1, 0.06)), new Vector3(0, 0.6, 1))
    set('hail', at(-4.6, 2.5))
    set('lifted', at(5.1, 2.9, top + 0.08))
    set('dent', gutter[0].clone().lerp(gutter[1], 0.38).add(new Vector3(0, 0.0, 0.08)), new Vector3(0, 0.3, 1))
    set('granules', new Vector3(MAIN.x0 + 0.35, 0.35, MAIN.z1 + 0.5), new Vector3(0, 0.5, 1))
    set('skylight', at(0, 2.2, top + 0.25))
    set('solar', fromPlane(this.garage.planes[0], 3.3, 2.2, top + 0.1), this.garage.planes[0].normal)
    set('snowGuard', at(-4.2, MAIN.z1 - 0.15, top + 0.08))
    set('copper', gutter[0].clone().lerp(gutter[1], 0.06).add(new Vector3(0, -0.4, 0.05)), new Vector3(0, 0.2, 1))
    set('lighting', new Vector3(-0.6, MAIN.eave - 0.45, MAIN.z1 + 0.32), new Vector3(0, 0, 1))
    set('gutterGuard', gutter[0].clone().lerp(gutter[1], 0.82).add(new Vector3(0, 0.15, 0.04)), new Vector3(0, 1, 0.4))
  }

  private buildSamples() {
    const random = seeded(77)
    const planes = [...this.main.planes, ...this.garage.planes, ...this.porch.planes]
    const total = planes.reduce((sum, plane) => sum + plane.area, 0)
    const top = layerLift.finish + finishThickness[this.config.finish] + 0.02
    this.samples = []
    for (const plane of planes) {
      const outline = planeOutline(plane)
      const count = Math.round((plane.area / total) * 420)
      const minU = Math.min(...outline.map(p => p.x)), maxU = Math.max(...outline.map(p => p.x))
      const maxV = Math.max(...outline.map(p => p.y))
      let placed = 0
      for (let attempt = 0; attempt < count * 6 && placed < count; attempt++) {
        const u = minU + random() * (maxU - minU)
        const v = random() * maxV
        if (!inside(outline, u, v)) continue
        this.samples.push({ position: fromPlane(plane, u, v, top), normal: plane.normal.clone() })
        placed++
      }
    }
  }

  /* -------------------------------------------------------------- */
  /* Queries                                                         */
  /* -------------------------------------------------------------- */

  roofSamples(): Anchor[] { return this.samples }

  heightAt(x: number, z: number): number | null {
    let best: number | null = null
    for (const roof of [this.main, this.garage, this.porch]) {
      const h = roof.heightAt(x, z)
      if (h !== null && (best === null || h > best)) best = h
    }
    return best === null ? null : best + 0.07
  }

  normalAt(x: number, z: number): Vector3 {
    let best: { h: number; n: Vector3 } | null = null
    for (const roof of [this.main, this.garage, this.porch]) {
      const h = roof.heightAt(x, z)
      if (h === null || (best && h <= best.h)) continue
      let normal = roof.planes[0].normal
      let closest = Infinity
      for (const plane of roof.planes) {
        const d = Math.abs(new Vector3(x, h, z).sub(plane.origin).dot(plane.normal))
        if (d < closest && inside(planeOutline(plane), new Vector3(x, h, z).sub(plane.origin).dot(plane.u), new Vector3(x, h, z).sub(plane.origin).dot(plane.v))) { closest = d; normal = plane.normal }
      }
      best = { h, n: normal }
    }
    return best ? best.n : new Vector3(0, 1, 0)
  }

  layerAnchor(key: LayerKey): Vector3 {
    return (this.layerAnchorBase.get(key) ?? new Vector3()).clone().add(this.layers[key].position)
  }

  metrics(): RoofMetrics {
    return measureRoof(this.config)
  }

  /* -------------------------------------------------------------- */
  /* Per-frame state                                                 */
  /* -------------------------------------------------------------- */

  update(state: ModelState, time: number) {
    const { explode, build } = state
    const building = build < 0.999
    const exploded = explode > 0.002
    const showSystem = building || exploded

    LAYERS.forEach((key, index) => {
      const group = this.layers[key]
      group.position.y = explode * index * LIFT_SPACING
      const hidden = !showSystem && (key === 'rafters' || key === 'icewater' || key === 'underlayment' || key === 'starter')
      group.visible = !hidden
    })

    // Focus: the layer being explained stays lit, the rest recede.
    const focusing = state.focus >= 0 && exploded
    const tint = (material: Mat, index: number) => {
      const base = this.baseColors.get(material)
      if (!base) return
      const k = focusing ? Math.max(0, 1 - Math.abs(index - state.focus)) : 1
      const level = 0.38 + 0.62 * (focusing ? smooth(0, 1, k) : 1)
      material.color.copy(base).multiplyScalar(level)
      material.emissive.set('#d0874a')
      material.emissiveIntensity = focusing ? Math.max(0, k - 0.4) * 0.16 : 0
    }
    const m = this.materials
    tint(m.rafter, 0); tint(m.deck, 1); tint(m.drip, 2); tint(m.icewater, 3); tint(m.underlayment, 4); tint(m.starter, 5)
    tint(this.finishMaterial, 6); tint(this.finishEdge, 6); tint(m.flashing, 7)
    tint(this.capMaterial, 8)
    if (this.ribMaterial !== this.finishMaterial) tint(this.ribMaterial, 6)

    // Chimney steps aside while the roof is taken apart.
    const chimneyFade = 1 - smooth(0.02, 0.16, explode)
    m.chimney.opacity = chimneyFade
    m.chimney.depthWrite = chimneyFade > 0.98
    const chimney = this.shell.getObjectByName('chimney')
    const cap = this.shell.getObjectByName('chimneyCap')
    if (chimney) chimney.visible = chimneyFade > 0.01
    if (cap) cap.visible = chimneyFade > 0.5

    // Construction: each trade sweeps across or climbs the roof.
    const phase = (a: number, b: number) => smooth(a, b, build)
    const sweep = (name: string, a: number, b: number) => {
      const plane = this.clips[name]
      if (!plane) return
      plane.normal.set(-1, 0, 0)
      plane.constant = building ? this.ranges.xMin + (this.ranges.xMax - this.ranges.xMin) * phase(a, b) : OFF
    }
    const climb = (name: string, a: number, b: number, low = this.ranges.yLow, high = this.ranges.yHigh) => {
      const plane = this.clips[name]
      if (!plane) return
      plane.normal.set(0, -1, 0)
      plane.constant = building ? low + (high - low) * phase(a, b) : OFF
    }
    const mainLow = this.main.eaveY - 0.15
    const mainHigh = this.main.ridgeY + 0.4
    sweep('rafters', 0.02, 0.24)
    sweep('deck', 0.16, 0.4)
    sweep('drip', 0.38, 0.47)
    sweep('icewater', 0.42, 0.52)
    climb('underlayment', 0.5, 0.63, mainLow, mainHigh)
    sweep('starter', 0.6, 0.67)
    climb('finish', 0.66, 0.9, mainLow, mainHigh)
    climb('finish2', 0.64, 0.8, this.porch.eaveY - 0.15, this.garage.ridgeY + 0.3)
    sweep('ridge', 0.88, 0.97)
    sweep('gutter', 0.93, 1.0)
    if (!building && exploded) {
      // Stepped cutaway: each layer starts one step further along the roof.
      const k = smooth(0, 1, explode)
      const cut = (name: string, index: number) => {
        const plane = this.clips[name]
        plane.normal.set(1, 0, 0)
        plane.constant = -(this.stepOrigin + this.step * (index - 0.4) * k)
      }
      cut('deck', 1); cut('drip', 2); cut('icewater', 3); cut('underlayment', 4); cut('starter', 5); cut('finish', 6.4); cut('ridge', 7.6)
    }
    this.layers.flashing.visible = !building || build > 0.86
    this.layers.flashing.scale.setScalar(1)

    // Upgrades.
    const up = state.upgrades
    const ease = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3)
    for (const group of this.upgradeGroups.skylights.children) {
      const f = ease(up.skylights)
      group.visible = up.skylights > 0.001
      const base = group.userData.base as Matrix4
      const normal = group.userData.normal as Vector3
      group.matrix.copy(base).premultiply(new Matrix4().makeTranslation(normal.clone().multiplyScalar((1 - f) * 0.9)))
      group.matrix.multiply(new Matrix4().makeScale(0.7 + 0.3 * f, 0.7 + 0.3 * f, 0.7 + 0.3 * f))
    }
    for (const panel of this.solarPanels) {
      const order = panel.userData.order as number
      const f = ease(up.solar * 1.6 - order * 0.06)
      panel.visible = f > 0.001
      const base = panel.userData.base as Matrix4
      const normal = panel.userData.normal as Vector3
      panel.matrix.copy(base).premultiply(new Matrix4().makeTranslation(normal.clone().multiplyScalar((1 - f) * 1.2)))
    }
    for (const child of this.upgradeGroups.snowGuards.children) {
      const guard = child as InstancedMesh
      const base = guard.userData.base as Matrix4[]
      const shown = Math.round(base.length * Math.min(1, up.snowGuards * 1.05))
      guard.count = shown
      guard.visible = shown > 0
    }
    const copperK = smooth(0, 1, up.copper)
    for (const material of [m.gutter, m.drip, m.chimneyCap]) {
      const base = this.baseColors.get(material)!
      material.color.copy(base).lerp(copper, copperK)
      material.metalness = 0.45 + 0.45 * copperK
      material.roughness = 0.42 - 0.12 * copperK
    }
    const lightK = up.lighting * (0.25 + 0.75 * state.night)
    if (m.soffitLight) { m.soffitLight.emissiveIntensity = lightK * 9; this.upgradeGroups.lighting.visible = up.lighting > 0.001 }
    if (m.soffitWash) m.soffitWash.opacity = lightK * 0.7
    m.mesh.opacity = up.gutterGuards * 0.85
    this.upgradeGroups.gutterGuards.visible = up.gutterGuards > 0.01

    // Night: rooms and porch lights come on.
    m.glassLit.emissiveIntensity = state.night * 2.4
    m.glassDim.emissiveIntensity = state.night * 0.7
    m.lightFixture.emissiveIntensity = state.night * 6
    m.wash.opacity = state.night * 0.65

    // Storm aftermath.
    m.bruise.opacity = state.damage * 0.78
    const tab = this.damageGroup.getObjectByName('liftedTab')
    if (tab) tab.visible = state.damage > 0.3
    this.damageGroup.visible = state.damage > 0.01
    void time
  }

  private disposeChildren(group: Group) {
    for (const child of [...group.children]) {
      group.remove(child)
      child.traverse(node => {
        const mesh = node as Mesh
        if (mesh.isMesh) mesh.geometry.dispose()
      })
    }
  }

  dispose() {
    this.disposeChildren(this.fixed)
    this.disposeChildren(this.shell)
    for (const key of LAYERS) this.disposeChildren(this.layers[key])
    this.disposeChildren(this.damageGroup)
    for (const upgrade of Object.values(this.upgradeGroups)) this.disposeChildren(upgrade)
    for (const material of new Set([...Object.values(this.materials), this.finishMaterial, this.finishEdge, this.capMaterial, this.ribMaterial, ...Object.values(this.secondary)])) material?.dispose()
    for (const texture of [this.glow, this.wash, this.interior, this.solar]) texture.dispose()
  }
}

/** The slope interval a plane covers at a given distance along its eave. */
function spanAt(plane: RoofPlane, u: number): [number, number] {
  const outline = planeOutline(plane)
  let low = Infinity
  let high = -Infinity
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i]
    const q = outline[(i + 1) % outline.length]
    if ((p.x - u) * (q.x - u) > 0 || p.x === q.x) continue
    const v = p.y + ((q.y - p.y) * (u - p.x)) / (q.x - p.x)
    low = Math.min(low, v)
    high = Math.max(high, v)
  }
  return Number.isFinite(low) ? [low, high] : [0, 1]
}

function inside(polygon: Vector2[], u: number, v: number): boolean {
  let result = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j]
    if ((a.y > v) !== (b.y > v) && u < ((b.x - a.x) * (v - a.y)) / (b.y - a.y) + a.x) result = !result
  }
  return result
}
