import {
  ACESFilmicToneMapping, BackSide, BoxGeometry, Color, DirectionalLight, MathUtils, Mesh, MeshBasicMaterial, PerspectiveCamera, PMREMGenerator,
  PlaneGeometry, PointLight, Scene, ShaderMaterial, SphereGeometry, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
} from 'three'
import { FixturesModel } from './fixtures'
import { HouseModel } from './house'
import layout from './layout.json'
import { FIXTURE_PIPE, SHUTOFF, TAP_FILTER, type FixtureId } from './network'
import { Plumbing } from './plumbing'
import { baseTarget, type SceneTarget, type World } from './state'
import { PIPE_X, ScaleStudy } from './study'
import { SystemModel } from './system'
import { WaterVolume } from './volume'

export interface ScreenPoint { x: number; y: number; visible: boolean }
export interface FrameInfo {
  width: number
  height: number
  anchors: Record<string, ScreenPoint>
  treated: Record<string, number>
}
export interface EngineOptions { quality: 'high' | 'low'; reducedMotion: boolean }

const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt))

const { fixtures: FX, levels: LV, tanks: T, main: MAIN } = layout

/** Fixed points on the model for labels the page pins to it. */
const ANCHORS: Record<string, [number, number, number]> = {
  main: [MAIN.x, MAIN.y + 0.34, layout.cut],
  shutoff: SHUTOFF,
  hose: [FX.hose.x - 0.1, FX.hose.y + 0.05, FX.hose.z],
  system: [T.carbon.x, T.floor + T.carbon.height + 0.32, T.z],
  underSink: TAP_FILTER,
  heater: [FX.heater.x, LV.basementFloor + FX.heater.height * 0.55, FX.heater.z + FX.heater.radius],
  kitchenSink: [FX.kitchenSink.x, FX.kitchenSink.y + 0.36, FX.kitchenSink.z],
  dishwasher: [FX.dishwasher.x, LV.groundFloor + 0.2, -2.38],
  fridge: [FX.fridge.x, LV.groundFloor + 1.5, -2.28],
  vanity: [FX.vanity.x, FX.vanity.y + 0.4, -2.7],
  toilet: [FX.toilet.x, LV.upperFloor + 0.55, -2.6],
  shower: [FX.shower.x, FX.shower.headY + 0.08, FX.shower.z],
  washer: [FX.washer.x, LV.basementFloor + 0.5, FX.washer.z],
  tank0: [T.sediment.x - 0.08, T.floor + 0.62, T.z + T.sediment.radius],
  tank1: [T.carbon.x - 0.14, T.floor + 0.04, T.z + T.carbon.radius],
  tank2: [T.scale.x - 0.14, T.floor + 0.04, T.z + T.scale.radius],
  pipeRaw: [-PIPE_X - 0.5, 0.22, 2.7],
  pipeClean: [PIPE_X - 0.5, 0.22, 2.7],
}

const SKY_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }
`

const SKY_FRAGMENT = /* glsl */ `
varying vec2 vUv;
uniform float uDim; uniform float uTime; uniform vec2 uGlow;
float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 top = vec3(0.016, 0.034, 0.055);
  vec3 horizon = vec3(0.070, 0.135, 0.175);
  vec3 floorTone = vec3(0.012, 0.024, 0.036);
  float h = vUv.y;
  vec3 color = h > 0.34 ? mix(horizon, top, smoothstep(0.34, 1.0, h)) : mix(floorTone, horizon, smoothstep(0.0, 0.34, h));
  float glow = exp(-pow(distance(vUv, uGlow) * 1.5, 2.0));
  color += vec3(0.05, 0.075, 0.085) * glow;
  color = mix(color, vec3(0.012, 0.02, 0.028), uDim);
  // Dither: this gradient runs dark and slow, exactly where banding shows.
  color += (rand(gl_FragCoord.xy + uTime) - 0.5) / 255.0 * 1.6;
  gl_FragColor = vec4(color, 1.0);
}
`

/**
 * One scene, one camera. The page asks for a target state and the engine eases
 * to it, so the visitor always feels they moved through one house. Only the
 * scale study is somewhere else, reached through a brief fade.
 */
export class WaterEngine {
  readonly canvas: HTMLCanvasElement
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(28, 1, 0.1, 400)
  private readonly house = new HouseModel()
  private readonly plumbing: Plumbing
  private readonly fixtures: FixturesModel
  private readonly system: SystemModel
  private readonly study: ScaleStudy
  private readonly volume = new WaterVolume()
  private readonly options: EngineOptions
  private readonly sky: Mesh
  private readonly skyMaterial: ShaderMaterial
  private readonly curtain: Mesh
  private readonly curtainMaterial: MeshBasicMaterial
  private readonly shadowMaterial: ShaderMaterial
  private readonly systemLight = new PointLight('#ffe9cf', 0, 7, 1.4)
  private target: SceneTarget = structuredClone(baseTarget)
  private current: SceneTarget = structuredClone(baseTarget)
  private shownWorld: World = 'house'
  private curtainValue = 0
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
  private readonly orbit = new Vector2()
  private readonly orbitTarget = new Vector2()
  private readonly listeners = new Set<(frame: FrameInfo) => void>()
  private readonly frameInfo: FrameInfo = { width: 1, height: 1, anchors: {}, treated: {} }
  private readonly scratch = new Vector3()
  private readonly projected = new Vector3()
  private readonly firstFrame: (() => void)[] = []
  private renderedOnce = false
  private loaded = false
  private targeted = false

  constructor(canvas: HTMLCanvasElement, options: EngineOptions) {
    this.canvas = canvas
    this.options = options
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1
    this.maxPixelRatio = options.quality === 'high' ? 2 : 1.5

    const quality = options.quality
    this.plumbing = new Plumbing({ reduced: options.reducedMotion, quality })
    this.fixtures = new FixturesModel({ reduced: options.reducedMotion, quality })
    this.system = new SystemModel({ reduced: options.reducedMotion, quality })
    this.study = new ScaleStudy({ reduced: options.reducedMotion })
    this.study.group.visible = false

    this.scene.environment = this.buildEnvironment()
    this.scene.environmentIntensity = 0.9

    this.skyMaterial = new ShaderMaterial({
      vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: { uDim: { value: 0 }, uTime: { value: 0 }, uGlow: { value: new Vector2(0.6, 0.56) } },
    })
    this.sky = new Mesh(new PlaneGeometry(2, 2), this.skyMaterial)
    this.sky.frustumCulled = false
    this.sky.renderOrder = -10

    // A soft pool of shadow under the model, so it sits in the air rather than on nothing.
    this.shadowMaterial = new ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec2 vUv; uniform float uAlpha;
        void main() { vec2 d = (vUv - 0.5) * 2.0; float r = dot(d, d); gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha * exp(-r * 3.2)); }`,
      uniforms: { uAlpha: { value: 0.75 } },
    })
    const shadow = new Mesh(new PlaneGeometry(48, 24), this.shadowMaterial)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.set(-2, layout.plinth.bottom - 0.9, -2)
    shadow.renderOrder = -5

    // The filter system gets a little light of its own, since it is live and the room is baked.
    this.systemLight.position.set(-3.2, -0.5, -0.6)
    const systemFill = new DirectionalLight('#fff2df', 0.9)
    systemFill.position.set(-2, 3, 6)

    this.curtainMaterial = new MeshBasicMaterial({ color: '#050a0e', transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false })
    this.curtain = new Mesh(new PlaneGeometry(2, 2), this.curtainMaterial)
    this.curtain.frustumCulled = false
    this.curtain.renderOrder = 100
    this.curtain.onBeforeRender = () => {
      // Pinned to the camera: fill the screen whatever the view.
      this.curtain.position.copy(this.camera.position)
      this.curtain.quaternion.copy(this.camera.quaternion)
      this.curtain.translateZ(-1)
      this.curtain.scale.setScalar(4)
      this.curtain.updateMatrixWorld()
    }

    this.scene.add(this.sky, shadow, this.house.group, this.plumbing.group, this.system.group, this.fixtures.group, this.volume.group, this.study.group, this.systemLight, systemFill, this.curtain)
    canvas.addEventListener('webglcontextlost', this.onContextLost)
  }

  private buildEnvironment() {
    const env = new Scene()
    const room = new Mesh(new SphereGeometry(20, 24, 16), new ShaderMaterial({
      side: BackSide,
      vertexShader: 'varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vP; void main() { vec3 c = mix(vec3(0.04, 0.05, 0.06), vec3(0.36, 0.37, 0.38), smoothstep(-0.2, 0.9, vP.y)); gl_FragColor = vec4(c, 1.0); }',
    }))
    env.add(room)
    const softbox = (color: string, intensity: number, w: number, h: number, x: number, y: number, z: number) => {
      const material = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity) })
      const mesh = new Mesh(new BoxGeometry(w, h, 0.1), material)
      mesh.position.set(x, y, z)
      mesh.lookAt(0, 0, 0)
      env.add(mesh)
    }
    softbox('#fff3e2', 14, 10, 6, -7, 7, 8)
    softbox('#dfeeff', 6, 3, 12, 11, 2, 5)
    softbox('#ffd9ad', 7, 12, 2, 0, 9, -6)
    softbox('#b6dcff', 2.5, 8, 3, -3, -8, 8)
    const generator = new PMREMGenerator(this.renderer)
    const texture = generator.fromScene(env, 0.035).texture
    generator.dispose()
    env.traverse((node) => {
      if (node instanceof Mesh) { node.geometry.dispose(); (node.material as MeshBasicMaterial).dispose() }
    })
    return texture
  }

  /* Public API ------------------------------------------------------- */

  async load() {
    await this.house.load(this.renderer, this.options.quality)
    this.loaded = true
    this.renderOnce()
  }

  setTarget(target: SceneTarget, immediate = false) {
    this.target = target
    this.plumbing.setMode(target.mode, immediate || this.options.reducedMotion)
    // The first shot is framed for this screen from the start, not flown to.
    if (!this.targeted) {
      this.targeted = true
      this.current.camera = structuredClone(target.camera)
    }
    if (immediate) {
      this.current = structuredClone(target)
      this.shownWorld = target.world
    }
  }

  /** Nudge the view by dragging: a look around, not free flight. */
  orbitBy(dx: number, dy: number) {
    this.orbitTarget.x = MathUtils.clamp(this.orbitTarget.x + dx * 0.16, -24, 24)
    this.orbitTarget.y = MathUtils.clamp(this.orbitTarget.y + dy * 0.09, -5, 12)
  }

  resetOrbit() { this.orbitTarget.set(0, 0) }

  onFrame(listener: (frame: FrameInfo) => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  whenRendered(callback: () => void) {
    if (this.renderedOnce) callback()
    else this.firstFrame.push(callback)
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
    this.house.dispose()
    this.plumbing.dispose()
    this.fixtures.dispose()
    this.system.dispose()
    this.study.dispose()
    this.volume.dispose()
    this.scene.environment?.dispose()
    this.skyMaterial.dispose()
    this.curtainMaterial.dispose()
    this.shadowMaterial.dispose()
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
    const dt = Math.min(0.12, Math.max(0, (now - this.last) / 1000))
    this.last = now
    const start = performance.now()
    this.step(dt)
    this.render()
    this.adapt(performance.now() - start, dt)
  }

  /** Keep the frame rate smooth by trading resolution, never content. */
  private adapt(cost: number, dt: number) {
    if (dt >= 0.12 || dt === 0) return
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
    const ease = (from: number, to: number, rate: number) => (snap || reduced ? to : damp(from, to, rate, dt))

    // A change of world goes through a short fade; the camera jumps while the screen is dark.
    if (t.world !== this.shownWorld) {
      this.curtainValue = snap || reduced ? 1 : Math.min(1, this.curtainValue + dt * 3)
      if (this.curtainValue >= 1) {
        this.shownWorld = t.world
        c.camera = structuredClone(t.camera)
        c.world = t.world
      }
    } else {
      this.curtainValue = snap || reduced ? 0 : Math.max(0, this.curtainValue - dt * 2.2)
    }
    this.curtainMaterial.opacity = this.curtainValue
    this.curtain.visible = this.curtainValue > 0.001

    const inHouse = this.shownWorld === 'house'
    const aim = this.shownWorld === t.world ? t.camera : c.camera
    const cam = c.camera
    const rate = 1.9
    for (const key of ['azimuth', 'elevation', 'distance', 'offsetX', 'offsetY', 'fov'] as const) cam[key] = ease(cam[key], aim[key], rate)
    for (let i = 0; i < 3; i++) cam.target[i] = ease(cam.target[i], aim.target[i], rate)
    c.drift = ease(c.drift, t.drift, 1.4)
    c.dim = ease(c.dim, inHouse ? t.dim : 1, 2)
    c.open = ease(c.open, t.open, 1.7)
    c.volume = ease(c.volume, t.volume, 1.6)
    c.people = t.people
    c.years = ease(c.years, t.years, 4)
    c.hardness = ease(c.hardness, t.hardness, 4)

    if (!reduced) this.pointerSmoothed.lerp(this.pointer, 1 - Math.exp(-dt * 2.4))
    this.orbit.x = ease(this.orbit.x, this.orbitTarget.x, 5)
    this.orbit.y = ease(this.orbit.y, this.orbitTarget.y, 5)
    const drift = reduced ? 0 : c.drift
    const az = MathUtils.degToRad(cam.azimuth + this.orbit.x + Math.sin(this.time * 0.09) * 1.8 * drift + this.pointerSmoothed.x * 1.5 * drift)
    const el = MathUtils.degToRad(MathUtils.clamp(cam.elevation + this.orbit.y + Math.sin(this.time * 0.07) * 0.5 * drift - this.pointerSmoothed.y * 0.8 * drift, -8, 60))
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

    this.house.group.visible = inHouse
    this.plumbing.group.visible = inHouse
    this.system.group.visible = inHouse
    this.fixtures.group.visible = inHouse
    this.study.group.visible = !inHouse

    const uniforms = this.skyMaterial.uniforms
    uniforms.uDim.value = inHouse ? c.dim * 0.8 : 1
    uniforms.uTime.value = this.time % 10
    uniforms.uGlow.value.set(0.5 + cam.offsetX, 0.56 - cam.offsetY)

    this.house.setDim(c.dim * 0.74)
    this.plumbing.update(snap ? 0 : dt, this.time)
    this.systemLight.intensity = (0.8 + c.open * 2.4) * (inHouse ? 1 : 0)
    this.system.update(snap ? 0 : dt, this.time, { open: c.open, tracer: t.tracer, visible: inHouse, focus: t.focusTank, camera: this.camera.position })
    const treated = t.mode === 'whole' ? 1 : 0
    this.fixtures.update(snap ? 0 : dt, this.time, t.effect, treated, t.mode === 'tap', inHouse)
    this.volume.update(this.time, c.volume, c.people, snap ? 1 : dt)
    if (!inHouse) {
      const hard = c.hardness / 30
      const age = c.years / 15
      const thickness = Math.pow(age, 0.85) * (0.28 + hard * 0.72)
      this.study.update(this.time, thickness, thickness * 0.12)
    }
  }

  private render() {
    this.renderer.render(this.scene, this.camera)
    if (!this.renderedOnce && this.loaded) {
      this.renderedOnce = true
      this.firstFrame.splice(0).forEach((callback) => callback())
    }
    if (this.listeners.size) this.emit()
  }

  private emit() {
    const info = this.frameInfo
    info.width = this.width
    info.height = this.height
    const project = (name: string, x: number, y: number, z: number) => {
      const point = (info.anchors[name] ??= { x: 0, y: 0, visible: false })
      const p = this.projected.set(x, y, z).project(this.camera)
      point.x = (p.x * 0.5 + 0.5) * this.width
      point.y = (-p.y * 0.5 + 0.5) * this.height
      point.visible = p.z < 1 && p.z > -1 && point.x > -40 && point.x < this.width + 40 && point.y > -40 && point.y < this.height + 40
    }
    for (const [name, [x, y, z]] of Object.entries(ANCHORS)) project(name, x, y, z)
    for (let index = 0; index < 6; index++) {
      const [x, y, z] = this.volume.bandAnchor(index)
      project(`band${index}`, x, y, z)
    }
    for (const [fixture, run] of Object.entries(FIXTURE_PIPE) as [FixtureId, string][]) info.treated[fixture] = this.plumbing.treatedOf(run)
    for (const listener of this.listeners) listener(info)
  }
}
