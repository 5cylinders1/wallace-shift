import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DataTexture, DoubleSide, DynamicDrawUsage, FloatType, Group,
  IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PlaneGeometry, Quaternion, RedFormat, ShaderMaterial, Vector3, type Camera, type Texture,
} from 'three'
import { seeded } from './textures'

export interface Surface {
  heightAt(x: number, z: number): number | null
  normalAt(x: number, z: number): Vector3
}

const HEIGHT_BOUNDS = { x0: -10, z0: -7.5, width: 27, depth: 18 }

/** A small height field of the roofs so rain stops on them, not through them. */
export function roofHeightTexture(surface: Surface, previous?: DataTexture): DataTexture {
  const size = 96
  const data = new Float32Array(size * size)
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = HEIGHT_BOUNDS.x0 + ((i + 0.5) / size) * HEIGHT_BOUNDS.width
      const z = HEIGHT_BOUNDS.z0 + ((j + 0.5) / size) * HEIGHT_BOUNDS.depth
      data[j * size + i] = surface.heightAt(x, z) ?? 0
    }
  }
  if (previous) {
    previous.image.data = data
    previous.needsUpdate = true
    return previous
  }
  const texture = new DataTexture(data, size, size, RedFormat, FloatType)
  texture.needsUpdate = true
  return texture
}

const rainVertex = /* glsl */ `
  attribute vec4 seed;
  attribute float tip;
  uniform float uTime;
  uniform float uDensity;
  uniform vec3 uCenter;
  uniform vec3 uSize;
  uniform vec2 uWind;
  uniform sampler2D uHeight;
  uniform vec4 uBounds;
  varying float vAlpha;
  void main() {
    float speed = 17.0 + seed.z * 7.0;
    float y = mod(seed.y * uSize.y - uTime * speed, uSize.y);
    vec3 p = uCenter + vec3((seed.x - 0.5) * uSize.x, y, (seed.w - 0.5) * uSize.z);
    p.xz += uWind * (uSize.y - y) * 0.06;
    vec3 dir = normalize(vec3(uWind.x * 0.35, -1.0, uWind.y * 0.35));
    p -= dir * (0.55 + seed.z * 0.4) * tip;
    vec2 huv = (p.xz - uBounds.xy) / uBounds.zw;
    float roof = 0.0;
    if (huv.x > 0.0 && huv.x < 1.0 && huv.y > 0.0 && huv.y < 1.0) roof = texture2D(uHeight, huv).r;
    float shown = step(fract(seed.y * 13.37 + seed.w * 7.1), uDensity) * step(roof, p.y);
    vAlpha = shown * (0.55 - tip * 0.4);
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`

const rainFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha * uOpacity);
    #include <colorspace_fragment>
  }
`

interface Pulse { alive: boolean; age: number; life: number; size: number; position: Vector3; quaternion: Quaternion; strength: number }
interface Stone { alive: boolean; position: Vector3; velocity: Vector3; radius: number; bounces: number; rest: number }

const Z = new Vector3(0, 0, 1)

export class Weather {
  readonly group = new Group()
  private readonly rain: LineSegments<BufferGeometry, ShaderMaterial>
  private readonly pulses: InstancedMesh
  private readonly pulseState: Pulse[]
  private readonly hail: InstancedMesh
  private readonly stones: Stone[]
  private readonly bolt: Mesh<BufferGeometry, MeshBasicMaterial>
  private readonly random = seeded(2024)
  private readonly matrix = new Matrix4()
  private readonly color = new Color()
  private surface: Surface
  private samples: { position: Vector3; normal: Vector3 }[] = []
  private splashCarry = 0
  private boltTimer = 4
  private flashTime = -10
  private flashValue = 0
  private heightTexture: DataTexture

  constructor(surface: Surface, glow: Texture, quality: 'high' | 'low') {
    this.surface = surface
    const drops = quality === 'high' ? 2600 : 1100
    const seeds = new Float32Array(drops * 2 * 4)
    const tips = new Float32Array(drops * 2)
    for (let i = 0; i < drops; i++) {
      const s = [this.random(), this.random(), this.random(), this.random()]
      for (let k = 0; k < 2; k++) {
        seeds.set(s, (i * 2 + k) * 4)
        tips[i * 2 + k] = k
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(drops * 2 * 3), 3))
    geometry.setAttribute('seed', new BufferAttribute(seeds, 4))
    geometry.setAttribute('tip', new BufferAttribute(tips, 1))
    this.heightTexture = roofHeightTexture(surface)
    const material = new ShaderMaterial({
      vertexShader: rainVertex,
      fragmentShader: rainFragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uDensity: { value: 0 },
        uCenter: { value: new Vector3(2, 0, 3) },
        uSize: { value: new Vector3(58, 28, 44) },
        uWind: { value: [1.4, 0.6] },
        uHeight: { value: this.heightTexture },
        uBounds: { value: [HEIGHT_BOUNDS.x0, HEIGHT_BOUNDS.z0, HEIGHT_BOUNDS.width, HEIGHT_BOUNDS.depth] },
        uColor: { value: new Color('#c9d6e2') },
        uOpacity: { value: 0 },
      },
    })
    this.rain = new LineSegments(geometry, material)
    this.rain.frustumCulled = false
    this.group.add(this.rain)

    const pulseCount = quality === 'high' ? 260 : 120
    const pulseGeometry = new PlaneGeometry(1, 1)
    this.pulses = new InstancedMesh(pulseGeometry, new MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false }), pulseCount)
    this.pulses.instanceColor = new InstancedBufferAttribute(new Float32Array(pulseCount * 3), 3)
    this.pulses.instanceMatrix.setUsage(DynamicDrawUsage)
    this.pulses.frustumCulled = false
    this.pulseState = Array.from({ length: pulseCount }, () => ({ alive: false, age: 0, life: 1, size: 1, position: new Vector3(), quaternion: new Quaternion(), strength: 1 }))
    this.group.add(this.pulses)

    const stoneCount = quality === 'high' ? 170 : 80
    this.hail = new InstancedMesh(new IcosahedronGeometry(1, 1), new MeshStandardMaterial({ color: '#eef4f8', roughness: 0.18, metalness: 0, emissive: new Color('#8fa6ba'), emissiveIntensity: 0.35 }), stoneCount)
    this.hail.instanceMatrix.setUsage(DynamicDrawUsage)
    this.hail.frustumCulled = false
    this.hail.castShadow = false
    this.stones = Array.from({ length: stoneCount }, () => ({ alive: false, position: new Vector3(), velocity: new Vector3(), radius: 0.05, bounces: 0, rest: 0 }))
    this.group.add(this.hail)

    this.bolt = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ color: '#eef2ff', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false, side: DoubleSide }))
    this.bolt.frustumCulled = false
    this.group.add(this.bolt)
  }

  setSurface(surface: Surface, samples: { position: Vector3; normal: Vector3 }[]) {
    this.surface = surface
    this.samples = samples
    this.heightTexture = roofHeightTexture(surface, this.heightTexture)
    this.rain.material.uniforms.uHeight.value = this.heightTexture
  }

  /** Brightness of the current lightning flash, 0 to 1. */
  get flash(): number { return this.flashValue }

  private pulse(position: Vector3, normal: Vector3, size: number, life: number, strength: number) {
    const slot = this.pulseState.find(p => !p.alive)
    if (!slot) return
    slot.alive = true
    slot.age = 0
    slot.life = life
    slot.size = size
    slot.strength = strength
    slot.position.copy(position).addScaledVector(normal, 0.03)
    slot.quaternion.setFromUnitVectors(Z, normal)
  }

  private spawnStone(stone: Stone) {
    const r = this.random
    stone.alive = true
    stone.position.set(2 + (r() - 0.5) * 40, 20 + r() * 14, 1.5 + (r() - 0.5) * 26)
    stone.velocity.set(1.2 + (r() - 0.5), -9 - r() * 4, 0.5 + (r() - 0.5))
    stone.radius = 0.045 + r() * 0.04
    stone.bounces = 0
    stone.rest = 0
  }

  private strike(camera: Camera) {
    const r = this.random
    const start = new Vector3((r() - 0.5) * 120, 70, -70 - r() * 40)
    const end = start.clone().add(new Vector3((r() - 0.5) * 18, -70, (r() - 0.5) * 8))
    const points: Vector3[] = [start, end]
    let offset = 9
    for (let level = 0; level < 6; level++) {
      for (let i = points.length - 1; i > 0; i--) {
        const mid = points[i - 1].clone().add(points[i]).multiplyScalar(0.5)
        mid.x += (r() - 0.5) * offset
        mid.z += (r() - 0.5) * offset * 0.4
        points.splice(i, 0, mid)
      }
      offset *= 0.55
    }
    const view = new Vector3()
    camera.getWorldDirection(view)
    const positions: number[] = []
    const ribbon = (path: Vector3[], width: number) => {
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1]
        const side = new Vector3().crossVectors(b.clone().sub(a), view).normalize().multiplyScalar(width * (1 - i / path.length * 0.6))
        const quad = [a.clone().sub(side), a.clone().add(side), b.clone().add(side), a.clone().sub(side), b.clone().add(side), b.clone().sub(side)]
        for (const p of quad) positions.push(p.x, p.y, p.z)
      }
    }
    ribbon(points, 0.55)
    const branchStart = Math.floor(points.length * (0.25 + r() * 0.3))
    const branch = [points[branchStart]]
    for (let i = 0; i < 18; i++) branch.push(branch[branch.length - 1].clone().add(new Vector3((r() - 0.3) * 3.5, -2.2 - r() * 1.5, (r() - 0.5))))
    ribbon(branch, 0.25)
    this.bolt.geometry.dispose()
    this.bolt.geometry = new BufferGeometry()
    this.bolt.geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  }

  update(dt: number, time: number, camera: Camera, state: { rain: number; hail: number; lightning: number; reduced: boolean }) {
    const rainMaterial = this.rain.material
    rainMaterial.uniforms.uTime.value = state.reduced ? 0 : time
    rainMaterial.uniforms.uDensity.value = state.rain
    rainMaterial.uniforms.uOpacity.value = Math.min(1, state.rain * 1.4) * 0.55
    this.rain.visible = state.rain > 0.01

    // Splashes where rain meets the roof.
    if (!state.reduced && this.samples.length && state.rain > 0.05) {
      this.splashCarry += dt * state.rain * 90
      while (this.splashCarry > 1) {
        this.splashCarry -= 1
        const sample = this.samples[Math.floor(this.random() * this.samples.length)]
        this.pulse(sample.position, sample.normal, 0.22 + this.random() * 0.18, 0.28, 0.35)
      }
    }

    // Hail.
    const activeStones = state.reduced ? 0 : Math.round(this.stones.length * state.hail)
    this.stones.forEach((stone, index) => {
      if (index >= activeStones) {
        if (stone.alive && stone.position.y > 6) stone.alive = false
      } else if (!stone.alive) {
        if (this.random() < dt * 3) this.spawnStone(stone)
      }
      if (stone.alive) {
        if (stone.rest > 0) {
          stone.rest -= dt
          if (stone.rest <= 0) stone.alive = false
        } else {
          stone.velocity.y = Math.max(-16, stone.velocity.y - 9.8 * dt)
          stone.position.addScaledVector(stone.velocity, dt)
          const roof = this.surface.heightAt(stone.position.x, stone.position.z)
          if (roof !== null && stone.position.y - stone.radius <= roof && stone.position.y > roof - 0.6) {
            const normal = this.surface.normalAt(stone.position.x, stone.position.z)
            const vn = stone.velocity.dot(normal)
            if (vn < 0) {
              stone.velocity.addScaledVector(normal, -(1.38) * vn)
              stone.velocity.multiplyScalar(0.72)
              stone.velocity.x += (this.random() - 0.5) * 0.8
              stone.velocity.z += (this.random() - 0.5) * 0.8
              if (stone.bounces < 2) this.pulse(stone.position.clone().setY(roof), normal, 0.5, 0.32, 0.9)
              stone.bounces++
            }
            stone.position.y = roof + stone.radius
          } else if (stone.position.y - stone.radius <= 0.02) {
            if (Math.abs(stone.velocity.y) > 2.5 && stone.bounces < 4) {
              stone.velocity.y *= -0.3
              stone.velocity.x *= 0.5
              stone.velocity.z *= 0.5
              stone.bounces++
            } else {
              stone.velocity.set(0, 0, 0)
              stone.rest = 2.5 + this.random() * 3
            }
            stone.position.y = stone.radius + 0.02
          }
          if (stone.position.y < -2) stone.alive = false
        }
      }
      const r = stone.alive ? stone.radius : 0
      this.matrix.makeScale(r, r * 0.92, r).setPosition(stone.position)
      this.hail.setMatrixAt(index, this.matrix)
    })
    this.hail.instanceMatrix.needsUpdate = true
    this.hail.visible = this.stones.some(stone => stone.alive)

    // Pulses.
    this.pulseState.forEach((pulse, index) => {
      if (pulse.alive) {
        pulse.age += dt
        if (pulse.age >= pulse.life) pulse.alive = false
      }
      const t = pulse.alive ? pulse.age / pulse.life : 1
      const scale = pulse.alive ? pulse.size * (0.35 + t * 0.9) : 0
      this.matrix.compose(pulse.position, pulse.quaternion, new Vector3(scale, scale, scale))
      this.pulses.setMatrixAt(index, this.matrix)
      const fade = pulse.alive ? (1 - t) * (1 - t) * pulse.strength : 0
      this.color.setRGB(fade * 0.85, fade * 0.92, fade)
      this.pulses.setColorAt(index, this.color)
    })
    this.pulses.instanceMatrix.needsUpdate = true
    if (this.pulses.instanceColor) this.pulses.instanceColor.needsUpdate = true

    // Lightning.
    if (state.lightning > 0.5 && !state.reduced) {
      this.boltTimer -= dt
      if (this.boltTimer <= 0) {
        this.strike(camera)
        this.flashTime = time
        this.boltTimer = 3.5 + this.random() * 5.5
      }
    } else {
      this.boltTimer = Math.min(this.boltTimer, 1.5)
    }
    const since = time - this.flashTime
    let flash = 0
    if (since >= 0 && since < 1.2) {
      if (since < 0.07) flash = 1
      else if (since < 0.13) flash = 0.2
      else if (since < 0.22) flash = 0.85
      else flash = 0.85 * Math.exp(-(since - 0.22) * 7)
    }
    this.flashValue = flash * Math.min(1, state.lightning)
    this.bolt.material.opacity = this.flashValue > 0.15 ? this.flashValue : 0
    this.bolt.visible = this.bolt.material.opacity > 0
  }

  dispose() {
    this.rain.geometry.dispose()
    this.rain.material.dispose()
    this.pulses.geometry.dispose()
    ;(this.pulses.material as MeshBasicMaterial).dispose()
    this.hail.geometry.dispose()
    ;(this.hail.material as MeshStandardMaterial).dispose()
    this.bolt.geometry.dispose()
    this.bolt.material.dispose()
    this.heightTexture.dispose()
  }
}
