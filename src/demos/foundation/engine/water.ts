import {
  BufferGeometry, DynamicDrawUsage, Group, InstancedMesh, Line, LineDashedMaterial, Matrix4, Mesh, MeshBasicMaterial,
  Quaternion, SphereGeometry, BoxGeometry, Vector3, type Material,
} from 'three'
import { HOUSE, gradeAt } from './ground'
import { section } from './geometry'

/**
 * Where water goes. Each route is a polyline through the model; particles
 * travel along it, faster on the surface and in pipes, slowly through soil.
 * Which routes run depends on the fixes in place, cheapest first:
 * extend the downspout, regrade, then drain inside or seal outside.
 */

type Point = [number, number, number, number?]
interface Route { points: Vector3[]; speed: number[]; cumulative: number[]; length: number; fade: boolean }

function route(points: Point[], fade = true): Route {
  const vectors = points.map(([x, y, z]) => new Vector3(x, y, z))
  const speed = points.map(point => point[3] ?? 1)
  const cumulative = [0]
  for (let i = 1; i < vectors.length; i++) cumulative.push(cumulative[i - 1] + vectors[i].distanceTo(vectors[i - 1]))
  return { points: vectors, speed, cumulative, length: cumulative[cumulative.length - 1], fade }
}

const join = (...parts: Point[][]): Point[] => parts.flatMap((part, index) => (index === 0 ? part : part.slice(1)))

const S = 0.025 // the section plane, just in front of the cut
const SOIL = 0.42
const roofTop = (x: number) => HOUSE.ridge - (Math.abs(x) / 6) * (HOUSE.ridge - (HOUSE.ceiling + 0.2)) + 0.27

const ROOF: Point[] = [[1.1, roofTop(1.1), -1.0, 1.6], [6.5, roofTop(6.5), -1.0, 1.2], [6.62, 3.2, -1.02], [6.1, 3.12, -1.02, 2.2], [6.1, 0.24, -1.02, 1.2], [6.45, 0.17, -1.02]]
const EXTENSION: Point[] = [[6.45, 0.17, -1.02, 1.6], [10.6, 0.1, -1.02, 1], [11.3, 0.02, -1.02, 0.7], [12.8, -0.02, -1.02]]
const AT_WALL: Point[] = [[6.45, 0.17, -1.02, 0.8], [6.5, 0.03, -0.55, 0.8], [6.55, 0.0, S]]
const along = (from: number, to: number): Point[] => Array.from({ length: 7 }, (_, i) => {
  const x = from + ((to - from) * i) / 6
  return [x, gradeAt(x, 1, 1) + 0.03, S, 0.9] as Point
})
const REGRADED: Point[] = [[6.55, gradeAt(6.55, 1, 1) + 0.03, S, 0.9], ...along(6.6, 11.6)]
const INFILTRATE: Point[] = [[6.55, 0.0, S, SOIL], [6.42, -0.6, S, SOIL], [6.3, -1.3, S, SOIL], [6.2, -1.9, S, SOIL], [6.1, -2.44, S, SOIL]]
const GROUND: Point[] = [[11.8, -2.0, S, SOIL], [9.4, -2.2, S, SOIL], [7.4, -2.38, S, SOIL], [6.1, -2.44, S, SOIL]]
const COVE: Point[] = [[6.1, -2.44, S, 0.5], [5.98, -2.47, S, 0.5], [5.76, -2.37, S, 0.7], [5.4, -2.336, -0.3, 0.6], [4.6, -2.336, -1.3, 0.5], [3.9, -2.336, -2.0]]
const DRAIN: Point[] = [[6.1, -2.44, S, 0.5], [5.98, -2.5, S, 0.5], [5.76, -2.5, S, 0.6], [5.5, -2.68, S, 0.8], [5.45, -2.74, S, 1.4], [4.5, -2.74, S, 1.2], [4.32, -2.96, S, 0.8], [4.2, -3.1, S]]
const MEMBRANE: Point[] = [[6.2, -1.9, S, SOIL], [6.09, -2.3, S, 0.7], [6.3, -2.52, S, 0.7], [6.48, -2.64, S]]
const PUMPED: Point[] = [[4.35, -2.95, -0.1, 2.4], [4.35, 0.45, -0.1, 2.4], [6.3, 0.45, -0.1, 2.2], [6.3, 0.1, -0.1, 2], [6.5, 0.06, -0.1, 1.8], [10.6, 0.03, -0.1, 1], [11.4, 0.0, -0.1, 0.7], [12.6, -0.02, -0.1]]

export interface FlowInput {
  rain: number
  flow: number
  pressure: number
  table: number
  extension: boolean
  regrade: boolean
  drain: boolean
  membrane: boolean
  pumping: boolean
}

interface Drop { route: number; distance: number; speed: number; size: number; alive: boolean }

const MAX_DROPS = 900
const RAIN = 1100

export class WaterModel {
  readonly group = new Group()
  private readonly routes: Route[]
  private readonly drops: Drop[] = []
  private readonly mesh: InstancedMesh
  private readonly rainMesh: InstancedMesh
  private readonly rainState: Float32Array
  private readonly materials: Material[] = []
  private readonly geometries: BufferGeometry[] = []
  private readonly guides: { line: Line; material: LineDashedMaterial; key: string }[] = []
  private readonly arrows: { mesh: Mesh; material: MeshBasicMaterial; kind: 'pressure' | 'swell' | 'shrink' }[] = []
  private readonly matrix = new Matrix4()
  private readonly position = new Vector3()
  private readonly scale = new Vector3()
  private readonly quaternion = new Quaternion()
  private readonly spawn = new Map<string, number>()
  private readonly reduced: boolean
  private readonly routeIndex: Record<string, number>
  /** Fill of the sump pit, 0..1, driven by what reaches it and the pump. */
  sumpLevel = 0.3
  private pumpOn = false

  constructor(reduced: boolean) {
    this.reduced = reduced
    const r = {
      roofExtension: route(join(ROOF, EXTENSION)),
      roofRegraded: route(join(ROOF, AT_WALL, REGRADED)),
      roofCove: route(join(ROOF, AT_WALL, INFILTRATE, COVE)),
      roofDrain: route(join(ROOF, AT_WALL, INFILTRATE, DRAIN), false),
      roofMembrane: route(join(ROOF, AT_WALL, INFILTRATE.slice(0, 4), MEMBRANE)),
      groundCove: route(join(GROUND, COVE)),
      groundDrain: route(join(GROUND, DRAIN), false),
      groundMembrane: route(join(GROUND.slice(0, 3), [[6.3, -2.5, S, 0.7], [6.48, -2.64, S]])),
      pumped: route(PUMPED),
    }
    this.routes = Object.values(r)
    this.routeIndex = Object.fromEntries(Object.keys(r).map((key, index) => [key, index])) as Record<keyof typeof r, number>

    const dropGeometry = new SphereGeometry(1, 8, 6)
    const dropMaterial = new MeshBasicMaterial({ color: '#2f7fd8', transparent: true, opacity: 0.92, depthWrite: false })
    this.mesh = new InstancedMesh(dropGeometry, dropMaterial, MAX_DROPS)
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage)
    this.mesh.count = 0
    this.mesh.renderOrder = 8
    this.mesh.frustumCulled = false
    this.group.add(this.mesh)
    this.materials.push(dropMaterial)
    this.geometries.push(dropGeometry)
    for (let i = 0; i < MAX_DROPS; i++) this.drops.push({ route: 0, distance: 0, speed: 1, size: 1, alive: false })

    const rainGeometry = new BoxGeometry(0.014, 0.42, 0.014)
    const rainMaterial = new MeshBasicMaterial({ color: '#7f9bbb', transparent: true, opacity: 0.55, depthWrite: false })
    this.rainMesh = new InstancedMesh(rainGeometry, rainMaterial, RAIN)
    this.rainMesh.instanceMatrix.setUsage(DynamicDrawUsage)
    this.rainMesh.frustumCulled = false
    this.rainMesh.count = 0
    this.group.add(this.rainMesh)
    this.materials.push(rainMaterial)
    this.geometries.push(rainGeometry)
    this.rainState = new Float32Array(RAIN * 3)
    for (let i = 0; i < RAIN; i++) {
      this.rainState[i * 3] = -16 + Math.random() * 32
      this.rainState[i * 3 + 1] = Math.random() * 16
      this.rainState[i * 3 + 2] = -17.5 + Math.random() * 17.3
    }

    // Reduced motion: the active routes are drawn as dashed lines instead.
    for (const [key, index] of Object.entries(this.routeIndex)) {
      const geometry = new BufferGeometry().setFromPoints(this.routes[index].points)
      const material = new LineDashedMaterial({ color: '#2f7fd8', dashSize: 0.22, gapSize: 0.14, transparent: true, opacity: 0, depthTest: false })
      const line = new Line(geometry, material)
      line.computeLineDistances()
      line.renderOrder = 9
      line.visible = false
      this.group.add(line)
      this.guides.push({ line, material, key })
      this.materials.push(material)
      this.geometries.push(geometry)
    }

    // Pressure arrows toward the right wall, swell and settlement arrows on the left.
    const arrowShape = (length: number): [number, number][] => [[0, 0], [-0.26, 0.15], [-0.26, 0.055], [-length, 0.055], [-length, -0.055], [-0.26, -0.055], [-0.26, -0.15]]
    const arrow = (kind: 'pressure' | 'swell' | 'shrink', x: number, y: number, angle: number, length: number, color: string) => {
      const geometry = section(arrowShape(length), 0)
      geometry.rotateZ(angle)
      geometry.translate(x, y, 0.03)
      const material = new MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, depthTest: false })
      const mesh = new Mesh(geometry, material)
      mesh.renderOrder = 10
      this.group.add(mesh)
      this.arrows.push({ mesh, material, kind })
      this.materials.push(material)
      this.geometries.push(geometry)
    }
    for (const y of [-0.7, -1.4, -2.1]) arrow('pressure', 6.42, y, Math.PI, 1.2, '#2f7fd8')
    for (const x of [-9.4, -8.2]) arrow('swell', x, -1.6, Math.PI / 2, 0.9, '#c4471f')
    for (const x of [-9.4, -8.2]) arrow('shrink', x, -2.1, -Math.PI / 2, 0.9, '#c4471f')
    arrow('shrink', -5.875, -3.0, -Math.PI / 2, 0.8, '#c4471f')
  }

  private emit(key: string, perSecond: number, dt: number) {
    const index = this.routeIndex[key]
    let pending = (this.spawn.get(key) ?? Math.random()) + perSecond * dt
    while (pending >= 1) {
      pending -= 1
      const drop = this.drops.find(item => !item.alive)
      if (!drop) break
      drop.alive = true
      drop.route = index
      drop.distance = Math.random() * 0.3
      drop.speed = 0.85 + Math.random() * 0.35
      drop.size = 0.038 + Math.random() * 0.022
    }
    this.spawn.set(key, pending)
  }

  update(dt: number, input: FlowInput, arrows: { pressure: number; swell: number; shrink: number }) {
    // Which way the water goes from the roof and from the ground.
    const roof = input.extension ? 'roofExtension' : input.regrade ? 'roofRegraded' : input.membrane ? 'roofMembrane' : input.drain ? 'roofDrain' : 'roofCove'
    const ground = input.membrane ? 'groundMembrane' : input.drain ? 'groundDrain' : 'groundCove'
    const groundRate = input.pressure * Math.max(0, Math.min(1, (input.table + 4.2) / 2)) * 26 * input.flow
    const active = new Set<string>()
    if (input.flow > 0.02 && input.rain > 0.02) active.add(roof)
    if (groundRate > 0.5) active.add(ground)

    // The pump runs in bursts once the pit fills, if it has power.
    const inflow = (active.has('roofDrain') ? input.rain * input.flow * 0.05 : 0) + (active.has('groundDrain') ? groundRate * 0.0025 : 0)
    if (input.drain) {
      this.sumpLevel = Math.min(1, this.sumpLevel + inflow * dt * 4 + 0.004 * dt)
      if (!input.pumping) this.pumpOn = false
      else if (this.sumpLevel > 0.82) this.pumpOn = true
      else if (this.sumpLevel < 0.28) this.pumpOn = false
      if (this.pumpOn) this.sumpLevel = Math.max(0.2, this.sumpLevel - dt * 0.28)
      if (this.pumpOn) active.add('pumped')
    }

    for (const guide of this.guides) {
      const on = this.reduced && active.has(guide.key)
      guide.line.visible = on
      guide.material.opacity = on ? 0.9 : 0
    }
    for (const item of this.arrows) {
      item.material.opacity = Math.min(0.92, arrows[item.kind])
      item.mesh.visible = arrows[item.kind] > 0.01
    }

    if (this.reduced) { this.mesh.count = 0; this.rainMesh.count = 0; return }

    if (active.has(roof)) this.emit(roof, input.rain * input.flow * 34, dt)
    if (active.has(ground)) this.emit(ground, groundRate, dt)
    if (active.has('pumped')) this.emit('pumped', 30, dt)

    let count = 0
    for (const drop of this.drops) {
      if (!drop.alive) continue
      const r = this.routes[drop.route]
      let segment = 1
      while (segment < r.cumulative.length - 1 && r.cumulative[segment] < drop.distance) segment++
      const speed = r.speed[segment - 1] * 2.1 * drop.speed
      drop.distance += speed * dt
      if (drop.distance >= r.length) { drop.alive = false; continue }
      const a = r.points[segment - 1], b = r.points[segment]
      const span = r.cumulative[segment] - r.cumulative[segment - 1]
      const t = span > 0 ? (drop.distance - r.cumulative[segment - 1]) / span : 0
      this.position.lerpVectors(a, b, Math.max(0, Math.min(1, t)))
      const remaining = r.length - drop.distance
      const shrink = r.fade ? Math.min(1, remaining / 0.8) : 1
      const size = drop.size * shrink * (r.speed[segment - 1] < 0.5 ? 0.85 : 1)
      this.scale.set(size, size, size)
      this.matrix.compose(this.position, this.quaternion, this.scale)
      this.mesh.setMatrixAt(count++, this.matrix)
    }
    this.mesh.count = count
    this.mesh.instanceMatrix.needsUpdate = true

    // Rain across the whole block, stopping at the roof or the lawn.
    const rainCount = Math.round(RAIN * Math.min(1, input.rain))
    for (let i = 0; i < rainCount; i++) {
      const s = this.rainState
      s[i * 3 + 1] -= dt * 13
      const x = s[i * 3], z = s[i * 3 + 2]
      const underRoof = Math.abs(x) < 6.6 && z > -7.8
      const floor = underRoof ? roofTop(x) : gradeAt(x, 1, 0)
      if (s[i * 3 + 1] < floor) s[i * 3 + 1] = 13 + Math.random() * 4
      this.position.set(x, s[i * 3 + 1], z)
      this.scale.set(1, 1, 1)
      this.matrix.compose(this.position, this.quaternion, this.scale)
      this.rainMesh.setMatrixAt(i, this.matrix)
    }
    this.rainMesh.count = rainCount
    this.rainMesh.instanceMatrix.needsUpdate = true
  }

  dispose() {
    for (const geometry of this.geometries) geometry.dispose()
    for (const material of this.materials) material.dispose()
  }
}
