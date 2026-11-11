import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export type Tone = 'brand' | 'pain'

/** Where the camera should be and what should glow. The stage eases toward it. */
export interface Shot {
  focus: string[] | 'all'
  /** Degrees around the spine: 0 front, 90 right side, 180 back. */
  azimuth: number
  elevation: number
  /** Margin around the focused bones: 1 fills the frame. */
  fit: number
  /** Where the spine sits on screen, as a fraction of the viewport (+ is right / up). */
  screenX: number
  screenY?: number
  xray?: boolean
  bones?: string[]
  nerves?: string[]
  tone?: Tone
  spin?: boolean
}

export interface Hit {
  name: string
  label: string
  region: string
}

interface Part {
  name: string
  mesh: Mesh
  material: MeshPhysicalMaterial | MeshStandardMaterial
  base: Color
  amount: number
  hover: number
  opacity: number
  box: Box3
  label: string
  region: string
}

const TONES: Record<Tone, Color> = { brand: new Color('#5b9cf0'), pain: new Color('#ff6b3d') }
const DEG = Math.PI / 180
const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt))

export class SpineStage {
  readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(30, 1, 0.01, 20)
  private readonly bones = new Map<string, Part>()
  private readonly discs: Part[] = []
  private readonly nerves: Part[] = []
  private readonly raycaster = new Raycaster()
  private readonly pointer = new Vector2(9, 9)
  private shot: Shot = { focus: 'all', azimuth: 125, elevation: 6, fit: 1.1, screenX: 0.2, spin: true }
  private cam = { x: 0, y: 0.35, z: 0, az: 125, el: 6, dist: 2.2, sx: 0.2, sy: 0, xray: 0 }
  private drag = { active: false, lastX: 0, offset: 0, velocity: 0, moved: 0 }
  private time = 0
  private frame = 0
  private last = 0
  private running = false
  private hovered: Part | null = null
  private dragResetPending = false
  private active = true
  private readonly reduceMotion: boolean
  private width = 1
  private height = 1
  private readonly resizeObserver: ResizeObserver
  ready = false
  onHover: (hit: Hit | null, x: number, y: number) => void = () => {}
  onSelect: (hit: Hit) => void = () => {}

  private readonly canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.9
    this.renderer.setClearColor(0x000000, 0)

    const pmrem = new PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.32
    pmrem.dispose()

    const key = new DirectionalLight('#ffe7c7', 1.9)
    key.position.set(-1.2, 1.6, 1.8)
    const rim = new DirectionalLight('#7fb4ff', 2.1)
    rim.position.set(1.4, 0.9, -1.8)
    const under = new HemisphereLight('#c9dcff', '#20160f', 0.22)
    this.scene.add(key, rim, under)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.resize()

    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerCancel)
    canvas.addEventListener('pointerleave', this.onPointerLeave)
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  async load(url: string, decoderPath: string) {
    const draco = new DRACOLoader().setDecoderPath(decoderPath).setDecoderConfig({ type: 'wasm' })
    const loader = new GLTFLoader().setDRACOLoader(draco)
    const gltf = await loader.loadAsync(url)
    draco.dispose()

    const bone = new MeshPhysicalMaterial({
      color: '#e6d6bd', roughness: 0.55, metalness: 0, vertexColors: true,
      sheen: 0.25, sheenRoughness: 0.8, sheenColor: new Color('#fff3e2'), clearcoat: 0.08, clearcoatRoughness: 0.6,
    })
    const disc = new MeshPhysicalMaterial({ color: '#6f9cc6', roughness: 0.28, metalness: 0, vertexColors: true, clearcoat: 0.6, clearcoatRoughness: 0.25 })
    const nerve = new MeshStandardMaterial({ color: '#f4c66e', roughness: 0.45, emissive: new Color('#ff9a3d'), emissiveIntensity: 0, transparent: true, opacity: 0, depthWrite: false })

    gltf.scene.updateMatrixWorld(true)
    gltf.scene.traverse((node) => {
      if (!(node instanceof Mesh)) return
      const data = (node.userData ?? {}) as { kind?: string; label?: string; region?: string }
      const holder = node.userData.kind ? node : node.parent
      const extras = (holder?.userData ?? data) as { kind?: string; label?: string; region?: string }
      const kind = extras.kind ?? ''
      const template = kind === 'disc' ? disc : kind === 'nerve' || kind === 'cord' ? nerve : bone
      const material = template.clone()
      node.material = material
      node.castShadow = false
      const name = holder?.name ?? node.name
      const part: Part = {
        name,
        mesh: node, material, base: material.color.clone(), amount: 0, hover: 0, opacity: kind === 'nerve' || kind === 'cord' ? 0 : 1,
        box: new Box3().setFromObject(node), label: extras.label ?? node.name, region: extras.region ?? '',
      }
      if (kind === 'vertebra') this.bones.set(name, part)
      else if (kind === 'disc') this.discs.push(part)
      else if (kind === 'nerve' || kind === 'cord') {
        part.label = name
        this.nerves.push(part)
        node.visible = false
        node.renderOrder = 2
      }
    })
    this.scene.add(gltf.scene)
    this.ready = true
    // Start where the current shot says, without a fly-in.
    this.snap()
  }

  setShot(shot: Shot) {
    this.shot = shot
    this.drag.velocity = 0
    this.dragResetPending = true
    if (this.reduceMotion) this.snap()
  }

  /** Whether the stage is on screen; the loop only runs while it is and the tab is visible. */
  setActive(active: boolean) {
    this.active = active
    if (active && !document.hidden) this.start()
    else this.stop()
  }

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    const loop = (now: number) => {
      if (!this.running) return
      this.step(Math.min(0.05, (now - this.last) / 1000))
      this.last = now
      this.frame = requestAnimationFrame(loop)
    }
    this.frame = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.frame)
  }

  /** Advances the scene by dt seconds and draws one frame (also handy in tests). */
  step(dt: number) {
    this.time += dt
    if (this.ready) this.update(dt)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.stop()
    this.resizeObserver.disconnect()
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerCancel)
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.scene.traverse((node) => {
      if (node instanceof Mesh) {
        node.geometry.dispose()
        ;(node.material as MeshStandardMaterial).dispose()
      }
    })
    this.scene.environment?.dispose()
    this.renderer.dispose()
  }

  // ------------------------------------------------------------------ framing

  private focusBox() {
    const box = new Box3()
    if (this.shot.focus === 'all') {
      this.bones.forEach((p) => box.union(p.box))
      return box
    }
    for (const name of this.shot.focus) {
      const part = this.bones.get(name)
      if (part) box.union(part.box)
    }
    if (box.isEmpty()) this.bones.forEach((p) => box.union(p.box))
    return box
  }

  private desired() {
    const box = this.focusBox()
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    const tan = Math.tan((this.camera.fov / 2) * DEG)
    const across = Math.max(size.x, size.z) * 1.15
    const aspect = this.width / this.height
    const byHeight = (size.y / 2) / tan
    const byWidth = (across / 2) / (tan * aspect * (1 - Math.abs(this.shot.screenX)))
    const dist = Math.max(byHeight, byWidth) * this.shot.fit + across / 2
    const sway = this.shot.spin && !this.reduceMotion ? Math.sin(this.time * 0.22) * 16 : 0
    return { x: center.x, y: center.y, z: center.z, az: this.shot.azimuth + sway, el: this.shot.elevation, dist, sx: this.shot.screenX, sy: this.shot.screenY ?? 0, xray: this.shot.xray ? 1 : 0 }
  }

  private snap() {
    if (!this.ready) return
    Object.assign(this.cam, this.desired())
    this.drag.offset = 0
    this.applyCamera()
  }

  private applyCamera() {
    const { x, y, z, az, el, dist, sx, sy } = this.cam
    const a = (az + this.drag.offset) * DEG
    const e = el * DEG
    this.camera.position.set(x + Math.sin(a) * Math.cos(e) * dist, y + Math.sin(e) * dist, z + Math.cos(a) * Math.cos(e) * dist)
    this.camera.lookAt(x, y, z)
    this.camera.setViewOffset(this.width, this.height, -sx * this.width, sy * this.height, this.width, this.height)
    this.camera.updateProjectionMatrix()
  }

  private update(dt: number) {
    const goal = this.desired()
    const rate = this.reduceMotion ? 60 : 2.6
    for (const key of ['x', 'y', 'z', 'el', 'dist', 'sx', 'sy'] as const) this.cam[key] = damp(this.cam[key], goal[key], rate, dt)
    // Take the short way round.
    let delta = goal.az - this.cam.az
    delta = ((delta + 540) % 360) - 180
    this.cam.az += delta * (1 - Math.exp(-rate * dt))
    this.cam.xray = damp(this.cam.xray, goal.xray, 4, dt)

    if (!this.drag.active) {
      this.drag.offset += this.drag.velocity * dt
      this.drag.velocity = damp(this.drag.velocity, 0, 3, dt)
      if (this.dragResetPending) {
        this.drag.offset = damp(this.drag.offset, 0, 2.5, dt)
        if (Math.abs(this.drag.offset) < 0.5) this.dragResetPending = false
      }
    }
    this.applyCamera()
    this.paint(dt)
  }

  private paint(dt: number) {
    const tone = TONES[this.shot.tone ?? 'pain']
    const lit = new Set(this.shot.bones ?? [])
    const xray = this.cam.xray
    const pulse = this.reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(this.time * 3.2)
    this.bones.forEach((part, name) => {
      part.amount = damp(part.amount, lit.has(name) ? 1 : 0, 5, dt)
      part.hover = damp(part.hover, this.hovered === part ? 1 : 0, 10, dt)
      const material = part.material
      material.color.copy(part.base).lerp(tone, part.amount * 0.72)
      material.emissive.copy(tone).multiplyScalar(part.amount * 0.22 * pulse + part.hover * 0.06)
      if (part.hover > 0.01) material.emissive.r += part.hover * 0.05
      const target = 1 - xray * (lit.has(name) ? 0.35 : 0.84)
      this.setOpacity(part, target)
    })
    for (const part of this.discs) this.setOpacity(part, 1 - xray * 0.8)
    const wanted = this.shot.nerves ?? []
    for (const part of this.nerves) {
      const name = part.name
      const on = wanted.some((key) => (key === 'sciatic' ? name.startsWith('sciatic') : name.startsWith(`root_${key}_`)))
      part.amount = damp(part.amount, on ? 1 : 0, 5, dt)
      const target = xray * (on ? 1 : name === 'SpinalCord' ? 0.7 : 0.38)
      part.opacity = damp(part.opacity, target, 6, dt)
      const material = part.material as MeshStandardMaterial
      material.opacity = part.opacity
      material.color.copy(part.base).lerp(TONES.pain, part.amount * 0.85)
      material.emissive.copy(TONES.pain)
      material.emissiveIntensity = part.amount * 0.9 * pulse
      part.mesh.visible = part.opacity > 0.01
    }
  }

  private setOpacity(part: Part, target: number) {
    part.opacity = Math.abs(part.opacity - target) < 0.002 ? target : part.opacity + (target - part.opacity) * 0.12
    const material = part.material
    const transparent = part.opacity < 0.995
    if (material.transparent !== transparent) {
      material.transparent = transparent
      material.needsUpdate = true
    }
    material.opacity = part.opacity
    material.depthWrite = !transparent
  }

  // ------------------------------------------------------------------ input

  /**
   * Resizing a WebGL canvas wipes what it has drawn, so a resize redraws in the
   * same task, before the browser paints. The stage's CSS height is the large
   * viewport (100lvh), so phone toolbars sliding in and out while scrolling do
   * not resize it at all; this only runs for real changes such as rotation.
   */
  private resize() {
    const rect = this.canvas.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    const ratio = Math.min(window.devicePixelRatio || 1, width < 700 ? 2 : 1.75)
    if (width === this.width && height === this.height && ratio === this.renderer.getPixelRatio()) return
    this.width = width
    this.height = height
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    if (this.ready) this.applyCamera()
    else this.camera.updateProjectionMatrix()
    this.renderer.render(this.scene, this.camera)
  }

  private pick(clientX: number, clientY: number): Part | null {
    if (!this.ready) return null
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const meshes = [...this.bones.values()].map((p) => p.mesh)
    const hit = this.raycaster.intersectObjects(meshes, false)[0]
    if (!hit) return null
    return [...this.bones.values()].find((p) => p.mesh === hit.object) ?? null
  }

  private hitFor(part: Part): Hit {
    return { name: part.name, label: part.label, region: part.region }
  }

  private onPointerMove = (event: PointerEvent) => {
    if (this.drag.active) {
      const dx = event.clientX - this.drag.lastX
      this.drag.lastX = event.clientX
      this.drag.moved += Math.abs(dx)
      this.drag.offset += dx * 0.35
      this.drag.velocity = dx * 0.35 * 60
      this.dragResetPending = false
      return
    }
    if (event.pointerType !== 'mouse') return
    const part = this.pick(event.clientX, event.clientY)
    this.hovered = part
    this.canvas.style.cursor = part ? 'pointer' : 'grab'
    this.onHover(part ? this.hitFor(part) : null, event.clientX, event.clientY)
  }

  private onPointerDown = (event: PointerEvent) => {
    this.drag.active = true
    this.drag.lastX = event.clientX
    this.drag.moved = 0
    this.drag.velocity = 0
  }

  private onPointerUp = (event: PointerEvent) => {
    if (!this.drag.active) return
    this.drag.active = false
    if (this.drag.moved < 6 && event.target === this.canvas) {
      const part = this.pick(event.clientX, event.clientY)
      if (part) this.onSelect(this.hitFor(part))
    }
  }

  private onPointerCancel = () => {
    this.drag.active = false
    this.drag.velocity = 0
  }

  private onPointerLeave = () => {
    this.hovered = null
    this.onHover(null, 0, 0)
  }

  private onVisibility = () => {
    if (document.hidden || !this.active) this.stop()
    else this.start()
  }
}
