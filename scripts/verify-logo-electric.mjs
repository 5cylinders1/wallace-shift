/** Original Electrified snapshot parity and runtime checks. No browser/GPU claim. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ShaderChunk, ShaderLib } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ts from 'typescript'

// Original shader verified against the pre-third-glass snapshot on restoration.
// Archive SHA-256: 553efb662acc38faf8aa7b171a923487740be278e6fb1ee0cde0ffec475f30bf.
// Keep the regression standalone; the historical review archive is not required.
const originalShaderHash = 'bef5728938e54973336f7d0764f9a1155b2f9fba12b9e9d7544cfc9481df3a63'
const componentPath = 'src/components/experiments/water-hero/'
const base = new URL('../', import.meta.url), modules = new Map()
async function sourceUrl(file) {
  const key = file
  if (modules.has(key)) return modules.get(key)
  const source = await readFile(new URL(file, base), 'utf8')
  let js = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  } }).outputText
  for (const match of [...js.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const specifier = match[1]
    const resolved = specifier.startsWith('.')
      ? await sourceUrl(new URL(`${specifier}.ts`, `file:///${file}`).pathname.slice(1)) : import.meta.resolve(specifier)
    js = js.replace(match[0], `from '${resolved}'`)
  }
  const result = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
  modules.set(key, result)
  return result
}
const load = name => sourceUrl(`${componentPath}${name}.ts`).then(url => import(url))
const currentShader = await load('shaders/logoLED')
const { logoLEDFragmentPars: shader } = currentShader
const { createLogoLEDMaterial, logoLEDUniforms, updateLEDLighting } = await load('logoMaterial')
const { createLogoMaterialVariants, logoVariantMaterials, selectLogoAppearance, disposeLogoMaterialVariants } = await load('logoMaterialVariants')
const { logoOpeningUniforms, updateLogoOpening } = await load('logoOpening')
const { LED_LOGO_MATERIAL, ELECTRIC_LOGO_MATERIAL } = await load('waterHeroConfig')
const { buildElectricContour } = await load('electricContour')
const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
const { scene: source } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
const meshes = root => { const result = []; root.traverse(mesh => { if (mesh.isMesh) result.push(mesh) }); return result }
function expandIncludes(text) {
  return text.replace(/#include <([\w_]+)>/g, (_, name) => {
    assert.equal(typeof ShaderChunk[name], 'string')
    return expandIncludes(ShaderChunk[name])
  })
}
function variants(t) {
  const beauty = source.clone(true), proxy = source.clone(true)
  createLogoMaterialVariants(beauty, .432916); createLogoMaterialVariants(proxy, .432916, true)
  t.after(() => { disposeLogoMaterialVariants(beauty); disposeLogoMaterialVariants(proxy) })
  return { beauty, proxy, materials: [...logoVariantMaterials(beauty), ...logoVariantMaterials(proxy)] }
}

await test('Electrified matches the verified original shader and saved material profiles', async () => {
  const source = await readFile(new URL(`${componentPath}shaders/logoLED.ts`, base))
  assert.equal(createHash('sha256').update(source).digest('hex'), originalShaderHash,
    'the complete original shader, including the LED branch, is restored without later sparse or middle-ground scheduling')
  assert.deepEqual(ELECTRIC_LOGO_MATERIAL, { color: [.08, .50, 1.0], intensity: 2.4, reflectionGain: .62 })
  assert.deepEqual(LED_LOGO_MATERIAL, {
    housingColor: [.028, .040, .050], metalness: .28, roughness: .30, envMapIntensity: .72,
    color: [.64, .88, 1.0], intensity: 1.65, reflectionGain: .62,
  })
})

// Sample the original scalar lane fields; derivatives, rasterization and tone
// mapping are outside this check. The source fingerprint above protects the full shader.
const clamp = x => Math.max(0, Math.min(1, x))
const math = {
  sin: Math.sin, pow: Math.pow, floor: Math.floor, abs: Math.abs,
  fract: x => x - Math.floor(x), mix: (a, b, t) => a + (b - a) * t,
  step: (edge, value) => value < edge ? 0 : 1,
  smoothstep: (a, b, value) => { const x = clamp((value - a) / (b - a)); return x * x * (3 - 2 * x) },
}
const helpers = ['electricHash', 'electricBend', 'electricPath'].map(name => {
  const match = shader.match(new RegExp(`float ${name}\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\}`))
  assert.ok(match)
  return `function ${name}(${match[1].replaceAll('float ', '')}) { ${match[2].replace(/\bfloat\b/g, 'let')} }`
}).join('\n')
const laneSource = shader.match(/float lane = [\s\S]*?float forkWindow = [^;]+;/)?.[0]
assert.ok(laneSource)
const sampleLane = new Function('p', 'i', 'uElectricTime', 'math', `
  const {sin, pow, floor, abs, fract, mix, step, smoothstep} = math;
  ${helpers}
  ${laneSource.replace(/charge \+= [^;]+;/g, '').replaceAll('float(i)', 'i').replace(/\bfloat\b/g, 'let')
    .replace('vec2 q = vec2(p.x + p.y * slope, p.y);', 'const q = {x: p.x + p.y * slope, y: p.y};')}
  return {center, surge, forkY, forkCenter, forkProgress, forkWindow};
`)
const sample = (time, lane, z = 0) => sampleLane({ x: 0, y: z }, lane, time, math)

await test('the original three lanes remain energized with continuous bends, finite forks and deterministic frozen time zero', () => {
  assert.ok(shader.includes('for (int i = 0; i < 3; i++)'))
  let smallestSurge = 1, largestSurge = 0, movingSamples = 0
  for (let lane = 0; lane < 3; lane++) {
    for (let z = -.5; z <= .6; z += .025) {
      for (const time of [0, .9, 1.95, 4.1, 5.15, 6.4, 8.4, 12, 30]) {
        const field = sample(time, lane, z), next = sample(time + 1e-7, lane, z)
        assert.ok(Object.values(field).every(Number.isFinite))
        assert.ok(field.surge >= .48 && field.surge <= 1, 'the archived effect has sustained currents, not new quiet intervals')
        smallestSurge = Math.min(smallestSurge, field.surge); largestSurge = Math.max(largestSurge, field.surge)
        for (const key of ['center', 'surge', 'forkCenter', 'forkWindow']) assert.ok(Math.abs(next[key] - field[key]) < 1e-5)
        if (Math.abs(sample(time + .2, lane, z).center - field.center) > .0001) movingSamples++
      }
      const frozen = sample(0, lane, z)
      sample(80, lane, z)
      assert.deepEqual(sample(0, lane, z), frozen, 'time-zero reduced motion is a frozen original field, not a blank current')
    }
    for (const time of [0, 3, 20]) {
      const origin = sample(time, lane).forkY
      assert.ok(sample(time, lane, origin + .06).forkWindow > .9)
      assert.equal(sample(time, lane, origin - .02).forkWindow, 0)
      assert.equal(sample(time, lane, origin + .28).forkWindow, 0)
    }
  }
  assert.ok(smallestSurge < .49 && largestSurge > .99 && movingSamples > 0)
})

await test('the restored field keeps authored GLB coordinates, actual contour binding and native opaque geometry', t => {
  const { beauty, proxy } = variants(t)
  const originals = meshes(source).map(mesh => ({ geometry: mesh.geometry, positions: mesh.geometry.attributes.position.array.slice() }))
  for (const root of [beauty, proxy]) {
    selectLogoAppearance(root, 'electric')
    meshes(root).forEach((mesh, index) => {
      assert.equal(mesh.geometry, originals[index].geometry)
      const u = logoLEDUniforms(mesh.material), contour = buildElectricContour(mesh.geometry)
      assert.deepEqual(u.uElectricSegments.value.slice(0, u.uElectricSegmentCount.value), contour)
      assert.ok(contour.length === 11 || contour.length === 4)
      assert.ok(!Object.hasOwn(u, 'uElectricMainPiece'), 'the later alternating-arm scheduler no longer controls either piece')
      assert.equal(mesh.material.transparent, false); assert.equal(mesh.material.depthWrite, true); assert.equal(mesh.material.transmission, 0)
      const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader }
      mesh.material.onBeforeCompile(shader, {})
      assert.ok(shader.vertexShader.includes('vElectricPlane = transformed.xz * 6.0;'))
      assert.ok(shader.fragmentShader.indexOf(currentShader.logoLEDFragmentComposite.trim())
        < shader.fragmentShader.indexOf('if (uOpeningSurface < 1.0 || uOpeningTraceStrength > 0.0)'))
      expandIncludes(shader.vertexShader); expandIncludes(shader.fragmentShader)
    })
  }
  const material = createLogoLEDMaterial(meshes(source)[0].material)
  t.after(() => material.dispose())
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader }
  material.onBeforeCompile(shader, {})
  let nativeVertex = shader.vertexShader
  for (const snippet of [currentShader.logoLEDVertexPars, currentShader.logoLEDVertexNormal, currentShader.logoLEDVertexProject]) nativeVertex = nativeVertex.replace(`\n${snippet}`, '')
  assert.equal(nativeVertex, ShaderLib.physical.vertexShader, 'electrical motion never deforms vertices or replaces projection')
  meshes(source).forEach((mesh, index) => assert.deepEqual(mesh.geometry.attributes.position.array, originals[index].positions))
})

await test('beauty/proxy share the original clock while LED restoration and the common opening remain independent', t => {
  const { beauty, proxy, materials } = variants(t)
  const physical = materials.map(material => material.toJSON()), versions = materials.map(material => material.version)
  const fields = u => ({ color: u.uLEDColor.value.toArray(), intensity: u.uLEDIntensity.value, time: u.uElectricTime.value, mode: u.uElectricMode.value })
  for (const time of [0, .9, 4.1, 6.4, 8.4, 16, 80, 0]) for (const underwater of [0, .5, 1]) {
    selectLogoAppearance(beauty, 'led'); selectLogoAppearance(proxy, 'led')
    updateLEDLighting(materials, time, underwater, 'led')
    const savedLED = materials.map(material => logoLEDUniforms(material)).filter(Boolean).map(fields)
    selectLogoAppearance(beauty, 'electric'); selectLogoAppearance(proxy, 'electric')
    updateLEDLighting(materials, time, underwater, 'electric')
    meshes(beauty).forEach((mesh, index) => {
      const a = logoLEDUniforms(mesh.material), b = logoLEDUniforms(meshes(proxy)[index].material)
      assert.equal(a.uElectricTime.value, time); assert.equal(a.uElectricMode.value, 1)
      assert.equal(b.uElectricTime.value, time); assert.equal(b.uElectricMode.value, 1)
      assert.deepEqual(a.uLEDColor.value.toArray(), b.uLEDColor.value.toArray())
      assert.equal(b.uLEDIntensity.value, a.uLEDIntensity.value * ELECTRIC_LOGO_MATERIAL.reflectionGain)
      for (let lane = 0; lane < 3; lane++) assert.deepEqual(sample(a.uElectricTime.value, lane), sample(b.uElectricTime.value, lane))
      if (underwater === 0) {
        assert.deepEqual(a.uLEDColor.value.toArray(), ELECTRIC_LOGO_MATERIAL.color)
        assert.equal(a.uLEDIntensity.value, ELECTRIC_LOGO_MATERIAL.intensity)
      }
    })
    selectLogoAppearance(beauty, 'led'); selectLogoAppearance(proxy, 'led')
    updateLEDLighting(materials, time, underwater, 'led')
    assert.deepEqual(materials.map(material => logoLEDUniforms(material)).filter(Boolean).map(fields), savedLED)
  }
  updateLEDLighting(materials, 0, 0, 'electric')
  const beforeOpening = materials.map(material => logoLEDUniforms(material)).filter(Boolean).map(fields)
  assert.ok(beforeOpening.every(fields => fields.time === 0 && fields.mode === 1))
  for (const progress of [.065, .4, .065, 0, .4]) updateLogoOpening(materials, progress)
  assert.deepEqual(materials.map(material => logoLEDUniforms(material)).filter(Boolean).map(fields), beforeOpening)
  assert.ok(materials.every(material => logoOpeningUniforms(material).uOpeningTraceStrength.value === 0))
  assert.deepEqual(materials.map(material => material.toJSON()), physical)
  assert.deepEqual(materials.map(material => material.version), versions)
  updateLEDLighting(materials, 0, 0, 'led')
  for (const mesh of meshes(beauty)) assert.equal(logoLEDUniforms(mesh.material).uLEDIntensity.value, LED_LOGO_MATERIAL.intensity)
})
