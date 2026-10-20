import {
  BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, type Material, type Texture,
} from 'three'
import { EARTH, FROST_DEPTH } from './ground'
import { blob, cylinderAt } from './shapes'
import { contactShadowTexture, lawnTexture, strataTexture } from './textures'
import { GLSL_GROUND, shared } from './uniforms'
import { merge, seeded } from './geometry'

/** The tree stands behind the house, clear of the headline. */
export const TREE: [number, number] = [3.2, -14.6]

const SPAN = EARTH.x1 - EARTH.x0
const HEIGHT = EARTH.top - EARTH.bottom

/**
 * A vertical face of the soil block. `sx` is the position along the painted
 * strip, so strata stay continuous round the block's front corners.
 */
function face(corners: { x: number; z: number; sx: number }[]): BufferGeometry {
  const [a, b] = corners
  const positions: number[] = []
  const uvs: number[] = []
  const normals: number[] = []
  const nx = -(b.z - a.z), nz = b.x - a.x
  const length = Math.hypot(nx, nz) || 1
  const columns = 24
  const rows = 8
  for (let i = 0; i < columns; i++) for (let j = 0; j < rows; j++) {
    const quad = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i, j + 1]]
    for (const [ci, rj] of quad) {
      const t = ci / columns
      const y = EARTH.bottom + (rj / rows) * HEIGHT
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t
      const sx = a.sx + (b.sx - a.sx) * t
      positions.push(x, y, z)
      uvs.push((sx - EARTH.x0) / SPAN, (y - EARTH.bottom) / HEIGHT)
      normals.push(nx / length, 0, nz / length)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  return geometry
}

const SOIL_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying float vSx;
`

const SOIL_FRAGMENT = /* glsl */ `
float sx = vSx;
float y = vWorld.y;
float g = gradeAt(vWorld.x, uNegGrade, uRegrade);
if (y > g + 0.002) discard;
if (vWorld.z > -0.02 && abs(vWorld.x) < 6.0 && y > -2.5) discard;
float depth = g - y;
float tb = topsoilBottom(sx);
float cb = clayBottom(sx);
float sb = shaleBottom(sx);
vec3 c = diffuseColor.rgb;

// Fresh soil placed by regrading, above the original grade.
float original = gradeAt(vWorld.x, uNegGrade, 0.0);
if (y > original) c = vec3(0.34, 0.26, 0.19) * (0.82 + 0.36 * valueNoise(vec2(sx, y) * 36.0));

float upper = step(cb, y);
float sat = 1.0 - smoothstep(uTable - 0.05, uTable + 0.05, y);
float moist = uWet * upper * (1.0 - smoothstep(0.0, 4.5, depth) * 0.35);
c *= mix(1.0, 0.78, clamp(moist * 0.7 + sat * 0.35, 0.0, 1.0));
c = mix(c, c * vec3(0.86, 0.94, 1.08), sat * 0.55);
float shimmer = valueNoise(vec2(sx * 3.0, y * 9.0)) * sat * (1.0 - smoothstep(0.0, 1.6, uTable - y));
c = mix(c, uWater, shimmer * 0.12);
float tableLine = (1.0 - smoothstep(0.01, 0.028, abs(y - uTable))) * step(uTable, -0.2);
c = mix(c, uWater * 0.75, tableLine * 0.95);

// Late summer: the upper clay dries, lightens and cracks.
float dz = uDry * upper * (1.0 - smoothstep(0.3, 2.5, depth));
c = mix(c, c * 1.16 + vec3(0.05, 0.04, 0.02), dz * 0.55);
float fissureDepth = 1.0 - smoothstep(0.2, 1.7 + 0.6 * valueNoise(vec2(sx * 2.0, 3.0)), depth);
float edge = cellEdge(vec2(sx * 2.4, y * 0.75));
float fissure = (1.0 - smoothstep(0.02, 0.06, edge)) * fissureDepth;
c = mix(c, vec3(0.09, 0.07, 0.05), uDry * upper * fissure);

// The soil shrinks back from the basement walls.
float ax = abs(vWorld.x);
float gapWidth = uGap * 0.22 * (1.0 - smoothstep(0.1, 2.1, depth));
float inGap = step(6.0, ax) * step(ax, 6.0 + gapWidth) * step(-0.02, vWorld.z);
float gapEdge = step(6.0 + gapWidth, ax) * step(ax, 6.0 + gapWidth + 0.025) * step(-0.02, vWorld.z) * step(0.01, gapWidth);
c = mix(c, vec3(0.04, 0.035, 0.03), inGap);
c = mix(c, c * 0.55, gapEdge);

// Frozen ground to the footing-depth line.
float frozen = uFrost * (1.0 - smoothstep(${(FROST_DEPTH - 0.03).toFixed(3)}, ${(FROST_DEPTH + 0.01).toFixed(3)}, depth));
float crystals = valueNoise(vec2(sx, y) * 28.0);
c = mix(c, vec3(0.83, 0.88, 0.94), frozen * (0.4 + crystals * 0.25));
float frostLine = (1.0 - smoothstep(0.006, 0.02, abs(depth - ${FROST_DEPTH.toFixed(4)}))) * uFrost;
c = mix(c, vec3(0.25, 0.42, 0.64), frostLine * 0.85);

// Emphasise one stratum when the copy talks about it.
float layer = y > tb ? 0.0 : (y > cb ? 1.0 : (y > sb ? 2.0 : 3.0));
float other = step(0.5, abs(layer - uFocus));
c = mix(c, c * 0.42 + vec3(0.12), uFocusAmount * other);

// Section line at grade.
c = mix(c, vec3(0.09, 0.08, 0.07), 1.0 - smoothstep(0.0, 0.028, depth));
diffuseColor.rgb = c;
`

export class Earth {
  readonly group = new Group()
  private readonly materials: Material[] = []
  private readonly geometries: BufferGeometry[] = []
  private readonly textures: Texture[] = []
  private readonly canopy: MeshStandardMaterial
  private readonly canopyMesh: Mesh
  private readonly frostMarks: LineBasicMaterial

  constructor() {
    const strata = strataTexture()
    const lawnNoise = lawnTexture()
    lawnNoise.repeat.set(10, 6)
    this.textures.push(strata, lawnNoise)

    // Soil: the cut face, both sides and the back.
    const soil = new MeshStandardMaterial({ map: strata, roughness: 1, metalness: 0, side: DoubleSide })
    soil.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, shared)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${SOIL_VERTEX}`)
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvSx = uv.x * ' + SPAN.toFixed(1) + ' + ' + EARTH.x0.toFixed(1) + ';')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${SOIL_VERTEX}\nuniform float uNegGrade, uRegrade, uWet, uTable, uDry, uGap, uFrost, uFocus, uFocusAmount;\nuniform vec3 uWater;\n${GLSL_GROUND}`)
        .replace('#include <map_fragment>', `#include <map_fragment>\n${SOIL_FRAGMENT}`)
    }
    soil.customProgramCacheKey = () => 'datum-soil'
    this.materials.push(soil)
    const faces = [
      face([{ x: EARTH.x0, z: 0, sx: EARTH.x0 }, { x: EARTH.x1, z: 0, sx: EARTH.x1 }]),
      face([{ x: EARTH.x1, z: 0, sx: EARTH.x1 }, { x: EARTH.x1, z: EARTH.z0, sx: EARTH.x1 + EARTH.z0 }]),
      face([{ x: EARTH.x0, z: EARTH.z0, sx: EARTH.x0 - EARTH.z0 }, { x: EARTH.x0, z: 0, sx: EARTH.x0 }]),
      face([{ x: EARTH.x1, z: EARTH.z0, sx: EARTH.x0 }, { x: EARTH.x0, z: EARTH.z0, sx: EARTH.x1 }]),
    ]
    for (const geometry of faces) {
      const mesh = new Mesh(geometry, soil)
      mesh.receiveShadow = true
      this.group.add(mesh)
      this.geometries.push(geometry)
    }

    // Lawn: displaced by the grade, cut away inside the house, tinted by season.
    const lawnGeometry = new PlaneGeometry(SPAN, -EARTH.z0, 128, 72)
    lawnGeometry.rotateX(-Math.PI / 2)
    lawnGeometry.translate(0, 0, EARTH.z0 / 2)
    const lawn = new MeshStandardMaterial({ map: lawnNoise, roughness: 1, color: '#ffffff' })
    lawn.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, shared)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vWorld;\nuniform float uNegGrade, uRegrade;\n${GLSL_GROUND}`)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += gradeAt(transformed.x, uNegGrade, uRegrade);')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vWorld;\nuniform float uLawnDry, uFrost, uWet, uGap, uNegGrade, uRegrade;\n${GLSL_GROUND}`)
        .replace('#include <map_fragment>', /* glsl */ `#include <map_fragment>
if (vWorld.x > -6.0 && vWorld.x < 6.0 && vWorld.z > -7.25) discard;
vec3 green = vec3(0.47, 0.56, 0.36);
vec3 straw = vec3(0.71, 0.64, 0.45);
vec3 tint = mix(green, straw, uLawnDry);
float patchy = valueNoise(vWorld.xz * 0.35);
tint *= 0.86 + patchy * 0.22;
vec3 c = diffuseColor.rgb * tint * 1.25;
c *= 1.0 - uWet * 0.12;
float fresh = smoothstep(0.02, 0.06, vWorld.y - gradeAt(vWorld.x, uNegGrade, 0.0));
c = mix(c, vec3(0.36, 0.28, 0.2) * (0.9 + patchy * 0.2), fresh);
c = mix(c, vec3(0.9, 0.92, 0.95), uFrost * (0.55 + patchy * 0.3));
float ax = abs(vWorld.x);
float gap = step(6.0, ax) * step(ax, 6.0 + uGap * 0.22) * step(vWorld.z, 0.0) * step(-7.4, vWorld.z);
c = mix(c, vec3(0.06, 0.05, 0.04), gap);
diffuseColor.rgb = c;`)
    }
    lawn.customProgramCacheKey = () => 'datum-lawn'
    this.materials.push(lawn)
    const lawnMesh = new Mesh(lawnGeometry, lawn)
    lawnMesh.receiveShadow = true
    this.group.add(lawnMesh)
    this.geometries.push(lawnGeometry)

    // A soft shadow under the block, so it sits on the page like a model on a table.
    const shadowTexture = contactShadowTexture()
    this.textures.push(shadowTexture)
    const shadowGeometry = new PlaneGeometry(SPAN * 1.35, -EARTH.z0 * 1.5)
    shadowGeometry.rotateX(-Math.PI / 2)
    shadowGeometry.translate(0, EARTH.bottom - 0.02, EARTH.z0 / 2 + 0.2)
    const shadow = new MeshBasicMaterial({ color: '#000000', alphaMap: shadowTexture, transparent: true, opacity: 0.1, depthWrite: false })
    this.materials.push(shadow)
    this.group.add(new Mesh(shadowGeometry, shadow))
    this.geometries.push(shadowGeometry)

    // A tree on the back lawn.
    const random = seeded(5)
    const bark = new MeshStandardMaterial({ color: '#6c5c4c', roughness: 0.95 })
    this.canopy = new MeshStandardMaterial({ color: '#8e9c72', roughness: 0.95 })
    this.materials.push(bark, this.canopy)
    const trunk = cylinderAt(TREE[0], 0, TREE[1], 0.16, 0.26, 4.6)
    const trunkMesh = new Mesh(trunk, bark)
    trunkMesh.castShadow = true
    this.group.add(trunkMesh)
    this.geometries.push(trunk)
    const crown = merge([blob(1.9, random, 3, 1.0), blob(1.35, random, 2, 0.95).translate(1.2, -0.5, 0.4), blob(1.3, random, 2, 0.95).translate(-1.1, -0.35, -0.5)])
    crown.translate(TREE[0], 5.4, TREE[1])
    this.canopyMesh = new Mesh(crown, this.canopy)
    this.canopyMesh.castShadow = true
    this.canopyMesh.receiveShadow = true
    this.group.add(this.canopyMesh)
    this.geometries.push(crown)

    const shrubMaterial = new MeshStandardMaterial({ color: '#8a9670', roughness: 0.95 })
    this.materials.push(shrubMaterial)
    for (const [x, z, r] of [[-7.1, -2.2, 0.5], [-7.0, -4.4, 0.42], [-6.9, -6.3, 0.46], [7.3, -4.6, 0.44], [7.2, -6.4, 0.5]] as const) {
      const shrub = blob(r, random, 2, 0.85)
      shrub.translate(x, r * 0.62, z)
      const mesh = new Mesh(shrub, shrubMaterial)
      mesh.castShadow = true
      this.group.add(mesh)
      this.geometries.push(shrub)
    }

    // Dimension marks for the footing-depth line, at the block's left edge.
    const x = EARTH.x0 + 1.2
    const marks = new BufferGeometry()
    marks.setAttribute('position', new Float32BufferAttribute([
      x, 0, 0.02, x, -FROST_DEPTH, 0.02,
      x - 0.25, 0, 0.02, x + 0.25, 0, 0.02,
      x - 0.25, -FROST_DEPTH, 0.02, x + 0.25, -FROST_DEPTH, 0.02,
    ], 3))
    this.frostMarks = new LineBasicMaterial({ color: new Color('#1d3f66'), transparent: true, opacity: 0, depthTest: false })
    this.materials.push(this.frostMarks)
    const lines = new LineSegments(marks, this.frostMarks)
    lines.renderOrder = 5
    this.group.add(lines)
    this.geometries.push(marks)
  }

  update(state: { autumn: number; bare: number; frost: number }) {
    const green = new Color('#8e9c72')
    const amber = new Color('#c48a42')
    this.canopy.color.copy(green).lerp(amber, state.autumn)
    const scale = 1 - state.bare * 0.62
    this.canopyMesh.scale.setScalar(1)
    this.canopyMesh.visible = scale > 0.42
    this.canopy.opacity = 1
    this.canopyMesh.position.set(TREE[0] * (1 - scale), 5.4 * (1 - scale), TREE[1] * (1 - scale))
    this.canopyMesh.scale.setScalar(scale)
    this.frostMarks.opacity = state.frost * 0.9
  }

  dispose() {
    for (const geometry of this.geometries) geometry.dispose()
    for (const material of this.materials) material.dispose()
    for (const texture of this.textures) texture.dispose()
  }
}
