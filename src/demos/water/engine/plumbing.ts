import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DataTexture, DoubleSide, FloatType, Group, IcosahedronGeometry,
  InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, NearestFilter, RGBAFormat, ShaderMaterial, Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { buildRuns, isDownstream, treatedReach, type Run } from './network'
import type { Mode } from './state'

/** Water colours, in the only two states the visitor needs to learn. */
export const RAW = new Color('#e8912f')
export const CLEAN = new Color('#7fe6ff')

const TREATED = /* glsl */ `
uniform float uWholeFrom;
uniform float uWholeTo;
uniform float uTap;
attribute float aArc;
attribute float aTapArc;
attribute float aPurity;
float treatedAt(float arc, float tapArc, float purity) {
  // Downstream of the system: clean between the two moving fronts.
  float whole = 0.0;
  if (arc >= 0.0) {
    float head = 1.0 - smoothstep(uWholeTo - 0.25, uWholeTo + 0.05, arc);
    float tail = smoothstep(uWholeFrom - 0.05, uWholeFrom + 0.25, arc);
    whole = head * tail;
  }
  // Between the tanks: as clean as the stages it has passed.
  if (purity >= 0.0) whole = purity * smoothstep(0.0, 1.0, uWholeTo);
  // Past an under-sink filter, one tap's worth.
  float tap = tapArc >= 0.0 ? 1.0 - smoothstep(uTap - 0.08, uTap + 0.02, tapArc) : 0.0;
  return max(whole, tap);
}
`

function tube(run: Run, radius: number, sides: number): BufferGeometry {
  const { points, arcs, spec } = run
  const n = points.length
  const positions = new Float32Array(n * sides * 3)
  const normals = new Float32Array(n * sides * 3)
  const arc = new Float32Array(n * sides)
  const tapArc = new Float32Array(n * sides)
  const purity = new Float32Array(n * sides)
  const indices: number[] = []
  const tangent = new Vector3()
  const normal = new Vector3()
  const binormal = new Vector3()
  const p = new Vector3()
  for (let i = 0; i < n; i++) {
    const next = points[Math.min(i + 1, n - 1)]
    const previous = points[Math.max(i - 1, 0)]
    tangent.copy(next).sub(previous).normalize()
    if (i === 0) {
      normal.set(0, 0, 1).cross(tangent)
      if (normal.lengthSq() < 0.01) normal.set(1, 0, 0).cross(tangent)
      normal.normalize()
    } else {
      normal.sub(tangent.clone().multiplyScalar(normal.dot(tangent))).normalize()
    }
    binormal.crossVectors(tangent, normal)
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2
      const cos = Math.cos(a), sin = Math.sin(a)
      const offset = i * sides + s
      p.copy(normal).multiplyScalar(cos).addScaledVector(binormal, sin)
      normals.set([p.x, p.y, p.z], offset * 3)
      p.multiplyScalar(radius).add(points[i])
      positions.set([p.x, p.y, p.z], offset * 3)
      arc[offset] = isDownstream(spec) ? run.start + arcs[i] : -1
      tapArc[offset] = spec.tap ? arcs[i] : -1
      purity[offset] = spec.zone === 'system' ? spec.purity ?? 0 : -1
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < sides; s++) {
      const a = i * sides + s, b = i * sides + (s + 1) % sides
      indices.push(a, b, a + sides, b, b + sides, a + sides)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  geometry.setAttribute('aArc', new BufferAttribute(arc, 1))
  geometry.setAttribute('aTapArc', new BufferAttribute(tapArc, 1))
  geometry.setAttribute('aPurity', new BufferAttribute(purity, 1))
  geometry.setIndex(indices)
  return geometry
}

/**
 * Pipes are a dark casing with a lit core, so they stay legible over pale
 * plaster and dark soil alike. A faint second pass shows the runs hidden
 * behind cabinets and walls, the x-ray the whole page depends on.
 */
export class Plumbing {
  readonly group = new Group()
  readonly runs: Run[] = buildRuns()
  readonly reach = treatedReach(this.runs)
  private readonly uniforms = {
    uTime: { value: 0 },
    uWholeFrom: { value: -1 },
    uWholeTo: { value: 0 },
    uTap: { value: 0 },
    uRaw: { value: RAW },
    uClean: { value: CLEAN },
    uOpacity: { value: 1 },
  }
  private readonly geometries: BufferGeometry[] = []
  private readonly materials: ShaderMaterial[] = []
  private readonly pathTexture: DataTexture
  private mode: Mode = 'none'
  private leaving = false
  private readonly reduced: boolean
  private readonly flowSpeed = 3.4

  constructor(options: { reduced: boolean; quality: 'high' | 'low' }) {
    this.reduced = options.reduced
    const casingGeometry = mergeGeometries(this.runs.map((run) => tube(run, 0.026 * (run.spec.radius ?? 1), 8)))
    const coreGeometry = mergeGeometries(this.runs.map((run) => tube(run, 0.015 * (run.spec.radius ?? 1), 6)))
    if (!casingGeometry || !coreGeometry) throw new Error('Could not build pipe geometry')
    this.geometries.push(casingGeometry, coreGeometry)

    const vertex = /* glsl */ `
      ${TREATED}
      varying float vTreated;
      varying float vArc;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vTreated = treatedAt(aArc, aTapArc, aPurity);
        vArc = aArc >= 0.0 ? aArc : position.x + position.y + position.z;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `
    // Occluded runs, drawn first and faint.
    const xray = new ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
      vertexShader: vertex,
      fragmentShader: /* glsl */ `
        uniform vec3 uRaw; uniform vec3 uClean; uniform float uOpacity;
        varying float vTreated;
        void main() {
          gl_FragColor = vec4(mix(uRaw, uClean, vTreated), 0.34 * uOpacity);
        }
      `,
    })
    const casing = new ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: vertex,
      fragmentShader: /* glsl */ `
        uniform vec3 uRaw; uniform vec3 uClean; uniform float uOpacity;
        varying float vTreated; varying vec3 vNormal; varying vec3 vView;
        void main() {
          vec3 tint = mix(vec3(0.16, 0.075, 0.02), vec3(0.015, 0.11, 0.17), vTreated);
          float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.5);
          gl_FragColor = vec4(tint + mix(uRaw, uClean, vTreated) * rim * 0.6, 0.86 * uOpacity);
        }
      `,
    })
    const core = new ShaderMaterial({
      uniforms: this.uniforms, transparent: true, toneMapped: false,
      vertexShader: vertex,
      fragmentShader: /* glsl */ `
        uniform vec3 uRaw; uniform vec3 uClean; uniform float uTime; uniform float uOpacity;
        varying float vTreated; varying float vArc;
        void main() {
          float pulse = 0.5 + 0.5 * sin((vArc - uTime * 1.5) * 9.0);
          vec3 tone = mix(uRaw, uClean, vTreated);
          gl_FragColor = vec4(tone * (0.92 + pulse * 0.42), uOpacity);
        }
      `,
    })
    this.materials.push(xray, casing, core)
    const xrayMesh = new Mesh(casingGeometry, xray); xrayMesh.renderOrder = 1
    const casingMesh = new Mesh(casingGeometry, casing); casingMesh.renderOrder = 2
    const coreMesh = new Mesh(coreGeometry, core); coreMesh.renderOrder = 3
    this.group.add(xrayMesh, casingMesh, coreMesh)

    // Particles ride the same runs on the GPU: one texture row per run.
    const samples = 48
    const pixels = new Float32Array(samples * this.runs.length * 4)
    this.runs.forEach((run, row) => {
      for (let i = 0; i < samples; i++) {
        const target = (i / (samples - 1)) * run.length
        let at = 0
        while (at < run.arcs.length - 2 && run.arcs[at + 1] < target) at++
        const span = Math.max(run.arcs[at + 1] - run.arcs[at], 1e-5)
        const p = run.points[at].clone().lerp(run.points[at + 1], Math.min(1, (target - run.arcs[at]) / span))
        pixels.set([p.x, p.y, p.z, 1], (row * samples + i) * 4)
      }
    })
    this.pathTexture = new DataTexture(pixels, samples, this.runs.length, RGBAFormat, FloatType)
    this.pathTexture.minFilter = this.pathTexture.magFilter = NearestFilter
    this.pathTexture.needsUpdate = true

    const density = options.quality === 'high' ? 5.5 : 3
    const counts = this.runs.map((run) => Math.ceil(run.length * density))
    const total = counts.reduce((sum, c) => sum + c, 0)
    const dot = new IcosahedronGeometry(1, 0)
    this.geometries.push(dot)
    const attributes = {
      aRun: new Float32Array(total), aPhase: new Float32Array(total), aSize: new Float32Array(total),
      aLength: new Float32Array(total), aStart: new Float32Array(total), aTapFlag: new Float32Array(total), aPurityI: new Float32Array(total),
    }
    let cursor = 0
    this.runs.forEach((run, row) => {
      for (let i = 0; i < counts[row]; i++) {
        attributes.aRun[cursor] = row
        attributes.aPhase[cursor] = (i + Math.random() * 0.8) / counts[row]
        attributes.aSize[cursor] = Math.random() < 0.3 ? 1.9 : 1
        attributes.aLength[cursor] = run.length
        attributes.aStart[cursor] = isDownstream(run.spec) ? run.start : -1
        attributes.aTapFlag[cursor] = run.spec.tap ? 1 : 0
        attributes.aPurityI[cursor] = run.spec.zone === 'system' ? run.spec.purity ?? 0 : -1
        cursor++
      }
    })
    const particles = new ShaderMaterial({
      uniforms: {
        ...this.uniforms,
        uPaths: { value: this.pathTexture },
        uRows: { value: this.runs.length },
        uSamples: { value: samples },
        uSpeed: { value: this.flowSpeed },
      },
      transparent: true, depthTest: false, depthWrite: false, toneMapped: false, blending: AdditiveBlending, side: DoubleSide,
      vertexShader: /* glsl */ `
        uniform sampler2D uPaths; uniform float uRows; uniform float uSamples; uniform float uTime; uniform float uSpeed;
        uniform float uWholeFrom; uniform float uWholeTo; uniform float uTap;
        attribute float aRun; attribute float aPhase; attribute float aSize; attribute float aLength;
        attribute float aStart; attribute float aTapFlag; attribute float aPurityI;
        varying float vTreated; varying float vGrit;
        void main() {
          float along = fract(aPhase + uTime * uSpeed / aLength);
          float at = along * (uSamples - 1.0);
          float base = floor(at);
          vec2 uvA = vec2((base + 0.5) / uSamples, (aRun + 0.5) / uRows);
          vec2 uvB = vec2((min(base + 1.0, uSamples - 1.0) + 0.5) / uSamples, (aRun + 0.5) / uRows);
          vec3 centre = mix(texture2D(uPaths, uvA).xyz, texture2D(uPaths, uvB).xyz, at - base);
          float arc = aStart >= 0.0 ? aStart + along * aLength : -1.0;
          float whole = 0.0;
          if (arc >= 0.0) whole = (1.0 - smoothstep(uWholeTo - 0.25, uWholeTo + 0.05, arc)) * smoothstep(uWholeFrom - 0.05, uWholeFrom + 0.25, arc);
          if (aPurityI >= 0.0) whole = aPurityI * smoothstep(0.0, 1.0, uWholeTo);
          float tap = aTapFlag > 0.5 ? 1.0 - smoothstep(uTap - 0.08, uTap + 0.02, along * aLength) : 0.0;
          vTreated = max(whole, tap);
          vGrit = step(1.5, aSize);
          float grow = mix(aSize, 1.0, vTreated);
          vec4 mv = modelViewMatrix * vec4(centre + position * 0.012 * grow, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uRaw; uniform vec3 uClean; uniform float uOpacity;
        varying float vTreated; varying float vGrit;
        void main() {
          vec3 raw = mix(uRaw * 1.2, vec3(0.34, 0.14, 0.03), vGrit);
          gl_FragColor = vec4(mix(raw, uClean * 1.5, vTreated) * uOpacity, uOpacity * 0.95);
        }
      `,
    })
    this.materials.push(particles)
    const instanced = new InstancedMesh(dot, particles, total)
    const identity = new Matrix4()
    for (let i = 0; i < total; i++) instanced.setMatrixAt(i, identity)
    dot.setAttribute('aRun', new InstancedBufferAttribute(attributes.aRun, 1))
    dot.setAttribute('aPhase', new InstancedBufferAttribute(attributes.aPhase, 1))
    dot.setAttribute('aSize', new InstancedBufferAttribute(attributes.aSize, 1))
    dot.setAttribute('aLength', new InstancedBufferAttribute(attributes.aLength, 1))
    dot.setAttribute('aStart', new InstancedBufferAttribute(attributes.aStart, 1))
    dot.setAttribute('aTapFlag', new InstancedBufferAttribute(attributes.aTapFlag, 1))
    dot.setAttribute('aPurityI', new InstancedBufferAttribute(attributes.aPurityI, 1))
    instanced.frustumCulled = false
    instanced.renderOrder = 4
    if (!options.reduced) this.group.add(instanced)
  }

  /** How much of a fixture's run is clean right now, for pins and readouts. */
  treatedOf(id: string): number {
    const run = this.runs.find((candidate) => candidate.spec.id === id)
    if (!run) return 0
    const end = run.start + run.length
    const { uWholeFrom, uWholeTo, uTap } = this.uniforms
    const whole = isDownstream(run.spec) && end <= uWholeTo.value && end >= uWholeFrom.value ? 1 : 0
    const tap = run.spec.tap && uTap.value >= run.length ? 1 : 0
    return Math.max(whole, tap)
  }

  setMode(mode: Mode, immediate: boolean) {
    if (mode === this.mode && !immediate) return
    const { uWholeFrom, uWholeTo, uTap } = this.uniforms
    if (immediate) {
      uWholeFrom.value = -1
      uWholeTo.value = mode === 'whole' ? this.reach + 1 : 0
      uTap.value = mode === 'tap' ? 2 : 0
      this.leaving = false
    } else if (mode === 'whole') {
      uWholeFrom.value = -1
      uWholeTo.value = this.leaving ? 0 : uWholeTo.value
      this.leaving = false
    } else if (this.mode === 'whole') {
      // Raw water chases the clean water out of the pipes, from the system onward.
      this.leaving = true
      uWholeFrom.value = -0.5
    }
    this.mode = mode
  }

  update(dt: number, time: number) {
    const u = this.uniforms
    u.uTime.value = this.reduced ? 0 : time
    const rate = this.flowSpeed * dt
    if (this.mode === 'whole') u.uWholeTo.value = Math.min(this.reach + 1, u.uWholeTo.value + rate)
    if (this.leaving) {
      u.uWholeFrom.value += rate
      if (u.uWholeFrom.value > this.reach + 0.5) {
        u.uWholeTo.value = 0
        u.uWholeFrom.value = -1
        this.leaving = false
      }
    }
    u.uTap.value = this.mode === 'tap' ? Math.min(2, u.uTap.value + rate * 0.5) : Math.max(0, u.uTap.value - rate * 0.5)
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose())
    this.materials.forEach((material) => material.dispose())
    this.pathTexture.dispose()
  }
}
