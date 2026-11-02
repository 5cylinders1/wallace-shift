import {
  AdditiveBlending, CanvasTexture, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, DynamicDrawUsage, Group,
  IcosahedronGeometry, InstancedMesh, LatheGeometry, Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial,
  PlaneGeometry, Sprite, SpriteMaterial, TubeGeometry, Vector2, Vector3, type BufferGeometry, type Material,
} from 'three'
import layout from './layout.json'
import { TAP_FILTER } from './network'
import type { RoomEffect } from './state'
import { CLEAN, RAW } from './plumbing'

const { fixtures: FX, levels: LV, cut: CUT, backWall: BACK } = layout
const COUNTER_TOP = LV.groundFloor + 0.1 + 0.78 + 0.035
const FLOOR_U = LV.upperFloor

function softDisc(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,255,255,0.75)')
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.28)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  return new CanvasTexture(canvas)
}

/**
 * The things the camera gets close to and reflections matter on: taps, the
 * shower, the glass in the kitchen. Also the running water and steam the rooms
 * chapter switches on.
 */
export class FixturesModel {
  readonly group = new Group()
  private readonly geometries: BufferGeometry[] = []
  private readonly materials: Material[] = []
  private readonly stream: InstancedMesh
  private readonly shower: InstancedMesh
  private readonly seeds: { x: number; z: number; phase: number; speed: number }[] = []
  private readonly steam: Sprite[] = []
  private readonly steamMaterial: SpriteMaterial
  private readonly streamMaterial: MeshStandardMaterial
  private readonly showerMaterial: MeshStandardMaterial
  private readonly glassWater: Mesh
  private readonly glassWaterMaterial: MeshPhysicalMaterial
  private readonly tapFilter: Group
  private readonly motes: InstancedMesh
  private readonly moteMaterial: MeshBasicMaterial
  private readonly matrix = new Matrix4()
  private readonly color = new Color()
  private readonly texture = softDisc()
  private showerAmount = 0
  private kitchenAmount = 0
  private fill = 0
  private treated = 0
  private readonly reduced: boolean

  constructor(options: { reduced: boolean; quality: 'high' | 'low' }) {
    this.reduced = options.reduced
    const brass = new MeshStandardMaterial({ color: '#c8a35a', metalness: 1, roughness: 0.22 })
    const black = new MeshStandardMaterial({ color: '#17181a', metalness: 0.85, roughness: 0.38 })
    const chrome = new MeshStandardMaterial({ color: '#d7dad9', metalness: 1, roughness: 0.14 })
    this.materials.push(brass, black, chrome)

    const add = (geometry: BufferGeometry, material: Material, x: number, y: number, z: number, parent: Group = this.group) => {
      this.geometries.push(geometry)
      const mesh = new Mesh(geometry, material)
      mesh.position.set(x, y, z)
      parent.add(mesh)
      return mesh
    }

    // Kitchen tap: a gooseneck that reaches over the basin.
    const k = FX.kitchenSink
    const spout = new CatmullRomCurve3([
      new Vector3(k.x, COUNTER_TOP, k.z), new Vector3(k.x, COUNTER_TOP + 0.26, k.z),
      new Vector3(k.x, COUNTER_TOP + 0.36, k.z + 0.08), new Vector3(k.x, COUNTER_TOP + 0.32, k.z + 0.19), new Vector3(k.x, COUNTER_TOP + 0.24, k.z + 0.21),
    ])
    add(new TubeGeometry(spout, 32, 0.012, 10), brass, 0, 0, 0)
    add(new CylinderGeometry(0.025, 0.03, 0.05, 16), brass, k.x, COUNTER_TOP + 0.025, k.z)
    add(new CylinderGeometry(0.009, 0.009, 0.07, 10), brass, k.x + 0.055, COUNTER_TOP + 0.06, k.z).rotation.z = 0.6
    const kitchenOut = new Vector3(k.x, COUNTER_TOP + 0.235, k.z + 0.21)

    // Vanity tap, wall-mounted over the vessel.
    const v = FX.vanity
    const wallTap = add(new CylinderGeometry(0.01, 0.01, 0.2, 10), black, v.x, v.y + 0.27, BACK + 0.1)
    wallTap.rotation.x = Math.PI / 2
    const escutcheon = add(new CylinderGeometry(0.03, 0.03, 0.01, 18), black, v.x, v.y + 0.27, BACK + 0.012)
    escutcheon.rotation.x = Math.PI / 2

    // Shower: arm, rain head, valve trim, glass panel.
    const s = FX.shower
    const arm = add(new CylinderGeometry(0.011, 0.011, s.z - BACK, 12), black, s.x, s.headY, (s.z + BACK) / 2)
    arm.rotation.x = Math.PI / 2
    const headTop = new LatheGeometry([new Vector2(0.0001, 0.018), new Vector2(0.13, 0.012), new Vector2(0.15, 0), new Vector2(0.0001, 0)], 28)
    add(headTop, black, s.x, s.headY - 0.03, s.z)
    const showerHead = new Vector3(s.x, s.headY - 0.035, s.z)
    const valve = add(new CylinderGeometry(0.06, 0.06, 0.015, 24), black, s.x + 0.2, FLOOR_U + 1.1, BACK + 0.02)
    valve.rotation.x = Math.PI / 2
    const lever = add(new CylinderGeometry(0.009, 0.009, 0.1, 10), black, s.x + 0.2, FLOOR_U + 1.1, BACK + 0.07)
    lever.rotation.x = Math.PI / 2
    const glass = new MeshPhysicalMaterial({ color: '#d9f0ee', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.12, side: DoubleSide, depthWrite: false, envMapIntensity: 1.3 })
    this.materials.push(glass)
    const panelZ0 = BACK + 0.02
    const panelZ1 = -0.65
    const panel = add(new PlaneGeometry(panelZ1 - panelZ0, 2.05), glass, -4.28, FLOOR_U + 0.05 + 1.03, (panelZ0 + panelZ1) / 2)
    panel.rotation.y = Math.PI / 2
    panel.renderOrder = 8
    const channel = add(new CylinderGeometry(0.006, 0.006, 2.05, 8), black, -4.28, FLOOR_U + 0.05 + 1.03, panelZ1)
    channel.renderOrder = 8

    // Hose bib on the outside wall, and a shutoff with a meter where the service line lands.
    const hose = add(new CylinderGeometry(0.018, 0.018, 0.09, 12), brass, FX.hose.x - 0.015, FX.hose.y, FX.hose.z)
    hose.rotation.z = Math.PI / 2
    add(new CylinderGeometry(0.03, 0.03, 0.012, 16), brass, FX.hose.x - 0.015, FX.hose.y + 0.05, FX.hose.z)
    const meterBody = add(new CylinderGeometry(0.07, 0.07, 0.1, 22), brass, -5.8, layout.main.y, CUT - 0.34)
    meterBody.rotation.x = 0
    add(new CylinderGeometry(0.06, 0.06, 0.006, 22), chrome, -5.8, layout.main.y + 0.054, CUT - 0.34)

    // Glass on the counter, under the tap: the thing a person actually drinks.
    const glassX = k.x + 0.5
    const glassZ = k.z + 0.22
    const tumbler = new LatheGeometry([
      new Vector2(0.0001, 0.008), new Vector2(0.034, 0.008), new Vector2(0.036, 0), new Vector2(0.044, 0.14), new Vector2(0.041, 0.14), new Vector2(0.033, 0.012), new Vector2(0.0001, 0.012),
    ], 24)
    const tumblerMaterial = new MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.02, transparent: true, opacity: 0.2, side: DoubleSide, depthWrite: false, envMapIntensity: 1.8 })
    this.materials.push(tumblerMaterial)
    add(tumbler, tumblerMaterial, glassX, COUNTER_TOP, glassZ).renderOrder = 9
    this.glassWaterMaterial = new MeshPhysicalMaterial({ color: '#ffd9a0', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false, envMapIntensity: 1.2 })
    this.materials.push(this.glassWaterMaterial)
    const waterGeometry = new CylinderGeometry(0.04, 0.034, 0.12, 22)
    waterGeometry.translate(0, 0.06, 0)
    this.geometries.push(waterGeometry)
    this.glassWater = new Mesh(waterGeometry, this.glassWaterMaterial)
    this.glassWater.position.set(glassX, COUNTER_TOP + 0.012, glassZ)
    this.glassWater.renderOrder = 8
    this.group.add(this.glassWater)

    // Fine motes in untreated water, in the glass.
    const moteGeometry = new IcosahedronGeometry(1, 0)
    this.geometries.push(moteGeometry)
    this.moteMaterial = new MeshBasicMaterial({ color: '#a7601e', transparent: true, opacity: 0.85, depthWrite: false })
    this.materials.push(this.moteMaterial)
    this.motes = new InstancedMesh(moteGeometry, this.moteMaterial, 26)
    this.motes.renderOrder = 9
    this.motes.frustumCulled = false
    this.group.add(this.motes)

    // Under-sink filter, the alternative the whole page argues against.
    this.tapFilter = new Group()
    const filterMaterial = new MeshStandardMaterial({ color: '#dfe5e4', roughness: 0.4, depthTest: false, transparent: true })
    this.materials.push(filterMaterial)
    add(new CylinderGeometry(0.05, 0.05, 0.24, 16), filterMaterial, TAP_FILTER[0], TAP_FILTER[1], TAP_FILTER[2], this.tapFilter).renderOrder = 6
    this.tapFilter.visible = false
    this.group.add(this.tapFilter)

    // Water: droplets are cheap and read better than a stretched cylinder at this size.
    const drop = new IcosahedronGeometry(1, 0)
    this.geometries.push(drop)
    this.streamMaterial = new MeshStandardMaterial({ color: '#dff5fb', metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.9, emissive: '#7fe6ff', emissiveIntensity: 0.35 })
    this.showerMaterial = this.streamMaterial.clone()
    this.materials.push(this.streamMaterial, this.showerMaterial)
    this.stream = new InstancedMesh(drop, this.streamMaterial, 70)
    this.stream.instanceMatrix.setUsage(DynamicDrawUsage)
    this.stream.frustumCulled = false
    this.stream.visible = false
    this.group.add(this.stream)
    const showerCount = options.quality === 'high' ? 340 : 170
    this.shower = new InstancedMesh(drop, this.showerMaterial, showerCount)
    this.shower.instanceMatrix.setUsage(DynamicDrawUsage)
    this.shower.frustumCulled = false
    this.shower.visible = false
    this.group.add(this.shower)
    for (let i = 0; i < showerCount; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * 0.13
      this.seeds.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, phase: Math.random(), speed: 0.85 + Math.random() * 0.4 })
    }
    this.kitchenOut = kitchenOut
    this.showerHead = showerHead

    // Steam: big soft sprites that carry the vapour the shower chapter is about.
    this.steamMaterial = new SpriteMaterial({ map: this.texture, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending })
    this.materials.push(this.steamMaterial)
    const steamCount = options.quality === 'high' ? 26 : 14
    for (let i = 0; i < steamCount; i++) {
      const sprite = new Sprite(this.steamMaterial)
      sprite.position.set(s.x, FLOOR_U + 0.3, s.z)
      sprite.visible = false
      sprite.renderOrder = 9
      this.steam.push(sprite)
      this.group.add(sprite)
    }

    this.glassX = glassX
    this.glassZ = glassZ
  }

  private readonly kitchenOut: Vector3
  private readonly showerHead: Vector3
  private readonly glassX: number
  private readonly glassZ: number

  update(dt: number, time: number, effect: RoomEffect, treated: number, tapOn: boolean, visible: boolean) {
    this.tapFilter.visible = tapOn && visible
    const rate = 1 - Math.exp(-dt * 2.4)
    this.kitchenAmount += ((effect === 'kitchen' && visible ? 1 : 0) - this.kitchenAmount) * rate
    this.showerAmount += ((effect === 'shower' && visible ? 1 : 0) - this.showerAmount) * rate
    this.treated += (treated - this.treated) * rate

    // Kitchen: a running tap, a glass that fills, and what is or is not in it.
    const kitchen = this.kitchenAmount
    this.stream.visible = kitchen > 0.02 && !this.reduced
    const tone = this.color.copy(RAW).lerp(CLEAN, this.treated)
    this.streamMaterial.emissive.copy(tone)
    if (this.stream.visible) {
      const fall = COUNTER_TOP + 0.235 - (COUNTER_TOP + 0.035)
      for (let i = 0; i < this.stream.count; i++) {
        const t = (i / this.stream.count + time * 0.9) % 1
        const y = this.kitchenOut.y - t * t * fall
        const width = 0.0045 + 0.0025 * Math.sin(i * 7.1)
        this.matrix.makeScale(width * kitchen, 0.012 * kitchen, width * kitchen).setPosition(this.kitchenOut.x + Math.sin(i * 12.9) * 0.002, y, this.kitchenOut.z + Math.cos(i * 4.3) * 0.002)
        this.stream.setMatrixAt(i, this.matrix)
      }
      this.stream.instanceMatrix.needsUpdate = true
    }
    this.fill += ((kitchen > 0.5 ? 1 : 0) - this.fill) * (1 - Math.exp(-dt * 0.7))
    if (this.reduced && kitchen > 0.5) this.fill = 1
    const level = Math.max(this.fill, 0.82 * Math.min(1, kitchen * 1.5) * 0.25 + 0.2)
    this.glassWater.scale.set(1, Math.max(level, 0.05), 1)
    this.glassWaterMaterial.color.set('#ffd9a0').lerp(new Color('#d9f5fb'), this.treated)
    this.glassWaterMaterial.opacity = 0.55 - this.treated * 0.32
    this.moteMaterial.opacity = (1 - this.treated) * 0.85
    this.motes.visible = this.treated < 0.98 && visible
    if (this.motes.visible) {
      for (let i = 0; i < this.motes.count; i++) {
        const a = i * 2.399 + time * 0.2
        const r = 0.01 + ((i * 13) % 7) * 0.0035
        const y = COUNTER_TOP + 0.02 + ((Math.sin(time * 0.35 + i) * 0.5 + 0.5) * 0.1 * level)
        this.matrix.makeScale(0.0014, 0.0014, 0.0014).setPosition(this.glassX + Math.cos(a) * r, y, this.glassZ + Math.sin(a) * r)
        this.motes.setMatrixAt(i, this.matrix)
      }
      this.motes.instanceMatrix.needsUpdate = true
    }

    // Shower: drops, and steam that carries a tint unless the water is treated.
    const shower = this.showerAmount
    this.shower.visible = shower > 0.02 && !this.reduced
    this.showerMaterial.emissive.copy(tone)
    if (this.shower.visible) {
      const height = this.showerHead.y - FLOOR_U - 0.05
      this.seeds.forEach((seed, i) => {
        const t = (seed.phase + time * seed.speed * 0.9) % 1
        const y = this.showerHead.y - t * t * height
        const spread = 1 + t * 0.35
        this.matrix.makeScale(0.0042 * shower, 0.024 * shower, 0.0042 * shower).setPosition(this.showerHead.x + seed.x * spread, y, this.showerHead.z + seed.z * spread)
        this.shower.setMatrixAt(i, this.matrix)
      })
      this.shower.instanceMatrix.needsUpdate = true
    }
    const steamTone = this.color.set('#e8b45e').lerp(new Color('#d8eef2'), this.treated)
    this.steamMaterial.color.copy(steamTone)
    this.steamMaterial.opacity = shower * (0.15 - this.treated * 0.09)
    this.steam.forEach((sprite, i) => {
      sprite.visible = shower > 0.02
      if (!sprite.visible) return
      const t = this.reduced ? (i / this.steam.length) : (i / this.steam.length + time * 0.045) % 1
      const a = i * 2.4
      sprite.position.set(
        this.showerHead.x + 0.15 + Math.cos(a + time * 0.15) * (0.25 + t * 0.55),
        FLOOR_U + 0.25 + t * 2.3,
        this.showerHead.z + 0.45 + Math.sin(a) * (0.3 + t * 0.6),
      )
      const size = 0.7 + t * 1.5
      sprite.scale.set(size, size, 1)
    })
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose())
    this.materials.forEach((material) => material.dispose())
    this.texture.dispose()
  }
}
