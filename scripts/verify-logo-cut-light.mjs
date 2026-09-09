/** Actual central-cut geometry, emission and shader checks; no browser/GPU rendering. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { FrontSide, MeshPhysicalMaterial, ShaderChunk, ShaderLib, Vector3 } from 'three'
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
const { CUT_LIGHT_MATERIAL: profile, createLogoCutLightMaterial, logoCutLightUniforms,
  setCutLightGlowPass, buildCutLightBanks } = await load('logoCutLight')
const cutShader = await load('shaders/logoCutLight')
const { buildChromeSeam, logoChromeUniforms } = await load('logoChrome')
const { buildMercuryContour } = await load('logoMercury')
const { createOpeningFrame, logoOpeningUniforms, updateLogoOpening } = await load('logoOpening')
const { createLogoMaterialVariants, logoVariantMaterials, selectLogoAppearance, disposeLogoMaterialVariants } = await load('logoMaterialVariants')
const { logoMaterials, logoGlassUniforms, logoLEDUniforms } = await load('logoMaterial')
const { logoFrostedUniforms } = await load('logoFrosted')
const { logoPearlUniforms } = await load('logoPearl')
const { logoCopperUniforms } = await load('logoCopper')
const { logoMercuryUniforms } = await load('logoMercury')
const { NODE_NAMES } = await load('waterHeroConfig')
const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
const { scene: source } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
source.updateMatrixWorld(true)
const meshes = root => { const result = []; root.traverse(mesh => { if (mesh.isMesh) result.push(mesh) }); return result }
const frameFor = mesh => createOpeningFrame(mesh, source.getObjectByName(NODE_NAMES.root))
const close = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) <= epsilon, `${a} vs ${b}`)
const smoothstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
function expandIncludes(text) {
  return text.replace(/#include <([\w_]+)>/g, (_, name) => {
    assert.equal(typeof ShaderChunk[name], 'string')
    return expandIncludes(ShaderChunk[name])
  })
}

// Execute the actual field equations. Only GLSL vector arithmetic and GPU
// derivatives receive CPU adapters; the latter use each actual GLB triangle
// plane and a modeled pixel footprint, not a claim about rasterization.
const vec2 = (x, y) => ({ x, y })
const add = (a, b) => vec2(a.x + b.x, a.y + b.y)
const sub = (a, b) => vec2(a.x - b.x, a.y - b.y)
const scale = (a, s) => vec2(a.x * s, a.y * s)
const dot = (a, b) => a.x * b.x + a.y * b.y
const length = a => Math.hypot(a.x, a.y)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
let fieldSource = cutShader.logoCutLightFragmentPars.match(/float cutLightField\(vec2 p\) \{([\s\S]*)\}/)?.[1]
assert.ok(fieldSource)
fieldSource = fieldSource.replace(/\/\/[^\n]*/g, '').replace(/\b(?:float|int|vec[234]) (?=\w+\s*=)/g, 'let ')
  .replace('length(fwidth(p))', 'pixelFootprint')
  .replace(/let wallNormal = cross\(dFdx\(vCutVolume\), dFdy\(vCutVolume\)\);[\s\S]*?wallNormal \*= [^;]+;/, 'const wallNormal = geometricNormal;')
  .replace('wallNormal.xz / max(length(wallNormal.xz), .000001)', 'scale(wallNormal.xz, 1 / max(length(wallNormal.xz), .000001))')
  .replace('edge.zw - edge.xy', 'sub(edge.zw, edge.xy)')
  .replace('direction / edgeLength', 'scale(direction, 1 / edgeLength)')
  .replaceAll('p - edge.xy', 'sub(p, edge.xy)')
  .replace('edge.xy + alongDirection * clamp(along, 0.0, edgeLength)', 'add(edge.xy, scale(alongDirection, clamp(along, 0.0, edgeLength)))')
  .replace('p - capPoint', 'sub(p, capPoint)')
  .replace('edge.xy + bankNormal * bank.x + alongDirection * wallAlong', 'add(add(edge.xy, scale(bankNormal, bank.x)), scale(alongDirection, wallAlong))')
  .replace('p - wallPoint', 'sub(p, wallPoint)')
const runField = new Function('p', 'u', 'vCutFace', 'vCutDepth', 'geometricNormal', 'pixelFootprint', 'math', `
  const {max, abs, exp, pow} = Math;
  const {vec2, add, sub, scale, dot, length, clamp, smoothstep, mix} = math;
  const {uCutSegments, uCutBankInfo, uCutSegmentCount, uCutSpillWidth, uCutSpillGain} = u;
  ${fieldSource}
`)
function fieldAt(p, uniforms, { face = 1, depth = 1, normal = new Vector3(0, 1, 0), footprint = .0001 } = {}) {
  const u = Object.fromEntries(Object.entries(uniforms).map(([key, value]) => [key, value.value]))
  u.uCutSegments = u.uCutSegments.map(edge => ({ xy: vec2(edge.x, edge.y), zw: vec2(edge.z, edge.w) }))
  const geometric = { x: normal.x, y: normal.y, z: normal.z, xz: vec2(normal.x, normal.z) }
  const value = runField(vec2(...p), u, face, depth, geometric, footprint,
    { vec2, add, sub, scale, dot, length, clamp, smoothstep, mix: (a, b, t) => a * (1 - t) + b * t })
  assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, `finite bounded central-light field: ${value}`)
  return value
}
function triangles(mesh) {
  const p = mesh.geometry.attributes.position, n = mesh.geometry.attributes.normal, index = mesh.geometry.index, result = []
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
    const vertices = ids.map(id => new Vector3().fromBufferAttribute(p, id))
    const normal = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize()
    if (normal.lengthSq() < .5) continue
    const nativeCenter = vertices.reduce((sum, v) => sum.add(v), new Vector3()).divideScalar(3)
    const center = nativeCenter.clone().applyMatrix4(frameFor(mesh))
    const face = ids.reduce((sum, id) => sum + Math.abs(new Vector3().fromBufferAttribute(n, id).normalize().y), 0) / 3
    result.push({ nativeCenter, center, normal, face })
  }
  return result
}

await test('the actual cut banks illuminate recessed inner walls while keeping outer cap edges and walls dark', t => {
  let innerCount = 0, outerCount = 0
  for (const mesh of meshes(source)) {
    const frame = frameFor(mesh), banks = buildCutLightBanks(mesh.geometry, frame)
    assert.deepEqual(banks.segments, buildChromeSeam(mesh.geometry, frame))
    assert.equal(banks.segments.length, mesh.name === NODE_NAMES.left ? 3 : 1)
    const material = createLogoCutLightMaterial(mesh.material, frame, mesh.geometry)
    t.after(() => material.dispose())
    const u = logoCutLightUniforms(material)
    assert.deepEqual(u.uCutBankInfo.value.slice(0, banks.segments.length), banks.bankInfo)
    const endpoints = banks.segments.flatMap(edge => [[edge.x, edge.y], [edge.z, edge.w]])
    banks.segments.forEach((edge, i) => {
      const info = banks.bankInfo[i]
      assert.ok(info.x > 0 && info.x < .02, 'the source lies on a measured bevel-offset wall')
      for (const [p, terminal] of [[[edge.x, edge.y], info.y], [[edge.z, edge.w], info.z]]) {
        const shared = endpoints.filter(other => Math.hypot(p[0] - other[0], p[1] - other[1]) < 1e-5).length > 1
        assert.equal(terminal, shared ? 0 : 1)
        const brightness = fieldAt(p, u)
        assert.ok(shared ? brightness > .6 : brightness < .001, 'only outer terminal ends taper; internal cut joins remain lit')
        for (const axis of [0, 1]) {
          const a = [...p], b = [...p]; a[axis] -= 1e-8; b[axis] += 1e-8
          assert.ok(Math.abs(fieldAt(a, u) - fieldAt(b, u)) < 1e-4, 'joined banks have no nearest-segment brightness seam')
        }
      }
    })
    for (const tri of triangles(mesh)) {
      if (Math.abs(tri.normal.y) > .001) continue
      const normal = tri.normal.clone().applyMatrix3(banks.normalFrame).normalize()
      const p = [tri.center.x, tri.center.z]
      const depth = (tri.nativeCenter.y - banks.depthBounds.x) / banks.depthBounds.y
      const value = fieldAt(p, u, { face: tri.face, normal, depth })
      const inner = banks.segments.some((edge, i) => {
        const delta = sub(vec2(edge.z, edge.w), vec2(edge.x, edge.y)), size = length(delta)
        const outward = vec2(-delta.y / size, delta.x / size), offset = dot(sub(vec2(...p), vec2(edge.x, edge.y)), outward)
        return normal.x * outward.x + normal.z * outward.y > .98 && Math.abs(offset - banks.bankInfo[i].x) < .00001
      })
      if (inner) { innerCount++; assert.ok(value > .15, `${mesh.name} inner wall receives the recessed source (${value})`) }
      else { outerCount++; assert.ok(value < .001, `${mesh.name} outer wall does not acquire cut light (${value})`) }
    }
    const sameEdge = (a, b) => a.toArray().every((v, i) => Math.abs(v - b.toArray()[i]) < 1e-6)
    for (const edge of buildMercuryContour(mesh.geometry, frame)) {
      if (banks.segments.some(bank => sameEdge(edge, bank))) continue
      for (const along of [.25, .5, .75]) {
        const p = [edge.x + (edge.z - edge.x) * along, edge.y + (edge.w - edge.y) * along]
        if (endpoints.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < .04)) continue
        assert.ok(fieldAt(p, u) < .0001, 'outer front/back cap borders do not become luminous outlines')
      }
    }
  }
  assert.ok(innerCount >= 8 && outerCount >= 12, `actual indexed inner/outer walls checked: ${innerCount}/${outerCount}`)
})

await test('water proxy keeps the white source but narrows and attenuates its spill without altering the charcoal body', t => {
  for (const mesh of meshes(source)) {
    const frame = frameFor(mesh)
    const beauty = createLogoCutLightMaterial(mesh.material, frame, mesh.geometry)
    const proxy = createLogoCutLightMaterial(mesh.material, frame, mesh.geometry, true)
    t.after(() => { beauty.dispose(); proxy.dispose() })
    const a = logoCutLightUniforms(beauty), b = logoCutLightUniforms(proxy)
    for (const key of ['color', 'roughness', 'metalness', 'ior', 'specularIntensity', 'envMapIntensity']) assert.deepEqual(beauty[key], proxy[key])
    assert.deepEqual(a.uCutColor.value.toArray(), [1, 1, 1]); assert.deepEqual(b.uCutColor.value.toArray(), [1, 1, 1])
    assert.ok(b.uCutGain.value > 0 && b.uCutGain.value < .4)
    assert.ok(b.uCutSpillWidth.value < a.uCutSpillWidth.value && b.uCutSpillGain.value < a.uCutSpillGain.value)
    for (const edge of a.uCutSegments.value.slice(0, a.uCutSegmentCount.value)) {
      const delta = sub(vec2(edge.z, edge.w), vec2(edge.x, edge.y)), size = length(delta)
      const outward = vec2(-delta.y / size, delta.x / size)
      let totalA = 0, totalB = 0
      for (let distance = 0; distance <= .05; distance += .0002) {
        const p = [(edge.x + edge.z) / 2 - outward.x * distance, (edge.y + edge.w) / 2 - outward.y * distance]
        const fa = fieldAt(p, a), fb = fieldAt(p, b)
        totalA += fa * a.uCutGain.value; totalB += fb * b.uCutGain.value
        assert.ok(fb <= fa + 1e-10, 'the proxy cannot widen or intensify any cap sample')
        if (distance > .005 && distance < .015) assert.ok(fb < fa * .2, 'water spill falls off earlier than beauty')
      }
      assert.ok(totalB > 0 && totalB < totalA * .3, 'integrated reflected line remains visibly connected but subordinate')
    }
  }
})

await test('Cut Light owns a clean charcoal body and steady white emitter without changing any prior material or mesh', t => {
  const beauty = source.clone(true), proxy = source.clone(true)
  const before = meshes(source).map(mesh => ({ material: mesh.material.toJSON(), positions: mesh.geometry.attributes.position.array.slice(),
    normals: mesh.geometry.attributes.normal.array.slice(), geometry: mesh.geometry }))
  createLogoMaterialVariants(beauty, .432916); createLogoMaterialVariants(proxy, .432916, true)
  t.after(() => { disposeLogoMaterialVariants(beauty); disposeLogoMaterialVariants(proxy) })
  const materials = [...logoVariantMaterials(beauty), ...logoVariantMaterials(proxy)]
  const previous = materials.filter(material => !logoCutLightUniforms(material))
  const snapshot = material => JSON.stringify([material.toJSON(), logoLEDUniforms(material), logoGlassUniforms(material), logoChromeUniforms(material),
    logoFrostedUniforms(material), logoPearlUniforms(material), logoCopperUniforms(material), logoMercuryUniforms(material)])
  const unchanged = previous.map(snapshot)
  selectLogoAppearance(beauty, 'cutlight'); selectLogoAppearance(proxy, 'cutlight')
  const actual = logoMaterials(beauty), reflected = logoMaterials(proxy)
  for (const root of [beauty, proxy]) meshes(root).forEach((mesh, i) => assert.equal(mesh.geometry, before[i].geometry))
  for (const material of [...actual, ...reflected]) {
    assert.ok(material instanceof MeshPhysicalMaterial && Object.hasOwn(material.defines, 'PHYSICAL'))
    assert.equal(material.side, FrontSide); assert.equal(material.transparent, false)
    assert.equal(material.depthWrite, true); assert.equal(material.opacity, 1); assert.equal(material.transmission, 0)
    assert.ok(Math.max(...material.color.toArray()) < .1, 'the broad material remains charcoal rather than a white diffuser')
    assert.deepEqual(material.emissive.toArray(), [0, 0, 0], 'native body material cannot emit independently of the central-cut mask')
    for (const map of ['map', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap']) assert.equal(material[map], null)
    assert.equal(logoGlassUniforms(material), undefined)
    const u = logoCutLightUniforms(material)
    assert.deepEqual(u.uCutColor.value.toArray(), [1, 1, 1])
    assert.ok(u.uCutIntensity.value > 0)
    assert.ok(Object.keys(u).every(key => !/time|pulse|phase/i.test(key)), 'light has no hidden flicker or color clock')
    assert.equal(u.uCutGlowPass.value, 0)
  }
  const uniforms = [...actual, ...reflected].map(logoCutLightUniforms)
  for (const name of Object.keys(uniforms[0])) assert.equal(new Set(uniforms.map(u => u[name])).size, uniforms.length)
  assert.equal(new Set(uniforms.map(u => u.uCutColor.value)).size, uniforms.length)
  setCutLightGlowPass(materials, true); setCutLightGlowPass(materials, false)
  assert.deepEqual(previous.map(snapshot), unchanged)
  meshes(source).forEach((mesh, i) => {
    assert.deepEqual(mesh.material.toJSON(), before[i].material)
    assert.deepEqual(mesh.geometry.attributes.position.array, before[i].positions)
    assert.deepEqual(mesh.geometry.attributes.normal.array, before[i].normals)
  })
})

await test('native charcoal shading is isolated from the permanent cut halo and the shared opening remains reversible', t => {
  const mesh = meshes(source)[0], material = createLogoCutLightMaterial(mesh.material, frameFor(mesh), mesh.geometry)
  t.after(() => material.dispose())
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader }
  material.onBeforeCompile(shader, {})
  for (const [name, uniform] of Object.entries(logoCutLightUniforms(material))) assert.equal(shader.uniforms[name], uniform)
  let nativeVertex = shader.vertexShader
  for (const snippet of [cutShader.logoCutLightVertexPars, cutShader.logoCutLightVertexNormal, cutShader.logoCutLightVertexProject]) {
    nativeVertex = nativeVertex.replace(`\n${snippet}`, '')
    const writes = [...snippet.replace(/\/\/[^\n]*/g, '').matchAll(/\b(\w+)\s*=(?!=)/g)].map(match => match[1])
    assert.ok(writes.every(name => name.startsWith('vCut')), 'the source geometry and native projection are untouched')
  }
  assert.equal(nativeVertex, ShaderLib.physical.vertexShader)
  assert.ok(!shader.fragmentShader.includes('uGlassScene'))
  const finish = shader.fragmentShader.indexOf(cutShader.logoCutLightFragmentComposite.trim())
  assert.ok(finish > shader.fragmentShader.indexOf('#include <lights_fragment_end>'))
  assert.ok(finish < shader.fragmentShader.indexOf('#include <opaque_fragment>'))
  assert.ok(finish < shader.fragmentShader.indexOf('#include <tonemapping_fragment>'))
  expandIncludes(shader.vertexShader); expandIncludes(shader.fragmentShader)
  const expression = cutShader.logoCutLightFragmentComposite.match(/outgoingLight = ([^;]+);/)?.[1]
  assert.ok(expression)
  const composite = new Function('cutEmission', 'outgoingLight', 'uCutGlowPass', `
    const step = (edge, value) => value < edge ? 0 : 1;
    return ${expression};
  `)
  for (const emitted of [0, .01, 1, 3]) for (const reflected of [0, .2, 2, 1000]) {
    close(composite(emitted, reflected, 0), emitted + reflected)
    close(composite(emitted, reflected, 1), emitted, 1e-10)
  }
  const discard = cutShader.logoCutLightFragmentComposite.match(/if \(([^\n]+)\) discard;/)?.[1]
  assert.ok(discard)
  const clipped = new Function('uCutGlowPass', 'cameraPosition', 'vCutWorld', `return ${discard};`)
  assert.equal(clipped(1, { y: 4 }, { y: -.1 }), true)
  assert.equal(clipped(0, { y: 4 }, { y: -.1 }), false)
  assert.equal(clipped(1, { y: -4 }, { y: -.1 }), false)
  assert.equal(clipped(1, { y: 4 }, { y: .1 }), false)

  const beauty = source.clone(true), proxy = source.clone(true)
  createLogoMaterialVariants(beauty, .432916); createLogoMaterialVariants(proxy, .432916, true)
  t.after(() => { disposeLogoMaterialVariants(beauty); disposeLogoMaterialVariants(proxy) })
  selectLogoAppearance(beauty, 'cutlight'); selectLogoAppearance(proxy, 'cutlight')
  const active = logoMaterials(beauty), reflected = logoMaterials(proxy), all = [...active, ...reflected]
  const cutBefore = all.map(item => JSON.stringify(logoCutLightUniforms(item)))
  for (const item of all) {
    const opening = logoOpeningUniforms(item)
    assert.equal(opening.uOpeningGlass.value, 0)
    assert.deepEqual(opening.uOpeningColor.value.toArray(), [1, 1, 1])
    assert.equal(opening.uOpeningGain.value, active.includes(item) ? 1 : profile.openingReflectionGain)
  }
  for (const progress of [.065, .4, .065, 0, .4]) updateLogoOpening(all, progress)
  assert.ok(all.every(item => logoOpeningUniforms(item).uOpeningTraceStrength.value === 0))
  assert.deepEqual(all.map(item => JSON.stringify(logoCutLightUniforms(item))), cutBefore,
    'reverse and reduced-motion opening updates cannot remove or animate the settled central light')
  setCutLightGlowPass(active, true)
  assert.ok(active.every(item => logoCutLightUniforms(item).uCutGlowPass.value === 1))
  assert.ok(reflected.every(item => logoCutLightUniforms(item).uCutGlowPass.value === 0))
  setCutLightGlowPass(all, false)
  assert.deepEqual(all.map(item => JSON.stringify(logoCutLightUniforms(item))), cutBefore)
})
