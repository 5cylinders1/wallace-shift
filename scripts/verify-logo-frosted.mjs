/** Real GLB/material and scalar optical checks; these do not render or compile on a GPU. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Box3, FrontSide, MeshPhysicalMaterial, ShaderChunk, ShaderLib, Texture, Vector3 } from 'three'
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
const { FROSTED_CRYSTAL_MATERIAL: profile, createLogoFrostedMaterial, logoFrostedUniforms,
  updateFrostedLighting, setFrostedGlowPass } = await load('logoFrosted')
const { FROSTED_VOLUME: volume, logoFrostedFragmentPars: pars,
  logoFrostedFragmentRoughness: roughness, logoFrostedFragmentComposite: composite } = await load('shaders/logoFrosted')
const { createLogoCrystalMaterial, logoGlassUniforms, logoLEDUniforms, bindGlassScene } = await load('logoMaterial')
const { logoChromeUniforms } = await load('logoChrome')
const { createLogoMaterialVariants, logoVariantMaterials, disposeLogoMaterialVariants } = await load('logoMaterialVariants')
const { buildGlassGeometry } = await load('glassGeometry')
const { COLOR_WAVE, UNDERWATER_PALETTE } = await load('shaders/underwaterColor')
const bytes = await readFile(new URL('../public/models/ws_logo.glb', import.meta.url))
const { scene: source } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
source.updateMatrixWorld(true)
const meshes = []
source.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh) })
const size = new Box3().setFromObject(source).getSize(new Vector3())
const thickness = size.y * 2 / size.x
const close = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) <= epsilon, `${a} vs ${b}`)
const smoothstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t
const scalar = (expression, names) => new Function(...names, 'mix', 'smoothstep', `
  const {exp, pow, max, abs} = Math;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  return ${expression};
`)
const assignment = (name, text = composite) => {
  const expression = text.match(new RegExp(`(?:float|vec3) ${name} = ([\\s\\S]*?);`))?.[1]
  assert.ok(expression, `${name} has an executable scalar expression`)
  return expression
}
const capWeight = scalar(pars.match(/return (1\.0 - smoothstep[^;]+);/)[1], ['vGlassBevel'])
const scatterAt = scalar(assignment('frostedScatter'), ['frostedCap'])
const unscatteredAt = scalar(assignment('frostedUnscattered'), ['frostedScatter', 'frostedPath'])
const absorptionAt = scalar(assignment('frostedAbsorption'), ['uGlassAbsorption', 'frostedPath'])
const interiorAt = scalar(assignment('frostedInterior'), ['uFrostedColor', 'uFrostedIntensity', 'uFrostedGain',
  'frostedUnscattered', 'frostedAbsorption', 'frostedInnerFalloff', 'frostedFresnel'])
const transmissionAt = scalar(assignment('frostedTransmission'), ['frostedAbsorption', 'frostedUnscattered'])
const roughnessAt = scalar(roughness.match(/roughnessFactor = ([^;]+);/)[1].replace('frostedCapWeight()', 'cap'), ['cap'])
const read = (fn, ...args) => fn(...args, mix, smoothstep)
function optics(cap, path, channel = 2, gain = 1) {
  const scatter = read(scatterAt, cap), unscattered = read(unscatteredAt, scatter, path)
  const absorption = read(absorptionAt, profile.absorption[channel], path)
  return { transmitted: read(transmissionAt, absorption, unscattered),
    interior: read(interiorAt, profile.color[channel], profile.intensity, gain, unscattered, absorption, 1, .04) }
}
function expandIncludes(text) {
  return text.replace(/#include <([\w_]+)>/g, (_, name) => {
    assert.equal(typeof ShaderChunk[name], 'string')
    return expandIncludes(ShaderChunk[name])
  })
}

await test('Frosted owns clean dielectric materials and capture uniforms without mutating clear glass or the cached GLB', t => {
  for (const mesh of meshes) {
    const before = mesh.material.toJSON(), positions = mesh.geometry.attributes.position.array.slice()
    const clear = createLogoCrystalMaterial(mesh.material, thickness), clearBefore = clear.toJSON()
    const beauty = createLogoFrostedMaterial(mesh.material, thickness)
    const proxy = createLogoFrostedMaterial(mesh.material, thickness, true)
    t.after(() => { clear.dispose(); beauty.dispose(); proxy.dispose() })
    for (const material of [beauty, proxy]) {
      assert.ok(material instanceof MeshPhysicalMaterial)
      assert.equal(material.metalness, 0); assert.equal(material.transmission, 0)
      assert.equal(material.transparent, false); assert.equal(material.depthWrite, true)
      assert.equal(material.side, FrontSide); assert.equal(material.opacity, 1)
      assert.equal(material.ior, profile.ior); assert.equal(material.roughness, profile.roughness)
      assert.deepEqual(material.color.toArray(), profile.baseColor)
      assert.deepEqual(material.emissive.toArray(), [0, 0, 0])
      for (const map of ['map', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap']) assert.equal(material[map], null)
      const glass = logoGlassUniforms(material), frost = logoFrostedUniforms(material)
      assert.ok(glass && frost)
      assert.deepEqual(glass.uGlassBodyFill.value.toArray(), [0, 0], 'the diffuse gray undercoat remains disabled')
      assert.equal(glass.uGlassWorldThickness.value, thickness)
      assert.equal(glass.uGlassRimStrength.value, 0)
      assert.deepEqual(glass.uGlassAbsorption.value.toArray(), profile.absorption)
      assert.ok(!logoLEDUniforms(material) && !logoChromeUniforms(material))
      assert.notEqual(material.customProgramCacheKey(), clear.customProgramCacheKey())
    }
    const a = logoFrostedUniforms(beauty), b = logoFrostedUniforms(proxy)
    for (const name of Object.keys(a)) assert.notEqual(a[name], b[name])
    assert.notEqual(a.uFrostedColor.value, b.uFrostedColor.value)
    assert.notEqual(logoGlassUniforms(beauty).uGlassAbsorption.value, logoGlassUniforms(clear).uGlassAbsorption.value)
    assert.deepEqual(clear.toJSON(), clearBefore)
    assert.deepEqual(mesh.material.toJSON(), before); assert.deepEqual(mesh.geometry.attributes.position.array, positions)
  }
})

await test('Frosted hooks fit the installed native shader in declaration, lighting and output order', t => {
  const material = createLogoFrostedMaterial(meshes[0].material, thickness)
  t.after(() => material.dispose())
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader }
  material.onBeforeCompile(shader, {})
  for (const registry of [logoGlassUniforms(material), logoFrostedUniforms(material)]) {
    for (const [name, uniform] of Object.entries(registry)) assert.equal(shader.uniforms[name], uniform)
  }
  const fragment = shader.fragmentShader
  const helpers = fragment.indexOf('float frostedCapWeight()')
  assert.ok(helpers > fragment.indexOf('varying float vGlassBevel;'))
  assert.ok(helpers > fragment.indexOf('uniform sampler2D uGlassScene;'))
  assert.ok(helpers < fragment.indexOf('void main() {'))
  const rough = fragment.indexOf(roughness.trim())
  assert.ok(rough > fragment.indexOf('#include <roughnessmap_fragment>'))
  assert.ok(rough < fragment.indexOf('#include <lights_physical_fragment>'))
  assert.ok(fragment.indexOf('float crystalFaceWeight =') < fragment.indexOf('#include <lights_physical_fragment>'))
  const finish = fragment.indexOf('outgoingLight = frostedInterior + frostedOptics;')
  assert.ok(finish > fragment.indexOf('vec3 totalSpecular ='))
  assert.ok(finish < fragment.indexOf('#include <opaque_fragment>'))
  assert.ok(finish < fragment.indexOf('#include <tonemapping_fragment>'))
  assert.ok(!fragment.includes('outgoingLight = totalSpecular + crystalBody + crystalRearReflection;'), 'clear-glass composite was replaced, not layered underneath')
  assert.equal(fragment.split('uniform float uFrostedGlowPass;').length - 1, 1)
  assert.ok(shader.vertexShader.includes('vFrostedWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;'))
  const expanded = expandIncludes(fragment)
  assert.ok(expanded.indexOf('material.iridescence *= crystalBevel;') < expanded.search(/material\.iridescenceFresnel\w*\s*=\s*evalIridescence/))
  expandIncludes(shader.vertexShader)
})

await test('actual rounded GLB normals separate a scattering cap from clearer shoulders without a discontinuous boundary', t => {
  for (const mesh of meshes) {
    const geometry = buildGlassGeometry(mesh.geometry), n = geometry.attributes.normal
    t.after(() => geometry.dispose())
    const caps = [], shoulders = [], transition = []
    for (let i = 0; i < n.count; i++) {
      const normal = new Vector3().fromBufferAttribute(n, i).normalize()
      const cap = read(capWeight, 1 - Math.abs(normal.y))
      if (cap > .999) caps.push(cap)
      else if (cap < .001) shoulders.push(cap)
      else transition.push(cap)
      assert.ok(cap >= 0 && cap <= 1)
      const optical = optics(cap, thickness)
      assert.ok(optical.interior > 0 && optical.transmitted > 0 && optical.transmitted < 1)
    }
    assert.ok(caps.length > 0 && shoulders.length > 0 && transition.length > 0, `${mesh.name} has actual cap, curved transition and side normals`)
    assert.ok(optics(1, thickness).interior > optics(0, thickness).interior * 2)
    assert.ok(optics(1, thickness).transmitted < optics(0, thickness).transmitted)
    assert.ok(read(roughnessAt, 1) > read(roughnessAt, 0) * 3)
  }
  for (let bevel = 0; bevel <= 1; bevel += .001) {
    const left = read(capWeight, bevel - 1e-7), right = read(capWeight, bevel + 1e-7)
    assert.ok(Math.abs(optics(left, thickness).interior - optics(right, thickness).interior) < 1e-6)
  }
  for (const cap of [0, .25, .5, 1]) {
    for (const channel of [0, 1, 2]) {
      let previous = Infinity
      for (let angle = 0; angle <= 90; angle++) {
        const path = thickness / Math.max(.30, Math.abs(Math.cos(angle * Math.PI / 180)))
        const light = optics(cap, path, channel)
        assert.ok(Number.isFinite(light.interior) && light.interior > 0)
        assert.ok(light.transmitted <= previous + 1e-12, 'longer optical paths attenuate background radiance')
        previous = light.transmitted
      }
    }
  }
})

function blockAfter(text, token) {
  const start = text.indexOf(token)
  assert.ok(start >= 0, token)
  const open = text.indexOf('{', start)
  let depth = 1, at = open + 1
  for (; at < text.length && depth; at++) {
    if (text[at] === '{') depth++
    else if (text[at] === '}') depth--
  }
  assert.equal(depth, 0)
  return { body: text.slice(open + 1, at - 1), start, end: at }
}

await test('intrinsic Frosted light survives the halo pass while capture and environment sampling remain excluded', t => {
  const beauty = createLogoFrostedMaterial(meshes[0].material, thickness)
  const proxy = createLogoFrostedMaterial(meshes[0].material, thickness, true), texture = new Texture()
  t.after(() => { bindGlassScene([beauty, proxy], null); texture.dispose(); beauty.dispose(); proxy.dispose() })
  // Even an accidentally present beauty texture cannot be sampled by a mirrored proxy.
  bindGlassScene([beauty, proxy], texture, 1024, 576)
  const outerCondition = composite.match(/if \((uFrostedGlowPass < \.5)\)/)[1]
  const captureCondition = composite.match(/if \((uGlassReady > \.5 && uFrostedProxy < \.5)\)/)[1]
  const shouldReflect = scalar(outerCondition, ['uFrostedGlowPass'])
  const shouldSample = scalar(captureCondition, ['uGlassReady', 'uFrostedProxy'])
  const outer = blockAfter(composite, `if (${outerCondition})`)
  assert.ok(outer.body.includes('frostedSceneSample(') && outer.body.includes('getIBLRadiance('))
  const rest = composite.slice(0, outer.start) + composite.slice(outer.end)
  assert.ok(!rest.includes('frostedSceneSample(') && !rest.includes('getIBLRadiance('))
  assert.ok(rest.includes('vec3 frostedOptics = vec3(0.0);'))
  assert.ok(rest.includes('outgoingLight = frostedInterior + frostedOptics;'))
  for (const material of [beauty, proxy]) {
    const u = logoFrostedUniforms(material), glass = logoGlassUniforms(material)
    for (const glow of [false, true]) {
      setFrostedGlowPass([material], glow)
      const reflections = read(shouldReflect, u.uFrostedGlowPass.value)
      const capture = reflections && read(shouldSample, glass.uGlassReady.value, u.uFrostedProxy.value)
      assert.equal(reflections, !glow)
      assert.equal(capture, !glow && material === beauty)
      for (const background of [0, 1, 1000]) {
        const inside = optics(1, thickness, 2, u.uFrostedGain.value).interior
        const result = inside + (reflections ? background : 0)
        assert.ok(inside > .1, 'settled glow retains real volume energy')
        if (glow) close(result, inside)
      }
    }
  }
  close(optics(1, thickness, 2, profile.reflectionGain).interior / optics(1, thickness).interior, .48)
  assert.ok(composite.includes('uFrostedGlowPass > .5 && cameraPosition.y > 0.0 && vFrostedWorld.y < 0.0'), 'the above-water halo cannot glow through the water surface')
})

await test('the fixed Frosted blur retains radiance and stays bounded at close camera distances', () => {
  const weights = [...pars.matchAll(/frostedSceneTap\([^;]*?\) \* ([.\d]+);/g)].map(match => Number(match[1]))
  assert.equal(weights.length, 13)
  close(weights.reduce((a, b) => a + b, 0), 1)
  for (const radiance of [0, .01, 1, 40]) close(weights.reduce((sum, w) => sum + radiance * w, 0), radiance)
  const blur = scalar(assignment('blur'), ['projectedThickness', 'frostedCap'])
  for (const cap of [0, .2, .5, 1]) {
    let prior = 0
    for (const projected of [0, 1, 10, 100, 1000, 1e6]) {
      const radius = read(blur, projected, cap)
      assert.ok(radius >= 1 && radius <= volume.maxBlur && radius >= prior)
      prior = radius
    }
  }
  assert.ok(read(blur, 50, 1) > read(blur, 50, 0))
  assert.ok(composite.includes(`vec2(-${volume.maxOffset}), vec2(${volume.maxOffset})`))
  assert.ok(pars.includes('clamp(uv, pixel * .5, vec2(1.0) - pixel * .5)'), 'all kernel samples stop inside the texture edge')
})

await test('Frosted pulse updates are isolated, continuous and restore the exact static reduced-motion state', t => {
  const beauty = source.clone(true), proxy = source.clone(true)
  createLogoMaterialVariants(beauty, thickness); createLogoMaterialVariants(proxy, thickness, true)
  t.after(() => { disposeLogoMaterialVariants(beauty); disposeLogoMaterialVariants(proxy) })
  const materials = [...logoVariantMaterials(beauty), ...logoVariantMaterials(proxy)]
  const frosted = materials.filter(material => logoFrostedUniforms(material))
  const other = materials.filter(material => !logoFrostedUniforms(material))
  const snapshot = material => JSON.stringify([material.toJSON(), logoLEDUniforms(material), logoChromeUniforms(material), logoGlassUniforms(material)])
  const before = other.map(snapshot)
  const refs = frosted.map(material => logoFrostedUniforms(material).uFrostedColor.value)
  const state = () => frosted.map(material => { const u = logoFrostedUniforms(material); return [u.uFrostedColor.value.toArray(), u.uFrostedIntensity.value, u.uFrostedGain.value] })
  updateFrostedLighting(materials, 0, 0)
  const still = state()
  for (const material of frosted) {
    const u = logoFrostedUniforms(material)
    assert.deepEqual(u.uFrostedColor.value.toArray(), profile.color)
    assert.equal(u.uFrostedIntensity.value, profile.intensity)
    assert.equal(u.uFrostedGain.value, u.uFrostedProxy.value ? .48 : 1)
  }
  const boundaries = [0, COLOR_WAVE.attack, COLOR_WAVE.peak, COLOR_WAVE.release, COLOR_WAVE.transition, 1]
  for (let cycle = 0; cycle < UNDERWATER_PALETTE.length * 2; cycle++) {
    for (const age of boundaries) {
      const time = .72 / COLOR_WAVE.speed + (cycle + age) * COLOR_WAVE.seconds
      updateFrostedLighting(materials, time - 1e-6, 1); const left = state()
      updateFrostedLighting(materials, time + 1e-6, 1); const right = state()
      for (let i = 0; i < frosted.length; i++) {
        left[i][0].forEach((value, channel) => close(value, right[i][0][channel], 1e-5))
        close(left[i][1], right[i][1], 1e-5)
        assert.ok(right[i][1] >= profile.intensity && right[i][1] <= profile.intensity * 1.12 + 1e-10)
        assert.equal(logoFrostedUniforms(frosted[i]).uFrostedColor.value, refs[i])
      }
    }
  }
  updateFrostedLighting(materials, 0, 0); assert.deepEqual(state(), still)
  updateFrostedLighting(materials, NaN, Infinity); assert.deepEqual(state(), still)
  updateFrostedLighting(materials, -4, -2); assert.deepEqual(state(), still)
  assert.deepEqual(other.map(snapshot), before, 'all approved styles, including clear-glass capture state, remain byte-identical')
})
