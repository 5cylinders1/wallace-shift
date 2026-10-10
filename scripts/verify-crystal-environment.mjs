/** Source placement and GPU-resource orchestration checks. Mocked cube draws
 * verify ownership and routing, not photographed appearance or GPU shading. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  ACESFilmicToneMapping, Box3, Color, CubeCamera, HalfFloatType, LinearSRGBColorSpace,
  Matrix4, NoToneMapping, PMREMGenerator, Vector3, WebGLRenderTarget,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { transpileModule } from 'typescript'

const modules = new Map()
async function sourceModule(url) {
  if (modules.has(url.href)) return modules.get(url.href)
  let javascript = transpileModule(await readFile(url, 'utf8'), { compilerOptions: { target: 9, module: 7 } }).outputText
  for (const match of [...javascript.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const specifier = match[1]
    const resolved = specifier.startsWith('.') ? await sourceModule(new URL(`${specifier}.ts`, url)) : import.meta.resolve(specifier)
    javascript = javascript.replace(match[0], `from '${resolved}'`)
  }
  const result = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
  modules.set(url.href, result)
  return result
}
const baseUrl = new URL('../src/components/experiments/water-hero/', import.meta.url)
const { CRYSTAL_REFLECTION_CARDS, SOFT_GLASS_REFLECTION_CARDS, STUDIO_CRYSTAL_REFLECTION_CARDS, CRYSTAL_ENVIRONMENT_SIZE, CRYSTAL_AMBIENT,
  crystalCardBasis, createCrystalEnvironmentMaterial, createCrystalEnvironment } = await import(
  await sourceModule(new URL('crystalEnvironment.ts', baseUrl)),
)
const { buildGlassGeometry } = await import(await sourceModule(new URL('glassGeometry.ts', baseUrl)))
const { CRYSTAL_FACE_CURVATURE } = await import(await sourceModule(new URL('shaders/logoGlass.ts', baseUrl)))

await test('bright shoulder cards stay off-axis while restrained soft cards reveal the flat front and back faces', () => {
  const shoulders = CRYSTAL_REFLECTION_CARDS.filter(card => !card.softOval)
  const faces = CRYSTAL_REFLECTION_CARDS.filter(card => card.softOval)
  assert.equal(shoulders.length, 6)
  assert.equal(faces.length, 4)
  for (const card of CRYSTAL_REFLECTION_CARDS) {
    const { forward, right, up } = crystalCardBasis(card)
    assert.ok(Math.abs(forward.length() - 1) < 1e-12)
    assert.ok(Math.abs(right.dot(forward)) < 1e-12)
    assert.ok(Math.abs(up.dot(forward)) < 1e-12)
    assert.ok(Math.abs(up.dot(right)) < 1e-12)
    if (card.softOval) continue
    for (const face of [new Vector3(0, 0, 1), new Vector3(0, 0, -1)]) {
      const facing = face.dot(forward)
      if (facing <= 0) continue
      const extent = Math.max(Math.abs(face.dot(right) / facing) / card.half[0],
        Math.abs(face.dot(up) / facing) / card.half[1])
      assert.ok(extent > 1.12, 'the bright shoulder cards must not wash the entire flat face')
    }
  }
  assert.ok(CRYSTAL_REFLECTION_CARDS.some(card => card.azimuth > 2))
  assert.ok(CRYSTAL_REFLECTION_CARDS.some(card => card.azimuth < -2))
  assert.ok(CRYSTAL_REFLECTION_CARDS.some(card => card.half[1] >= .9))
  assert.ok(faces.every(card => card.intensity > 0 && card.intensity < 3.6), 'face cards are far dimmer than the primary shoulder cards')
})

await test('both actual glass pieces receive localized face reflections while most of their area stays clear', async t => {
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  const faceCards = CRYSTAL_REFLECTION_CARDS.filter(card => card.softOval)
  const radiance = direction => faceCards.reduce((sum, card) => {
    const { forward, right, up } = crystalCardBasis(card)
    const facing = direction.dot(forward)
    if (facing <= .01) return sum
    const x = direction.dot(right) / facing / card.half[0], y = direction.dot(up) / facing / card.half[1]
    const coverage = Math.exp(-(x * x + y * y) * 2.4) * (1 - smooth(.8, 1.6, Math.hypot(x, y)))
    return sum + coverage * card.intensity * (.66 + .34 * smooth(-1, 1, y))
  }, 0)
  const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
  scene.updateMatrixWorld(true)
  const bounds = new Box3().setFromObject(scene), center = bounds.getCenter(new Vector3())
  const scale = 2 / bounds.getSize(new Vector3()).x, orient = new Matrix4().makeRotationX(Math.PI / 2)
  const camera = new Vector3(0, .10, 7.9), logoOrigin = new Vector3(0, .54, 0)
  const meshes = []
  scene.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh) })
  const lens = CRYSTAL_FACE_CURVATURE
  for (const mesh of meshes) {
    const glass = buildGlassGeometry(mesh.geometry), p = glass.attributes.position, n = glass.attributes.normal, index = glass.index
    t.after(() => glass.dispose())
    let area = 0, lit = 0, minimum = Infinity, maximum = 0
    for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
      if (!ids.every(id => n.getY(id) > .9999)) continue
      const [a, b, c] = ids.map(id => new Vector3().fromBufferAttribute(p, id))
      const triangleArea = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2
      // Equal barycentric samples, weighted by actual triangle area. This
      // verifies the two real pieces, not an empty rectangular face aperture.
      for (let u = 1; u < 10; u++) for (let v = 1; v < 10 - u; v++) {
        const point = a.clone().multiplyScalar(1 - (u + v) / 10).addScaledVector(b, u / 10).addScaledVector(c, v / 10)
        const x = point.x * lens.scale, z = point.z * lens.scale
        const normal = new Vector3(-(lens.xx * x + lens.xz * z), 1, -(lens.zz * z + lens.xz * x)).normalize().transformDirection(orient)
        const world = point.clone().applyMatrix4(mesh.matrixWorld).sub(center).applyMatrix4(orient).multiplyScalar(scale).add(logoOrigin)
        const reflected = world.sub(camera).normalize().reflect(normal)
        const value = radiance(reflected)
        area += triangleArea
        if (value > .45) lit += triangleArea
        minimum = Math.min(minimum, value); maximum = Math.max(maximum, value)
      }
    }
    const highlighted = lit / area
    assert.ok(highlighted > .20 && highlighted < .50, `${mesh.name}: a broad minority catches a reflection; most of the face stays clear`)
    assert.equal(minimum, 0, 'the soft card has finite extent rather than an everywhere-gray floor')
    assert.ok(maximum > 2 && maximum < 3.2, 'each real piece needs a readable localized source')
    t.diagnostic(`${mesh.name}: ${(highlighted * 100).toFixed(1)}% of sampled face area catches the soft card; CPU source-placement estimate`)
  }
})

await test('card radiance stays linear HDR with shaped edges and a restrained ambient floor', () => {
  const material = createCrystalEnvironmentMaterial()
  assert.equal(material.toneMapped, false)
  assert.equal(material.depthWrite, false)
  assert.equal(material.depthTest, false)
  assert.equal(material.defines.CARD_COUNT, CRYSTAL_REFLECTION_CARDS.length)
  assert.deepEqual(material.uniforms.uAmbient.value.toArray(), [...CRYSTAL_AMBIENT])
  assert.ok(Math.max(...CRYSTAL_AMBIENT) < .002)
  assert.ok(Math.max(...material.uniforms.uIntensity.value) > 20)
  assert.ok(material.uniforms.uIntensity.value.every(value => value <= 28))
  assert.equal(material.uniforms.uSoftOval.value.filter(value => value === 1).length, 4)
  assert.doesNotMatch(material.fragmentShader, /tonemapping_fragment|colorspace_fragment|uTime|noise/)
  assert.match(material.fragmentShader, /distanceToCard/)
  assert.match(material.fragmentShader, /graduation/)
  assert.match(material.fragmentShader, /exp\(-dot\(oval, oval\) \* 2\.4\)/)
  material.dispose()
})

await test('Glass replaces white shoulder plateaus with lower-peak continuous falloff while retaining opening face lights', () => {
  const original = createCrystalEnvironmentMaterial()
  const soft = createCrystalEnvironmentMaterial('soft-glass')
  try {
    assert.equal(SOFT_GLASS_REFLECTION_CARDS.length, CRYSTAL_REFLECTION_CARDS.length)
    assert.deepEqual(soft.uniforms.uAmbient.value, original.uniforms.uAmbient.value)
    assert.deepEqual(soft.uniforms.uHalf.value, original.uniforms.uHalf.value)
    assert.deepEqual(soft.uniforms.uForward.value, original.uniforms.uForward.value)
    assert.deepEqual(soft.uniforms.uColor.value, original.uniforms.uColor.value)
    assert.ok(soft.uniforms.uSoftOval.value.every(value => value === 1))
    assert.ok(Math.max(...soft.uniforms.uIntensity.value) < 6,
      'Glass should no longer inherit the 18–28 HDR white card peaks')
    const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
    // CPU source-radiance estimate at fixed horizontal offsets in a card.
    // This checks the authored light source, not its rendered BRDF or GPU.
    const sample = (material, i, fraction) => {
      const half = material.uniforms.uHalf.value[i]
      const x = half.x * fraction
      let coverage
      if (material.uniforms.uSoftOval.value[i] > .5) {
        coverage = Math.exp(-fraction * fraction * 2.4) * (1 - smooth(.8, 1.6, Math.abs(fraction)))
      } else {
        const radius = Math.min(half.x, half.y) * .22
        const qx = Math.abs(x) - half.x + radius, qy = -half.y + radius
        const distance = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
        const feather = Math.min(half.x, half.y) * .12
        coverage = 1 - smooth(-feather, feather, distance)
      }
      return material.uniforms.uIntensity.value[i] * coverage * .83
    }
    for (const [i, card] of CRYSTAL_REFLECTION_CARDS.entries()) {
      if (card.softOval) {
        assert.deepEqual(SOFT_GLASS_REFLECTION_CARDS[i], card, 'retain the selective front/back opening reflections')
        continue
      }
      const peak = sample(soft, i, 0)
      assert.ok(peak <= sample(original, i, 0) * .201)
      assert.ok(Math.abs(sample(original, i, .5) / sample(original, i, 0) - 1) < 1e-12,
        'the original source contains the broad plateau visible in the reference')
      const values = [0, .25, .5, .75, 1, 1.5, 1.6].map(x => sample(soft, i, x))
      assert.ok(values.every((value, j) => j === 0 || value < values[j - 1]), 'radiance falls throughout the card instead of ending in a hard step')
      assert.ok(values[2] < peak * .60)
      assert.ok(values[4] < peak * .10)
      assert.equal(values.at(-1), 0, 'the light has finite extent and leaves dark passages')
    }
  } finally { original.dispose(); soft.dispose() }
})

function renderFixture(failAt = '', profile = 'original') {
  const oldCubeUpdate = CubeCamera.prototype.update
  const oldFilter = PMREMGenerator.prototype.fromCubemap
  const oldDispose = PMREMGenerator.prototype.dispose
  const target = new WebGLRenderTarget(17, 19)
  let activeTarget = target, face = 3, mip = 2
  const clear = new Color(.02, .04, .08)
  let alpha = .25
  const disposed = { cube: 0, filtered: 0, geometry: 0, material: 0, generator: 0 }
  let capturedCube, filteredTarget, cubeDraws = 0, filters = 0
  const renderer = {
    toneMapping: ACESFilmicToneMapping, xr: { enabled: true },
    autoClear: false, autoClearColor: false, autoClearDepth: false, autoClearStencil: true,
    getRenderTarget: () => activeTarget, getActiveCubeFace: () => face, getActiveMipmapLevel: () => mip,
    setRenderTarget(value, nextFace = 0, nextMip = 0) { activeTarget = value; face = nextFace; mip = nextMip },
    getClearColor(out) { return out.copy(clear) }, getClearAlpha: () => alpha,
    setClearColor(value, nextAlpha) { clear.copy(value); alpha = nextAlpha },
  }
  CubeCamera.prototype.update = function(actualRenderer, scene) {
    cubeDraws++
    assert.equal(actualRenderer, renderer)
    assert.equal(renderer.toneMapping, NoToneMapping)
    assert.equal(renderer.xr.enabled, false)
    assert.equal(renderer.autoClear, true)
    capturedCube = this.renderTarget
    assert.equal(capturedCube.width, CRYSTAL_ENVIRONMENT_SIZE)
    assert.equal(capturedCube.texture.type, HalfFloatType)
    assert.equal(capturedCube.texture.colorSpace, LinearSRGBColorSpace)
    assert.equal(capturedCube.texture.generateMipmaps, false)
    assert.equal(scene.children.length, 1, 'only the owned photographic rig is captured')
    const mesh = scene.children[0]
    const cards = profile === 'soft-glass' ? SOFT_GLASS_REFLECTION_CARDS : profile === 'studio' ? STUDIO_CRYSTAL_REFLECTION_CARDS : CRYSTAL_REFLECTION_CARDS
    assert.deepEqual(mesh.material.uniforms.uIntensity.value, cards.map(card => card.intensity))
    assert.deepEqual(mesh.material.uniforms.uSoftOval.value, cards.map(card => card.softOval ? 1 : 0))
    capturedCube.addEventListener('dispose', () => disposed.cube++)
    mesh.geometry.addEventListener('dispose', () => disposed.geometry++)
    mesh.material.addEventListener('dispose', () => disposed.material++)
    renderer.setRenderTarget(capturedCube, 4, 0)
    renderer.setClearColor(new Color(.8, .7, .6), .1)
    if (failAt === 'cube') throw new Error('injected crystal cube failure')
  }
  PMREMGenerator.prototype.fromCubemap = function(texture) {
    filters++
    assert.equal(texture, capturedCube.texture)
    assert.equal(renderer.toneMapping, NoToneMapping)
    if (failAt === 'filter') throw new Error('injected crystal filter failure')
    filteredTarget = new WebGLRenderTarget(768, 1024)
    filteredTarget.addEventListener('dispose', () => disposed.filtered++)
    renderer.setRenderTarget(filteredTarget)
    return filteredTarget
  }
  PMREMGenerator.prototype.dispose = function() { disposed.generator++ }
  return {
    run: () => createCrystalEnvironment(renderer, profile), disposed,
    verify(environment) {
      assert.equal(cubeDraws, 1)
      assert.equal(filters, failAt === 'cube' ? 0 : 1)
      assert.equal(activeTarget, target); assert.equal(face, 3); assert.equal(mip, 2)
      assert.equal(renderer.toneMapping, ACESFilmicToneMapping)
      assert.equal(renderer.xr.enabled, true)
      assert.equal(renderer.autoClear, false); assert.equal(renderer.autoClearColor, false)
      assert.equal(renderer.autoClearDepth, false); assert.equal(renderer.autoClearStencil, true)
      assert.deepEqual(clear.toArray(), [.02, .04, .08]); assert.equal(alpha, .25)
      assert.equal(disposed.geometry, 1); assert.equal(disposed.material, 1); assert.equal(disposed.generator, 1)
      if (environment) {
        assert.equal(environment.profile, profile, 'source identity follows the allocated profile')
        assert.equal(environment.environment, filteredTarget.texture)
        assert.equal(environment.radiance, capturedCube.texture, 'probe uses raw radiance, avoiding a second source blur')
        assert.equal(disposed.cube, 0); assert.equal(disposed.filtered, 0)
        environment.dispose()
        assert.equal(disposed.cube, 1); assert.equal(disposed.filtered, 1)
      } else assert.equal(disposed.cube, 1)
    },
    restore() {
      CubeCamera.prototype.update = oldCubeUpdate
      PMREMGenerator.prototype.fromCubemap = oldFilter
      PMREMGenerator.prototype.dispose = oldDispose
      target.dispose()
    },
  }
}

await test('crystal capture retains only its two textures and restores caller rendering state', () => {
  for (const profile of ['original', 'soft-glass', 'studio']) {
    const f = renderFixture('', profile)
    try { f.verify(f.run()) } finally { f.restore() }
  }
})

await test('failed cube or filtering work releases owned resources and restores renderer state', () => {
  for (const profile of ['original', 'soft-glass', 'studio']) for (const pass of ['cube', 'filter']) {
    const f = renderFixture(pass, profile)
    try { assert.throws(f.run, /injected crystal/); f.verify() } finally { f.restore() }
  }
})

await test('glass reflection rig stays separate from sky, water and LED/Electric paths', async () => {
  const base = '../src/components/experiments/water-hero/'
  const [scene, logo, probe] = await Promise.all(['WaterScene.tsx', 'WSLogo.tsx', 'LogoParticleReflection.tsx']
    .map(name => readFile(new URL(base + name, import.meta.url), 'utf8')))
  assert.match(scene, /crystalProfile = appearance === 'glass' \? 'soft-glass' : appearance === 'studio' \? 'studio' : 'original'/)
  assert.match(scene, /glassEnabled \? createCrystalEnvironment\(gl, crystalProfile\) : null/)
  assert.match(scene, /\[gl, glassEnabled, crystalProfile\]/, 'switching optical looks reallocates the matching source')
  assert.match(scene, /activeCrystalEnvironment = glassEnabled && crystalEnvironment\?\.profile === crystalProfile\s*\? crystalEnvironment : null/,
    'a disposed or previous-profile cube cannot leak through during a switch')
  assert.match(scene, /crystalEnvironment=\{activeCrystalEnvironment\?\.environment \?\? null\}/)
  assert.match(scene, /crystalEnvironment=\{activeCrystalEnvironment\}/)
  assert.match(scene, /scene.background = environment.background/)
  assert.match(scene, /scene.environment = environment.environment/)
  assert.match(scene, /<NightSky environment=\{environment\}/)
  assert.match(scene, /<WaterSurface[\s\S]*environment=\{environment\}/)
  assert.match(logo, /material.envMap = crystal \? crystalEnvironment \?\? reflectionEnvironment : reflectionEnvironment/)
  assert.match(probe, /glass && crystalEnvironment \? crystalEnvironment.radiance : environment/)
  assert.match(probe, /capturedEnvironment.current !== background \|\| particleReflectionDue/)
  assert.match(probe, /capturedEnvironment.current === background/)
  assert.match(probe, /: scene.environmentIntensity/)
})
