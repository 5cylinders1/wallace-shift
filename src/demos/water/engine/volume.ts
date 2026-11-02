import { BoxGeometry, DoubleSide, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh, ShaderMaterial, type BufferGeometry } from 'three'
import layout from './layout.json'

/** Indoor water by end use, from the 2016 Residential End Uses of Water study. Sums to 100. */
export const END_USES = [
  { id: 'toilets', label: 'Toilets', share: 24 },
  { id: 'showers', label: 'Showers', share: 20 },
  { id: 'faucets', label: 'Faucets', share: 19 },
  { id: 'washers', label: 'Clothes washers', share: 17 },
  { id: 'leaks', label: 'Leaks', share: 12 },
  { id: 'other', label: 'Baths, dishwashers and other', share: 8 },
] as const

export const GALLONS_PER_PERSON_DAY = 138 / 2.65
const CUBIC_METRES_PER_GALLON = 0.003785
/** The block lines up with the house's back wall. */
const BLOCK_BACK = layout.backWall

export const gallonsPerYear = (people: number) => Math.round(GALLONS_PER_PERSON_DAY * 365 * people)
export const blockSide = (people: number) => Math.cbrt(gallonsPerYear(people) * CUBIC_METRES_PER_GALLON)

/**
 * One year of a household's indoor water, at true scale, standing next to the
 * house. It is the same scale as the model, so nothing needs explaining. The
 * bands are the study's end uses, bottom to top; the faucet band is lit.
 */
export class WaterVolume {
  readonly group = new Group()
  private readonly box: Mesh
  private readonly edges: LineSegments
  private readonly geometries: BufferGeometry[] = []
  private readonly material: ShaderMaterial
  private readonly lineMaterial: LineBasicMaterial
  private side = 0
  /** x of the block's left face, just past the end of the plinth. */
  private readonly left = layout.plinth.right + 0.9

  constructor() {
    const geometry = new BoxGeometry(1, 1, 1)
    geometry.translate(0, 0.5, 0)
    this.geometries.push(geometry)
    const stops: number[] = []
    let total = 0
    END_USES.forEach((use) => { total += use.share; stops.push(total / 100) })
    this.material = new ShaderMaterial({
      uniforms: { uReveal: { value: 0 }, uTime: { value: 0 }, uStops: { value: stops } },
      transparent: true, depthWrite: false, side: DoubleSide, toneMapped: false,
      vertexShader: /* glsl */ `
        varying vec3 vLocal; varying vec3 vNormal; varying vec3 vView;
        void main() {
          vLocal = position;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uReveal; uniform float uTime; uniform float uStops[6];
        varying vec3 vLocal; varying vec3 vNormal; varying vec3 vView;
        void main() {
          float y = vLocal.y;
          if (y > uReveal) discard;
          float band = 0.0;
          for (int i = 0; i < 5; i++) band = max(band, 1.0 - smoothstep(0.0, 0.0035, abs(y - uStops[i])));
          float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.0);
          float faucets = step(uStops[1], y) * step(y, uStops[2]);
          vec3 deep = mix(vec3(0.03, 0.22, 0.34), vec3(0.07, 0.46, 0.6), y);
          float ripple = sin((vLocal.x + vLocal.z) * 9.0 + uTime * 0.7) * sin(y * 24.0 - uTime * 0.4) * 0.03;
          vec3 color = deep + ripple + fresnel * 0.34 + faucets * vec3(0.16, 0.26, 0.26) + band * vec3(0.72, 0.95, 1.0);
          float alpha = (0.42 + fresnel * 0.4 + band * 0.55 + faucets * 0.14);
          float surface = smoothstep(uReveal - 0.012, uReveal, y);
          gl_FragColor = vec4(color + surface * 0.5, alpha);
        }
      `,
    })
    this.box = new Mesh(geometry, this.material)
    this.box.renderOrder = 10
    const edgeGeometry = new EdgesGeometry(geometry)
    this.geometries.push(edgeGeometry)
    this.lineMaterial = new LineBasicMaterial({ color: '#a6efff', transparent: true, opacity: 0.8 })
    this.edges = new LineSegments(edgeGeometry, this.lineMaterial)
    this.edges.renderOrder = 11
    this.group.add(this.box, this.edges)
    this.group.visible = false
  }

  /** Height in the world of an end-use band's middle, for the page's labels. */
  bandAnchor(index: number): [number, number, number] {
    let below = 0
    for (let i = 0; i < index; i++) below += END_USES[i].share
    const middle = (below + END_USES[index].share / 2) / 100
    return [this.left + this.side, middle * this.side, BLOCK_BACK + this.side]
  }

  update(time: number, reveal: number, people: number, dt: number) {
    this.group.visible = reveal > 0.004
    if (!this.group.visible) return
    const target = blockSide(people)
    this.side = this.side === 0 ? target : this.side + (target - this.side) * (1 - Math.exp(-dt * 4))
    const s = this.side
    this.group.position.set(this.left + s / 2, 0, BLOCK_BACK + s / 2)
    this.group.scale.set(s, s, s)
    this.material.uniforms.uReveal.value = reveal
    this.material.uniforms.uTime.value = time
    this.lineMaterial.opacity = Math.min(1, reveal * 2) * 0.8
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose())
    this.material.dispose()
    this.lineMaterial.dispose()
  }
}
