import { BufferGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, type Material, type Object3D, type Texture } from 'three'
import { HOUSE, shaleBottom } from './ground'
import { disc, merge, rect, section, slab } from './geometry'
import { pipe } from './shapes'
import { hatchTexture } from './textures'
import { deformable } from './uniforms'
import type { RepairKey, Repairs } from './state'

export const PIER_X = -6.33
/** Outer face of the left footing. */
const FOOTING_EDGE = -(HOUSE.x1 - HOUSE.wall / 2) - 0.3
const H = HOUSE
const PIER_BOTTOM = shaleBottom(PIER_X) - 0.45
const PIER_TOP = H.footingBottom

/** The model's settlement at a point, matching the GLSL deform. */
export function settleOffset(x: number, settle: number): number {
  const t = Math.max(0, Math.min(1, (x + 6.3) / 8.8))
  return -0.24 * settle * (1 - t * t * (3 - 2 * t))
}

interface Part {
  objects: Object3D[]
  materials: { material: Material & { opacity: number }; base: number }[]
}

/**
 * Each repair, drawn as it would appear in section: piers and anchors on the
 * cut face, straps and braces inside the basement, drainage in the slab.
 * `update` reveals them from their install progress, 0 to 1.
 */
export class RepairModel {
  readonly group = new Group()
  private readonly parts = new Map<RepairKey, Part>()
  private readonly geometries: BufferGeometry[] = []
  private readonly textures: Texture[] = []
  private readonly pushShaft: Mesh
  private readonly helicalShaft: Mesh
  private readonly pushBracket: Mesh
  private readonly helicalBracket: Mesh
  private readonly anchorRod: Mesh
  private readonly anchorPlate: Mesh
  private readonly extension: Mesh
  private readonly sumpWater: Mesh
  private readonly batteryLight: MeshBasicMaterial

  constructor() {
    const gravel = hatchTexture('gravel'); gravel.repeat.set(1.6, 1.6)
    const patch = hatchTexture('concrete')
    this.textures.push(gravel, patch)

    const part = (key: RepairKey): Part => {
      let entry = this.parts.get(key)
      if (!entry) { entry = { objects: [], materials: [] }; this.parts.set(key, entry) }
      return entry
    }
    const material = <T extends Material & { opacity: number }>(key: RepairKey, made: T): T => {
      made.transparent = true
      part(key).materials.push({ material: made, base: made.opacity })
      return made
    }
    const add = (key: RepairKey, geometry: BufferGeometry, made: Material, order = 4) => {
      const mesh = new Mesh(geometry, made)
      mesh.renderOrder = order
      mesh.castShadow = made instanceof MeshStandardMaterial
      mesh.receiveShadow = made instanceof MeshStandardMaterial
      this.group.add(mesh)
      this.geometries.push(geometry)
      part(key).objects.push(mesh)
      return mesh
    }
    const cap = (key: RepairKey, color: string, map?: Texture) => material(key, new MeshBasicMaterial({ color, map, depthWrite: false }))
    const solid = (key: RepairKey, options: ConstructorParameters<typeof MeshStandardMaterial>[0], deform = false) => {
      const made = material(key, new MeshStandardMaterial({ roughness: 0.6, ...options }))
      return deform ? deformable(made, `repair-${key}-${part(key).materials.length}`) : made
    }

    /* Piers: shafts grow down from a bracket to the limestone. --------- */
    const length = PIER_TOP - PIER_BOTTOM
    const shaft = (halfWidth: number, plates: boolean) => {
      const geometries = [rect(-halfWidth, halfWidth, -length, 0, 0.012)]
      if (plates) for (const lift of [0.3, 0.8, 1.35]) {
        const y = -length + lift
        geometries.push(section([[-0.19, y - 0.02], [0.19, y + 0.01], [0.19, y + 0.03], [-0.19, y]], 0.013))
      }
      return merge(geometries)
    }
    const bracketShape: [number, number][] = [[-0.22, -0.18], [0.2, -0.18], [0.2, -0.08], [0, -0.08], [0, 0.32], [-0.1, 0.32], [-0.1, -0.02], [-0.22, -0.02]]
    const steelCap = (key: RepairKey) => cap(key, '#353a41')
    this.pushShaft = add('piers', shaft(0.055, false), steelCap('piers'), 6)
    const shine = rect(-0.032, -0.014, -length, 0, 0.014)
    this.geometries.push(shine)
    const shineMesh = new Mesh(shine, cap('piers', '#8a929b'))
    shineMesh.renderOrder = 7
    this.pushShaft.add(shineMesh)
    this.pushBracket = add('piers', section(bracketShape, 0.012), steelCap('piers'), 6)
    this.helicalShaft = add('helical', shaft(0.026, true), steelCap('helical'), 6)
    this.helicalBracket = add('helical', section(bracketShape, 0.012), steelCap('helical'), 6)

    /* Wall anchors: rods through the wall to plates in stable soil. ---- */
    const anchorY = -1.25
    const rodLength = 3.95
    this.anchorRod = add('anchors', rect(0, rodLength, -0.014, 0.014, 0.012), steelCap('anchors'), 6)
    this.anchorRod.position.set(H.x1 - H.wall, anchorY, 0)
    this.anchorPlate = add('anchors', rect(-0.045, 0.045, -0.32, 0.32, 0.012), steelCap('anchors'), 6)
    this.anchorPlate.position.set(H.x1 - H.wall + rodLength, anchorY, 0)
    add('anchors', merge([-0.4, -2.6, -4.8].map(z => slab(5.63, 5.749, anchorY - 0.26, anchorY + 0.26, z - 0.22, z + 0.22))), solid('anchors', { color: '#4b525b', metalness: 0.5 }, true))

    /* Carbon fibre straps and steel braces on the inside face. --------- */
    add('straps', merge([-0.75, -2.15, -3.55, -4.95, -6.35].flatMap(z => [
      slab(5.735, 5.749, H.slabTop, H.wallTop - 0.02, z - 0.065, z + 0.065),
      slab(5.6, 5.749, H.wallTop - 0.14, H.wallTop - 0.02, z - 0.08, z + 0.08),
    ])), solid('straps', { color: '#25282c', roughness: 0.42 }, true))
    add('braces', merge([-1.45, -3.6, -5.75].flatMap(z => [
      slab(5.52, 5.6, H.slabTop, H.wallTop, z - 0.07, z + 0.07),
      slab(5.6, 5.64, H.slabTop, H.wallTop, z - 0.012, z + 0.012),
      slab(5.64, 5.72, H.slabTop, H.wallTop, z - 0.07, z + 0.07),
      slab(5.38, 5.72, H.slabTop, H.slabTop + 0.03, z - 0.16, z + 0.16),
    ])), solid('braces', { color: '#69707a', metalness: 0.5, roughness: 0.45 }, true))

    /* Interior drain tile: a gravel trench, a pipe and a slab patch. ---- */
    add('drain', rect(5.15, H.x1 - H.wall, -2.98, H.slabTop - 0.07, 0.007), cap('drain', '#ffffff', gravel), 5)
    add('drain', rect(5.15, H.x1 - H.wall, H.slabTop - 0.07, H.slabTop, 0.007), cap('drain', '#c9c3b6', patch), 5)
    add('drain', disc(5.45, -2.74, 0.06, 0.009), cap('drain', '#2b2e33'), 6)
    add('drain', disc(5.45, -2.74, 0.042, 0.01), cap('drain', '#e9e6df'), 6)
    add('drain', rect(4.48, 5.15, -2.79, -2.69, 0.008), cap('drain', '#2b2e33'), 6)
    add('drain', merge([
      slab(5.15, H.x1 - H.wall, H.slabTop - 0.001, H.slabTop + 0.003, -7.0, 0),
    ]), solid('drain', { color: '#bcb6a9', roughness: 0.9 }))
    add('drain', slab(H.x1 - H.wall - 0.008, H.x1 - H.wall - 0.001, H.slabTop, H.slabTop + 0.35, -7.0, 0), solid('drain', { color: '#2f3237', roughness: 0.7 }, true))

    /* Sump pit, pump and discharge. ------------------------------------- */
    add('sump', rect(3.72, 4.48, -3.24, H.slabTop, 0.007), cap('sump', '#2e3135'), 5)
    add('sump', rect(3.77, 4.43, -3.19, H.slabTop, 0.008), cap('sump', '#ece8df'), 5)
    this.sumpWater = add('sump', rect(3.77, 4.43, 0, 1, 0.009), cap('sump', '#3f86d6'), 6)
    this.sumpWater.position.y = -3.19
    add('sump', rect(3.93, 4.25, -3.17, -2.88, 0.01), cap('sump', '#555a61'), 7)
    add('sump', rect(4.31, 4.39, -2.95, H.slabTop, 0.01), cap('sump', '#d9d6cf'), 7)
    add('sump', slab(3.66, 4.54, H.slabTop, H.slabTop + 0.03, -0.42, -0.002), solid('sump', { color: '#3a3d42', roughness: 0.6 }))
    add('sump', pipe([[4.35, -2.4, -0.1], [4.35, 0.45, -0.1], [5.9, 0.45, -0.1], [6.3, 0.45, -0.1], [6.3, 0.1, -0.1], [6.5, 0.06, -0.1]], 0.035), solid('sump', { color: '#ebe8e1', roughness: 0.5 }))
    add('sump', pipe([[6.5, 0.06, -0.1], [10.6, 0.03, -0.1]], 0.05), solid('sump', { color: '#2d3034', roughness: 0.8 }))
    add('battery', slab(3.0, 3.48, H.slabTop, H.slabTop + 0.29, -1.05, -0.62), solid('battery', { color: '#3c4047', roughness: 0.5 }))
    this.batteryLight = cap('battery', '#6fd08c')
    add('battery', slab(3.18, 3.3, H.slabTop + 0.24, H.slabTop + 0.27, -0.62, -0.6), this.batteryLight, 6)

    /* Exterior membrane and footing drain. ----------------------------- */
    add('membrane', rect(H.x1, H.x1 + 0.04, H.footingTop, -0.03, 0.009), cap('membrane', '#24272b'), 6)
    add('membrane', rect(6.18, 6.8, -2.88, -2.36, 0.008), cap('membrane', '#ffffff', gravel), 5)
    add('membrane', disc(6.48, -2.64, 0.06, 0.01), cap('membrane', '#2b2e33'), 6)
    add('membrane', disc(6.48, -2.64, 0.042, 0.011), cap('membrane', '#e9e6df'), 6)

    /* Downspout extension. --------------------------------------------- */
    this.extension = add('extension', slab(0, 4.1, 0.03, 0.12, -1.07, -0.97), solid('extension', { color: '#e3e0d9', roughness: 0.55 }))
    this.extension.position.x = 6.5
  }

  update(repairs: Repairs, settle: number, sumpLevel: number, onBattery: boolean) {
    for (const [key, entry] of this.parts) {
      const p = repairs[key]
      const visible = p > 0.004
      for (const object of entry.objects) object.visible = visible
      const fade = Math.min(1, p * 3)
      for (const { material, base } of entry.materials) material.opacity = base * fade
    }
    const corner = PIER_TOP + settleOffset(PIER_X, settle)
    const grow = (shaft: Mesh, bracket: Mesh, p: number) => {
      shaft.position.set(PIER_X, corner - 0.03, 0)
      shaft.scale.y = Math.max(0.001, Math.min(1, p / 0.8))
      bracket.position.set(FOOTING_EDGE, corner, 0)
    }
    grow(this.pushShaft, this.pushBracket, repairs.piers)
    grow(this.helicalShaft, this.helicalBracket, repairs.helical)
    this.anchorRod.scale.x = Math.max(0.001, Math.min(1, repairs.anchors / 0.7))
    this.anchorPlate.visible = repairs.anchors > 0.7
    this.extension.scale.x = Math.max(0.001, Math.min(1, repairs.extension * 1.4))
    this.sumpWater.scale.y = Math.max(0.001, sumpLevel * 0.78)
    this.batteryLight.color.set(onBattery ? '#f2b84b' : '#6fd08c')
  }

  dispose() {
    for (const geometry of this.geometries) geometry.dispose()
    for (const entry of this.parts.values()) for (const { material } of entry.materials) material.dispose()
    for (const texture of this.textures) texture.dispose()
  }
}
