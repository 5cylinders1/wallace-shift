import {
  Color, DirectionalLight, HemisphereLight, MathUtils, NeutralToneMapping, PCFShadowMap, PerspectiveCamera,
  PointLight, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
} from 'three'
import { Earth } from './earth'
import { FROST_DEPTH, HOUSE } from './ground'
import { HouseModel } from './house'
import { PIER_X, RepairModel, settleOffset } from './repairs'
import { REPAIRS, baseTarget, type SceneTarget } from './state'
import { shared } from './uniforms'
import { WaterModel } from './water'

export interface ScreenPoint { x: number; y: number; visible: boolean }
export interface FrameInfo { width: number; height: number; anchors: Record<string, ScreenPoint> }
export interface EngineOptions { quality: 'high' | 'low'; reducedMotion: boolean }

type Numeric = Exclude<keyof SceneTarget, 'camera' | 'repairs' | 'focus'>
const RATES: Record<Numeric, number> = {
  drift: 1.2, wet: 1.5, table: 1.3, dry: 1.5, gap: 1.5, frost: 1.6, pressure: 1.8, swell: 1.6, negGrade: 2, lawnDry: 1.2,
  autumn: 1.2, bare: 1.4, settle: 1.6, bow: 1.6, stepCrack: 2.2, hCrack: 2.2, puddle: 1.1, rain: 2, flow: 2, night: 1.6, power: 4,
}
const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt))

const PAPER = new Color('#e9e4da')
const STORM = new Color('#262b31')

/** Fixed points on the model for the labels the page pins to it. */
const ANCHORS: Record<string, [number, number, number]> = {
  topsoil: [-13.2, -0.2, 0], clay: [-13.2, -2.3, 0], shale: [-13.2, -5.6, 0], rock: [-13.2, -8.4, 0],
  backfill: [6.95, -1.6, 0], footing: [-5.875, -2.65, 0], coveJoint: [5.75, -2.36, -0.02], grade: [8.2, 0.02, 0],
  stepCrack: [-5.74, -1.45, -2.4], hCrack: [5.74, -0.93, -3.6], door: [-3.25, 2.3, -4.58], floor: [-4.4, 0.64, -1.4],
  downspout: [6.12, 1.6, -1.0], gap: [-6.08, -0.2, 0],
  piers: [PIER_X, -5.0, 0], helical: [PIER_X, -6.6, 0], anchors: [9.0, -1.25, 0], straps: [5.73, -0.5, -2.15], braces: [5.6, -0.9, -3.6],
  drain: [5.45, -2.74, 0], sump: [4.1, -2.9, 0], battery: [3.24, -2.06, -0.84], membrane: [6.02, -1.2, 0], extension: [10.4, 0.12, -1.02],
  regrade: [6.9, 0.2, 0], pressure: [7.4, -1.4, 0], swell: [-8.8, -1.4, 0],
}

export class FoundationEngine {
  readonly canvas: HTMLCanvasElement
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(30, 1, 1, 320)
  private readonly key = new DirectionalLight('#fff6ea', 2.5)
  private readonly hemi = new HemisphereLight('#f6f2ea', '#86796a', 1.15)
  private readonly fill = new DirectionalLight('#f3f0ea', 0.7)
  private readonly basementLight = new PointLight('#ffd9a8', 0, 11, 1.4)
  private readonly roomLight = new PointLight('#ffe2bb', 0, 11, 1.4)
  private readonly earth: Earth
  private readonly house: HouseModel
  private readonly repairs: RepairModel
  private readonly water: WaterModel
  private readonly options: EngineOptions
  private target: SceneTarget = structuredClone(baseTarget)
  private current: SceneTarget = structuredClone(baseTarget)
  private raf = 0
  private last = 0
  private time = 0
  private active = false
  private disposed = false
  private width = 1
  private height = 1
  private pixelRatio = 1
  private readonly maxPixelRatio: number
  private frameCost = 16
  private slowFor = 0
  private fastFor = 0
  private readonly pointer = new Vector2()
  private readonly pointerSmoothed = new Vector2()
  private readonly listeners = new Set<(frame: FrameInfo) => void>()
  private readonly frameInfo: FrameInfo = { width: 1, height: 1, anchors: {} }
  private readonly scratch = new Vector3()
  private readonly projected = new Vector3()
  private readonly background = new Color()
  private firstFrame: (() => void) | null = null
  private renderedOnce = false

  constructor(canvas: HTMLCanvasElement, options: EngineOptions) {
    this.canvas = canvas
    this.options = options
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = NeutralToneMapping
    this.renderer.toneMappingExposure = 1.02
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap
    this.maxPixelRatio = options.quality === 'high' ? 2 : 1.5

    const size = options.quality === 'high' ? 2048 : 1024
    this.key.castShadow = true
    this.key.shadow.mapSize.set(size, size)
    const s = this.key.shadow.camera
    s.left = -24; s.right = 24; s.top = 20; s.bottom = -16; s.near = 4; s.far = 120
    this.key.shadow.bias = -0.0005
    this.key.shadow.normalBias = 0.03
    this.key.position.set(-16, 30, 26)
    this.key.target.position.set(0, -2, -4)
    this.basementLight.position.set(0.6, -0.5, -3.4)
    this.roomLight.position.set(0.4, 2.9, -2.6)
    this.fill.position.set(10, 4, 30)
    this.scene.add(this.key, this.key.target, this.hemi, this.fill, this.basementLight, this.roomLight)

    this.earth = new Earth()
    this.house = new HouseModel()
    this.repairs = new RepairModel()
    this.water = new WaterModel(options.reducedMotion)
    this.scene.add(this.earth.group, this.house.group, this.repairs.group, this.water.group)
    canvas.addEventListener('webglcontextlost', this.onContextLost)
  }

  /* Public API ------------------------------------------------------- */

  setTarget(target: SceneTarget, immediate = false) {
    this.target = target
    if (immediate) this.current = structuredClone(target)
  }

  onFrame(listener: (frame: FrameInfo) => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  whenRendered(callback: () => void) {
    if (this.renderedOnce) callback()
    else this.firstFrame = callback
  }

  setActive(active: boolean) {
    if (this.disposed || active === this.active) return
    this.active = active
    cancelAnimationFrame(this.raf)
    if (active) {
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.loop)
    }
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, Math.round(width))
    this.height = Math.max(1, Math.round(height))
    const budget = this.options.quality === 'high' ? 4_600_000 : 2_100_000
    const device = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio)
    this.pixelRatio = Math.max(0.75, Math.min(device, Math.sqrt(budget / (this.width * this.height))))
    this.applySize()
    if (!this.active) this.renderOnce()
  }

  setPointer(x: number, y: number) { this.pointer.set(x, y) }

  renderOnce() {
    if (this.disposed) return
    this.step(0, true)
    this.render()
  }

  capture(type = 'image/jpeg', quality = 0.9): string {
    this.renderOnce()
    return this.canvas.toDataURL(type, quality)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.listeners.clear()
    this.earth.dispose()
    this.house.dispose()
    this.repairs.dispose()
    this.water.dispose()
    this.renderer.dispose()
  }

  /* Loop ------------------------------------------------------------- */

  private onContextLost = (event: Event) => {
    event.preventDefault()
    this.setActive(false)
    this.canvas.dispatchEvent(new CustomEvent('engine-lost'))
  }

  private applySize() {
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.setSize(this.width, this.height, false)
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
  }

  private loop = (now: number) => {
    if (!this.active || this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    if (document.hidden) { this.last = now; return }
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000))
    this.last = now
    const start = performance.now()
    this.step(dt)
    this.render()
    this.adapt(performance.now() - start, dt)
  }

  /** Keep the frame rate smooth by trading resolution, never content. */
  private adapt(cost: number, dt: number) {
    if (dt > 0.1 || dt === 0) return
    this.frameCost = this.frameCost * 0.92 + Math.max(cost, dt * 1000 * 0.9) * 0.08
    if (this.frameCost > 24) { this.slowFor += dt; this.fastFor = 0 } else if (this.frameCost < 13) { this.fastFor += dt; this.slowFor = 0 } else { this.slowFor = 0; this.fastFor = 0 }
    const floor = this.options.quality === 'high' ? 1 : 0.8
    const ceiling = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio)
    if (this.slowFor > 1.2 && this.pixelRatio > floor) {
      this.pixelRatio = Math.max(floor, this.pixelRatio - 0.15); this.slowFor = 0; this.applySize()
    } else if (this.fastFor > 5 && this.pixelRatio < ceiling - 0.01) {
      this.pixelRatio = Math.min(ceiling, this.pixelRatio + 0.1); this.fastFor = 0; this.applySize()
    }
  }

  private step(dt: number, snap = false) {
    const reduced = this.options.reducedMotion
    this.time += dt
    const c = this.current, t = this.target
    const ease = (from: number, to: number, rate: number) => (snap ? to : damp(from, to, rate, dt))
    for (const key of Object.keys(RATES) as Numeric[]) c[key] = ease(c[key], t[key], RATES[key])
    for (const key of REPAIRS) c.repairs[key] = ease(c.repairs[key], t.repairs[key], key === 'piers' || key === 'helical' || key === 'anchors' ? 3.2 : 2.4)
    c.focus = t.focus
    const cam = c.camera
    for (const key of ['azimuth', 'elevation', 'distance', 'offsetX', 'offsetY', 'fov'] as const) cam[key] = ease(cam[key], t.camera[key], 2.2)
    for (let i = 0; i < 3; i++) cam.target[i] = ease(cam.target[i], t.camera.target[i], 2.2)

    if (!reduced) this.pointerSmoothed.lerp(this.pointer, 1 - Math.exp(-dt * 2.4))
    const drift = reduced ? 0 : c.drift
    const az = MathUtils.degToRad(cam.azimuth + Math.sin(this.time * 0.07) * 3 * drift + this.pointerSmoothed.x * 2 * drift)
    const el = MathUtils.degToRad(MathUtils.clamp(cam.elevation + Math.sin(this.time * 0.05) * 0.9 * drift - this.pointerSmoothed.y * 1 * drift, -6, 70))
    const target = this.scratch.set(cam.target[0], cam.target[1], cam.target[2])
    this.camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * cam.distance,
      target.y + Math.sin(el) * cam.distance,
      target.z + Math.cos(az) * Math.cos(el) * cam.distance,
    )
    this.camera.lookAt(target)
    if (Math.abs(this.camera.fov - cam.fov) > 0.01) this.camera.fov = cam.fov
    this.camera.setViewOffset(this.width, this.height, -cam.offsetX * this.width, cam.offsetY * this.height, this.width, this.height)
    this.camera.updateProjectionMatrix()

    // Shared uniforms reach soil, house and repairs at once.
    shared.uTime.value = this.time
    shared.uSettle.value = c.settle
    shared.uBow.value = c.bow
    shared.uWet.value = c.wet
    shared.uTable.value = c.table
    shared.uDry.value = c.dry
    shared.uGap.value = c.gap
    shared.uFrost.value = c.frost
    shared.uSwell.value = c.swell
    shared.uNegGrade.value = c.negGrade
    shared.uRegrade.value = c.repairs.regrade
    shared.uFocus.value = c.focus
    shared.uFocusAmount.value = ease(shared.uFocusAmount.value, c.focus >= 0 ? 1 : 0, 3)
    shared.uNight.value = c.night
    shared.uLawnDry.value = c.lawnDry

    this.background.copy(PAPER).lerp(STORM, c.night)
    this.renderer.setClearColor(this.background)
    this.key.intensity = 2.5 - c.night * 1.9
    this.key.color.set('#fff6ea').lerp(new Color('#9fb2c9'), c.night)
    this.hemi.intensity = 1.15 - c.night * 0.6
    this.fill.intensity = 0.7 - c.night * 0.45
    const interior = 0.6 + c.night * 5.5
    this.basementLight.intensity = interior * (0.35 + 0.65 * c.power)
    this.roomLight.intensity = interior * 0.9 * c.power

    const r = c.repairs
    const pumping = r.drain > 0.5 && (c.power > 0.5 || r.battery > 0.5)
    this.water.update(snap ? 0 : dt, {
      rain: c.rain, flow: c.flow, pressure: c.pressure, table: c.table,
      extension: r.extension > 0.5, regrade: r.regrade > 0.5, drain: r.drain > 0.5, membrane: r.membrane > 0.5, pumping,
    }, { pressure: c.pressure * (1 - r.membrane) * 0.95, swell: c.swell, shrink: c.dry * 0.9 })
    this.repairs.update(r, c.settle, this.water.sumpLevel, r.drain > 0.5 && c.power < 0.5 && r.battery > 0.5)
    this.house.update({ stepCrack: c.stepCrack, hCrack: c.hCrack, puddle: c.puddle, night: c.night })
    this.earth.update({ autumn: c.autumn, bare: c.bare, frost: c.frost })
  }

  private render() {
    this.renderer.render(this.scene, this.camera)
    if (!this.renderedOnce) {
      this.renderedOnce = true
      const callback = this.firstFrame
      this.firstFrame = null
      callback?.()
    }
    if (this.listeners.size) this.emit()
  }

  private emit() {
    const info = this.frameInfo
    info.width = this.width
    info.height = this.height
    const c = this.current
    const project = (name: string, x: number, y: number, z: number) => {
      const point = (info.anchors[name] ??= { x: 0, y: 0, visible: false })
      const p = this.projected.set(x, y, z).project(this.camera)
      point.x = (p.x * 0.5 + 0.5) * this.width
      point.y = (-p.y * 0.5 + 0.5) * this.height
      point.visible = p.z < 1 && p.z > -1 && point.x > -40 && point.x < this.width + 40 && point.y > -40 && point.y < this.height + 40
    }
    for (const [name, [x, y, z]] of Object.entries(ANCHORS)) {
      const moves = x < 2.5 && y > -3
      project(name, x, y + (moves ? settleOffset(x, c.settle) : 0), z)
    }
    project('waterTable', 12.2, c.table, 0)
    project('frost', -13.6, -FROST_DEPTH / 2, 0)
    project('wallTop', HOUSE.x1, HOUSE.wallTop, 0)
    for (const listener of this.listeners) listener(info)
  }
}
