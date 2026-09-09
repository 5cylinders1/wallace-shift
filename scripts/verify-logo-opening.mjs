/** Actual GLB registration and material/shader ownership checks. No GPU rendering. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Group, ShaderChunk, ShaderLib, Vector3 } from 'three'
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
const { OPENING_CUT, createOpeningFrame, installLogoOpening, logoOpeningUniforms,
  updateLogoOpening, setOpeningGlowPass } = await load('logoOpening')
const { createLogoMaterialVariants, logoVariantMaterials, selectLogoAppearance, disposeLogoMaterialVariants } = await load('logoMaterialVariants')
const { logoGlassUniforms, logoLEDUniforms, updateLEDLighting } = await load('logoMaterial')
const { logoChromeUniforms, BLACK_CHROME_MATERIAL } = await load('logoChrome')
const { logoFrostedUniforms, FROSTED_CRYSTAL_MATERIAL } = await load('logoFrosted')
const { logoPearlUniforms, PEARL_CERAMIC_MATERIAL } = await load('logoPearl')
const { logoCopperUniforms, SMOKED_COPPER_MATERIAL } = await load('logoCopper')
const { logoMercuryUniforms, LIQUID_MERCURY_MATERIAL } = await load('logoMercury')
const { logoCutLightUniforms, CUT_LIGHT_MATERIAL } = await load('logoCutLight')
const { sampleOpeningReveal, OPENING_REVEAL } = await load('openingReveal')
const { logoOpeningFragmentPars, logoOpeningFragmentComposite } = await load('shaders/logoOpening')
const { NODE_NAMES, WS_LOGO_URL, LED_LOGO_MATERIAL } = await load('waterHeroConfig')
const bytes = await readFile(new URL(`../public${WS_LOGO_URL}`, import.meta.url))
const { scene: source } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
const meshes = root => { const found = []; root.traverse(object => { if (object.isMesh) found.push(object) }); return found }
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-7, `${message}: ${a} vs ${b}`)
const revealValues = uniforms => ({ trace: uniforms.uOpeningTrace.value,
  traceStrength: uniforms.uOpeningTraceStrength.value, surface: uniforms.uOpeningSurface.value })
const expectedValues = reveal => ({ trace: reveal.trace, traceStrength: reveal.traceStrength, surface: reveal.surface })

// Execute the scalar expressions from the shader itself, without a GPU. The
// segment projection is a CPU reference; this does not validate GLSL compilation.
const clamp = (x, low = 0, high = 1) => Math.max(low, Math.min(high, x))
const smoothstep = (low, high, value) => { const x = clamp((value - low) / (high - low)); return x * x * (3 - 2 * x) }
const math = { exp: Math.exp, pow: Math.pow, max: Math.max, min: Math.min, smoothstep }
const scalarSource = logoOpeningFragmentPars.match(/float weight = [\s\S]*?(?=    blended \+=)/)?.[0]
const energySource = logoOpeningFragmentPars.match(/blended \+= vec2\(bankDistance, (.*)\) \* weight;/)?.[1]
assert.ok(scalarSource && energySource, 'each segment evaluates radiance before spatial blending')
assert.match(logoOpeningFragmentPars, /return blended \/ totalWeight;/, 'normalize the light contributions')
assert.match(logoOpeningFragmentComposite, /float bankDistance = cut\.x;/)
assert.match(logoOpeningFragmentComposite, /vec3 charge = uOpeningColor \* cut\.y/)
const segmentLight = new Function('sample', 'nearest', 'trace', 'math', `
  const { exp, pow, max, min, smoothstep } = math;
  ${scalarSource.replace(/\bfloat\b/g, 'let').replaceAll('samples[i]', 'sample').replaceAll('uOpeningTrace', 'trace')}
  return { weight, bank: bankDistance, energy: ${energySource} };
`)
const surfaceSource = logoOpeningFragmentComposite.match(/float delay = [\s\S]*?float settled = [^;]+;/)?.[0]
assert.ok(surfaceSource)
const settledAt = new Function('bankDistance', 'uOpeningSurface', 'math', `
  const { min, smoothstep } = math;
  ${surfaceSource.replace(/\bfloat\b/g, 'let')}
  return settled;
`)
function segmentSamples(p) {
  return OPENING_CUT.points.slice(1).map((b, i) => {
    const a = OPENING_CUT.points[i], dx = b[0] - a[0], dz = b[1] - a[1]
    const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz))
    return { i, x: Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz),
      y: OPENING_CUT.arc[i] + t * (OPENING_CUT.arc[i + 1] - OPENING_CUT.arc[i]),
      z: OPENING_CUT.halfGap[i] + t * (OPENING_CUT.halfGap[i + 1] - OPENING_CUT.halfGap[i]) }
  })
}
function lightAt(p, trace, old = false) {
  const samples = segmentSamples(p), nearest = Math.min(...samples.map(sample => sample.x))
  const lights = samples.map(sample => segmentLight(sample, nearest, trace, math))
  const total = lights.reduce((sum, light) => sum + light.weight, 0)
  const field = old ? lights[samples.findIndex(sample => sample.x === nearest)] : {
    bank: lights.reduce((sum, light) => sum + light.bank * light.weight, 0) / total,
    energy: lights.reduce((sum, light) => sum + light.energy * light.weight, 0) / total,
  }
  return { ...field, samples, lights, total, settled: settledAt(field.bank, .5, math) }
}
const nearestSegment = p => segmentSamples(p).reduce((a, b) => a.x < b.x ? a : b).i
function frontCaps(root) {
  const triangles = []
  for (const mesh of meshes(root)) {
    const { geometry } = mesh, positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal')
    const frame = logoOpeningUniforms(mesh.material).uOpeningFrame.value
    for (let i = 0; i < (geometry.index?.count ?? positions.count); i += 3) {
      const indices = [0, 1, 2].map(k => geometry.index ? geometry.index.getX(i + k) : i + k)
      if (!indices.every(k => normals.getY(k) > .999)) continue
      triangles.push({ mesh: mesh.name, points: indices.map(k => {
        const p = new Vector3().fromBufferAttribute(positions, k).applyMatrix4(frame)
        return [p.x, p.z]
      }) })
    }
  }
  return triangles
}
function insideTriangle(p, triangle) {
  const signs = triangle.map((a, i) => {
    const b = triangle[(i + 1) % 3]
    return (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])
  })
  return signs.every(value => value >= -1e-10) || signs.every(value => value <= 1e-10)
}

function variants(t) {
  const beauty = source.clone(true), proxy = source.clone(true)
  createLogoMaterialVariants(beauty, .432916)
  createLogoMaterialVariants(proxy, .432916, true)
  t.after(() => { disposeLogoMaterialVariants(beauty); disposeLogoMaterialVariants(proxy) })
  return { beauty, proxy, materials: [...logoVariantMaterials(beauty), ...logoVariantMaterials(proxy)] }
}

await test('the actual GLB pieces and rounded glass use one correctly registered native XZ path', t => {
  const { beauty, proxy } = variants(t)
  const expectedOffsets = {
    WS_Left: [-.05627303570508957, -.0084981769323349],
    WS_Right: [.056273043155670166, .008498191833496094],
  }
  for (const appearance of ['led', 'electric', 'glass', 'chrome', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight']) {
    for (const root of [beauty, proxy]) {
      selectLogoAppearance(root, appearance)
      for (const mesh of meshes(root)) {
        const offset = expectedOffsets[mesh.name]
        assert.ok(offset, 'only known GLB pieces participate')
        const uniforms = logoOpeningUniforms(mesh.material)
        assert.ok(uniforms)
        const positions = mesh.geometry.getAttribute('position')
        for (let i = 0; i < positions.count; i++) {
          const p = new Vector3().fromBufferAttribute(positions, i)
          const q = p.clone().applyMatrix4(uniforms.uOpeningFrame.value)
          near(q.x, (p.x + offset[0] - OPENING_CUT.center[0]) / OPENING_CUT.width, 'registered X')
          near(q.z, (p.z + offset[1] - OPENING_CUT.center[1]) / OPENING_CUT.width, 'registered Z')
        }
        for (const [x, z] of OPENING_CUT.points) {
          const common = new Vector3(x * OPENING_CUT.width + OPENING_CUT.center[0], 0,
            z * OPENING_CUT.width + OPENING_CUT.center[1])
          const local = common.sub(new Vector3(offset[0], 0, offset[1])).applyMatrix4(uniforms.uOpeningFrame.value)
          near(local.x, x, 'both halves agree on each path knot X')
          near(local.z, z, 'both halves agree on each path knot Z')
        }
      }
    }
  }
  assert.ok(OPENING_CUT.points.every((point, i) => i === 0 || point[1] > OPENING_CUT.points[i - 1][1]),
    'native Z increases from the visible top to the bottom')
  const lengths = OPENING_CUT.points.slice(1).map((point, i) => Math.hypot(
    point[0] - OPENING_CUT.points[i][0], point[1] - OPENING_CUT.points[i][1]))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  let cumulative = 0
  for (let i = 0; i < lengths.length; i++) {
    cumulative += lengths[i]
    near(OPENING_CUT.arc[i + 1], cumulative / total, 'arc follows actual segment lengths')
  }
})

await test('the opening frame cancels presentation transforms and never mutates authored mesh transforms', () => {
  const root = source.clone(true), authored = root.getObjectByName(NODE_NAMES.root)
  root.updateMatrixWorld(true)
  const before = meshes(root).map(mesh => ({ mesh, frame: createOpeningFrame(mesh, authored),
    position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray() }))
  const wrapper = new Group()
  wrapper.position.set(3, -4, 7); wrapper.rotation.set(.4, -.8, .2); wrapper.scale.set(2, 3, 4)
  wrapper.add(root); wrapper.updateMatrixWorld(true)
  for (const item of before) {
    const frame = createOpeningFrame(item.mesh, authored)
    frame.elements.forEach((value, i) => near(value, item.frame.elements[i], 'parent transforms cancel'))
    assert.deepEqual(item.mesh.position.toArray(), item.position)
    assert.deepEqual(item.mesh.quaternion.toArray(), item.quaternion)
    assert.deepEqual(item.mesh.scale.toArray(), item.scale)
  }
})

function expandIncludes(source) {
  return source.replace(/#include <([\w_]+)>/g, (_, name) => {
    assert.equal(typeof ShaderChunk[name], 'string', `native shader chunk ${name} exists`)
    return expandIncludes(ShaderChunk[name])
  })
}

await test('intro shading follows each selected finish and precedes native output conversion without duplicate hooks', t => {
  const { beauty, proxy } = variants(t)
  for (const appearance of ['led', 'electric', 'glass', 'chrome', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight']) {
    for (const root of [beauty, proxy]) {
      selectLogoAppearance(root, appearance)
      for (const mesh of meshes(root)) {
        const material = mesh.material, uniforms = logoOpeningUniforms(material)
        const key = material.customProgramCacheKey(), compile = material.onBeforeCompile
        const optical = appearance === 'glass' || appearance === 'frosted' || appearance === 'copper'
        installLogoOpening(material, uniforms.uOpeningFrame.value, optical, root === proxy)
        assert.equal(material.onBeforeCompile, compile, 'installing twice cannot chain or allocate another wrapper')
        assert.equal(material.customProgramCacheKey(), key)
        const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader }
        material.onBeforeCompile(shader, {})
        for (const [name, uniform] of Object.entries(uniforms)) assert.equal(shader.uniforms[name], uniform)
        const finish = appearance === 'cutlight' ? 'outgoingLight = cutEmission + outgoingLight * (1.0 - step(.5, uCutGlowPass));'
          : appearance === 'mercury' ? 'if (uMercuryGlowPass > .5) outgoingLight = vec3(0.0);'
          : appearance === 'copper' ? 'outgoingLight = totalSpecular + copperGlassWeight * (copperBody + copperRearReflection);'
          : appearance === 'pearl' ? 'if (uPearlGlowPass > .5) outgoingLight = vec3(0.0);'
          : appearance === 'frosted' ? 'outgoingLight = frostedInterior + frostedOptics;'
          : appearance === 'glass' ? 'outgoingLight = totalSpecular + crystalBody + crystalRearReflection;'
          : appearance === 'chrome' ? 'outgoingLight = chromeSeam + chromeBody * (1.0 - step(.5, uChromeGlowPass));'
            : 'outgoingLight = ledEmission + ledHousing * (1.0 - step(.5, uLEDGlowPass));'
        const finishAt = shader.fragmentShader.indexOf(finish)
        const openingAt = shader.fragmentShader.indexOf('if (uOpeningSurface < 1.0 || uOpeningTraceStrength > 0.0)')
        assert.ok(finishAt >= 0 && openingAt > finishAt, 'opening operates on the actual completed material result')
        assert.ok(openingAt < shader.fragmentShader.indexOf('#include <opaque_fragment>'))
        assert.ok(openingAt < shader.fragmentShader.indexOf('#include <tonemapping_fragment>'))
        assert.ok(openingAt < shader.fragmentShader.indexOf('#include <colorspace_fragment>'))
        assert.equal((shader.fragmentShader.match(/uniform float uOpeningSurface;/g) ?? []).length, 1)
        assert.equal((shader.vertexShader.match(/uniform mat4 uOpeningFrame;/g) ?? []).length, 1)
        expandIncludes(shader.fragmentShader); expandIncludes(shader.vertexShader)
        assert.equal(uniforms.uOpeningGlass.value, optical ? 1 : 0)
        assert.equal(uniforms.uOpeningEmissiveGlass.value, appearance === 'frosted' ? 1 : 0)
        assert.ok(optical ? logoGlassUniforms(material)
          : appearance === 'cutlight' ? logoCutLightUniforms(material)
          : appearance === 'mercury' ? logoMercuryUniforms(material)
          : appearance === 'pearl' ? logoPearlUniforms(material)
          : appearance === 'chrome' ? logoChromeUniforms(material) : logoLEDUniforms(material))
      }
    }
  }
})

await test('all active and inactive finishes share reversible intro values while keeping their owned uniforms and settled materials', t => {
  const { beauty, proxy, materials } = variants(t)
  const refs = materials.map(material => logoOpeningUniforms(material))
  assert.equal(new Set(refs).size, materials.length)
  for (const key of Object.keys(refs[0])) assert.equal(new Set(refs.map(uniforms => uniforms[key])).size, materials.length)
  const states = new Map(), versions = materials.map(material => material.version)
  const before = materials.map(material => material.toJSON())
  for (const progress of [0, .03, .06, .10, .145, .2, .06, 0, .10, .145]) {
    updateLogoOpening(materials, progress)
    const actual = refs.map(revealValues)
    for (const value of actual) assert.deepEqual(value, expectedValues(sampleOpeningReveal(progress)))
    if (states.has(progress)) assert.deepEqual(actual, states.get(progress), 'reverse/jumps restore every material exactly')
    else states.set(progress, actual)
  }
  for (const appearance of ['glass', 'led', 'electric', 'chrome', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight', 'glass']) {
    selectLogoAppearance(beauty, appearance); selectLogoAppearance(proxy, appearance)
    updateLEDLighting(materials, 8, 0, appearance)
    updateLogoOpening(materials, OPENING_REVEAL.surfaceEnd)
    for (const uniforms of refs) {
      assert.equal(uniforms.uOpeningSurface.value, 1)
      assert.equal(uniforms.uOpeningTraceStrength.value, 0, 'settled beauty skips the entire intro color modification')
      assert.equal(uniforms.uOpeningGlowPass.value, 0)
    }
  }
  assert.deepEqual(materials.map(material => material.version), versions)
  assert.deepEqual(materials.map(material => material.toJSON()), before, 'intro uniforms never alter physical preset properties')
  assert.deepEqual(materials.map(material => logoOpeningUniforms(material)), refs)
})

await test('reduced motion settles every finish immediately and selective glow flags remain isolated from proxies', t => {
  const { beauty, proxy, materials } = variants(t)
  for (const progress of [0, .03, .08, .12, .5, 1]) {
    updateLogoOpening(materials, progress, true)
    for (const material of materials) assert.deepEqual(revealValues(logoOpeningUniforms(material)),
      { trace: 1, traceStrength: 0, surface: 1 })
  }
  const proxyMaterials = logoVariantMaterials(proxy)
  for (const appearance of ['led', 'electric', 'glass', 'chrome', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight']) {
    selectLogoAppearance(beauty, appearance)
    const active = meshes(beauty).map(mesh => mesh.material)
    setOpeningGlowPass(active, true)
    for (const material of materials) {
      const uniforms = logoOpeningUniforms(material)
      assert.equal(uniforms.uOpeningGlowPass.value, active.includes(material) ? 1 : 0)
      const chrome = !!logoChromeUniforms(material), frosted = !!logoFrostedUniforms(material), pearl = !!logoPearlUniforms(material),
        copper = !!logoCopperUniforms(material), mercury = !!logoMercuryUniforms(material), cutlight = !!logoCutLightUniforms(material)
      assert.equal(uniforms.uOpeningGain.value, proxyMaterials.includes(material)
        ? chrome ? BLACK_CHROME_MATERIAL.reflectionGain
          : frosted ? FROSTED_CRYSTAL_MATERIAL.reflectionGain
            : pearl ? PEARL_CERAMIC_MATERIAL.openingReflectionGain
              : copper ? SMOKED_COPPER_MATERIAL.openingReflectionGain
                : mercury ? LIQUID_MERCURY_MATERIAL.openingReflectionGain
                  : cutlight ? CUT_LIGHT_MATERIAL.openingReflectionGain : LED_LOGO_MATERIAL.reflectionGain : 1)
      assert.deepEqual(uniforms.uOpeningColor.value.toArray(), chrome ? BLACK_CHROME_MATERIAL.seamColor
        : pearl ? PEARL_CERAMIC_MATERIAL.openingColor
          : copper ? SMOKED_COPPER_MATERIAL.openingColor
            : mercury ? LIQUID_MERCURY_MATERIAL.openingColor
              : cutlight ? CUT_LIGHT_MATERIAL.openingColor : [.52, .82, 1],
        'warm opening charges remain isolated from the cool approved looks')
    }
    setOpeningGlowPass(active, false)
    for (const material of materials) assert.equal(logoOpeningUniforms(material).uOpeningGlowPass.value, 0)
  }
})

await test('actual cap bisectors no longer produce a hard light or surface-reveal seam', t => {
  const { beauty } = variants(t)
  const caps = frontCaps(beauty)
  // These cross the original nearest-segment boundaries on the right stroke
  // and both triangular panels of the left piece, rather than empty space.
  const crossings = [
    { mesh: 'WS_Right', x: .376921596, z: -.097 },
    { mesh: 'WS_Right', x: .243331290, z: -.109 },
    { mesh: 'WS_Left', x: -.011084039, z: -.007 },
    { mesh: 'WS_Left', x: -.211152776, z: -.025 },
    { mesh: 'WS_Left', x: .055605541, z: -.001 },
  ]
  let oldSurfaceJump = 0, oldLightJump = 0
  for (const crossing of crossings) {
    let low = crossing.x - .002, high = crossing.x + .002
    const leftSegment = nearestSegment([low, crossing.z])
    assert.notEqual(leftSegment, nearestSegment([high, crossing.z]))
    for (let i = 0; i < 45; i++) {
      const x = (low + high) / 2
      if (nearestSegment([x, crossing.z]) === leftSegment) low = x
      else high = x
    }
    const x = (low + high) / 2
    assert.ok(caps.some(cap => cap.mesh === crossing.mesh && insideTriangle([x, crossing.z], cap.points)),
      `${crossing.mesh} regression location lies on an actual GLB cap`)
    const traces = [...segmentSamples([x, crossing.z]).map(sample => sample.y), .15, .35, .55, .8]
    for (const trace of traces) {
      const oldLeft = lightAt([x - 1e-7, crossing.z], trace, true)
      const oldRight = lightAt([x + 1e-7, crossing.z], trace, true)
      oldSurfaceJump = Math.max(oldSurfaceJump, Math.abs(oldLeft.settled - oldRight.settled))
      oldLightJump = Math.max(oldLightJump, Math.abs(oldLeft.energy - oldRight.energy))
      const deltas = [1e-3, 1e-5, 1e-7].map(step => {
        const left = lightAt([x - step, crossing.z], trace), right = lightAt([x + step, crossing.z], trace)
        return Math.max(Math.abs(left.bank - right.bank), Math.abs(left.energy - right.energy),
          Math.abs(left.settled - right.settled))
      })
      assert.ok(deltas[1] < deltas[0] * .025 + 1e-10, 'shrinking spatial steps shrink the complete scalar-field change')
      assert.ok(deltas[2] < deltas[1] * .025 + 1e-10, 'there is no residual discontinuity at the bisector')
      assert.ok(deltas[2] < 1e-4, 'subpixel neighbors cannot differ by a visible reveal step')
    }
  }
  assert.ok(oldSurfaceJump > .12, 'the fixture reproduces the old 12+ percentage point surface jump')
  assert.ok(oldLightJump > .05, 'the fixture also reproduces a localized charge discontinuity')
})

await test('the blend stays within actual segment radiance and cannot invent a head from an averaged arc', t => {
  const { beauty } = variants(t)
  const points = frontCaps(beauty).flatMap(cap => [
    ...cap.points,
    [cap.points.reduce((sum, p) => sum + p[0], 0) / 3, cap.points.reduce((sum, p) => sum + p[1], 0) / 3],
  ])
  // Explicit separated-arc bisectors catch the case where blending the arc
  // first creates a bright head between two dim per-segment light arrivals.
  points.push([.376921596, -.097], [-.211152776, -.025])
  let rejectedPhantom = false
  for (const p of points) {
    const initial = lightAt(p, 0)
    const averageArc = initial.samples.reduce((sum, sample, i) => sum + sample.y * initial.lights[i].weight, 0) / initial.total
    for (const trace of [0, .15, .3, .5, .7, .9, 1, averageArc]) {
      const field = lightAt(p, trace)
      const energies = field.lights.map(light => light.energy), banks = field.lights.map(light => light.bank)
      assert.ok(field.total >= 1 && field.total <= 3, 'distance-relative weights remain well-conditioned')
      assert.ok(Number.isFinite(field.bank) && Number.isFinite(field.energy))
      assert.ok(field.energy >= Math.min(...energies) - 1e-12 && field.energy <= Math.max(...energies) + 1e-12,
        'convex radiance blending cannot make a second, brighter head')
      assert.ok(field.bank >= Math.min(...banks) - 1e-12 && field.bank <= Math.max(...banks) + 1e-12)
      if (trace === averageArc) {
        const averageSample = ['x', 'y', 'z'].reduce((sample, key) => {
          sample[key] = field.samples.reduce((sum, item, i) => sum + item[key] * field.lights[i].weight, 0) / field.total
          return sample
        }, {})
        const phantom = segmentLight(averageSample, averageSample.x, trace, math).energy
        if (phantom > Math.max(...energies) * 2 && phantom > .0001) rejectedPhantom = true
      }
    }
  }
  assert.ok(rejectedPhantom, 'the fixtures distinguish per-segment radiance from the rejected averaged-arc alternative')
})

await test('the compact light peak travels top to bottom, decays locally, and reverses without history', () => {
  const previous = []
  for (const arc of [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1]) {
    const segment = Math.min(2, OPENING_CUT.arc.slice(1).findIndex(end => arc <= end))
    const along = (arc - OPENING_CUT.arc[segment]) / (OPENING_CUT.arc[segment + 1] - OPENING_CUT.arc[segment])
    const a = OPENING_CUT.points[segment], b = OPENING_CUT.points[segment + 1]
    const p = a.map((value, i) => value + (b[i] - value) * along)
    const values = Array.from({ length: 1201 }, (_, i) => lightAt(p, i / 1000).energy)
    const peak = Math.max(...values), peakTrace = values.indexOf(peak) / 1000
    assert.ok(Math.abs(peakTrace - arc) < .05, 'the light peak stays registered to the traveled cut location')
    assert.ok(previous.length === 0 || peakTrace > previous.at(-1), 'successive locations illuminate in path order')
    previous.push(peakTrace)
    assert.ok(lightAt(p, peakTrace - .3).energy < peak * .025, 'a compact front does not light far ahead of its arrival')
    assert.ok(lightAt(p, peakTrace + .6).energy < peak * .025, 'the local trailing light decays after passage')
    for (const trace of [.08, .25, .6, .9, .6, .25, .08]) {
      const first = lightAt(p, trace)
      lightAt(p, 1 - trace)
      assert.deepEqual(lightAt(p, trace), first, 'reverse evaluation has no hidden accumulated state')
    }
  }
})
