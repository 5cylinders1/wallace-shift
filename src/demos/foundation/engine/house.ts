import {
  BufferGeometry, CircleGeometry, Color, ExtrudeGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Shape, type Material, type Texture,
} from 'three'
import { HOUSE } from './ground'
import { merge, plain, rect, section, slab, worldUV } from './geometry'
import { cylinderAt } from './shapes'
import { blockTexture, concreteTexture, crackTexture, efflorescenceTexture, hatchTexture, sidingTexture } from './textures'
import { deformable } from './uniforms'

const H = HOUSE
const ROOF_THICK = 0.26
const roofY = (x: number) => H.ridge - (Math.abs(x) / 6) * (H.ridge - (H.ceiling + 0.2))
const EAVE_X = 6 + H.overhang

/** Joist positions along the house, 16 in. on centre. */
export const JOISTS = Array.from({ length: 28 }, (_, i) => -5.55 + i * 0.41)

/** A prism: a polygon on the section plane pushed back from z1 to z0. */
function prism(points: [number, number][], z0: number, z1: number): BufferGeometry {
  const shape = new Shape()
  points.forEach(([x, y], index) => (index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false })
  geometry.translate(0, 0, z0)
  return worldUV(plain(geometry))
}

/** Outline segments for a closed polygon on the section plane. */
function outline(points: [number, number][], z = 0.008): number[] {
  const out: number[] = []
  points.forEach(([x, y], index) => {
    const [x2, y2] = points[(index + 1) % points.length]
    out.push(x, y, z, x2, y2, z)
  })
  return out
}

const box = (x0: number, x1: number, y0: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

/** A wall run between openings: solid below and above, piers between. */
function wallWithOpenings(axis: 'x' | 'z', fixed: [number, number], span: [number, number], y: [number, number], openings: { from: number; to: number; sill: number; head: number }[]): BufferGeometry[] {
  const parts: BufferGeometry[] = []
  const make = (a0: number, a1: number, y0: number, y1: number) => {
    if (a1 - a0 < 0.001 || y1 - y0 < 0.001) return
    parts.push(axis === 'z' ? slab(fixed[0], fixed[1], y0, y1, a0, a1) : slab(a0, a1, y0, y1, fixed[0], fixed[1]))
  }
  const sorted = [...openings].sort((a, b) => a.from - b.from)
  let cursor = span[0]
  for (const opening of sorted) {
    make(cursor, opening.from, y[0], y[1])
    make(opening.from, opening.to, y[0], opening.sill)
    make(opening.from, opening.to, opening.head, y[1])
    cursor = opening.to
  }
  make(cursor, span[1], y[0], y[1])
  return parts
}

export interface CrackOverlay { material: MeshBasicMaterial; kind: 'step' | 'horizontal' | 'bloom' }

export class HouseModel {
  readonly group = new Group()
  readonly overlays: CrackOverlay[] = []
  private readonly materials: Material[] = []
  private readonly geometries: BufferGeometry[] = []
  private readonly textures: Texture[] = []
  private readonly puddle: Mesh
  private readonly puddleMaterial: MeshBasicMaterial
  readonly sectionLines: LineBasicMaterial

  constructor() {
    const std = (key: string, options: ConstructorParameters<typeof MeshStandardMaterial>[0]) => {
      const material = deformable(new MeshStandardMaterial({ roughness: 0.92, metalness: 0, ...options }), key)
      this.materials.push(material)
      return material
    }
    const basic = (key: string, options: ConstructorParameters<typeof MeshBasicMaterial>[0]) => {
      const material = deformable(new MeshBasicMaterial(options), key)
      this.materials.push(material)
      return material
    }
    const tex = <T extends Texture>(item: T, repeat = 1) => { item.repeat.set(repeat, repeat); this.textures.push(item); return item }

    const block = std('block', { map: tex(blockTexture(), 1 / 1.625), color: '#f2efe8' })
    const concrete = std('concrete', { map: tex(concreteTexture(), 0.5), color: '#f4f1ea' })
    const white = std('white', { color: '#efebe3' })
    const inner = std('inner', { color: '#e7e2d8' })
    const siding = std('siding', { map: tex(sidingTexture(), 1 / 1.2) })
    const roof = std('roof', { color: '#8e887e', roughness: 0.95 })
    const wood = std('wood', { color: '#cfae80', roughness: 0.85 })
    const steel = std('steel', { color: '#59606a', roughness: 0.5, metalness: 0.55 })
    const glass = std('glass', { color: '#a9bccb', roughness: 0.18, metalness: 0.1 })
    const appliance = std('appliance', { color: '#dedbd4', roughness: 0.6 })
    const trim = std('trim', { color: '#d9d4ca', roughness: 0.7 })

    const capConcrete = basic('cap-concrete', { map: tex(hatchTexture('concrete')) })
    const capGravel = basic('cap-gravel', { map: tex(hatchTexture('gravel'), 1.6) })
    const capStud = basic('cap-stud', { map: tex(hatchTexture('stud'), 2) })
    const capWood = basic('cap-wood', { map: tex(hatchTexture('wood'), 3) })
    const capRoof = basic('cap-roof', { color: '#4f4a43' })
    const capVoid = basic('cap-void', { color: '#ece8df' })
    const capWhite = basic('cap-white', { color: '#f6f3ed' })
    const capSteel = basic('cap-steel', { color: '#3d4148' })

    const add = (geometries: BufferGeometry[] | BufferGeometry, material: Material, shadows = true) => {
      const geometry = Array.isArray(geometries) ? merge(geometries) : geometries
      const mesh = new Mesh(geometry, material)
      mesh.castShadow = shadows
      mesh.receiveShadow = true
      this.group.add(mesh)
      this.geometries.push(geometry)
      return mesh
    }

    /* Basement ------------------------------------------------------- */
    const W = H.wall
    add([
      slab(H.x0, H.x0 + W, H.footingTop, H.wallTop, H.z0, 0),
      slab(H.x1 - W, H.x1, H.footingTop, H.wallTop, H.z0, 0),
      slab(H.x0 + W, H.x1 - W, H.footingTop, H.wallTop, H.z0, H.z0 + W),
    ], block)
    const fx = 0.3
    const wallMid = H.x1 - W / 2
    add([
      slab(-wallMid - fx, -wallMid + fx, H.footingBottom, H.footingTop, -7.6, 0),
      slab(wallMid - fx, wallMid + fx, H.footingBottom, H.footingTop, -7.6, 0),
      slab(-wallMid - fx, wallMid + fx, H.footingBottom, H.footingTop, -7.6, -6.9),
      slab(H.x0 + W, H.x1 - W, H.slabBottom, H.slabTop, H.z0 + W, 0),
    ], concrete)

    // Floor framing seen from below: joists, rims, a steel beam and its column.
    add([
      ...JOISTS.map(x => slab(x - 0.022, x + 0.022, H.wallTop, H.joistTop, H.z0 + W, 0)),
      slab(H.x0, H.x0 + 0.045, H.wallTop, H.joistTop, H.z0, 0),
      slab(H.x1 - 0.045, H.x1, H.wallTop, H.joistTop, H.z0, 0),
      slab(H.x0, H.x1, H.wallTop, H.joistTop, H.z0, H.z0 + 0.045),
    ], wood)
    add([
      slab(-0.08, 0.08, H.wallTop - 0.03, H.wallTop, H.z0 + W, 0),
      slab(-0.015, 0.015, H.wallTop - 0.25, H.wallTop - 0.03, H.z0 + W, 0),
      slab(-0.08, 0.08, H.wallTop - 0.28, H.wallTop - 0.25, H.z0 + W, 0),
      cylinderAt(0, H.slabTop, -3.6, 0.055, 0.055, H.wallTop - 0.28 - H.slabTop, 14),
    ], steel)
    add(slab(H.x0, H.x1, H.joistTop, H.floorTop, H.z0, 0), white)

    // Stairs up along the left wall, a water heater and a furnace at the back.
    const treads: BufferGeometry[] = []
    const rise = (H.floorTop - H.slabTop) / 15
    for (let i = 0; i < 15; i++) treads.push(slab(-5.72, -4.82, H.slabTop, H.slabTop + rise * (i + 1), -2.45 - 0.26 * (i + 1), -2.45 - 0.26 * i))
    add(treads, wood)
    add([cylinderAt(2.0, H.slabTop, -6.4, 0.28, 0.28, 1.5, 24), slab(2.7, 3.5, H.slabTop, -0.75, -6.95, -6.15)], appliance)
    add([cylinderAt(2.0, H.slabTop + 1.5, -6.4, 0.06, 0.06, 1.1, 10), slab(2.86, 3.34, -0.75, H.wallTop - 0.02, -6.9, -6.4)], steel)

    /* First floor ---------------------------------------------------- */
    const F0 = H.floorTop, F1 = H.ceiling
    const sideOpenings = [{ from: -5.7, to: -4.3, sill: 1.45, head: 2.65 }, { from: -2.9, to: -1.5, sill: 1.45, head: 2.65 }]
    for (const side of [-1, 1]) {
      const outer = side * H.x1
      const innerX = side * (H.x1 - 0.18)
      const skin: [number, number] = side < 0 ? [outer, outer + 0.02] : [outer - 0.02, outer]
      const core: [number, number] = side < 0 ? [outer + 0.02, innerX] : [innerX, outer - 0.02]
      add(wallWithOpenings('z', core, [H.z0, 0], [F0, F1], sideOpenings), inner)
      add(wallWithOpenings('z', skin, [H.z0, 0], [F0, F1], sideOpenings), siding)
      add(sideOpenings.map(o => slab(side * (H.x1 - 0.1) - 0.02, side * (H.x1 - 0.1) + 0.02, o.sill, o.head, o.from, o.to)), glass, false)
      add(sideOpenings.flatMap(o => [
        slab(Math.min(outer, outer + side * 0.06), Math.max(outer, outer + side * 0.06), o.sill - 0.05, o.sill, o.from - 0.05, o.to + 0.05),
      ]), trim)
    }
    const backOpening = [{ from: -0.8, to: 0.8, sill: 1.45, head: 2.65 }]
    add(wallWithOpenings('x', [H.z0 + 0.02, H.z0 + 0.18], [H.x0 + 0.18, H.x1 - 0.18], [F0, F1], backOpening), inner)
    add(wallWithOpenings('x', [H.z0, H.z0 + 0.02], [H.x0, H.x1], [F0, F1], backOpening), siding)
    add(slab(-0.8, 0.8, 1.45, 2.65, H.z0 + 0.08, H.z0 + 0.11), glass, false)

    // A partition with a door: the frame racks when the corner settles.
    add(wallWithOpenings('x', [-4.7, -4.6], [H.x0 + 0.18, 1.4], [F0, F1], [{ from: -3.7, to: -2.8, sill: F0, head: 2.65 }]), white)
    add([
      slab(-3.72, -3.66, F0, 2.67, -4.72, -4.58),
      slab(-2.84, -2.78, F0, 2.67, -4.72, -4.58),
      slab(-3.72, -2.78, 2.62, 2.68, -4.72, -4.58),
    ], trim)
    add(slab(-3.66, -2.84, F0 + 0.01, 2.62, -4.685, -4.635), std('door', { color: '#d6d0c4' }))

    // Simple furniture for scale.
    add([
      slab(2.2, 4.6, F0, 1.05, -3.6, -2.7), slab(2.2, 4.6, F0, 1.45, -3.78, -3.56),
      slab(-2.6, -0.9, 1.34, 1.39, -2.5, -1.4),
      ...[[-2.52, -2.42], [-1.08, -2.42], [-2.52, -1.48], [-1.08, -1.48]].map(([x, z]) => slab(x - 0.03, x + 0.03, F0, 1.34, z - 0.03, z + 0.03)),
      slab(-5.62, -3.8, F0, 1.1, -7.0, -5.05), slab(-5.62, -3.8, F0, 1.5, -7.04, -6.94),
    ], white)

    // Ceiling and attic floor.
    add(slab(H.x0 + 0.18, H.x1 - 0.18, F1, F1 + 0.04, H.z0 + 0.18, 0), inner)
    add(slab(H.x0, H.x1, F1 + 0.04, F1 + 0.2, H.z0, 0), white)

    // Roof: one chevron prism, ridge running back from the cut.
    const roofPoly: [number, number][] = [
      [-EAVE_X, roofY(EAVE_X)], [0, H.ridge], [EAVE_X, roofY(EAVE_X)],
      [EAVE_X, roofY(EAVE_X) + ROOF_THICK], [0, H.ridge + ROOF_THICK], [-EAVE_X, roofY(EAVE_X) + ROOF_THICK],
    ]
    add(prism(roofPoly, -7.8, 0), roof)
    add(prism([[H.x0, F1 + 0.2], [H.x1, F1 + 0.2], [0, H.ridge - 0.05]], H.z0, H.z0 + 0.18), siding)
    const gutter = std('gutter', { color: '#e3e0d9', roughness: 0.55 })
    add([
      slab(EAVE_X - 0.02, EAVE_X + 0.13, roofY(EAVE_X) - 0.16, roofY(EAVE_X), -7.8, 0),
      slab(-EAVE_X - 0.13, -EAVE_X + 0.02, roofY(EAVE_X) - 0.16, roofY(EAVE_X), -7.8, 0),
      slab(6.04, 6.14, 0.24, roofY(EAVE_X) - 0.12, -1.07, -0.97),
      slab(6.04, 6.5, 0.12, 0.24, -1.07, -0.97),
      slab(6.04, EAVE_X + 0.06, roofY(EAVE_X) - 0.16, roofY(EAVE_X) - 0.08, -1.07, -0.97),
    ], gutter)

    /* Section caps on the cut ----------------------------------------- */
    const caps = (geometries: BufferGeometry[], material: Material) => add(geometries, material, false)
    const coreInset = 0.035
    const blockCaps: BufferGeometry[] = []
    const voids: BufferGeometry[] = []
    const beds: number[] = []
    for (const side of [-1, 1]) {
      const a = side < 0 ? H.x0 : H.x1 - W
      blockCaps.push(rect(a, a + W, H.footingTop, H.wallTop))
      voids.push(rect(a + coreInset, a + W - coreInset, H.footingTop + 0.05, H.wallTop - 0.08, 0.005))
      for (let y = H.footingTop + 0.203; y < H.wallTop - 0.05; y += 0.203) beds.push(a + coreInset, y, 0.007, a + W - coreInset, y, 0.007)
    }
    caps(blockCaps, capConcrete)
    caps(voids, capVoid)
    caps([
      rect(-wallMid - fx, -wallMid + fx, H.footingBottom, H.footingTop),
      rect(wallMid - fx, wallMid + fx, H.footingBottom, H.footingTop),
      rect(H.x0 + W, H.x1 - W, H.slabBottom, H.slabTop),
    ], capConcrete)
    caps([rect(-wallMid + fx, wallMid - fx, H.slabBottom - 0.15, H.slabBottom, 0.003)], capGravel)
    caps([
      ...JOISTS.map(x => rect(x - 0.022, x + 0.022, H.wallTop, H.joistTop)),
      rect(H.x0, H.x0 + 0.045, H.wallTop, H.joistTop), rect(H.x1 - 0.045, H.x1, H.wallTop, H.joistTop),
      rect(H.x0, H.x1, H.joistTop, H.floorTop),
    ], capWood)
    caps([rect(-0.08, 0.08, H.wallTop - 0.03, H.wallTop), rect(-0.015, 0.015, H.wallTop - 0.25, H.wallTop - 0.03), rect(-0.08, 0.08, H.wallTop - 0.28, H.wallTop - 0.25)], capSteel)
    caps([rect(H.x0, H.x0 + 0.18, F0, F1), rect(H.x1 - 0.18, H.x1, F0, F1), rect(H.x0, H.x1, F1 + 0.04, F1 + 0.2)], capStud)
    caps([rect(H.x0 + 0.18, H.x1 - 0.18, F1, F1 + 0.04), rect(H.x0, H.x0 + 0.02, F0, F1, 0.005), rect(H.x1 - 0.02, H.x1, F0, F1, 0.005)], capWhite)
    caps([section(roofPoly)], capRoof)

    // Heavy outlines round everything the cut passes through.
    const lines: number[] = [...beds]
    for (const poly of [
      box(H.x0, H.x0 + W, H.footingTop, H.wallTop), box(H.x1 - W, H.x1, H.footingTop, H.wallTop),
      box(-wallMid - fx, -wallMid + fx, H.footingBottom, H.footingTop), box(wallMid - fx, wallMid + fx, H.footingBottom, H.footingTop),
      box(H.x0 + W, H.x1 - W, H.slabBottom, H.slabTop),
      box(H.x0, H.x0 + 0.18, F0, F1), box(H.x1 - 0.18, H.x1, F0, F1), box(H.x0, H.x1, H.joistTop, H.floorTop), box(H.x0, H.x1, F1, F1 + 0.2),
      roofPoly,
    ]) lines.push(...outline(poly))
    const lineGeometry = new BufferGeometry()
    lineGeometry.setAttribute('position', new Float32BufferAttribute(lines, 3))
    this.sectionLines = deformable(new LineBasicMaterial({ color: new Color('#1c1915'), transparent: true, opacity: 0.85 }), 'lines')
    this.materials.push(this.sectionLines)
    this.group.add(new LineSegments(lineGeometry, this.sectionLines))
    this.geometries.push(lineGeometry)

    /* Damage overlays --------------------------------------------------- */
    const wallHeight = H.wallTop - H.slabTop
    const overlay = (kind: CrackOverlay['kind'], texture: Texture, width: number, height: number, place: (geometry: PlaneGeometry) => void) => {
      this.textures.push(texture)
      const geometry = new PlaneGeometry(width, height)
      place(geometry)
      const material = basic(`overlay-${kind}-${this.overlays.length}`, { map: texture, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
      const mesh = new Mesh(plain(geometry), material)
      mesh.renderOrder = 2
      this.group.add(mesh)
      this.geometries.push(mesh.geometry)
      this.overlays.push({ material, kind })
    }
    // Stair-step crack in the left wall, following the mortar joints down and back.
    const stepPath = (startU: number, startV: number, steps: number, du: number): [number, number][] => {
      const points: [number, number][] = [[startU, startV]]
      let u = startU, v = startV
      for (let i = 0; i < steps; i++) {
        v -= 0.203; points.push([u, v])
        u += du; points.push([u, v])
      }
      return points
    }
    overlay('step', crackTexture(7, wallHeight, [stepPath(0.95, wallHeight - 0.12, 11, 0.2), stepPath(5.5, wallHeight - 0.3, 5, -0.2)], 3), 7, wallHeight, geometry => {
      geometry.rotateY(Math.PI / 2)
      geometry.translate(H.x0 + W + 0.002, H.slabTop + wallHeight / 2, -3.5)
    })
    overlay('step', crackTexture(11.5, wallHeight, [stepPath(1.6, wallHeight - 0.1, 8, -0.2)], 5), 11.5, wallHeight, geometry => {
      geometry.translate(0, H.slabTop + wallHeight / 2, H.z0 + W + 0.002)
    })
    overlay('step', crackTexture(3.2, 0.7, [[[2.12, 0.03], [1.98, 0.2], [1.86, 0.29], [1.66, 0.47], [1.55, 0.56]]], 9), 3.2, 0.7, geometry => {
      geometry.translate(H.x0 + 0.18 + 1.6, 2.68 + 0.35, -4.598)
    })
    // Horizontal crack along a bed joint in the right wall, stepping down at each end.
    const mid = 1.42
    overlay('horizontal', crackTexture(7, wallHeight, [[
      [0.35, 0.12], [0.35, 0.32], [0.55, 0.32], [0.55, 0.52], [0.75, 0.52], [0.75, 0.73], [0.95, 0.73], [0.95, 0.93], [1.15, 0.93], [1.15, 1.13], [1.35, 1.13], [1.35, mid],
      [5.8, mid], [5.8, 1.13], [6.0, 1.13], [6.0, 0.93], [6.2, 0.93], [6.2, 0.73], [6.4, 0.73], [6.4, 0.52], [6.6, 0.52], [6.6, 0.3],
    ]], 13), 7, wallHeight, geometry => {
      geometry.rotateY(-Math.PI / 2)
      geometry.translate(H.x1 - W - 0.002, H.slabTop + wallHeight / 2, -3.5)
    })
    overlay('bloom', efflorescenceTexture(7, 0.7), 7, 0.7, geometry => {
      geometry.rotateY(-Math.PI / 2)
      geometry.translate(H.x1 - W - 0.003, H.slabTop + 0.35, -3.5)
    })

    // Standing water spreading from the right-hand cove joint.
    const puddleGeometry = new CircleGeometry(1, 40)
    puddleGeometry.rotateX(-Math.PI / 2)
    this.puddleMaterial = new MeshBasicMaterial({ color: '#4b8fd9', transparent: true, opacity: 0, depthWrite: false })
    this.materials.push(this.puddleMaterial)
    this.puddle = new Mesh(puddleGeometry, this.puddleMaterial)
    this.puddle.position.set(H.x1 - W, H.slabTop + 0.004, -2.4)
    this.puddle.renderOrder = 3
    this.group.add(this.puddle)
    this.geometries.push(puddleGeometry)
  }

  update(state: { stepCrack: number; hCrack: number; puddle: number; night: number }) {
    for (const overlay of this.overlays) {
      overlay.material.opacity = overlay.kind === 'step' ? state.stepCrack : overlay.kind === 'horizontal' ? state.hCrack : Math.min(1, state.puddle * 1.4) * 0.8
    }
    const p = state.puddle
    this.puddle.visible = p > 0.01
    this.puddle.scale.set(0.4 + p * 2.4, 1, 0.3 + p * 1.95)
    this.puddleMaterial.opacity = Math.min(0.62, p * 1.2)
    this.sectionLines.opacity = 0.85 - state.night * 0.3
  }

  dispose() {
    for (const geometry of this.geometries) geometry.dispose()
    for (const material of this.materials) material.dispose()
    for (const texture of this.textures) texture.dispose()
  }
}
