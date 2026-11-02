import {
  BufferGeometry, CircleGeometry, Color, CylinderGeometry, DirectionalLight, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, PlaneGeometry,
  PointLight, RingGeometry, ShaderMaterial, type Material,
} from 'three'

/**
 * Fifteen years inside a hot-water line, at many times life size: two copper
 * pipes cut lengthwise, one on untreated hard water and one with scale control.
 * The crust is geometry, not a texture, so it closes the bore for real and the
 * water visibly has less room. Growth is a straight-line illustration; the page
 * says so next to the slider.
 */

const NOISE = /* glsl */ `
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float crust(vec3 p) {
  return vnoise(p * 2.2) * 0.55 + vnoise(p * 6.0) * 0.3 + vnoise(p * 15.0) * 0.15;
}
`

const R = 1.05
const WALL = 0.11
const BORE = R - WALL
const LENGTH = 5.2
export const PIPE_X = 1.42

/** Inner surface of the lower half of the pipe. Direction is what matters: the shader sets the radius. */
function crustGeometry(): BufferGeometry {
  const around = 96
  const along = 150
  const positions: number[] = []
  const indices: number[] = []
  for (let j = 0; j <= along; j++) {
    for (let i = 0; i <= around; i++) {
      const a = Math.PI + (i / around) * Math.PI
      positions.push(Math.cos(a), Math.sin(a), (j / along - 0.5) * LENGTH)
    }
  }
  for (let j = 0; j < along; j++) {
    for (let i = 0; i < around; i++) {
      const a = j * (around + 1) + i, b = a + 1, c = a + around + 1, d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** Where the knife cuts the crust: strips from the wall to the crust's surface, so its thickness reads. */
function cutGeometry(): BufferGeometry {
  const positions: number[] = []
  const edges: number[] = []
  const indices: number[] = []
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, c, b, d, c)
  // The near end, as a half ring.
  const around = 96
  for (let i = 0; i <= around; i++) {
    const a = Math.PI + (i / around) * Math.PI
    positions.push(Math.cos(a), Math.sin(a), LENGTH / 2, Math.cos(a), Math.sin(a), LENGTH / 2)
    edges.push(0, 1)
    if (i < around) quad(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 3)
  }
  // The two long edges, in the plane of the cut.
  const along = 150
  for (const side of [-1, 1]) {
    const base = positions.length / 3
    for (let j = 0; j <= along; j++) {
      const z = (j / along - 0.5) * LENGTH
      positions.push(side, 0, z, side, 0, z)
      edges.push(0, 1)
      if (j < along) {
        const k = base + j * 2
        quad(k, k + 1, k + 2, k + 3)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aEdge', new Float32BufferAttribute(edges, 1))
  geometry.setIndex(indices)
  return geometry
}

function crustMaterial(uniforms: { uThickness: { value: number }; uSeed: { value: number } }, cut: boolean): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: '#c9bea6', roughness: 0.96, metalness: 0, side: DoubleSide, flatShading: true, envMapIntensity: 0.35 })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uThickness = uniforms.uThickness
    shader.uniforms.uSeed = uniforms.uSeed
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uThickness; uniform float uSeed;
        ${cut ? 'attribute float aEdge;' : ''}
        varying float vCrust; varying float vGrow;
        ${NOISE}`)
      .replace('#include <begin_vertex>', `
        vec3 surface = normalize(vec3(position.xy, 0.0));
        float n = crust(vec3(surface.xy * 1.8, position.z * 0.75) + uSeed);
        float grow = uThickness * (0.55 + n * 0.95);
        vec3 transformed = vec3(surface.xy * (${BORE.toFixed(3)} - grow${cut ? ' * aEdge' : ''}), position.z);
        vCrust = n;
        vGrow = grow;
      `)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uThickness;
        varying float vCrust; varying float vGrow;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // Scale starts as scattered patches on bare copper and closes up as it thickens.
        if (vCrust < 0.62 - smoothstep(0.0, 0.25, uThickness) * 0.62) discard;
        diffuseColor.rgb *= mix(vec3(0.46, 0.36, 0.25), vec3(0.98, 0.93, 0.84), smoothstep(0.3, 0.68, vCrust));`)
  }
  return material
}

interface PipeParts {
  thickness: { value: number }
  water: Mesh
  waterUniforms: { uTime: { value: number }; uSpeed: { value: number }; uColor: { value: Color } }
}

export class ScaleStudy {
  readonly group = new Group()
  private readonly geometries: BufferGeometry[] = []
  private readonly materials: Material[] = []
  private readonly pipes: PipeParts[] = []
  private readonly reduced: boolean

  constructor(options: { reduced: boolean }) {
    this.reduced = options.reduced
    const copper = new MeshStandardMaterial({ color: '#c8804e', metalness: 0.85, roughness: 0.34, side: DoubleSide, envMapIntensity: 1.5 })
    const copperOut = new MeshStandardMaterial({ color: '#c58152', metalness: 1, roughness: 0.28, side: DoubleSide })
    this.materials.push(copper, copperOut)

    // CylinderGeometry sweeps around y: turn it so the half we keep is the lower one.
    const shell = new CylinderGeometry(R, R, LENGTH, 56, 1, true, Math.PI / 2, Math.PI)
    shell.rotateX(-Math.PI / 2)
    const inner = new CylinderGeometry(BORE, BORE, LENGTH, 56, 1, true, Math.PI / 2, Math.PI)
    inner.rotateX(-Math.PI / 2)
    const face = new RingGeometry(BORE, R, 56, 1, Math.PI, Math.PI)
    const lip = new PlaneGeometry(WALL, LENGTH)
    lip.rotateX(-Math.PI / 2)
    // Closes the far end: looking along the bore would otherwise show a hole into the void.
    const farEnd = new CircleGeometry(BORE, 48, Math.PI, Math.PI)
    const farMaterial = new MeshStandardMaterial({ color: '#5c3a22', roughness: 0.85, side: DoubleSide })
    this.materials.push(farMaterial)
    const crust = crustGeometry()
    const cut = cutGeometry()
    const waterPlane = new PlaneGeometry(2, LENGTH)
    waterPlane.rotateX(-Math.PI / 2)
    this.geometries.push(shell, inner, face, farEnd, lip, crust, cut, waterPlane)

    const make = (x: number, seed: number, tint: string) => {
      const group = new Group()
      group.position.x = x
      const thickness = { value: 0 }
      const seedUniform = { value: seed }
      group.add(new Mesh(shell, copperOut), new Mesh(inner, copper))
      const end = new Mesh(face, copperOut)
      end.position.z = LENGTH / 2
      const far = new Mesh(farEnd, farMaterial)
      far.position.z = -LENGTH / 2
      group.add(end, far)
      for (const side of [-1, 1]) {
        const edge = new Mesh(lip, copperOut)
        edge.position.x = side * (BORE + WALL / 2)
        group.add(edge)
      }
      const crustSurface = crustMaterial({ uThickness: thickness, uSeed: seedUniform }, false)
      const crustCut = crustMaterial({ uThickness: thickness, uSeed: seedUniform }, true)
      this.materials.push(crustSurface, crustCut)
      group.add(new Mesh(crust, crustSurface), new Mesh(cut, crustCut))

      // The water, seen as the flat face the knife cuts through it.
      const waterUniforms = { uTime: { value: 0 }, uSpeed: { value: 1 }, uColor: { value: new Color(tint) } }
      const waterMaterial = new ShaderMaterial({
        uniforms: waterUniforms, transparent: true, depthWrite: false, toneMapped: false,
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform float uSpeed; uniform vec3 uColor; varying vec2 vUv;
          float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
          void main() {
            float lane = floor(vUv.x * 26.0);
            float offset = rand(vec2(lane, 3.1));
            float along = fract(vUv.y * (2.0 + offset * 3.0) + offset * 7.0 + uTime * uSpeed * (0.8 + offset));
            float streak = smoothstep(0.0, 0.1, along) * (1.0 - smoothstep(0.1, 0.45, along)) * step(0.45, rand(vec2(lane, 9.7)));
            float edge = smoothstep(0.0, 0.04, vUv.x) * smoothstep(0.0, 0.04, 1.0 - vUv.x);
            gl_FragColor = vec4(uColor * (0.8 + streak * 0.5), (0.26 + streak * 0.3) * edge);
          }
        `,
      })
      this.materials.push(waterMaterial)
      const water = new Mesh(waterPlane, waterMaterial)
      water.position.y = 0.01
      water.renderOrder = 3
      group.add(water)
      this.group.add(group)
      this.pipes.push({ thickness, water, waterUniforms })
    }
    make(-PIPE_X, 3.1, '#efa04a')
    make(PIPE_X, 8.7, '#8fe6ff')

    const key = new DirectionalLight('#fff0dc', 1.5)
    key.position.set(-5, 5, 5)
    const rim = new DirectionalLight('#8fc7ff', 0.7)
    rim.position.set(6, 3, -4)
    const inside = new PointLight('#ffe4bf', 5, 12, 1.4)
    inside.position.set(0, 3, 3)
    this.group.add(key, rim, inside)
  }

  /** thickness: how far the crust has closed the bore, 0..1. controlled: the same, with scale control. */
  update(time: number, thickness: number, controlled: number) {
    const values = [thickness, controlled]
    this.pipes.forEach((pipe, index) => {
      const crust = Math.min(values[index], 1) * BORE * 0.8
      pipe.thickness.value = crust
      const open = Math.max(BORE - crust * 1.05, 0.08)
      pipe.water.scale.x = open
      // The same water through less room has to move faster.
      pipe.waterUniforms.uSpeed.value = this.reduced ? 0 : 0.12 * Math.min((BORE * BORE) / (open * open), 6)
      pipe.waterUniforms.uTime.value = time
    })
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose())
    this.materials.forEach((material) => material.dispose())
  }
}
