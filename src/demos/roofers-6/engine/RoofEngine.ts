import {
  ACESFilmicToneMapping, DirectionalLight, Fog, HalfFloatType, HemisphereLight, MathUtils, Mesh, PCFShadowMap,
  PerspectiveCamera, PMREMGenerator, Scene, SphereGeometry, SRGBColorSpace, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget,
} from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { defaultRoof, noUpgrades, type RoofConfig, type Upgrades } from '../catalog'
import { applySky, createSky, sampleAtmosphere } from './atmosphere'
import { HouseModel, LAYERS, type LayerKey } from './model'
import type { RoofMetrics } from './measure'
import { Site } from './site'
import { SurfaceLibrary, glowTexture } from './textures'
import { Weather } from './weather'

export interface CameraTarget {
  /** Degrees around the house, 0 = straight on to the front, positive toward the garage. */
  azimuth: number
  /** Degrees above the horizon. */
  elevation: number
  distance: number
  target: [number, number, number]
  /** Fraction of the viewport to slide the subject: +x right, +y up. */
  offsetX: number
  offsetY: number
  fov: number
}

export interface SceneTarget {
  camera: CameraTarget
  drift: number
  tod: number
  weather: number
  rain: number
  hail: number
  lightning: number
  explode: number
  focus: number
  build: number
  damage: number
  upgrades: Upgrades
}

export interface ScreenPoint { x: number; y: number; visible: boolean }

export interface FrameInfo {
  width: number
  height: number
  anchors: Record<string, ScreenPoint>
  layers: Record<LayerKey, ScreenPoint>
}

export interface EngineOptions {
  quality: 'high' | 'low'
  reducedMotion: boolean
}

export const baseTarget: SceneTarget = {
  camera: { azimuth: -28, elevation: 7, distance: 50, target: [3, 3.8, 0], offsetX: 0.17, offsetY: 0, fov: 30 },
  drift: 1, tod: 0.72, weather: 0, rain: 0, hail: 0, lightning: 0,
  explode: 0, focus: -1, build: 1, damage: 0, upgrades: { ...noUpgrades },
}

type Smoothed = Omit<SceneTarget, 'camera' | 'upgrades'>

const RATES: Record<keyof Smoothed, number> = {
  drift: 1.2, tod: 1.4, weather: 1.1, rain: 1.4, hail: 1.6, lightning: 3,
  explode: 5.5, focus: 6, build: 7, damage: 2.2,
}

const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt))

export class RoofEngine {
  readonly canvas: HTMLCanvasElement
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(30, 1, 0.5, 900)
  private readonly sun = new DirectionalLight('#ffffff', 3)
  private readonly flashLight = new DirectionalLight('#cdd8ff', 0)
  private readonly hemi = new HemisphereLight('#bcd4f0', '#5a5446', 1)
  private readonly sky = createSky()
  private readonly envScene = new Scene()
  private readonly pmrem: PMREMGenerator
  private envTarget: WebGLRenderTarget | null = null
  private envKey = ''
  private envTimer = 0
  private readonly library: SurfaceLibrary
  private readonly model: HouseModel
  private readonly site: Site
  private readonly weather: Weather
  private readonly glow = glowTexture()
  private composer: EffectComposer | null = null
  private bloom: UnrealBloomPass | null = null
  private readonly options: EngineOptions

  private target: SceneTarget = structuredClone(baseTarget)
  private current: SceneTarget = structuredClone(baseTarget)
  private config: RoofConfig = { ...defaultRoof }
  private raf = 0
  private last = 0
  private time = 0
  private active = false
  private disposed = false
  private width = 1
  private height = 1
  private pixelRatio = 1
  private maxPixelRatio = 1.75
  private frameCost = 16
  private slowFor = 0
  private fastFor = 0
  private pointer = new Vector2()
  private pointerSmoothed = new Vector2()
  private orbitEnabled = false
  private orbit = { azimuth: 0, elevation: 0, vAz: 0, vEl: 0, zoom: 0 }
  private listeners = new Set<(frame: FrameInfo) => void>()
  private readonly frameInfo: FrameInfo
  private readonly scratch = new Vector3()
  private readonly cameraScratch = new Vector3()
  private firstFrame: (() => void) | null = null
  private renderedOnce = false

  constructor(canvas: HTMLCanvasElement, options: EngineOptions) {
    this.canvas = canvas
    this.options = options
    this.renderer = new WebGLRenderer({ canvas, antialias: options.quality === 'low', powerPreference: 'high-performance', alpha: false, stencil: false })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.12
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap
    this.renderer.localClippingEnabled = true
    this.maxPixelRatio = options.quality === 'high' ? 1.75 : 1.5
    this.pmrem = new PMREMGenerator(this.renderer)
    this.library = new SurfaceLibrary(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()))

    this.scene.add(this.sky)
    const envSky = new Mesh(new SphereGeometry(50, 32, 16), this.sky.material)
    this.envScene.add(envSky)
    this.scene.fog = new Fog('#9aa6b8', 60, 220)

    const shadowSize = options.quality === 'high' ? 2048 : 1024
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(shadowSize, shadowSize)
    const s = this.sun.shadow.camera
    s.left = -30; s.right = 30; s.top = 26; s.bottom = -24; s.near = 5; s.far = 150
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.035
    this.sun.shadow.radius = options.quality === 'high' ? 4 : 2
    this.scene.add(this.sun, this.sun.target, this.hemi, this.flashLight, this.flashLight.target)
    this.flashLight.position.set(-30, 60, -20)

    this.site = new Site(this.library)
    this.model = new HouseModel(this.library)
    this.model.configure(this.config)
    this.weather = new Weather(this.model, this.glow, options.quality)
    this.weather.setSurface(this.model, this.model.roofSamples())
    this.scene.add(this.site.group, this.model.group, this.weather.group)

    if (options.quality === 'high') {
      const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 })
      this.composer = new EffectComposer(this.renderer, target)
      this.composer.addPass(new RenderPass(this.scene, this.camera))
      this.bloom = new UnrealBloomPass(new Vector2(256, 256), 0.3, 0.55, 0.92)
      this.composer.addPass(this.bloom)
      this.composer.addPass(new OutputPass())
    }

    this.frameInfo = {
      width: 1, height: 1,
      anchors: {},
      layers: Object.fromEntries(LAYERS.map(key => [key, { x: 0, y: 0, visible: false }])) as Record<LayerKey, ScreenPoint>,
    }
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    this.applyAtmosphere(true)
  }

  /* -------------------------------------------------------------- */
  /* Public API                                                      */
  /* -------------------------------------------------------------- */

  setTarget(target: SceneTarget, immediate = false) {
    this.target = target
    if (immediate) this.current = structuredClone(target)
  }

  configure(config: RoofConfig) {
    const geometryChanged = config.style !== this.config.style || config.pitch !== this.config.pitch || config.finish !== this.config.finish || config.color !== this.config.color
    this.config = { ...config }
    if (!geometryChanged) return
    this.model.configure(this.config)
    this.weather.setSurface(this.model, this.model.roofSamples())
  }

  metrics(): RoofMetrics { return this.model.metrics() }

  onFrame(listener: (frame: FrameInfo) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  whenRendered(callback: () => void) {
    if (this.renderedOnce) callback()
    else this.firstFrame = callback
  }

  setActive(active: boolean) {
    if (this.disposed || active === this.active) return
    this.active = active
    if (active) {
      this.last = performance.now()
      cancelAnimationFrame(this.raf)
      this.raf = requestAnimationFrame(this.loop)
    } else {
      cancelAnimationFrame(this.raf)
    }
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, Math.round(width))
    this.height = Math.max(1, Math.round(height))
    const budget = this.options.quality === 'high' ? 4_200_000 : 2_000_000
    const device = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio)
    const fit = Math.sqrt(budget / (this.width * this.height))
    this.pixelRatio = Math.max(0.75, Math.min(device, fit))
    this.applySize()
    if (!this.active) this.renderOnce()
  }

  /** Normalised pointer position, -1..1, for a whisper of parallax. */
  setPointer(x: number, y: number) {
    this.pointer.set(x, y)
  }

  setOrbitEnabled(enabled: boolean) {
    this.orbitEnabled = enabled
  }

  orbitBy(dx: number, dy: number) {
    if (!this.orbitEnabled) return
    this.orbit.vAz += -dx * 0.25
    this.orbit.vEl += dy * 0.12
  }

  zoomBy(delta: number) {
    this.orbit.zoom = MathUtils.clamp(this.orbit.zoom + delta, -0.35, 0.35)
  }

  resetOrbit() {
    this.orbit = { azimuth: 0, elevation: 0, vAz: 0, vEl: 0, zoom: 0 }
  }

  /** Renders a frame now, for still states and captures. */
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
    this.model.dispose()
    this.site.dispose()
    this.weather.dispose()
    this.library.dispose()
    this.glow.dispose()
    this.sky.geometry.dispose()
    this.sky.material.dispose()
    this.envTarget?.dispose()
    this.pmrem.dispose()
    this.composer?.dispose()
    this.renderer.dispose()
  }

  /* -------------------------------------------------------------- */
  /* Loop                                                            */
  /* -------------------------------------------------------------- */

  private onContextLost = (event: Event) => {
    event.preventDefault()
    this.setActive(false)
    this.canvas.dispatchEvent(new CustomEvent('engine-lost'))
  }

  private applySize() {
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.setSize(this.width, this.height, false)
    if (this.composer) {
      this.composer.setPixelRatio(this.pixelRatio)
      this.composer.setSize(this.width, this.height)
    }
    if (this.bloom) this.bloom.resolution.set(this.width * this.pixelRatio * 0.5, this.height * this.pixelRatio * 0.5)
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

  /** Keep the frame rate smooth by trading resolution, never effects. */
  private adapt(cost: number, dt: number) {
    // Throttled tabs and one-off hitches say nothing about steady-state cost.
    if (dt > 0.1 || dt === 0) return
    this.frameCost = this.frameCost * 0.92 + Math.max(cost, dt * 1000 * 0.9) * 0.08
    if (this.frameCost > 24) { this.slowFor += dt; this.fastFor = 0 } else if (this.frameCost < 13) { this.fastFor += dt; this.slowFor = 0 } else { this.slowFor = 0; this.fastFor = 0 }
    const floor = this.options.quality === 'high' ? 1 : 0.8
    if (this.slowFor > 1.2 && this.pixelRatio > floor) {
      this.pixelRatio = Math.max(floor, this.pixelRatio - 0.15)
      this.slowFor = 0
      this.applySize()
    } else if (this.fastFor > 5 && this.pixelRatio < Math.min(window.devicePixelRatio || 1, this.maxPixelRatio) - 0.01) {
      this.pixelRatio = Math.min(Math.min(window.devicePixelRatio || 1, this.maxPixelRatio), this.pixelRatio + 0.1)
      this.fastFor = 0
      this.applySize()
    }
  }

  private step(dt: number, snap = false) {
    const reduced = this.options.reducedMotion
    this.time += dt
    const c = this.current
    const t = this.target
    const ease = (current: number, target: number, rate: number) => (snap ? target : damp(current, target, rate, dt))
    for (const key of Object.keys(RATES) as (keyof Smoothed)[]) c[key] = ease(c[key], t[key], RATES[key])
    for (const key of Object.keys(t.upgrades) as (keyof Upgrades)[]) c.upgrades[key] = ease(c.upgrades[key], t.upgrades[key], 2.6)
    const cam = c.camera
    cam.azimuth = ease(cam.azimuth, t.camera.azimuth, 2.4)
    cam.elevation = ease(cam.elevation, t.camera.elevation, 2.4)
    cam.distance = ease(cam.distance, t.camera.distance, 2.4)
    cam.offsetX = ease(cam.offsetX, t.camera.offsetX, 2.4)
    cam.offsetY = ease(cam.offsetY, t.camera.offsetY, 2.4)
    cam.fov = ease(cam.fov, t.camera.fov, 2.4)
    for (let i = 0; i < 3; i++) cam.target[i] = ease(cam.target[i], t.camera.target[i], 2.4)

    // Studio orbit with inertia; it relaxes home when the studio closes.
    const o = this.orbit
    if (this.orbitEnabled) {
      o.azimuth += o.vAz
      o.elevation = MathUtils.clamp(o.elevation + o.vEl, -cam.elevation + 3, 52 - cam.elevation)
      o.vAz *= Math.exp(-dt * 5)
      o.vEl *= Math.exp(-dt * 5)
    } else {
      o.azimuth = damp(o.azimuth, 0, 2, dt)
      o.elevation = damp(o.elevation, 0, 2, dt)
      o.zoom = damp(o.zoom, 0, 2, dt)
      o.vAz = 0
      o.vEl = 0
    }

    if (!reduced) this.pointerSmoothed.lerp(this.pointer, 1 - Math.exp(-dt * 2.5))
    const drift = reduced ? 0 : c.drift
    const az = MathUtils.degToRad(cam.azimuth + o.azimuth + Math.sin(this.time * 0.075) * 5 * drift + this.pointerSmoothed.x * 2.2 * drift)
    const el = MathUtils.degToRad(MathUtils.clamp(cam.elevation + o.elevation + Math.sin(this.time * 0.052) * 1.2 * drift - this.pointerSmoothed.y * 1.1 * drift, 2, 80))
    const distance = cam.distance * (1 - o.zoom)
    const target = this.scratch.set(cam.target[0], cam.target[1], cam.target[2])
    this.camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * distance,
      target.y + Math.sin(el) * distance,
      target.z + Math.cos(az) * Math.cos(el) * distance,
    )
    this.camera.lookAt(target)
    if (Math.abs(this.camera.fov - cam.fov) > 0.01) this.camera.fov = cam.fov
    this.camera.setViewOffset(this.width, this.height, -cam.offsetX * this.width, cam.offsetY * this.height, this.width, this.height)
    this.camera.updateProjectionMatrix()
    this.sky.position.copy(this.camera.position)

    this.weather.update(dt, this.time, this.camera, { rain: c.rain, hail: c.hail, lightning: t.lightning, reduced })
    this.site.update(this.time, reduced ? 0 : 0.3 + c.weather * 1.7)
    const atmosphere = this.applyAtmosphere(false, dt)
    this.model.update({ explode: c.explode, focus: c.focus, build: c.build, damage: c.damage, night: atmosphere, upgrades: c.upgrades }, this.time)
  }

  /** Returns the night factor for the model. */
  private applyAtmosphere(force: boolean, dt = 0): number {
    const c = this.current
    const atmosphere = sampleAtmosphere(c.tod, c.weather)
    const flash = this.weather?.flash ?? 0
    applySky(this.sky, atmosphere)
    this.sky.material.uniforms.uTime.value = this.time
    this.sky.material.uniforms.uFlash.value = flash * 0.9

    const light = atmosphere.sunDirection.clone()
    light.y = Math.max(light.y, 0.06)
    light.normalize()
    this.sun.position.copy(light).multiplyScalar(70).add(new Vector3(3, 0, 0))
    this.sun.target.position.set(3, 0, 0)
    this.sun.color.copy(atmosphere.sunColor)
    this.sun.intensity = atmosphere.sunIntensity
    this.hemi.color.copy(atmosphere.hemiSky)
    this.hemi.groundColor.copy(atmosphere.hemiGround)
    this.hemi.intensity = atmosphere.hemiIntensity + flash * 1.2
    this.flashLight.intensity = flash * 4.5
    const fog = this.scene.fog as Fog
    fog.color.copy(atmosphere.fog)
    fog.near = 90 - c.weather * 60
    fog.far = 420 - c.weather * 280
    this.scene.background = null
    if (this.bloom) this.bloom.strength = 0.18 + atmosphere.night * 0.42 + flash * 0.5

    // Reflections follow the sky, refreshed only when it changes visibly.
    this.envTimer -= dt
    const key = `${c.tod.toFixed(2)}|${c.weather.toFixed(2)}`
    if (force || (key !== this.envKey && this.envTimer <= 0)) {
      this.envKey = key
      this.envTimer = 0.25
      this.sky.material.uniforms.uFlash.value = 0
      const next = this.pmrem.fromScene(this.envScene, 0.02, 0.1, 100)
      this.sky.material.uniforms.uFlash.value = flash * 0.9
      this.scene.environment = next.texture
      this.envTarget?.dispose()
      this.envTarget = next
    }
    return atmosphere.night
  }

  private render() {
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
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
    const project = (position: Vector3, normal: Vector3 | null, out: ScreenPoint) => {
      const p = this.cameraScratch.copy(position).project(this.camera)
      out.x = (p.x * 0.5 + 0.5) * this.width
      out.y = (-p.y * 0.5 + 0.5) * this.height
      let facing = true
      if (normal) facing = this.scratch.copy(this.camera.position).sub(position).dot(normal) > 0
      out.visible = p.z < 1 && p.z > -1 && facing
      return out
    }
    for (const [name, anchor] of this.model.anchors) {
      info.anchors[name] ??= { x: 0, y: 0, visible: false }
      project(anchor.position, anchor.normal, info.anchors[name])
    }
    for (const key of LAYERS) project(this.model.layerAnchor(key), null, info.layers[key])
    for (const listener of this.listeners) listener(info)
  }
}

