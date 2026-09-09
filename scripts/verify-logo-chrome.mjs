/** Actual-GLB chrome material, seam and scalar-shader checks. No GPU appearance claim. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { FrontSide, MeshPhysicalMaterial, ShaderChunk, ShaderLib, Vector3, Vector4 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ts from 'typescript'

const modules = new Map()
async function sourceUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href)
  let js = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  } }).outputText
  for (const match of [...js.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const specifier = match[1]
    const resolved = specifier.startsWith('.')
      ? await sourceUrl(new URL(`${specifier}.ts`, url)) : import.meta.resolve(specifier)
    js = js.replace(match[0], `from '${resolved}'`)
  }
  const result = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
  modules.set(url.href, result)
  return result
}
const base = new URL('../src/components/experiments/water-hero/', import.meta.url)
const load = name => sourceUrl(new URL(`${name}.ts`, base)).then(url => import(url))
const { BLACK_CHROME_MATERIAL: profile, buildChromeSeam, createLogoChromeMaterial,
  logoChromeUniforms, updateChromeLighting, setChromeGlowPass } = await load('logoChrome')
const { CHROME_SEAM, logoChromeFragmentPars, logoChromeFragmentComposite } = await load('shaders/logoChrome')
const { logoFrostedUniforms, FROSTED_CRYSTAL_MATERIAL } = await load('logoFrosted')
const { logoPearlUniforms, PEARL_CERAMIC_MATERIAL } = await load('logoPearl')
const { logoCopperUniforms, SMOKED_COPPER_MATERIAL } = await load('logoCopper')
const { logoMercuryUniforms, LIQUID_MERCURY_MATERIAL } = await load('logoMercury')
const { logoCutLightUniforms, CUT_LIGHT_MATERIAL } = await load('logoCutLight')
const { createOpeningFrame, logoOpeningUniforms, updateLogoOpening } = await load('logoOpening')
const { createLogoMaterialVariants, logoVariantMaterials, selectLogoAppearance, disposeLogoMaterialVariants } = await load('logoMaterialVariants')
const { logoLEDUniforms, updateLEDLighting } = await load('logoMaterial')
const { NODE_NAMES, LED_LOGO_MATERIAL } = await load('waterHeroConfig')
const { buildElectricContour, ELECTRIC_CONTOUR_SCALE } = await load('electricContour')
const { COLOR_WAVE } = await load('shaders/underwaterColor')
const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
const { scene: source } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
source.updateMatrixWorld(true)
const meshes = root => { const result = []; root.traverse(mesh => { if (mesh.isMesh) result.push(mesh) }); return result }
const frameFor = mesh => createOpeningFrame(mesh, source.getObjectByName(NODE_NAMES.root))
const close = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) <= epsilon, `${a} vs ${b}`)

function variants(t) {
  const beauty = source.clone(true), proxy = source.clone(true)
  createLogoMaterialVariants(beauty, .432916)
  createLogoMaterialVariants(proxy, .432916, true)
  const materials = [...logoVariantMaterials(beauty), ...logoVariantMaterials(proxy)]
  t.after(() => { disposeLogoMaterialVariants(beauty); disposeLogoMaterialVariants(proxy) })
  return { beauty, proxy, materials }
}

function expandIncludes(text) {
  return text.replace(/#include <([\w_]+)>/g, (_, name) => {
    assert.equal(typeof ShaderChunk[name], 'string', `${name} is an installed Three shader chunk`)
    return expandIncludes(ShaderChunk[name])
  })
}
const seamSource = logoChromeFragmentPars.match(/float chromeSeamLight\(vec2 p\)\s*\{([\s\S]*?)\}/)?.[1]
assert.ok(seamSource)
// Run the shader's exact scalar falloff while supplying a modeled pixel footprint.
// This checks math/energy behavior, not actual derivatives or rasterization.
const seamLight = new Function('distance', 'pixelFootprint', `
  const {exp, pow, max} = Math;
  ${seamSource.replace(/\bfloat\b/g, 'let').replace('chromeSeamDistance(p)', 'distance').replace('length(fwidth(p))', 'pixelFootprint')}
`)
const compositeSource = logoChromeFragmentComposite.match(/outgoingLight = ([^;]+);/)?.[1]
assert.ok(compositeSource)
const composite = new Function('chromeSeam', 'chromeBody', 'uChromeGlowPass', `
  const step = (edge, value) => value < edge ? 0 : 1;
  return ${compositeSource};
`)

await test('black chrome owns a clean opaque metal material and preserves the cached model and other finishes', t => {
  for (const mesh of meshes(source)) {
    const before = mesh.material.toJSON(), positions = mesh.geometry.attributes.position.array.slice()
    const frame = frameFor(mesh), frameBefore = frame.clone()
    const beauty = createLogoChromeMaterial(mesh.material, frame, mesh.geometry)
    const proxy = createLogoChromeMaterial(mesh.material, frame, mesh.geometry, true)
    t.after(() => { beauty.dispose(); proxy.dispose() })
    for (const material of [beauty, proxy]) {
      assert.ok(material instanceof MeshPhysicalMaterial)
      assert.ok(Object.hasOwn(material.defines, 'PHYSICAL'))
      assert.deepEqual(material.color.toArray(), profile.faceColor)
      assert.equal(material.metalness, profile.metalness)
      assert.equal(material.roughness, profile.roughness)
      assert.equal(material.envMapIntensity, profile.envMapIntensity)
      assert.equal(material.side, FrontSide)
      assert.equal(material.transmission, 0); assert.equal(material.transparent, false)
      assert.equal(material.depthWrite, true); assert.equal(material.opacity, 1)
      for (const map of ['map', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap']) {
        assert.equal(material[map], null, 'the reflective face receives no texture overlay')
      }
      assert.deepEqual(material.emissive.toArray(), [0, 0, 0])
      const u = logoChromeUniforms(material)
      assert.notEqual(u.uChromeFrame.value, frame)
      assert.deepEqual(u.uChromeFrame.value, frame)
      assert.ok(!logoLEDUniforms(material), 'the saved diffuser/current uniforms are not reused')
      const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader }
      material.onBeforeCompile(shader, {})
      for (const [name, uniform] of Object.entries(u)) assert.equal(shader.uniforms[name], uniform)
      const roughness = shader.fragmentShader.indexOf('roughnessFactor = mix(')
      assert.ok(roughness > shader.fragmentShader.indexOf('#include <roughnessmap_fragment>'))
      assert.ok(roughness < shader.fragmentShader.indexOf('#include <lights_physical_fragment>'), 'cap/side roughness affects actual physical light evaluation')
      const finish = shader.fragmentShader.indexOf(`outgoingLight = ${compositeSource};`)
      assert.ok(finish < shader.fragmentShader.indexOf('#include <opaque_fragment>'))
      assert.ok(finish < shader.fragmentShader.indexOf('#include <tonemapping_fragment>'))
      expandIncludes(shader.vertexShader); expandIncludes(shader.fragmentShader)
    }
    const a = logoChromeUniforms(beauty), b = logoChromeUniforms(proxy)
    for (const key of Object.keys(a)) assert.notEqual(a[key], b[key], `${key} has independent material ownership`)
    assert.notEqual(a.uChromeSeamColor.value, b.uChromeSeamColor.value)
    assert.notEqual(a.uChromeSegments.value, b.uChromeSegments.value)
    assert.deepEqual(mesh.material.toJSON(), before)
    assert.deepEqual(mesh.geometry.attributes.position.array, positions)
    assert.deepEqual(frame, frameBefore)
  }
})

function distanceToSeam(p, segments) {
  return Math.min(...segments.map(edge => {
    const dx = edge.z - edge.x, dy = edge.w - edge.y
    const along = Math.max(0, Math.min(1, ((p[0] - edge.x) * dx + (p[1] - edge.y) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(p[0] - edge.x - dx * along, p[1] - edge.y - dy * along)
  }))
}

await test('the narrow warm seam follows the finite inner edges of the actual two GLB caps', () => {
  for (const mesh of meshes(source)) {
    const frame = frameFor(mesh), seam = buildChromeSeam(mesh.geometry, frame)
    const boundary = buildElectricContour(mesh.geometry).map(edge => {
      const a = new Vector3(edge.x, 0, edge.y).divideScalar(ELECTRIC_CONTOUR_SCALE).applyMatrix4(frame)
      const b = new Vector3(edge.z, 0, edge.w).divideScalar(ELECTRIC_CONTOUR_SCALE).applyMatrix4(frame)
      return new Vector4(a.x, a.z, b.x, b.z)
    })
    assert.equal(seam.length, mesh.name === NODE_NAMES.left ? 3 : 1)
    const endpoints = new Map()
    for (const edge of seam) {
      assert.ok(boundary.some(actual => actual.clone().sub(edge).length() < 1e-8), 'every luminous bank is an actual transformed cap edge')
      assert.ok(Math.min(edge.x, edge.z) >= 0, 'the W outer arm and inner notch remain unlit')
      for (const point of [[edge.x, edge.y], [edge.z, edge.w]]) {
        const key = point.map(value => value.toFixed(7)).join(',')
        endpoints.set(key, { point, count: (endpoints.get(key)?.count ?? 0) + 1 })
      }
      const dx = edge.z - edge.x, dy = edge.w - edge.y, length = Math.hypot(dx, dy)
      for (const t of [.1, .3, .5, .7, .9]) {
        const p = [edge.x + t * dx, edge.y + t * dy]
        close(distanceToSeam(p, seam), 0)
        assert.ok(seamLight(distanceToSeam(p, seam), .001) > .9)
        const outside = [p[0] + dy / length * .04, p[1] - dx / length * .04]
        assert.ok(seamLight(distanceToSeam(outside, seam), .001) < .015, 'the seam has a narrow local influence')
      }
    }
    assert.equal([...endpoints.values()].filter(item => item.count === 1).length, 2, 'the lit banks form one connected open chain')
    assert.ok([...endpoints.values()].every(item => item.count === 1 || item.count === 2))
    // Finite endpoints cannot emit an infinite line beyond the top/bottom.
    for (const { point, count } of endpoints.values()) {
      if (count !== 1) continue
      const edge = seam.find(item => Math.hypot(point[0] - item.x, point[1] - item.y) < 1e-7
        || Math.hypot(point[0] - item.z, point[1] - item.w) < 1e-7)
      const atStart = Math.hypot(point[0] - edge.x, point[1] - edge.y) < 1e-7
      const other = atStart ? [edge.z, edge.w] : [edge.x, edge.y]
      const length = Math.hypot(point[0] - other[0], point[1] - other[1])
      const beyond = point.map((value, i) => value + (value - other[i]) / length * .05)
      close(distanceToSeam(beyond, seam), .05)
      assert.ok(seamLight(distanceToSeam(beyond, seam), .001) < .001)
    }
  }
})

await test('seam joins remain continuous and pixel softening preserves narrow-line energy', () => {
  for (const mesh of meshes(source)) {
    const seam = buildChromeSeam(mesh.geometry, frameFor(mesh))
    for (const edge of seam) {
      for (const p of [[edge.x, edge.y], [edge.z, edge.w], [(edge.x + edge.z) / 2, (edge.y + edge.w) / 2]]) {
        for (const offset of [0, .003, .01]) {
          const a = [p[0] + offset - 1e-7, p[1] + .001], b = [p[0] + offset + 1e-7, p[1] + .001]
          const da = distanceToSeam(a, seam), db = distanceToSeam(b, seam)
          assert.ok(Math.abs(da - db) <= 2.00001e-7, 'minimum finite-edge distance stays Lipschitz through joins')
          assert.ok(Math.abs(seamLight(da, .001) - seamLight(db, .001)) < .0001, 'no winner-dependent intensity step reintroduces a panel seam')
        }
      }
    }
  }
  const integrals = [], peaks = []
  for (const footprint of [.0005, .002, .006, .014]) {
    let energy = 0, previous = Infinity
    peaks.push(seamLight(0, footprint))
    for (let step = 0; step <= 1600; step++) {
      const value = seamLight(step * .0001, footprint)
      assert.ok(Number.isFinite(value) && value >= 0 && value <= previous, 'the lateral glow decays smoothly')
      previous = value
      energy += value * (step === 0 || step === 1600 ? .5 : 1) * .0001 * 2
    }
    integrals.push(energy)
  }
  assert.ok(peaks.every((peak, i) => i === 0 || peak < peaks[i - 1]), 'broader pixels reduce peak energy instead of brightening the logo')
  assert.ok(Math.max(...integrals) / Math.min(...integrals) < 1.001, 'antialiasing retains integrated seam energy across viewport footprints')
  assert.ok(CHROME_SEAM.width < .003 && CHROME_SEAM.shoulder < .008)
})

await test('only warm seam emission enters the halo and its water proxy retains a restrained gain', t => {
  const { beauty, proxy, materials } = variants(t)
  selectLogoAppearance(beauty, 'chrome'); selectLogoAppearance(proxy, 'chrome')
  const actual = meshes(beauty).map(mesh => mesh.material), reflected = meshes(proxy).map(mesh => mesh.material)
  updateChromeLighting(materials, 12, 1)
  setChromeGlowPass(actual, true)
  actual.forEach((material, index) => {
    const a = logoChromeUniforms(material), b = logoChromeUniforms(reflected[index])
    assert.equal(a.uChromeGlowPass.value, 1); assert.equal(b.uChromeGlowPass.value, 0)
    assert.deepEqual(a.uChromeSeamColor.value.toArray(), profile.seamColor)
    assert.deepEqual(b.uChromeSeamColor.value.toArray(), profile.seamColor)
    assert.equal(a.uChromeSeamGain.value, 1); assert.equal(b.uChromeSeamGain.value, profile.reflectionGain)
    assert.ok(profile.reflectionGain > 0 && profile.reflectionGain < .35)
    for (const distance of [0, .0024, .0065, .04]) {
      const field = seamLight(distance, .002)
      for (let channel = 0; channel < 3; channel++) {
        const emission = a.uChromeSeamColor.value.toArray()[channel] * a.uChromeSeamIntensity.value * a.uChromeSeamGain.value * field
        const reflection = b.uChromeSeamColor.value.toArray()[channel] * b.uChromeSeamIntensity.value * b.uChromeSeamGain.value * field
        close(reflection, emission * profile.reflectionGain)
        for (const body of [0, .1, 2, 1000]) {
          close(composite(emission, body, a.uChromeGlowPass.value), emission, 1e-12, 'face lighting cannot enter halo')
          close(composite(emission, body, 0), emission + body)
        }
      }
    }
  })
  for (const material of materials) {
    if (logoLEDUniforms(material)) assert.equal(logoLEDUniforms(material).uLEDGlowPass.value, 0)
  }
  setChromeGlowPass(materials, false)
  for (const material of [...actual, ...reflected]) assert.equal(logoChromeUniforms(material).uChromeGlowPass.value, 0)
})

await test('particle response remains subtle, continuous and warm; reduced motion restores a stationary chrome state', t => {
  const { beauty, proxy, materials } = variants(t)
  selectLogoAppearance(beauty, 'chrome'); selectLogoAppearance(proxy, 'chrome')
  const chrome = materials.filter(material => logoChromeUniforms(material))
  const uniforms = chrome.map(material => logoChromeUniforms(material))
  const stable = uniforms.map(u => ({ frame: u.uChromeFrame.value, color: u.uChromeSeamColor.value,
    segments: u.uChromeSegments.value, gain: u.uChromeSeamGain.value }))
  const before = materials.map(material => material.toJSON()), versions = materials.map(material => material.version)
  for (let time = 0; time < COLOR_WAVE.seconds * 6; time += .041) {
    for (const underwater of [0, .5, 1]) {
      updateChromeLighting(materials, time, underwater)
      uniforms.forEach((u, i) => {
        assert.deepEqual(u.uChromeSeamColor.value.toArray(), profile.seamColor)
        assert.equal(u.uChromeSeamGain.value, stable[i].gain)
        assert.equal(u.uChromeFrame.value, stable[i].frame); assert.equal(u.uChromeSegments.value, stable[i].segments)
        assert.equal(u.uChromeSeamColor.value, stable[i].color)
        assert.ok(u.uChromeSeamIntensity.value >= profile.seamIntensity && u.uChromeSeamIntensity.value <= profile.seamIntensity * 1.07)
        assert.ok(u.uChromePulseColor.value.toArray().every(value => Number.isFinite(value) && value >= 0 && value <= 1))
      })
    }
  }
  for (let cycle = 0; cycle < 6; cycle++) {
    const time = .72 / COLOR_WAVE.speed + cycle * COLOR_WAVE.seconds
    updateChromeLighting(materials, time - 1e-5, 1)
    const previous = uniforms.map(u => ({ color: u.uChromePulseColor.value.toArray(), intensity: u.uChromeSeamIntensity.value }))
    updateChromeLighting(materials, time + 1e-5, 1)
    uniforms.forEach((u, i) => {
      u.uChromePulseColor.value.toArray().forEach((value, c) => close(value, previous[i].color[c], 1e-6))
      close(u.uChromeSeamIntensity.value, previous[i].intensity, 1e-6)
    })
  }
  const values = () => uniforms.map(u => [u.uChromeTime.value, u.uChromeUnderwater.value,
    u.uChromeSeamIntensity.value, u.uChromePulseColor.value.toArray(), u.uChromeSeamColor.value.toArray()])
  updateChromeLighting(materials, 0, 0)
  const quiet = values()
  for (const time of [15, 50, 120, 4, 0]) {
    updateChromeLighting(materials, time, 1)
    updateChromeLighting(materials, 0, 0)
    assert.deepEqual(values(), quiet, 'zero clock/submersion restores the exact reduced-motion studio state')
  }
  assert.deepEqual(materials.map(material => material.toJSON()), before)
  assert.deepEqual(materials.map(material => material.version), versions)
})

await test('chrome keeps its warm opening isolated and restores every approved look at the same pose and clock', t => {
  const { beauty, proxy, materials } = variants(t)
  const saved = new Map()
  for (const appearance of ['led', 'electric', 'glass', 'chrome', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight', 'glass', 'electric', 'led']) {
    selectLogoAppearance(beauty, appearance); selectLogoAppearance(proxy, appearance)
    updateLEDLighting(materials, 14.2, .7, appearance)
    if (appearance === 'chrome') updateChromeLighting(materials, 14.2, .7)
    updateLogoOpening(materials, .10)
    const active = meshes(beauty).map(mesh => mesh.material)
    const values = active.map(material => {
      const led = logoLEDUniforms(material), opening = logoOpeningUniforms(material)
      return { material, geometry: meshes(beauty).find(mesh => mesh.material === material).geometry,
        color: led?.uLEDColor.value.toArray(), intensity: led?.uLEDIntensity.value,
        openingColor: opening.uOpeningColor.value.toArray(), openingGain: opening.uOpeningGain.value }
    })
    if (saved.has(appearance)) assert.deepEqual(values, saved.get(appearance))
    else saved.set(appearance, values)
    for (const material of materials) {
      const opening = logoOpeningUniforms(material), chrome = !!logoChromeUniforms(material), frosted = !!logoFrostedUniforms(material),
        pearl = !!logoPearlUniforms(material), copper = !!logoCopperUniforms(material), mercury = !!logoMercuryUniforms(material), cutlight = !!logoCutLightUniforms(material)
      assert.deepEqual(opening.uOpeningColor.value.toArray(), chrome ? profile.seamColor
        : pearl ? PEARL_CERAMIC_MATERIAL.openingColor
          : copper ? SMOKED_COPPER_MATERIAL.openingColor
            : mercury ? LIQUID_MERCURY_MATERIAL.openingColor
              : cutlight ? CUT_LIGHT_MATERIAL.openingColor : [.52, .82, 1])
      const reflection = logoVariantMaterials(proxy).includes(material)
      assert.equal(opening.uOpeningGain.value, reflection ? chrome ? profile.reflectionGain
        : frosted ? FROSTED_CRYSTAL_MATERIAL.reflectionGain
          : pearl ? PEARL_CERAMIC_MATERIAL.openingReflectionGain
            : copper ? SMOKED_COPPER_MATERIAL.openingReflectionGain
              : mercury ? LIQUID_MERCURY_MATERIAL.openingReflectionGain
                : cutlight ? CUT_LIGHT_MATERIAL.openingReflectionGain : LED_LOGO_MATERIAL.reflectionGain : 1)
    }
  }
})
