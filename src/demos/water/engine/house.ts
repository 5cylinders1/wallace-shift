import { Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, SRGBColorSpace, TextureLoader, type Texture, type WebGLRenderer } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const ZONES = ['shell', 'basement', 'kitchen', 'living', 'bath', 'bedroom'] as const

/**
 * The building, with all its light already in it. Blender's path tracer baked
 * each room to a texture (scripts/water/), so the model costs one unlit texture
 * per zone to draw and still has real bounced light. Nothing here is lit live.
 */
export class HouseModel {
  readonly group = new Group()
  private readonly materials: MeshBasicMaterial[] = []
  private readonly byZone = new Map<number, MeshBasicMaterial>()
  private readonly textures: Texture[] = []
  private dimmed = -1

  /** Small textures first, so the model is on screen fast. Full size follows on capable devices. */
  async load(renderer: WebGLRenderer, quality: 'high' | 'low') {
    const anisotropy = Math.min(quality === 'high' ? 8 : 4, renderer.capabilities.getMaxAnisotropy())
    const textureLoader = new TextureLoader()
    const prepare = (texture: Texture) => {
      texture.flipY = false
      texture.colorSpace = SRGBColorSpace
      texture.anisotropy = anisotropy
      texture.minFilter = LinearMipmapLinearFilter
      texture.magFilter = LinearFilter
      this.textures.push(texture)
      return texture
    }
    const [gltf, ...textures] = await Promise.all([
      new GLTFLoader().loadAsync('/demos/water/house.glb'),
      ...ZONES.map((zone) => textureLoader.loadAsync(`/demos/water/baked/${zone}-small.webp`)),
    ])
    textures.forEach(prepare)
    gltf.scene.traverse((node) => {
      if (!(node instanceof Mesh)) return
      const index = ZONES.findIndex((zone) => node.name.includes(zone) || node.parent?.name.includes(zone))
      if (index < 0) return
      const material = new MeshBasicMaterial({ map: textures[index], toneMapped: false })
      node.material = material
      node.frustumCulled = false
      this.materials.push(material)
      this.byZone.set(index, material)
    })
    this.group.add(gltf.scene)
    textures.forEach((texture) => renderer.initTexture(texture))
    if (quality !== 'high') return
    ZONES.forEach((zone, index) => {
      textureLoader.load(`/demos/water/baked/${zone}.webp`, (full) => {
        prepare(full)
        renderer.initTexture(full)
        const material = this.byZone.get(index)
        if (material) material.map = full
      })
    })
  }

  setDim(amount: number) {
    if (Math.abs(amount - this.dimmed) < 0.002) return
    this.dimmed = amount
    const value = 1 - amount
    this.materials.forEach((material) => material.color.setScalar(value))
  }

  dispose() {
    this.materials.forEach((material) => material.dispose())
    this.textures.forEach((texture) => texture.dispose())
    this.group.traverse((node) => { if (node instanceof Mesh) node.geometry.dispose() })
  }
}
