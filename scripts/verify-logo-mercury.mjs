/** Actual GLB, scalar normal-flow and native shader checks; no browser/GPU rendering. */
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
const { LIQUID_MERCURY_MATERIAL: profile, createLogoMercuryMaterial, logoMercuryUniforms,
  updateMercuryLighting, setMercuryGlowPass, buildMercuryContour } = await load('logoMercury')
const mercuryShader = await load('shaders/logoMercury')
const { createOpeningFrame, logoOpeningUniforms, updateLogoOpening } = await load('logoOpening')
const { createLogoMaterialVariants, logoVariantMaterials, selectLogoAppearance, disposeLogoMaterialVariants } = await load('logoMaterialVariants')
const { logoMaterials, logoLEDUniforms, logoGlassUniforms } = await load('logoMaterial')
const { logoChromeUniforms } = await load('logoChrome')
const { logoFrostedUniforms } = await load('logoFrosted')
const { logoPearlUniforms } = await load('logoPearl')
const { logoCopperUniforms } = await load('logoCopper')
const { buildElectricContour, ELECTRIC_CONTOUR_SCALE } = await load('electricContour')
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
function distanceToContour(p, segments) {
  return Math.min(...segments.map(edge => {
    const dx = edge.z - edge.x, dy = edge.w - edge.y
    const along = Math.max(0, Math.min(1, ((p[0] - edge.x) * dx + (p[1] - edge.y) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(p[0] - edge.x - dx * along, p[1] - edge.y - dy * along)
  }))
}

const { MERCURY_FLOW: flow, logoMercuryFragmentPars: pars, logoMercuryFragmentNormal: normalSnippet } = mercuryShader
const flowBody = pars.match(/vec2 mercuryFlowSlope\(vec2 p, float time\) \{([\s\S]*?)\n\}/)[1]
const returnAt = flowBody.indexOf('return vec2(')
const rawSlope = new Function('p', 'time', `const {sin, cos} = Math;
  ${flowBody.slice(0, returnAt).replace(/\bfloat\b/g, 'const')}
  return [${flowBody.slice(returnAt).match(/return vec2\(([\s\S]*?)\);/)[1]}];
`)
const clampSlope = new Function('mercurySlope', `const {min, max} = Math; const length = v => Math.hypot(...v);
  return ${normalSnippet.match(/mercurySlope \*= ([^;]+);/)[1]};
`)
const capAt = new Function('vMercuryFace', 'smoothstep', `return ${normalSnippet.match(/float mercuryCap = ([^;]+);/)[1]};`)
const edgeAt = new Function('distanceToEdge', 'smoothstep', `return ${pars.match(/interior \*= ([^;]+);/)[1]};`)
const slopeAt = (p, time) => { const slope = rawSlope({ x: p[0], y: p[1] }, time); const gain = clampSlope(slope); return slope.map(value => value * gain) }
const fadeAt = (p, contour) => contour.reduce((fade, edge) => fade * edgeAt(distanceToContour(p, [edge]), smoothstep), 1)

await test('Mercury owns opaque silver materials and freezes one shared beauty/proxy clock without touching any approved look or mesh', t => {
  const beauty = source.clone(true), proxy = source.clone(true)
  const sourceData = meshes(source).map(mesh => ({ geometry: mesh.geometry,
    position: mesh.geometry.attributes.position.array.slice(), normal: mesh.geometry.attributes.normal.array.slice(), material: mesh.material.toJSON() }))
  createLogoMaterialVariants(beauty, .432916); createLogoMaterialVariants(proxy, .432916, true)
  t.after(() => { disposeLogoMaterialVariants(beauty); disposeLogoMaterialVariants(proxy) })
  const materials = [...logoVariantMaterials(beauty), ...logoVariantMaterials(proxy)]
  const mercury = materials.filter(material => logoMercuryUniforms(material)), other = materials.filter(material => !logoMercuryUniforms(material))
  const snapshot = material => JSON.stringify([material.toJSON(), logoLEDUniforms(material), logoGlassUniforms(material), logoChromeUniforms(material),
    logoFrostedUniforms(material), logoPearlUniforms(material), logoCopperUniforms(material)])
  const othersBefore = other.map(snapshot)
  selectLogoAppearance(beauty, 'mercury'); selectLogoAppearance(proxy, 'mercury')
  for (const root of [beauty, proxy]) meshes(root).forEach((mesh, i) => assert.equal(mesh.geometry, sourceData[i].geometry))
  for (const material of mercury) {
    assert.ok(material instanceof MeshPhysicalMaterial && Object.hasOwn(material.defines, 'PHYSICAL'))
    assert.equal(material.side, FrontSide); assert.equal(material.transparent, false); assert.equal(material.depthWrite, true)
    assert.equal(material.opacity, 1); assert.equal(material.metalness, 1); assert.equal(material.transmission, 0)
    assert.equal(material.iridescence, 0); assert.equal(material.clearcoat, 0)
    assert.deepEqual(material.color.toArray(), profile.baseColor); assert.equal(material.roughness, profile.roughness)
    assert.deepEqual(material.emissive.toArray(), [0, 0, 0]); assert.equal(material.emissiveIntensity, 0)
    assert.ok(!logoGlassUniforms(material), 'opaque silver never joins the glass capture registry')
    for (const [name, value] of Object.entries(material)) {
      if (name.endsWith('Map') && name !== 'envMap') assert.equal(value, null, `${name} cannot add texture motion or deformation`)
    }
    assert.equal(material.map, null)
  }
  const refs = mercury.map(material => logoMercuryUniforms(material)), versions = mercury.map(material => material.version)
  const physical = mercury.map(material => material.toJSON())
  for (const key of Object.keys(refs[0])) assert.equal(new Set(refs.map(u => u[key])).size, mercury.length, `${key} is owned per material`)
  assert.equal(new Set(refs.map(u => u.uMercuryFrame.value)).size, mercury.length)
  assert.equal(new Set(refs.map(u => u.uMercurySegments.value)).size, mercury.length)
  for (const time of [0, 3, 11.5, 100, 11.5, 3, 0, -2, NaN, Infinity]) {
    updateMercuryLighting(materials, time)
    const expected = Number.isFinite(time) ? Math.max(0, time) : 0
    assert.ok(refs.every(u => u.uMercuryTime.value === expected), 'beauty and water proxy use identical optical motion, including time0 reduced motion')
  }
  assert.deepEqual(mercury.map(material => material.version), versions)
  assert.deepEqual(mercury.map(material => material.toJSON()), physical)
  assert.deepEqual(other.map(snapshot), othersBefore)
  meshes(source).forEach((mesh, i) => {
    assert.deepEqual(mesh.geometry.attributes.position.array, sourceData[i].position)
    assert.deepEqual(mesh.geometry.attributes.normal.array, sourceData[i].normal)
    assert.deepEqual(mesh.material.toJSON(), sourceData[i].material)
  })
})

await test('every finite GLB edge registers in the common frame and fades optical flow at the cut, notch and outer silhouette', t => {
  for (const mesh of meshes(source)) {
    const frame = frameFor(mesh), beforeFrame = frame.clone(), contour = buildMercuryContour(mesh.geometry, frame)
    const expected = buildElectricContour(mesh.geometry).map(edge => {
      const a = new Vector3(edge.x / ELECTRIC_CONTOUR_SCALE, 0, edge.y / ELECTRIC_CONTOUR_SCALE).applyMatrix4(frame)
      const b = new Vector3(edge.z / ELECTRIC_CONTOUR_SCALE, 0, edge.w / ELECTRIC_CONTOUR_SCALE).applyMatrix4(frame)
      return new Vector4(a.x, a.z, b.x, b.z)
    })
    assert.equal(contour.length, mesh.name === NODE_NAMES.left ? 11 : 4)
    assert.deepEqual(contour, expected, 'all authored finite edges are used, not an approximate box or only the central slit')
    assert.deepEqual(frame, beforeFrame)
    const endpoints = new Map()
    for (const edge of contour) {
      for (const t of [0, .1, .35, .6, .9, 1]) {
        const p = [edge.x + (edge.z - edge.x) * t, edge.y + (edge.w - edge.y) * t]
        assert.equal(fadeAt(p, contour), 0)
        for (const time of [0, 12, 40, 120]) assert.ok(slopeAt(p, time).every(value => value * fadeAt(p, contour) === 0))
      }
      for (const p of [[edge.x, edge.y], [edge.z, edge.w]]) {
        const key = p.map(value => value.toFixed(7)).join(',')
        endpoints.set(key, (endpoints.get(key) ?? 0) + 1)
      }
    }
    assert.ok([...endpoints.values()].every(count => count === 2), 'the full silhouette closes without missing a notch edge')
    const material = createLogoMercuryMaterial(mesh.material, frame, mesh.geometry)
    t.after(() => material.dispose())
    const u = logoMercuryUniforms(material)
    assert.notEqual(u.uMercuryFrame.value, frame); assert.deepEqual(u.uMercuryFrame.value, frame)
    assert.equal(u.uMercurySegmentCount.value, contour.length)
    assert.equal(u.uMercurySegments.value.length, 16)
    assert.deepEqual(u.uMercurySegments.value.slice(0, contour.length), contour)
    assert.ok(u.uMercurySegments.value.every(edge => edge.toArray().every(Number.isFinite)))
    assert.ok(pars.includes('if (i < uMercurySegmentCount)'), 'inactive uniform padding is never treated as an extra edge')
    let activeInterior = 0
    const p = mesh.geometry.attributes.position, n = mesh.geometry.attributes.normal, index = mesh.geometry.index
    for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
      if (ids.some(id => Math.abs(n.getY(id)) < .999)) continue
      const center = new Vector3().fromBufferAttribute(p, ids[0]).add(new Vector3().fromBufferAttribute(p, ids[1]))
        .add(new Vector3().fromBufferAttribute(p, ids[2])).divideScalar(3).applyMatrix4(frame)
      const point = [center.x, center.z]
      const fade = fadeAt(point, contour)
      if (fade > .1) activeInterior++
      for (const direction of [[1, 0], [0, 1]]) {
        const left = point.map((v, axis) => v - direction[axis] * 1e-7)
        const right = point.map((v, axis) => v + direction[axis] * 1e-7)
        assert.ok(Math.abs(fadeAt(left, contour) - fadeAt(right, contour)) < 1e-4, 'segment overlap and medial axes cannot form visible steps')
      }
    }
    assert.ok(activeInterior > 0, `${mesh.name} retains a moving interior instead of masking the entire cap`)
  }
})

await test('the actual analytic flow remains bounded and slow, while contour and cap gates keep edge normals still', () => {
  let largest = 0, temporalChange = 0, flowingSamples = 0
  for (const mesh of meshes(source)) {
    const frame = frameFor(mesh), contour = buildMercuryContour(mesh.geometry, frame)
    const positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal, index = mesh.geometry.index
    for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
      const point = new Vector3().fromBufferAttribute(positions, ids[0]).add(new Vector3().fromBufferAttribute(positions, ids[1]))
        .add(new Vector3().fromBufferAttribute(positions, ids[2])).divideScalar(3).applyMatrix4(frame)
      const p = [point.x, point.z]
      const faceWeight = ids.reduce((sum, id) => sum + Math.abs(new Vector3().fromBufferAttribute(normals, id).normalize().y), 0) / 3
      const cap = capAt(faceWeight, smoothstep), interior = fadeAt(p, contour)
      for (let time = 0; time <= 180; time += 3) {
        const slope = slopeAt(p, time), next = slopeAt(p, time + .1)
        const magnitude = Math.hypot(...slope)
        largest = Math.max(largest, magnitude)
        temporalChange = Math.max(temporalChange, Math.hypot(slope[0] - next[0], slope[1] - next[1]))
        assert.ok(magnitude <= flow.maxTilt + 1e-10)
        if (cap * interior > .1 && magnitude > .005) flowingSamples++
        const tangent = new Vector3(slope[0], 0, slope[1])
        for (const sign of [-1, 1]) {
          const face = new Vector3(0, sign, 0)
          const tilted = face.clone().addScaledVector(tangent, -sign * cap * interior).normalize()
          assert.ok(tilted.angleTo(face) <= flow.maxTilt + 1e-10, 'front and back cap normals cannot tilt beyond the optical bound')
          if (cap === 0 || interior === 0) assert.deepEqual(tilted.toArray(), face.toArray())
        }
      }
    }
  }
  assert.ok(largest > .01 && largest <= .030000001)
  assert.ok(flowingSamples > 0)
  assert.ok(temporalChange < .0003, 'subsecond updates move the reflection slowly rather than jumping or swiping')
  for (const p of [[-.3, -.2], [.07, .01], [.33, .22]]) {
    const frozen = slopeAt(p, 0)
    slopeAt(p, 20); slopeAt(p, 80)
    assert.deepEqual(slopeAt(p, 0), frozen, 'reduced-motion restoration is deterministic and has no accumulated simulation state')
  }
})

await test('native shader hooks change only interior shading normals and shared opening light is the only emitted halo', t => {
  const mesh = meshes(source)[0], material = createLogoMercuryMaterial(mesh.material, frameFor(mesh), mesh.geometry)
  t.after(() => material.dispose())
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader }
  material.onBeforeCompile(shader, {})
  for (const [name, uniform] of Object.entries(logoMercuryUniforms(material))) assert.equal(shader.uniforms[name], uniform)
  let nativeVertex = shader.vertexShader
  for (const snippet of [mercuryShader.logoMercuryVertexPars, mercuryShader.logoMercuryVertexNormal, mercuryShader.logoMercuryVertexProject]) {
    nativeVertex = nativeVertex.replace(`\n${snippet}`, '')
    const writes = [...snippet.replace(/\/\/[^\n]*/g, '').matchAll(/\b(\w+)\s*=(?!=)/g)].map(match => match[1])
    assert.ok(writes.every(name => name.startsWith('vMercury')), 'custom vertex code writes varyings only, never position or projection')
  }
  assert.equal(nativeVertex, ShaderLib.physical.vertexShader, 'the installed native vertex pipeline remains exact')
  const normalAt = shader.fragmentShader.indexOf(normalSnippet.trim())
  assert.ok(normalAt > shader.fragmentShader.indexOf('#include <normal_fragment_maps>'))
  assert.ok(normalAt < shader.fragmentShader.indexOf('#include <lights_physical_fragment>'))
  assert.ok(normalSnippet.includes('normal * dot(normal, mercuryTilt)'), 'normal projection prevents an accidental outward displacement term')
  assert.ok(!shader.fragmentShader.includes('uGlassScene'))
  expandIncludes(shader.vertexShader); expandIncludes(shader.fragmentShader)
  const suppress = new Function('outgoingLight', 'uMercuryGlowPass', `${mercuryShader.logoMercuryFragmentComposite.replace('vec3(0.0)', '0')} return outgoingLight;`)
  for (const reflectedRadiance of [0, .2, 1, 1000]) {
    assert.equal(suppress(reflectedRadiance, 0), reflectedRadiance)
    assert.equal(suppress(reflectedRadiance, 1), 0)
  }
  const beauty = source.clone(true), proxy = source.clone(true)
  createLogoMaterialVariants(beauty, .432916); createLogoMaterialVariants(proxy, .432916, true)
  t.after(() => { disposeLogoMaterialVariants(beauty); disposeLogoMaterialVariants(proxy) })
  selectLogoAppearance(beauty, 'mercury'); selectLogoAppearance(proxy, 'mercury')
  const active = logoMaterials(beauty), reflected = logoMaterials(proxy)
  setMercuryGlowPass(active, true)
  for (const item of [...active, ...reflected]) {
    const u = logoOpeningUniforms(item)
    assert.equal(logoMercuryUniforms(item).uMercuryGlowPass.value, active.includes(item) ? 1 : 0)
    assert.equal(u.uOpeningGlass.value, 0)
    assert.deepEqual(u.uOpeningColor.value.toArray(), profile.openingColor)
    assert.equal(u.uOpeningGain.value, active.includes(item) ? 1 : profile.openingReflectionGain)
  }
  updateLogoOpening([...active, ...reflected], .065)
  assert.ok(active.every(item => logoOpeningUniforms(item).uOpeningTraceStrength.value > 0))
  updateLogoOpening([...active, ...reflected], .4)
  assert.ok(active.every(item => logoOpeningUniforms(item).uOpeningTraceStrength.value === 0))
  setMercuryGlowPass([...active, ...reflected], false)
  assert.ok([...active, ...reflected].every(item => logoMercuryUniforms(item).uMercuryGlowPass.value === 0))
})
