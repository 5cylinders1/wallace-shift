import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Matrix3, Points,
  ShaderMaterial, Vector3, type Mesh } from 'three'

/** Deterministic, so the field is identical on every load and in every check. */
function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

interface SurfacePoint { position: Vector3; normal: Vector3 }

/** Area-weighted sampling of the authored halves, in the space the caller's
 * meshes already occupy. Larger faces receive proportionally more motes, so
 * the settled skin describes the real mark rather than its vertex density. */
export function sampleJourneySurface(meshes: Mesh[], count: number,
  random: () => number): SurfacePoint[] {
  const triangles: { a: Vector3; b: Vector3; c: Vector3; normal: Vector3; area: number }[] = []
  let total = 0
  for (const mesh of meshes) {
    const geometry = mesh.geometry
    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    if (!position) continue
    const index = geometry.getIndex()
    const faces = index ? index.count : position.count
    const normalMatrix = new Matrix3().getNormalMatrix(mesh.matrixWorld)
    for (let i = 0; i < faces; i += 3) {
      const corners = [0, 1, 2].map(offset => {
        const vertex = index ? index.getX(i + offset) : i + offset
        return {
          point: new Vector3().fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld),
          direction: normal
            ? new Vector3().fromBufferAttribute(normal, vertex).applyMatrix3(normalMatrix).normalize()
            : new Vector3(0, 1, 0),
        }
      })
      const [a, b, c] = corners
      const area = new Vector3().subVectors(b.point, a.point)
        .cross(new Vector3().subVectors(c.point, a.point)).length() * .5
      if (!(area > 0)) continue
      total += area
      triangles.push({
        a: a.point, b: b.point, c: c.point, area: total,
        normal: a.direction.clone().add(b.direction).add(c.direction).normalize(),
      })
    }
  }
  if (!triangles.length || !(total > 0)) {
    throw new Error('The journey mark has no sampleable surface for its charge field.')
  }
  const points: SurfacePoint[] = []
  for (let i = 0; i < count; i++) {
    const target = random() * total
    let low = 0, high = triangles.length - 1
    while (low < high) {
      const middle = (low + high) >> 1
      if (triangles[middle].area < target) low = middle + 1
      else high = middle
    }
    const face = triangles[low]
    let u = random(), v = random()
    if (u + v > 1) { u = 1 - u; v = 1 - v }
    points.push({
      position: new Vector3()
        .addScaledVector(new Vector3().subVectors(face.b, face.a), u)
        .addScaledVector(new Vector3().subVectors(face.c, face.a), v)
        .add(face.a),
      normal: face.normal.clone(),
    })
  }
  return points
}

export interface JourneyGatherFrame {
  visible: number
  power: number
  surge: number
  time: number
  pixelRatio: number
}

const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback
const unit = (value: number) => Math.max(0, Math.min(1, finite(value)))

/** The charge the quiz mark gathers. Motes begin as a loose, cold volume
 * drifting around the mark, are pulled into an orbiting shell as the reader
 * commits, and finally settle onto the authored surface as a second skin of
 * light. Three answered questions is the difference between raw material and
 * a finished object — the point of the whole section. */
export function createJourneyGather(meshes: Mesh[], center: Vector3, extent: number, count = 4200) {
  const random = seededRandom(0x5715f7)
  const surface = sampleJourneySurface(meshes, count, random)
  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const scatter = new Float32Array(count * 3)
  const seeds = new Float32Array(count * 4)
  const reach = Math.max(.001, extent)
  for (let i = 0; i < count; i++) {
    const point = surface[i]
    positions.set([point.position.x, point.position.y, point.position.z], i * 3)
    normals.set([point.normal.x, point.normal.y, point.normal.z], i * 3)
    // A hollow-ish cloud: biasing the radius outward keeps the loose state
    // reading as a surrounding volume rather than a blob over the mark.
    const theta = random() * Math.PI * 2
    const height = random() * 2 - 1
    const ring = Math.sqrt(Math.max(0, 1 - height * height))
    const distance = reach * (.85 + 1.35 * Math.cbrt(random()))
    scatter.set([
      center.x + Math.cos(theta) * ring * distance,
      center.y + height * distance * .62,
      center.z + Math.sin(theta) * ring * distance,
    ], i * 3)
    seeds.set([random(), random(), random(), random()], i * 4)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aNormal', new BufferAttribute(normals, 3))
  geometry.setAttribute('aScatter', new BufferAttribute(scatter, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4))
  geometry.computeBoundingSphere()

  const material = new ShaderMaterial({
    name: 'HomepageJourney_QuizGather',
    transparent: true,
    // Motes are light added over a dark panel, and this layer draws over the
    // mark's own already-composited pixels rather than over bare canvas, so
    // additive is correct here where it is wrong for the panel backdrops.
    blending: AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uGather: { value: 0 },
      uSurge: { value: 0 },
      uTime: { value: 0 },
      uVisible: { value: 0 },
      uPixelRatio: { value: 1 },
      uCenter: { value: center.clone() },
      uReach: { value: reach },
      uCool: { value: new Color('#3ea6c8') },
      uWarm: { value: new Color('#b9a8f0') },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aNormal;
      attribute vec3 aScatter;
      attribute vec4 aSeed;
      uniform float uGather, uSurge, uTime, uPixelRatio, uReach;
      uniform vec3 uCenter;
      varying float vAlpha;
      varying float vHeat;
      void main() {
        // Motes arrive in waves rather than together, so each answer reads as
        // a gathering rather than a single hard state change.
        float stagger = aSeed.x * .38;
        float gather = clamp(uGather * 1.45 - stagger, 0.0, 1.0);
        gather = gather * gather * (3.0 - 2.0 * gather);

        vec3 offset = aScatter - uCenter;
        // Loose motes orbit slowly and drift; both die away as they commit.
        float turn = uTime * (.11 + aSeed.y * .19) * (1.0 - gather * .85);
        float cosine = cos(turn), sine = sin(turn);
        vec3 loose = vec3(offset.x * cosine - offset.z * sine, offset.y,
          offset.x * sine + offset.z * cosine);
        loose += vec3(sin(uTime * .43 + aSeed.z * 21.0),
          cos(uTime * .37 + aSeed.w * 17.0),
          sin(uTime * .31 + aSeed.x * 13.0)) * uReach * .10 * (1.0 - gather);

        // Halfway, the cloud tightens into an orbiting shell just clear of
        // the mark; only then does it settle onto the authored surface.
        vec3 shell = normalize(loose + vec3(.0001)) * uReach * (1.18 + aSeed.w * .18);
        vec3 skin = (position - uCenter) + aNormal * uReach * .035;
        // The first answer owns the tightening, the later two own the settle,
        // so every step of the quiz changes the field in a visible way.
        vec3 place = mix(loose, shell, smoothstep(0.0, .42, gather));
        place = mix(place, skin, smoothstep(.42, 1.0, gather));

        // Committing to an answer drives one shockwave out through the field.
        place += normalize(place + vec3(.0001)) * uSurge * uReach * (.14 + aSeed.y * .22);

        vec4 view = modelViewMatrix * vec4(uCenter + place, 1.0);
        gl_Position = projectionMatrix * view;
        float ember = step(.93, aSeed.z);
        gl_PointSize = (1.1 + 1.7 * gather + aSeed.w * 1.1 + ember * 2.2) * uPixelRatio;
        vAlpha = (.28 + .72 * gather) * (.45 + .55 * aSeed.w) * (1.0 + uSurge * 1.6);
        vHeat = clamp(gather * .75 + ember * .5 + uSurge * .4, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uVisible;
      uniform vec3 uCool, uWarm;
      varying float vAlpha;
      varying float vHeat;
      void main() {
        float radius = length(gl_PointCoord - .5) * 2.0;
        float core = 1.0 - smoothstep(.15, 1.0, radius);
        if (core < .002) discard;
        float alpha = core * vAlpha * uVisible;
        if (alpha < .002) discard;
        gl_FragColor = vec4(mix(uCool, uWarm, vHeat) * alpha, alpha);
      }
    `,
  })
  material.customProgramCacheKey = () => 'homepage-journey-quiz-gather-v1'
  const points = new Points(geometry, material)
  points.name = 'HomepageJourney_QuizGather'
  // Drawn after the mark so its depth buffer hides the motes settling on the
  // far side, which is what makes the skin read as wrapped around an object.
  points.renderOrder = 6
  points.frustumCulled = false
  points.visible = false
  let disposed = false

  return {
    points,
    update(frame: JourneyGatherFrame) {
      const visible = disposed ? 0 : unit(frame.visible)
      points.visible = visible > .001
      if (!points.visible) return
      const uniforms = material.uniforms
      uniforms.uVisible.value = visible
      uniforms.uGather.value = unit(frame.power)
      uniforms.uSurge.value = unit(frame.surge)
      uniforms.uTime.value = Math.max(0, finite(frame.time))
      uniforms.uPixelRatio.value = Math.max(.5, Math.min(3, finite(frame.pixelRatio, 1)))
    },
    dispose() {
      if (disposed) return
      disposed = true
      points.visible = false
      geometry.dispose()
      material.dispose()
    },
  }
}
