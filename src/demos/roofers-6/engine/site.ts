import { BufferGeometry, CanvasTexture, CircleGeometry, Color, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, RepeatWrapping, Shape, SRGBColorSpace, type Material, type Texture } from 'three'
import { blob, box, cylinder, merge } from './geometry'
import { seeded, type SurfaceLibrary } from './textures'

export const PLINTH = { x0: -18, x1: 24, z0: -15.5, z1: 16, depth: 1.4 }

/** Ground in section for the plinth edge, 6 m wide by the plinth depth. */
function strataTexture(): CanvasTexture {
  const element = document.createElement('canvas')
  element.width = 1024
  element.height = 256
  const context = element.getContext('2d')!
  const random = seeded(31)
  const bands: [number, string, string][] = [
    [0, '#3c4a2c', '#2f3a22'], [0.07, '#3a2c22', '#2c2119'], [0.34, '#6f6556', '#5c5346'], [0.62, '#9a7a52', '#86683f'], [0.86, '#5b544c', '#4a443e'],
  ]
  const wave = (y: number, x: number, seed: number) => y + Math.sin(x * 0.011 + seed) * 4 + Math.sin(x * 0.031 + seed * 2) * 2
  for (let i = 0; i < bands.length; i++) {
    const [start, color] = bands[i]
    context.fillStyle = color
    context.beginPath()
    context.moveTo(0, 256)
    for (let x = 0; x <= 1024; x += 16) context.lineTo(x, i === 0 ? 0 : wave(start * 256, x, i * 3.1))
    context.lineTo(1024, 256)
    context.closePath()
    context.fill()
  }
  // Pebbles, roots and grain.
  for (let i = 0; i < 2400; i++) {
    const y = random() * 256
    const band = bands.reduce((found, b, index) => (y / 256 >= b[0] ? index : found), 0)
    context.fillStyle = random() < 0.5 ? bands[band][2] : 'rgba(255,255,255,0.08)'
    const size = band === 2 ? 1.5 + random() * 4 : 0.8 + random() * 1.8
    context.beginPath()
    context.ellipse(random() * 1024, y, size, size * 0.7, 0, 0, Math.PI * 2)
    context.fill()
  }
  const texture = new CanvasTexture(element)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  return texture
}

/**
 * The site model around the house: plinth, drive, walk, planting and
 * trees on a studio floor. Trees sway with the storm.
 */
export class Site {
  readonly group = new Group()
  private readonly trees: Object3D[] = []
  private readonly materials: Material[] = []
  private readonly geometries: BufferGeometry[] = []
  private readonly textures: Texture[] = []

  constructor(library: SurfaceLibrary) {
    const random = seeded(1234)
    const lawn = library.get('lawn')
    lawn.albedo.repeat.set(1 / lawn.size[0], 1 / lawn.size[1])
    lawn.normal.repeat.copy(lawn.albedo.repeat)
    const concrete = library.get('concrete')
    concrete.albedo.repeat.set(1 / concrete.size[0], 1 / concrete.size[1])
    concrete.normal.repeat.copy(concrete.albedo.repeat)

    // The house stands on a site plinth, like an architect's model. Its cut
    // edge shows the ground in section: turf, topsoil, gravel and clay.
    const strata = strataTexture()
    this.textures.push(strata)
    const shape = new Shape()
    const r = 3.2
    const [X0, X1, Z0, Z1] = [PLINTH.x0, PLINTH.x1, PLINTH.z0, PLINTH.z1]
    shape.moveTo(X0 + r, -Z1)
    shape.lineTo(X1 - r, -Z1)
    shape.quadraticCurveTo(X1, -Z1, X1, -Z1 + r)
    shape.lineTo(X1, -Z0 - r)
    shape.quadraticCurveTo(X1, -Z0, X1 - r, -Z0)
    shape.lineTo(X0 + r, -Z0)
    shape.quadraticCurveTo(X0, -Z0, X0, -Z0 - r)
    shape.lineTo(X0, -Z1 + r)
    shape.quadraticCurveTo(X0, -Z1, X0 + r, -Z1)
    const plinth = new ExtrudeGeometry(shape, { depth: PLINTH.depth, bevelEnabled: false, curveSegments: 8 })
    plinth.rotateX(-Math.PI / 2)
    plinth.translate(0, -PLINTH.depth, 0)
    strata.repeat.set(1 / 6, 1 / PLINTH.depth)
    strata.offset.set(0, 1 - 1 / PLINTH.depth)
    const lawnMaterial = this.material({ map: lawn.albedo, normalMap: lawn.normal, roughness: 1, color: '#d2d6b4' })
    const strataMaterial = this.material({ map: strata, roughness: 0.95 })
    const plinthMesh = new Mesh(plinth, [lawnMaterial, strataMaterial])
    plinthMesh.receiveShadow = true
    plinthMesh.castShadow = true
    this.group.add(plinthMesh)
    this.geometries.push(plinth)

    const floor = new CircleGeometry(430, 72)
    floor.rotateX(-Math.PI / 2)
    floor.translate(0, -PLINTH.depth, 0)
    const floorMaterial = this.material({ color: '#30353a', roughness: 0.96 }) as MeshStandardMaterial
    floorMaterial.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vFloor;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFloor = (modelMatrix * vec4(position, 1.0)).xz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vFloor;')
        .replace('#include <fog_fragment>', '#include <fog_fragment>\n#ifdef USE_FOG\ngl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(34.0, 150.0, length(vFloor - vec2(3.0, 0.0))));\n#endif')
    }
    const floorMesh = new Mesh(floor, floorMaterial)
    floorMesh.receiveShadow = true
    this.group.add(floorMesh)
    this.geometries.push(floor)

    const paving = this.material({ map: concrete.albedo, normalMap: concrete.normal, roughness: 0.92 })
    const slab = (x0: number, x1: number, z0: number, z1: number) => {
      const geometry = box((x0 + x1) / 2, 0.02, (z0 + z1) / 2, x1 - x0, 0.04, z1 - z0)
      const p = geometry.attributes.position
      const u = geometry.attributes.uv
      for (let i = 0; i < p.count; i++) u.setXY(i, p.getX(i), -p.getZ(i))
      return geometry
    }
    const pavingGeometry = merge([slab(7.9, 13.3, 4.0, PLINTH.z1 - 0.02), slab(-2.35, -1.05, 6.9, 10.6), slab(-2.35, 7.9, 9.5, 10.6)])
    const pavingMesh = new Mesh(pavingGeometry, paving)
    pavingMesh.receiveShadow = true
    this.group.add(pavingMesh)
    this.geometries.push(pavingGeometry)

    // Soft contact shadow so the house sits in the lawn rather than on it.
    const aoCanvas = document.createElement('canvas')
    aoCanvas.width = 512
    aoCanvas.height = 256
    const ao = aoCanvas.getContext('2d')!
    const toPx = (x: number, z: number): [number, number] => [((x + 10) / 26) * 512, ((z + 7) / 13) * 256]
    ao.filter = 'blur(10px)'
    ao.fillStyle = 'rgba(0,0,0,0.85)'
    const rect = (x0: number, z0: number, x1: number, z1: number) => { const [a, b] = toPx(x0, z0); const [c, d] = toPx(x1, z1); ao.fillRect(a, b, c - a, d - b) }
    rect(-7.6, -4.6, 7.6, 4.6); rect(7.2, -3.2, 14, 4.4); rect(-5.2, 4.2, 1.8, 6.8)
    const aoTexture = new CanvasTexture(aoCanvas)
    const aoGeometry = new PlaneGeometry(26, 13)
    aoGeometry.rotateX(-Math.PI / 2)
    aoGeometry.translate(3, 0.012, -0.5)
    const aoMaterial = new MeshBasicMaterial({ color: '#000000', alphaMap: aoTexture, transparent: true, opacity: 0.5, depthWrite: false })
    this.materials.push(aoMaterial)
    const aoMesh = new Mesh(aoGeometry, aoMaterial)
    aoMesh.renderOrder = 1
    this.group.add(aoMesh)
    this.geometries.push(aoGeometry)
    this.textures.push(aoTexture)

    // Planting beds along the foundation.
    const mulch = this.material({ color: '#2f241d', roughness: 1 })
    const beds = merge([box(-6.3, 0.03, 5.0, 1.8, 0.06, 1.6), box(4.2, 0.03, 5.0, 5.6, 0.06, 1.6), box(-7.9, 0.03, 0, 1.4, 0.06, 8.8)])
    const bedMesh = new Mesh(beds, mulch)
    bedMesh.receiveShadow = true
    this.group.add(bedMesh)
    this.geometries.push(beds)

    const foliage = ['#4a5a3c', '#435437', '#536544', '#3e4d34', '#56683f'].map(color => this.material({ color, roughness: 0.9 }))
    const shrubs: BufferGeometry[][] = foliage.map(() => [])
    const shrubAt = (x: number, z: number, r: number) => {
      const geometry = blob(r, random, 2, 0.8)
      geometry.translate(x, r * 0.7, z)
      shrubs[Math.floor(random() * shrubs.length)].push(geometry)
    }
    for (const x of [-6.9, -6.0, 2.4, 3.3, 4.2, 5.1, 6.1]) shrubAt(x + (random() - 0.5) * 0.3, 5.0 + (random() - 0.5) * 0.4, 0.42 + random() * 0.2)
    for (const z of [-3.2, -1.6, 0.3, 2.0, 3.4]) shrubAt(-7.95, z, 0.4 + random() * 0.18)
    shrubs.forEach((list, index) => {
      if (!list.length) return
      const geometry = merge(list)
      const mesh = new Mesh(geometry, foliage[index])
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.group.add(mesh)
      this.geometries.push(geometry)
    })

    const bark = this.material({ color: '#3b322b', roughness: 0.95 })
    const tree = (x: number, z: number, height: number, spread: number) => {
      const group = new Group()
      const trunk = cylinder(spread * 0.035, spread * 0.06, height * 0.6, 8)
      trunk.translate(0, height * 0.3, 0)
      const trunkMesh = new Mesh(trunk, bark)
      trunkMesh.castShadow = true
      group.add(trunkMesh)
      this.geometries.push(trunk)
      const crownGeometry: BufferGeometry[] = []
      const main = blob(spread * 0.5, random, 3, 1.25)
      main.translate(0, height * 0.66, 0)
      crownGeometry.push(main)
      for (let i = 0; i < 2; i++) {
        const side = blob(spread * (0.3 + random() * 0.08), random, 3, 1.1)
        const angle = random() * Math.PI * 2
        side.translate(Math.cos(angle) * spread * 0.32, height * (0.5 + random() * 0.12), Math.sin(angle) * spread * 0.32)
        crownGeometry.push(side)
      }
      const crown = merge(crownGeometry)
      const crownMesh = new Mesh(crown, foliage[Math.floor(random() * foliage.length)])
      crownMesh.castShadow = true
      crownMesh.receiveShadow = true
      group.add(crownMesh)
      this.geometries.push(crown)
      group.position.set(x, 0, z)
      group.userData.phase = random() * Math.PI * 2
      group.userData.stiffness = 0.6 + random() * 0.6
      this.group.add(group)
      this.trees.push(group)
    }
    tree(-11.5, -9.5, 12, 5)
    tree(3.5, -10.8, 14, 5.8)
    tree(16.5, -8.5, 10.5, 4.4)
    tree(-15, -4.5, 8, 3.4)
    tree(19.5, 7.5, 6.5, 3)
    tree(-6, -12.2, 9, 3.6)

    // Mailbox at the end of the drive.
    const post = merge([box(14.1, 0.6, 14.2, 0.1, 1.2, 0.1), box(14.1, 1.25, 14.2, 0.24, 0.24, 0.5)])
    const postMesh = new Mesh(post, this.material({ color: new Color('#1c1d1f'), roughness: 0.5, metalness: 0.4 }))
    postMesh.castShadow = true
    this.group.add(postMesh)
    this.geometries.push(post)
  }

  private material(options: ConstructorParameters<typeof MeshStandardMaterial>[0]): MeshStandardMaterial {
    const material = new MeshStandardMaterial(options)
    this.materials.push(material)
    return material
  }

  update(time: number, wind: number) {
    for (const tree of this.trees) {
      const phase = tree.userData.phase as number
      const stiffness = tree.userData.stiffness as number
      const gust = Math.sin(time * 1.7 + phase) * 0.6 + Math.sin(time * 3.1 + phase * 2) * 0.4
      tree.rotation.z = (gust * 0.035 + 0.02) * wind / stiffness
      tree.rotation.x = Math.sin(time * 1.3 + phase) * 0.018 * wind / stiffness
    }
  }

  dispose() {
    for (const geometry of this.geometries) geometry.dispose()
    for (const material of this.materials) material.dispose()
    for (const texture of this.textures) texture.dispose()
  }
}
