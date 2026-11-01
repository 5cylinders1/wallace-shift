import {
  BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, DynamicDrawUsage, Group, IcosahedronGeometry,
  InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, OctahedronGeometry, PlaneGeometry, SphereGeometry,
  SRGBColorSpace, TorusGeometry, Vector3,
} from 'three'
import layout from './layout.json'
import { SYSTEM } from './network'
import type { TracerId } from './state'

type Profile = [number, number][]

/** Revolve a profile through part of a turn. Angle 0 is +x; PI/2 faces the viewer. */
function revolve(profile: Profile, from: number, sweep: number, segments: number, flip = false): BufferGeometry {
  const rows = profile.length
  const columns = segments + 1
  const positions = new Float32Array(rows * columns * 3)
  const uvs = new Float32Array(rows * columns * 2)
  const indices: number[] = []
  let arc = 0
  const arcs = profile.map(([r, y], i) => {
    if (i) arc += Math.hypot(r - profile[i - 1][0], y - profile[i - 1][1])
    return arc
  })
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = from + (column / segments) * sweep
      const offset = row * columns + column
      positions[offset * 3] = profile[row][0] * Math.cos(a)
      positions[offset * 3 + 1] = profile[row][1]
      positions[offset * 3 + 2] = profile[row][0] * Math.sin(a)
      uvs[offset * 2] = column / segments
      uvs[offset * 2 + 1] = arcs[row] / Math.max(arc, 1e-5)
    }
  }
  for (let row = 0; row < rows - 1; row++) {
    for (let column = 0; column < segments; column++) {
      const a = row * columns + column
      const b = a + 1
      const c = a + columns
      const d = c + 1
      if (flip) indices.push(a, b, c, b, d, c)
      else indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** Faces a cut wall, joining the outer and inner profile at one angle. */
function cutFace(outer: Profile, inner: Profile, angle: number, facing: 1 | -1): BufferGeometry {
  const rows = Math.min(outer.length, inner.length)
  const positions = new Float32Array(rows * 2 * 3)
  const uvs = new Float32Array(rows * 2 * 2)
  const indices: number[] = []
  const cos = Math.cos(angle), sin = Math.sin(angle)
  for (let i = 0; i < rows; i++) {
    positions.set([outer[i][0] * cos, outer[i][1], outer[i][0] * sin, inner[i][0] * cos, inner[i][1], inner[i][0] * sin], i * 6)
    uvs.set([0, i / rows, 1, i / rows], i * 4)
    if (i < rows - 1) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3
      if (facing > 0) indices.push(a, b, c, b, d, c)
      else indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** A pressure vessel profile: flat base, straight wall, domed top. */
function vesselProfile(radius: number, height: number, dome = 0.62): Profile {
  const profile: Profile = [[0.0001, 0], [radius * 0.82, 0], [radius * 0.92, 0.012], [radius, 0.06]]
  const domeHeight = radius * dome
  profile.push([radius, height - domeHeight])
  for (let i = 1; i <= 10; i++) {
    const t = (i / 10) * (Math.PI / 2)
    profile.push([Math.max(radius * Math.cos(t), 0.0001), height - domeHeight + domeHeight * Math.sin(t)])
  }
  return profile
}

const inset = (profile: Profile, by: number): Profile => profile.map(([r, y], i) => [Math.max(r - by, 0.0001), i === 0 ? y + by : Math.min(y, profile[profile.length - 1][1] - by)])

function brushedRoughness(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 16
  const context = canvas.getContext('2d')!
  for (let x = 0; x < 256; x++) {
    const v = 150 + Math.random() * 70
    context.fillStyle = `rgb(${v},${v},${v})`
    context.fillRect(x, 0, 1, 16)
  }
  const texture = new CanvasTexture(canvas)
  return texture
}

function badge(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const context = canvas.getContext('2d')!
  context.clearRect(0, 0, 512, 256)
  context.fillStyle = 'rgba(234, 239, 238, 0.92)'
  context.font = '500 92px Newsreader, Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('riffle', 256, 128)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export interface TracerSpec {
  color: string
  /** Stage that deals with it: 0 sediment, 1 carbon, 2 scale. -1 passes straight through. */
  stage: number
  /** 2 changes the particle instead of removing it. */
  keep?: boolean
}

export const TRACERS: Record<TracerId, TracerSpec> = {
  sediment: { color: '#d5a06a', stage: 0 },
  chlorine: { color: '#d9f05c', stage: 1 },
  chloramine: { color: '#8fe89a', stage: 1 },
  vocs: { color: '#f08bc1', stage: 1 },
  pfas: { color: '#ff7a59', stage: 1 },
  hardness: { color: '#ffc94d', stage: 2, keep: true },
  lead: { color: '#a9b4c6', stage: -1 },
  bacteria: { color: '#c79bff', stage: -1 },
}

const IDS = Object.keys(TRACERS) as TracerId[]

interface Particle {
  kind: TracerId
  /** Distance along the course. -1: waiting to enter. */
  at: number
  jitterX: number
  jitterY: number
  speed: number
  /** Time spent held on a filter surface, or -1 when moving. */
  held: number
  holdAt: Vector3
  converted: boolean
  scale: number
  stopAt: number
  stopStage: number
}

interface Leg { from: Vector3; to: Vector3; length: number; start: number; stage: number; phase: 'pipe' | 'down' | 'rise' }

const { tanks: T } = layout
const TZ = T.z
const SED_TOP = SYSTEM.head - 0.1
const SED_BOTTOM = SED_TOP - T.sediment.height
const BED_BOTTOM = T.floor + 0.14
const BED_TOP = T.floor + T.carbon.height * 0.66
const BEAD_TOP = T.floor + T.scale.height * 0.5

/**
 * The three-stage system, standing in the utility room at full size. Each
 * vessel is modelled in halves, so the front half can lift away and the
 * stage inside can be seen doing its job, with tracer particles for whatever
 * the visitor wants to follow.
 */
export class SystemModel {
  readonly group = new Group()
  private readonly fronts: { mesh: Object3D; materials: MeshPhysicalMaterial[]; base: Vector3 }[] = []
  private readonly geometries: BufferGeometry[] = []
  private readonly materials: (MeshStandardMaterial | MeshPhysicalMaterial | MeshBasicMaterial)[] = []
  private readonly cartridgeMaterial: MeshStandardMaterial
  private readonly beads: InstancedMesh | null = null
  private readonly beadSeeds: { x: number; y: number; z: number; r: number; p: number }[] = []
  private readonly particles: Particle[] = []
  private readonly dots: InstancedMesh
  private readonly crystals: InstancedMesh
  private readonly legs: Leg[] = []
  private readonly courseLength: number
  private readonly matrix = new Matrix4()
  private readonly color = new Color()
  private readonly scratch = new Vector3()
  private readonly reduced: boolean
  private load = 0
  private shownTracer: TracerId | 'all' | null = null
  private readonly stageStops: { start: number; end: number }[] = []

  constructor(options: { reduced: boolean; quality: 'high' | 'low' }) {
    this.reduced = options.reduced
    const count = options.quality === 'high' ? 1 : 0.55

    const enamel = new MeshPhysicalMaterial({ color: '#10242c', metalness: 0.1, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.18, side: DoubleSide, transparent: true })
    const backShell = new MeshStandardMaterial({ color: '#10242c', metalness: 0.1, roughness: 0.5, side: DoubleSide })
    const liner = new MeshStandardMaterial({ color: '#39474b', metalness: 0.75, roughness: 0.42, side: DoubleSide })
    const cutEdge = new MeshStandardMaterial({ color: '#c8d0d0', metalness: 1, roughness: 0.3, side: DoubleSide })
    const steel = new MeshStandardMaterial({ color: '#c2c8c8', metalness: 1, roughness: 0.36, roughnessMap: brushedRoughness() })
    const brass = new MeshStandardMaterial({ color: '#b98d3e', metalness: 1, roughness: 0.3 })
    this.materials.push(enamel, backShell, liner, cutEdge, steel, brass)
    this.fronts = []

    const vessel = (x: number, radius: number, height: number, y0: number, withBadge: boolean) => {
      const outer = vesselProfile(radius, height)
      const inner = inset(outer, 0.012)
      const group = new Group()
      group.position.set(x, y0, TZ)
      const add = (geometry: BufferGeometry, material: MeshStandardMaterial | MeshPhysicalMaterial, parent: Object3D = group) => {
        this.geometries.push(geometry)
        const mesh = new Mesh(geometry, material)
        parent.add(mesh)
        return mesh
      }
      // Back half stays, showing its lining.
      add(revolve(outer, Math.PI, Math.PI, 28, true), backShell)
      add(revolve(inner, Math.PI, Math.PI, 28), liner)
      add(cutFace(outer, inner, 0, 1), cutEdge)
      add(cutFace(outer, inner, Math.PI, -1), cutEdge)
      // Front half lifts away.
      const front = new Group()
      add(revolve(outer, 0, Math.PI, 28), enamel, front)
      add(revolve(inner, 0, Math.PI, 28, true), enamel, front)
      if (withBadge) {
        const labelMaterial = new MeshPhysicalMaterial({ map: badge(), transparent: true, roughness: 0.5, depthWrite: false })
        const label = new Mesh(new CylinderGeometry(radius + 0.002, radius + 0.002, 0.2, 24, 1, true, Math.PI * 0.32, Math.PI * 0.36), labelMaterial)
        label.position.y = height * 0.62
        this.geometries.push(label.geometry)
        this.materials.push(labelMaterial)
        front.add(label)
        this.fronts.push({ mesh: front, materials: [enamel, labelMaterial], base: new Vector3() })
      } else {
        this.fronts.push({ mesh: front, materials: [enamel], base: new Vector3() })
      }
      group.add(front)
      this.group.add(group)
      return group
    }

    // Stage 1: a clear-bowl sediment housing hung from the manifold.
    vessel(T.sediment.x, T.sediment.radius, T.sediment.height, SED_BOTTOM, false)
    // Stage 2 and 3: full-height vessels.
    vessel(T.carbon.x, T.carbon.radius, T.carbon.height, T.floor, true)
    vessel(T.scale.x, T.scale.radius, T.scale.height, T.floor, false)

    // Contact shadows: everything live needs help sitting on a floor that was baked without it.
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = shadowCanvas.height = 128
    const shadowContext = shadowCanvas.getContext('2d')!
    const shadowGradient = shadowContext.createRadialGradient(64, 64, 8, 64, 64, 64)
    shadowGradient.addColorStop(0, 'rgba(0,0,0,0.85)')
    shadowGradient.addColorStop(0.42, 'rgba(0,0,0,0.5)')
    shadowGradient.addColorStop(1, 'rgba(0,0,0,0)')
    shadowContext.fillStyle = shadowGradient
    shadowContext.fillRect(0, 0, 128, 128)
    const shadowMaterial = new MeshBasicMaterial({ map: new CanvasTexture(shadowCanvas), transparent: true, depthWrite: false, toneMapped: false })
    this.materials.push(shadowMaterial)
    const shadowGeometry = new PlaneGeometry(1, 1)
    shadowGeometry.rotateX(-Math.PI / 2)
    this.geometries.push(shadowGeometry)
    for (const tank of [T.carbon, T.scale]) {
      const shadow = new Mesh(shadowGeometry, shadowMaterial)
      shadow.position.set(tank.x + 0.03, T.floor + 0.006, TZ + 0.04)
      shadow.scale.set(tank.radius * 3.6, 1, tank.radius * 3)
      this.group.add(shadow)
    }

    // Heads and unions in machined steel, brass at the joints.
    const head = (x: number, y: number, radius: number) => {
      const body = new CylinderGeometry(radius * 0.62, radius * 0.72, 0.1, 24)
      const collar = new TorusGeometry(radius * 0.7, 0.012, 10, 28)
      this.geometries.push(body, collar)
      const a = new Mesh(body, steel); a.position.set(x, y, TZ)
      const b = new Mesh(collar, brass); b.position.set(x, y - 0.05, TZ); b.rotation.x = Math.PI / 2
      this.group.add(a, b)
    }
    head(T.sediment.x, SYSTEM.head - 0.04, T.sediment.radius)
    head(T.carbon.x, SYSTEM.head - 0.1, T.carbon.radius)
    head(T.scale.x, SYSTEM.head - 0.1, T.scale.radius)

    // Bracket on the wall behind the sediment housing.
    const bracketGeometry = new CylinderGeometry(0.012, 0.012, 0.8, 10)
    this.geometries.push(bracketGeometry)
    const bracket = new Mesh(bracketGeometry, steel)
    bracket.rotation.x = Math.PI / 2
    bracket.position.set(T.sediment.x, SYSTEM.head - 0.02, TZ - 0.42)
    this.group.add(bracket)

    // Stage 1 insides: a pleated cartridge. Real filter fabric folds, so they get real folds.
    const pleatR = T.sediment.radius - 0.05
    const rows = 2
    const pleats = 56
    const columns = pleats * 2
    const pPositions = new Float32Array((rows + 1) * (columns + 1) * 3)
    const pIndices: number[] = []
    const cartridgeHeight = T.sediment.height - 0.28
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const a = (column / columns) * Math.PI * 2
        const r = pleatR + (column % 2 === 0 ? 0.012 : -0.016)
        pPositions.set([r * Math.cos(a), (row / rows) * cartridgeHeight, r * Math.sin(a)], (row * (columns + 1) + column) * 3)
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1
        pIndices.push(a, c, b, b, c, d)
      }
    }
    const pleatGeometry = new BufferGeometry()
    pleatGeometry.setAttribute('position', new BufferAttribute(pPositions, 3))
    pleatGeometry.setIndex(pIndices)
    const flatPleats = pleatGeometry.toNonIndexed()
    flatPleats.computeVertexNormals()
    this.geometries.push(pleatGeometry, flatPleats)
    this.cartridgeMaterial = new MeshStandardMaterial({ color: '#f2efe6', roughness: 0.85, side: DoubleSide })
    this.materials.push(this.cartridgeMaterial)
    const cartridge = new Mesh(flatPleats, this.cartridgeMaterial)
    cartridge.position.set(T.sediment.x, SED_BOTTOM + 0.14, TZ)
    this.group.add(cartridge)
    const capGeometry = new CylinderGeometry(pleatR + 0.016, pleatR + 0.016, 0.018, 28)
    this.geometries.push(capGeometry)
    const capMaterial = new MeshStandardMaterial({ color: '#23292b', roughness: 0.5 })
    this.materials.push(capMaterial)
    for (const y of [SED_BOTTOM + 0.135, SED_BOTTOM + 0.14 + cartridgeHeight + 0.005]) {
      const cap = new Mesh(capGeometry, capMaterial)
      cap.position.set(T.sediment.x, y, TZ)
      this.group.add(cap)
    }

    // Stage 2 insides: a bed of catalytic carbon, granule by granule at the cut face.
    const carbonMaterial = new MeshStandardMaterial({ color: '#0d0e0f', roughness: 0.34, metalness: 0.5, flatShading: true })
    this.materials.push(carbonMaterial)
    const granule = new IcosahedronGeometry(1, 0)
    this.geometries.push(granule)
    const dummy = new Object3D()
    const fill = (x: number, radius: number, top: number, bottom: number, grains: number, size: number, mesh: InstancedMesh, each?: (i: number, d: Object3D) => void) => {
      for (let i = 0; i < grains; i++) {
        const h = bottom + Math.random() * (top - bottom)
        const span = Math.sqrt(Math.max(0, 1 - Math.pow(Math.random(), 1.2))) * radius
        const side = (Math.random() < 0.5 ? -1 : 1) * span * Math.random()
        dummy.position.set(x + side, h, TZ - Math.random() * 0.05)
        dummy.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
        const s = size * (0.72 + Math.random() * 0.6)
        dummy.scale.set(s, s * (0.75 + Math.random() * 0.4), s)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        each?.(i, dummy)
      }
      mesh.instanceMatrix.needsUpdate = true
      mesh.frustumCulled = false
      this.group.add(mesh)
    }
    const r2 = T.carbon.radius - 0.018
    fill(T.carbon.x, r2, BED_TOP, BED_BOTTOM, Math.round(6200 * count), 0.0125, new InstancedMesh(granule, carbonMaterial, Math.round(6200 * count)))
    // Solid core behind the granules so the bed never reads as hollow.
    const coreMaterial = new MeshStandardMaterial({ color: '#050606', roughness: 0.8 })
    this.materials.push(coreMaterial)
    const core = (x: number, top: number, radius: number, material: MeshStandardMaterial) => {
      const geometry = revolve([[0.0001, BED_BOTTOM], [radius, BED_BOTTOM], [radius, top], [0.0001, top]], Math.PI, Math.PI, 20, true)
      const cap = cutFace([[radius, BED_BOTTOM], [radius, top]], [[-radius, BED_BOTTOM], [-radius, top]], 0, 1)
      this.geometries.push(geometry, cap)
      const a = new Mesh(geometry, material); a.position.set(x, 0, TZ - 0.012)
      const b = new Mesh(cap, material); b.position.set(x, 0, TZ - 0.012)
      this.group.add(a, b)
    }
    core(T.carbon.x, BED_TOP, r2, coreMaterial)
    // Gravel underbed
    const gravelMaterial = new MeshStandardMaterial({ color: '#8a8173', roughness: 0.85, flatShading: true })
    this.materials.push(gravelMaterial)
    fill(T.carbon.x, r2, BED_BOTTOM + 0.05, BED_BOTTOM - 0.05, Math.round(420 * count), 0.022, new InstancedMesh(granule, gravelMaterial, Math.round(420 * count)))
    fill(T.scale.x, r2, BED_BOTTOM + 0.05, BED_BOTTOM - 0.05, Math.round(420 * count), 0.022, new InstancedMesh(granule, gravelMaterial, Math.round(420 * count)))

    // Stage 3 insides: ceramic beads the water keeps gently moving.
    const beadGeometry = new SphereGeometry(1, 10, 8)
    this.geometries.push(beadGeometry)
    const beadMaterial = new MeshStandardMaterial({ color: '#e8e3d6', roughness: 0.42, metalness: 0.02 })
    this.materials.push(beadMaterial)
    const beadCount = Math.round(1500 * count)
    const beads = new InstancedMesh(beadGeometry, beadMaterial, beadCount)
    beads.instanceMatrix.setUsage(DynamicDrawUsage)
    this.beads = beads
    fill(T.scale.x, r2, BEAD_TOP, BED_BOTTOM + 0.04, beadCount, 0.0105, beads, (_, d) => {
      this.beadSeeds.push({ x: d.position.x, y: d.position.y, z: d.position.z, r: d.scale.x, p: Math.random() * Math.PI * 2 })
    })
    const beadCore = new MeshStandardMaterial({ color: '#39505a', roughness: 0.6 })
    this.materials.push(beadCore)
    core(T.scale.x, BEAD_TOP, r2, beadCore)

    // Centre riser tubes
    const riser = new CylinderGeometry(0.018, 0.018, T.carbon.height - 0.2, 12)
    this.geometries.push(riser)
    const riserMaterial = new MeshPhysicalMaterial({ color: '#d7e4e6', metalness: 0, roughness: 0.15, transparent: true, opacity: 0.55, depthWrite: false })
    this.materials.push(riserMaterial)
    for (const x of [T.carbon.x, T.scale.x]) {
      const tube = new Mesh(riser, riserMaterial)
      tube.position.set(x, T.floor + (T.carbon.height - 0.2) / 2 + 0.12, TZ + 0.004)
      tube.renderOrder = 6
      this.group.add(tube)
    }

    // Tracer course: pipe, tank, pipe, tank, pipe, tank, outlet.
    const hx = SYSTEM.head + 0.04
    const v = (x: number, y: number, z = TZ + 0.03) => new Vector3(x, y, z)
    const addLeg = (from: Vector3, to: Vector3, stage: number, phase: Leg['phase']) => {
      const start = this.legs.length ? this.legs[this.legs.length - 1].start + this.legs[this.legs.length - 1].length : 0
      this.legs.push({ from, to, length: from.distanceTo(to), start, stage, phase })
    }
    const inlet = v(T.sediment.x - 0.5, hx, TZ)
    const stage0Start = () => this.legs.length ? this.legs[this.legs.length - 1].start + this.legs[this.legs.length - 1].length : 0
    addLeg(inlet, v(T.sediment.x - 0.12, hx, TZ), -1, 'pipe')
    let s = stage0Start()
    addLeg(v(T.sediment.x - 0.12, hx, TZ), v(T.sediment.x - 0.14, SED_TOP - 0.05), 0, 'down')
    addLeg(v(T.sediment.x - 0.14, SED_TOP - 0.05), v(T.sediment.x - 0.14, SED_BOTTOM + 0.14), 0, 'down')
    addLeg(v(T.sediment.x - 0.14, SED_BOTTOM + 0.14), v(T.sediment.x + 0.14, SED_BOTTOM + 0.14), 0, 'down')
    addLeg(v(T.sediment.x + 0.14, SED_BOTTOM + 0.14), v(T.sediment.x + 0.14, SED_TOP - 0.05), 0, 'rise')
    addLeg(v(T.sediment.x + 0.14, SED_TOP - 0.05), v(T.sediment.x + 0.12, hx, TZ), 0, 'pipe')
    this.stageStops.push({ start: s, end: stage0Start() })

    addLeg(v(T.sediment.x + 0.12, hx, TZ), v(T.sediment.x + 0.22, SYSTEM.jump, TZ), -1, 'pipe')
    addLeg(v(T.sediment.x + 0.22, SYSTEM.jump, TZ), v(T.carbon.x - 0.22, SYSTEM.jump, TZ), -1, 'pipe')
    addLeg(v(T.carbon.x - 0.22, SYSTEM.jump, TZ), v(T.carbon.x, hx, TZ), -1, 'pipe')
    s = stage0Start()
    addLeg(v(T.carbon.x, hx, TZ), v(T.carbon.x, BED_BOTTOM), 1, 'down')
    addLeg(v(T.carbon.x, BED_BOTTOM), v(T.carbon.x, BED_TOP + 0.26), 1, 'rise')
    addLeg(v(T.carbon.x, BED_TOP + 0.26), v(T.carbon.x, hx, TZ), 1, 'pipe')
    this.stageStops.push({ start: s, end: stage0Start() })

    addLeg(v(T.carbon.x, hx, TZ), v(T.carbon.x + 0.26, SYSTEM.jump, TZ), -1, 'pipe')
    addLeg(v(T.carbon.x + 0.26, SYSTEM.jump, TZ), v(T.scale.x - 0.26, SYSTEM.jump, TZ), -1, 'pipe')
    addLeg(v(T.scale.x - 0.26, SYSTEM.jump, TZ), v(T.scale.x, hx, TZ), -1, 'pipe')
    s = stage0Start()
    addLeg(v(T.scale.x, hx, TZ), v(T.scale.x, BED_BOTTOM), 2, 'down')
    addLeg(v(T.scale.x, BED_BOTTOM), v(T.scale.x, BEAD_TOP + 0.4), 2, 'rise')
    addLeg(v(T.scale.x, BEAD_TOP + 0.4), v(T.scale.x, hx, TZ), 2, 'pipe')
    this.stageStops.push({ start: s, end: stage0Start() })

    addLeg(v(T.scale.x, hx, TZ), v(T.scale.x + 0.26, SYSTEM.jump, TZ), -1, 'pipe')
    addLeg(v(T.scale.x + 0.26, SYSTEM.jump, TZ), v(SYSTEM.outlet[0] + 0.3, SYSTEM.jump, TZ), -1, 'pipe')
    const last = this.legs[this.legs.length - 1]
    this.courseLength = last.start + last.length

    const total = options.quality === 'high' ? 170 : 90
    for (let i = 0; i < total; i++) {
      this.particles.push({
        kind: 'sediment', at: -1, jitterX: Math.random() * 2 - 1, jitterY: Math.random(), speed: 0.5 + Math.random() * 0.2,
        held: -1, holdAt: new Vector3(), converted: false, scale: 0, stopAt: 0, stopStage: -1,
      })
    }
    const dotGeometry = new IcosahedronGeometry(1, 1)
    const crystalGeometry = new OctahedronGeometry(1, 0)
    this.geometries.push(dotGeometry, crystalGeometry)
    const dotMaterial = new MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
    const crystalMaterial = new MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
    this.materials.push(dotMaterial, crystalMaterial)
    this.dots = new InstancedMesh(dotGeometry, dotMaterial, total)
    this.crystals = new InstancedMesh(crystalGeometry, crystalMaterial, total)
    for (const mesh of [this.dots, this.crystals]) {
      mesh.instanceMatrix.setUsage(DynamicDrawUsage)
      mesh.frustumCulled = false
      mesh.renderOrder = 7
      this.group.add(mesh)
    }
    for (let i = 0; i < total; i++) {
      this.dots.setColorAt(i, this.color.set('#ffffff'))
      this.crystals.setColorAt(i, this.color)
    }
    this.particles.forEach((particle, index) => { particle.at = -((index / total) * this.courseLength) })
  }

  private positionAt(particle: Particle, out: Vector3): Leg {
    const distance = Math.min(particle.at, this.courseLength - 0.0001)
    let leg = this.legs[0]
    for (const candidate of this.legs) {
      if (distance >= candidate.start && distance < candidate.start + candidate.length) { leg = candidate; break }
    }
    const t = (distance - leg.start) / Math.max(leg.length, 1e-5)
    out.copy(leg.from).lerp(leg.to, t)
    if (leg.phase === 'rise' && leg.stage > 0) {
      // Fan out across the bed as the water climbs, then gather again.
      const spread = Math.sin(t * Math.PI)
      out.x += particle.jitterX * spread * (T.carbon.radius - 0.05)
      out.z = TZ + 0.02 + particle.jitterY * 0.03
    }
    return leg
  }

  private respawn(particle: Particle, tracer: TracerId | 'all') {
    particle.kind = tracer === 'all' ? IDS[Math.floor(Math.random() * IDS.length)] : tracer
    particle.at = 0
    particle.held = -1
    particle.converted = false
    particle.scale = 0
    const spec = TRACERS[particle.kind]
    particle.stopStage = spec.keep ? -1 : spec.stage
    particle.stopAt = 0
    if (spec.stage >= 0 && !spec.keep) {
      const stop = this.stageStops[spec.stage]
      const span = stop.end - stop.start
      particle.stopAt = spec.stage === 0
        ? stop.start + span * (0.18 + Math.random() * 0.35)
        : stop.start + span * (0.45 + Math.random() * 0.36)
    }
  }

  update(dt: number, time: number, state: { open: number; tracer: TracerId | 'all' | null; visible: boolean; focus: number; camera: Vector3 }) {
    const open = state.open
    for (const front of this.fronts) {
      front.mesh.position.set(0, open * 0.14, open * 0.52)
      const visible = open < 0.985
      front.mesh.visible = visible
      front.materials.forEach((material) => {
        const opacity = 1 - Math.min(1, open * 1.3)
        material.opacity = opacity
        material.depthWrite = opacity > 0.9
      })
    }

    if (!this.reduced && this.beads && open > 0.02) {
      const dummy = new Object3D()
      this.beadSeeds.forEach((seed, index) => {
        const lift = Math.sin(time * 1.2 + seed.p) * 0.005
        dummy.position.set(seed.x + Math.cos(time * 0.9 + seed.p) * 0.003, seed.y + lift, seed.z)
        dummy.scale.setScalar(seed.r)
        dummy.updateMatrix()
        this.beads!.setMatrixAt(index, dummy.matrix)
      })
      this.beads.instanceMatrix.needsUpdate = true
    }

    if (state.tracer) this.load = Math.min(1, this.load + dt * 0.02)
    const tan = this.color.set('#f2efe6').lerp(new Color('#a07a4e'), this.load * 0.7)
    this.cartridgeMaterial.color.copy(tan)

    const tracer = state.tracer
    if (tracer !== this.shownTracer) {
      // Show the choice now: spread the new particles along as much of the course as they'd reach.
      this.shownTracer = tracer
      if (tracer) {
        for (const particle of this.particles) {
          this.respawn(particle, tracer)
          particle.at = Math.random() * (particle.stopAt || this.courseLength)
          particle.scale = 1
          const spec = TRACERS[particle.kind]
          particle.converted = Boolean(spec.keep && particle.at > this.stageStops[2].start + (this.stageStops[2].end - this.stageStops[2].start) * 0.5)
        }
      }
    }
    const zero = this.matrix.makeScale(0, 0, 0)
    let dotsDirty = false
    if (!tracer || !state.visible) {
      this.dots.visible = false
      this.crystals.visible = false
      return
    }
    this.dots.visible = true
    this.crystals.visible = true
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]
      const spec = TRACERS[particle.kind]
      if (particle.at < 0) {
        particle.at += dt * 0.5
        if (particle.at >= 0) this.respawn(particle, tracer)
        this.dots.setMatrixAt(i, zero); this.crystals.setMatrixAt(i, zero)
        dotsDirty = true
        continue
      }
      // A tracer change sends new arrivals in the new colour without restarting the flow.
      let size = 0.0145
      if (particle.held >= 0) {
        particle.held += dt
        const fade = 1 - Math.min(1, particle.held / 3.2)
        this.scratch.copy(particle.holdAt)
        size *= Math.max(fade, 0)
        if (particle.held > 3.2) { this.respawn(particle, tracer); particle.at = -Math.random() * 0.8 }
      } else {
        particle.at += dt * particle.speed
        const leg = this.positionAt(particle, this.scratch)
        if (particle.stopAt && particle.at >= particle.stopAt) {
          particle.held = 0
          if (leg.stage === 0) this.scratch.z = TZ + (T.sediment.radius - 0.045)
          particle.holdAt.copy(this.scratch)
        }
        if (spec.keep && leg.stage === 2 && leg.phase === 'rise') particle.converted = true
        if (particle.at >= this.courseLength) { this.respawn(particle, tracer); particle.at = -Math.random() * 0.8 }
      }
      particle.scale = Math.min(1, particle.scale + dt * 3)
      const matrix = this.matrix.identity().makeScale(size * particle.scale, size * particle.scale, size * particle.scale).setPosition(this.scratch)
      this.color.set(spec.color)
      if (particle.converted) {
        this.crystals.setMatrixAt(i, matrix.clone().scale(new Vector3(1.25, 1.25, 1.25)))
        this.crystals.setColorAt(i, this.color)
        this.dots.setMatrixAt(i, zero)
      } else {
        this.dots.setMatrixAt(i, matrix)
        this.dots.setColorAt(i, this.color)
        this.crystals.setMatrixAt(i, zero)
      }
      dotsDirty = true
    }
    if (dotsDirty) {
      this.dots.instanceMatrix.needsUpdate = true
      this.crystals.instanceMatrix.needsUpdate = true
      if (this.dots.instanceColor) this.dots.instanceColor.needsUpdate = true
      if (this.crystals.instanceColor) this.crystals.instanceColor.needsUpdate = true
    }
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose())
    this.materials.forEach((material) => {
      material.map?.dispose()
      if ('roughnessMap' in material) material.roughnessMap?.dispose()
      material.dispose()
    })
  }
}
