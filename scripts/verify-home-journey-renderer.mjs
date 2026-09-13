/** Real authored GLB and renderer-contract tests. These run without a browser
 * or WebGL context and do not verify the final GPU-rendered appearance. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import * as three from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import ts from 'typescript'

const repo = new URL('../', import.meta.url)
const modules = new Map()
async function moduleUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href)
  let source = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  } }).outputText
  const imports = ts.createSourceFile(url.pathname, source, ts.ScriptTarget.Latest, true)
    .statements.filter(ts.isImportDeclaration)
  for (const node of imports.reverse()) {
    const name = node.moduleSpecifier.text
    const replacement = name.startsWith('.')
      ? await moduleUrl(new URL(`${name}.ts`, url))
      : import.meta.resolve(name)
    source = source.slice(0, node.moduleSpecifier.getStart()) + JSON.stringify(replacement)
      + source.slice(node.moduleSpecifier.end)
  }
  const result = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  modules.set(url.href, result)
  return result
}

const { prepareJourneyModel, loadJourneyModel } = await import(await moduleUrl(
  new URL('src/components/HomeJourney/journeyModel.ts', repo)))
const { createJourneyWater } = await import(await moduleUrl(
  new URL('src/components/HomeJourney/journeyWater.ts', repo)))
const { createJourneyLaunchLight } = await import(await moduleUrl(
  new URL('src/components/HomeJourney/journeyLaunchLight.ts', repo)))
const { createLogoCrystalMaterial, logoGlassUniforms } = await import(await moduleUrl(
  new URL('src/components/experiments/water-hero/logoMaterial.ts', repo)))
const bytes = await readFile(new URL('public/models/ws_logo.glb', repo))
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)

async function authoredScene() {
  return (await new GLTFLoader().parseAsync(buffer.slice(0), '')).scene
}
const boundsOf = object => new three.Box3().setFromObject(object)
const reveal = (overrides = {}) => ({
  amount: 1, headerEdge: .18, findEdge: .52, makeEdge: .78, launchEdge: .94,
  drawingHeight: 1440, blueprintDraw: 1, shimmer: 0, leftTurn: 0, rightTurn: 0, partScale: 1,
  ...overrides,
})
const spinGlassMeshes = model => {
  const meshes = []
  model.rig.traverse(node => {
    if (node instanceof three.Mesh && node.name === 'HomepageJourney_SpinGlass') meshes.push(node)
  })
  return meshes
}
const compilePhysical = material => {
  const shader = { uniforms: {}, vertexShader: three.ShaderLib.physical.vertexShader,
    fragmentShader: three.ShaderLib.physical.fragmentShader }
  material.onBeforeCompile(shader, {})
  return shader
}
const opticalState = material => ({
  color: material.color.toArray(), metalness: material.metalness, roughness: material.roughness,
  ior: material.ior, specularIntensity: material.specularIntensity,
  iridescence: material.iridescence, iridescenceIOR: material.iridescenceIOR,
  iridescenceThicknessRange: [...material.iridescenceThicknessRange],
  transmission: material.transmission, clearcoat: material.clearcoat,
})

await test('authored logo is centered and upright without changing positions or normals', async () => {
  const scene = await authoredScene()
  const rawSize = boundsOf(scene).getSize(new three.Vector3())
  const records = []
  scene.traverse(node => {
    if (node instanceof three.Mesh) records.push({
      geometry: node.geometry,
      position: Array.from(node.geometry.attributes.position.array),
      normal: Array.from(node.geometry.attributes.normal.array),
    })
  })
  const model = prepareJourneyModel(scene)
  try {
    const bounds = boundsOf(model.rig)
    const size = bounds.getSize(new three.Vector3())
    assert.equal(records.length, 2)
    assert.ok(Math.abs(size.x - 1) < 1e-7)
    assert.ok(bounds.getCenter(new three.Vector3()).length() < 1e-7)
    assert.ok(Math.abs(size.y - rawSize.z / rawSize.x) < 1e-7)
    assert.ok(Math.abs(size.z - rawSize.y / rawSize.x) < 1e-7)
    for (const record of records) {
      assert.deepEqual(Array.from(record.geometry.attributes.position.array), record.position)
      assert.deepEqual(Array.from(record.geometry.attributes.normal.array), record.normal)
    }
  } finally { model.dispose() }
})

await test('both authored halves separate and reassemble exactly after opposite full turns', async () => {
  const model = prepareJourneyModel(await authoredScene())
  try {
    const baseline = boundsOf(model.rig)
    model.update(0, .1, .22, 0, 1, 3)
    assert.ok(Math.abs(boundsOf(model.rig).getSize(new three.Vector3()).x - 1.22) < 1e-7)
    model.update(.5, .3, .22, Math.PI, 1, 3.5)
    model.update(1, .4, 0, Math.PI * 2, 1, 4)
    const restored = boundsOf(model.rig)
    assert.ok(restored.min.distanceTo(baseline.min) < 1e-7)
    assert.ok(restored.max.distanceTo(baseline.max) < 1e-7)
  } finally { model.dispose() }
})

await test('chrome-to-crystal shader retains its cool seam and composes once before output', async () => {
  const model = prepareJourneyModel(await authoredScene())
  try {
    assert.equal(model.materials.length, 2)
    model.update(0, 0, 0, 0, 1, 0)
    const darkMetalness = model.materials[0].metalness
    model.update(1, .4, 0, Math.PI * 2, 1, 4)
    for (const material of model.materials) {
      assert.equal(material.userData.journeyCrystal.value, 1)
      assert.ok(material.metalness < darkMetalness)
      assert.equal(material.transmission, 0, 'no extra screen-transmission render pass')
      assert.ok(material.roughness >= .2 && material.roughness < .3)
      const shader = { uniforms: {}, vertexShader: three.ShaderLib.physical.vertexShader,
        fragmentShader: three.ShaderLib.physical.fragmentShader }
      material.onBeforeCompile(shader, {})
      assert.equal(shader.uniforms.uJourneyCrystal.value, 1)
      assert.ok(shader.uniforms.uChromeSeamColor.value.b > shader.uniforms.uChromeSeamColor.value.r)
      assert.equal((shader.fragmentShader.match(/uniform float uJourneyCrystal/g) || []).length, 1)
      assert.equal((shader.fragmentShader.match(/vec3 journeyCrystal =/g) || []).length, 1)
      const composite = shader.fragmentShader.indexOf('vec3 journeyCrystal =')
      assert.ok(shader.fragmentShader.indexOf('vec3 chromeSeam =') < composite)
      assert.ok(composite < shader.fragmentShader.indexOf('#include <opaque_fragment>'))
    }
  } finally { model.dispose() }
})

await test('services finish stays pale silver and restores every later material on reverse scroll', async () => {
  const model = prepareJourneyModel(await authoredScene())
  const materialState = material => ({
    color: material.color.toArray(), metalness: material.metalness,
    roughness: material.roughness, clearcoat: material.clearcoat,
    clearcoatRoughness: material.clearcoatRoughness,
    iridescence: material.iridescence, envMapIntensity: material.envMapIntensity,
    opacity: material.opacity, emissive: material.emissive.toArray(),
  })
  try {
    for (const finish of [0, .5, 1]) {
      model.update(finish, .4, 0, 0, 1, 4)
      const original = model.materials.map(materialState)
      model.update(0, 0, 0, 0, 1, 4, 1)
      for (const material of model.materials) {
        const { r, g, b } = material.color
        assert.ok(Math.min(r, g, b) > .7, 'services body is pale silver against the dark band')
        assert.ok(Math.max(r, g, b) - Math.min(r, g, b) < .12, 'services tint remains restrained')
        assert.ok(material.roughness > .3 && material.clearcoat < .1)
        const shader = { uniforms: {}, vertexShader: three.ShaderLib.physical.vertexShader,
          fragmentShader: three.ShaderLib.physical.fragmentShader }
        material.onBeforeCompile(shader, {})
        assert.equal(shader.uniforms.uJourneyServicesSurface.value, 1)
        assert.equal(shader.uniforms.uChromeSeamIntensity.value, 0, 'services cut has no white emission')
      }
      model.update(finish, .4, 0, 0, 1, 4, 0)
      assert.deepEqual(model.materials.map(materialState), original,
        'process, quiz and closing material values survive a round trip through services')
    }
  } finally { model.dispose() }
})

await test('Make uses the approved iridescent Glass optics on owned rounded copies of both GLB halves', async () => {
  const scene = await authoredScene()
  const originals = []
  scene.traverse(node => {
    if (node instanceof three.Mesh) originals.push({ mesh: node, geometry: node.geometry,
      positions: Array.from(node.geometry.attributes.position.array),
      normals: Array.from(node.geometry.attributes.normal.array) })
  })
  const model = prepareJourneyModel(scene)
  const source = new three.MeshStandardMaterial()
  const reference = createLogoCrystalMaterial(source, .1)
  const referenceUniforms = logoGlassUniforms(reference)
  const environment = new three.Texture()
  try {
    const glass = spinGlassMeshes(model)
    assert.equal(glass.length, 2)
    assert.equal(model.materials.length, 2, 'legacy material updates cannot overwrite the separate Glass optics')
    model.setEnvironment(environment)
    model.rig.scale.setScalar(2)
    model.update(.4, .2, .14, 0, 1, 4, 0,
      reveal({ leftTurn: Math.PI, rightTurn: -Math.PI, partScale: 1.12 }))
    model.rig.updateMatrixWorld(true)
    for (const mesh of glass) {
      const original = originals.find(record => record.mesh === mesh.parent)
      assert.ok(original, 'the rounded skin follows the actual authored half and its independent pivot')
      assert.notEqual(mesh.geometry, original.geometry)
      assert.ok(mesh.geometry.attributes.position.count > original.geometry.attributes.position.count,
        'the Glass layer owns the approved rounded shoulder geometry')
      assert.deepEqual(Array.from(original.geometry.attributes.position.array), original.positions)
      assert.deepEqual(Array.from(original.geometry.attributes.normal.array), original.normals)
      assert.deepEqual(opticalState(mesh.material), opticalState(reference),
        'Make uses the existing iridescent Glass profile rather than a silver approximation')
      assert.equal(mesh.material.envMap, environment)
      assert.equal(mesh.material.transparent, true, 'alpha supports a gradual retirement into the legacy skin')
      assert.equal(mesh.material.depthWrite, true,
        'full-opacity Glass must occlude its own concave walls and the other rotating half')
      assert.ok(mesh.renderOrder > mesh.parent.renderOrder, 'Glass composites after its original surface')
      const uniforms = logoGlassUniforms(mesh.material)
      for (const name of ['uGlassAbsorption', 'uGlassBodyFill']) {
        assert.deepEqual(uniforms[name].value.toArray(), referenceUniforms[name].value.toArray())
      }
      for (const name of ['uGlassCrystalProfile', 'uGlassDispersion', 'uGlassInternalReflection', 'uGlassRimStrength']) {
        assert.equal(uniforms[name].value, referenceUniforms[name].value)
      }
      assert.equal(uniforms.uGlassReady.value, 1)
      assert.ok(uniforms.uGlassScene.value instanceof three.DataTexture,
        'the transparent WebGL canvas must transmit the Make panel color instead of black')
      const position = original.geometry.attributes.position
      const depths = Array.from({ length: position.count }, (_, index) => position.getY(index))
      const expectedThickness = (Math.max(...depths) - Math.min(...depths))
        * mesh.getWorldScale(new three.Vector3()).y
      assert.ok(Math.abs(uniforms.uGlassWorldThickness.value - expectedThickness) < 1e-7,
        'optical thickness follows the real extrusion, display scale and independent part scale')
      const shader = compilePhysical(mesh.material)
      assert.equal((shader.fragmentShader.match(/vec3 crystalTransmission =/g) || []).length, 1)
      assert.equal((shader.fragmentShader.match(/float crystalFilmPosition =/g) || []).length, 1)
      assert.ok(shader.fragmentShader.includes('material.iridescence *= crystalFilmWeight;'))
      assert.ok(shader.fragmentShader.includes('isOrthographic ? vec3(0.0, 0.0, 1.0)'),
        'the hero Glass shader receives parallel rays in the journey camera')
      assert.ok(shader.fragmentShader.indexOf('vec3 crystalTransmission =')
        < shader.fragmentShader.indexOf('#include <opaque_fragment>'))
    }
  } finally { model.dispose(); reference.dispose(); source.dispose(); environment.dispose() }
})

await test('each half changes to Glass at its own first edge-on turn and reverses without affecting other skins', async () => {
  const model = prepareJourneyModel(await authoredScene())
  try {
    const glass = spinGlassMeshes(model)
    const left = glass.find(mesh => mesh.parent.name === 'WS_Left')
    const right = glass.find(mesh => mesh.parent.name === 'WS_Right')
    assert.ok(left && right)
    const resources = glass.map(mesh => [mesh.geometry, mesh.material, logoGlassUniforms(mesh.material).uGlassScene.value])
    const profiles = glass.map(mesh => opticalState(mesh.material))
    assert.ok(glass.every(mesh => !mesh.visible))
    const half = Math.PI / 2
    const samples = [
      [0, 0, 0, 0], [half - 1e-5, 0, 0, 0], [half, 0, 1, 0],
      [Math.PI, -half + 1e-5, 1, 0], [Math.PI, -half, 1, 1],
      [Math.PI * 2, -Math.PI * 2, 1, 1], [Math.PI, -half + 1e-5, 1, 0],
      [half - 1e-5, 0, 0, 0], [0, 0, 0, 0],
    ]
    for (const [leftTurn, rightTurn, leftOwned, rightOwned] of samples) {
      model.update(.4, .2, .14, 0, 1, 4, 0, reveal({ leftTurn, rightTurn }))
      for (const [mesh, expected] of [[left, leftOwned], [right, rightOwned]]) {
        assert.equal(mesh.material.userData.journeySpinGlass.value, expected)
        assert.equal(mesh.visible, Boolean(expected))
        assert.equal(mesh.parent.material.userData.journeySpinGlass,
          mesh.material.userData.journeySpinGlass, 'base and Glass share one per-half ownership value')
      }
      assert.notEqual(left.material.userData.journeySpinGlass, right.material.userData.journeySpinGlass,
        'one half must never borrow the other half’s turn state')
    }
    const activated = reveal({ leftTurn: Math.PI, rightTurn: -Math.PI })
    for (const stage of [reveal({ ...activated, makeEdge: 2 }),
      reveal({ ...activated, amount: 0 }), undefined]) {
      model.update(1, .12, 0, Math.PI * 2, 1, 5, 0, activated)
      model.update(1, .12, 0, Math.PI * 2, 1, 5, 0, stage)
      assert.ok(glass.every(mesh => !mesh.visible && mesh.material.userData.journeySpinGlass.value === 0),
        'services, blueprint, Find and legacy quiz/footer calls keep their original skin')
    }
    for (const launchEdge of [2, .8, .3, 0, -1, .3, .8, 2]) {
      model.update(1, .12, 0, Math.PI * 2, 1, 5, 0, { ...activated, launchEdge })
      assert.ok(glass.every(mesh => mesh.visible && mesh.material.userData.journeySpinGlass.value === 1),
        'the approved Glass finish survives the Launch wipe and its reverse until the sequence retires')
    }
    model.update(.4, .2, .14, 0, 0, 4, 0, activated)
    assert.ok(glass.every(mesh => !mesh.visible), 'a hidden model must also hide its replacement layers')
    model.update(.4, .2, .14, 0, .5, 4, 0, activated)
    assert.ok(glass.every(mesh => mesh.visible && mesh.material.opacity === .5))
    assert.deepEqual(glass.map(mesh => [mesh.geometry, mesh.material, logoGlassUniforms(mesh.material).uGlassScene.value]),
      resources, 'scrolling reuses the owned Glass resources instead of allocating replacements')
    assert.deepEqual(glass.map(mesh => opticalState(mesh.material)), profiles,
      'legacy finish updates cannot overwrite the Glass optical parameters')
  } finally { model.dispose() }
})

await test('Glass and the original skin retain complementary pixels from Make through the Launch wipe', async () => {
  const model = prepareJourneyModel(await authoredScene())
  try {
    model.update(.4, .2, .14, 0, 1, 4, 0,
      reveal({ makeEdge: .3, launchEdge: .8, leftTurn: Math.PI, rightTurn: -Math.PI }))
    for (const mesh of spinGlassMeshes(model)) {
      const glassShader = compilePhysical(mesh.material)
      const baseShader = compilePhysical(mesh.parent.material)
      for (const name of ['uJourneySpinGlass', 'uJourneySurfaceAmount', 'uJourneyMakeEdge',
        'uJourneyLaunchEdge', 'uJourneyDrawingHeight']) {
        assert.equal(glassShader.uniforms[name], baseShader.uniforms[name],
          `${name} changes atomically in the replacement and original surface`)
      }
      const expression = (shader, variable) => shader.fragmentShader
        .match(new RegExp(`float ${variable} = ([\\s\\S]+?);`))?.[1].replace(/\s+/g, ' ').trim()
      const glassMask = expression(glassShader, 'journeySpinGlassMask')
      const baseMask = expression(baseShader, 'journeyGlassOwnership')
      assert.ok(glassMask)
      assert.equal(glassMask, baseMask, 'both shaders evaluate precisely the same screen ownership mask')
      assert.match(glassShader.fragmentShader, /if \(journeySpinGlassMask <= \.5\) discard;/)
      assert.match(baseShader.fragmentShader, /if \(journeyGlassOwnership > \.5 && uJourneySurfaceAmount >= \.999\) discard;/,
        'the original skin yields fully during the process and becomes the underlay during retirement')
      // Evaluate the emitted arithmetic to catch a reversed Make mask or
      // an accidental Launch exclusion without claiming GPU verification.
      const evaluate = new Function('uJourneySpinGlass', 'uJourneySurfaceAmount',
        'uJourneyMakeEdge', 'uJourneyLaunchEdge', 'journeyPassedEdge', `return ${glassMask}`)
      for (const [y, expected] of [[.1, 0], [.5, 1], [.9, 1]]) {
        const passed = edge => {
          const feather = .5 / 1440
          const t = Math.max(0, Math.min(1, (y - edge + feather) / (2 * feather)))
          return t * t * (3 - 2 * t)
        }
        assert.equal(evaluate(1, 1, .3, .8, passed), expected,
          'Make reveals Glass and Launch retains that material instead of replacing it')
        assert.equal(evaluate(0, 1, .3, .8, passed), 0)
        assert.equal(evaluate(1, .5, .3, .8, passed), expected,
          'retirement fades material opacity instead of thresholding the whole Glass surface')
      }
    }
  } finally { model.dispose() }
})

await test('Glass retires gradually over the original skin and restores depth ownership on reverse scroll', async () => {
  const model = prepareJourneyModel(await authoredScene())
  try {
    const glass = spinGlassMeshes(model)
    const finished = reveal({ makeEdge: -1, launchEdge: -1,
      leftTurn: Math.PI * 2, rightTurn: -Math.PI * 2 })
    const guard = compilePhysical(glass[0].parent.material).fragmentShader
      .match(/if \((journeyGlassOwnership[^)]*)\) discard;/)?.[1]
    assert.ok(guard)
    const originalDiscarded = new Function('journeyGlassOwnership', 'uJourneySurfaceAmount', `return ${guard}`)
    for (const amount of [1, .75, .5001, .5, .4999, .25, 0, .25, .5, .75, 1]) {
      model.update(1, .12, 0, Math.PI * 2, 1, 10, 0, { ...finished, amount })
      for (const mesh of glass) {
        assert.equal(mesh.material.opacity, amount,
          'every intermediate scroll position has matching continuous Glass alpha')
        assert.equal(mesh.visible, amount > 0)
        assert.equal(mesh.material.depthWrite, amount >= .999,
          'Glass writes depth at full opacity and releases its underlay only during retirement')
        const ownership = mesh.parent.material.userData.journeySpinGlass.value
        assert.equal(originalDiscarded(ownership, amount), amount === 1,
          'the original surface is available beneath every partially faded Glass state')
        assert.equal(mesh.parent.material.depthWrite, amount === 0 || amount === 1,
          'only the active retirement disables the original bevel’s occluding depth write')
      }
    }
    model.update(0, .08, 0, 0, 1, 10, 1)
    assert.ok(glass.every(mesh => !mesh.visible && mesh.material.opacity === 0))
    assert.ok(model.materials.every(material => material.depthWrite),
      'returning to services restores the original rendering behavior')
  } finally { model.dispose() }
})

await test('Launch illuminates the same Glass with one continuous scroll-driven sweep across both halves', async () => {
  const scene = await authoredScene()
  scene.updateMatrixWorld(true)
  const commonPoint = new three.Vector3(.03, .01, -.02)
    .applyMatrix4(scene.getObjectByName('WS_Logo').matrixWorld)
  const localPoints = new Map()
  scene.traverse(node => {
    if (node instanceof three.Mesh) localPoints.set(node, node.worldToLocal(commonPoint.clone()))
  })
  const model = prepareJourneyModel(scene)
  try {
    const glass = spinGlassMeshes(model)
    const shaders = glass.map(mesh => compilePhysical(mesh.material))
    const coordinates = shaders.map((shader, index) => localPoints.get(glass[index].parent).clone()
      .applyMatrix4(shader.uniforms.uJourneyGlassFrame.value))
    assert.ok(coordinates[0].distanceTo(coordinates[1]) < 1e-8,
      'a point in the shared authored frame has identical sweep coordinates on either half')
    const css = await readFile(new URL('src/components/HomeJourney/HomeJourney.css', repo), 'utf8')
    const launchColor = css.match(/\.journey-process__panel--launch\s*\{[^}]*background:\s*(#[\da-f]+)/i)?.[1]
    assert.ok(launchColor)
    const smoothstep = (low, high, value) => {
      const t = Math.min(1, Math.max(0, (value - low) / (high - low)))
      return t * t * (3 - 2 * t)
    }
    const mix = (a, b, t) => a + (b - a) * t
    for (const shader of shaders) {
      assert.deepEqual(shader.uniforms.uJourneyLaunchBackground.value.toArray(), new three.Color(launchColor).toArray(),
        'Glass transmits the actual Launch panel color')
      assert.match(shader.vertexShader, /vJourneyGlassPlane = \(uJourneyGlassFrame \* vec4\(transformed, 1\.0\)\)\.xz/)
      assert.match(shader.fragmentShader, /float journeyLaunch = journeyPassedEdge\(uJourneyLaunchEdge\)/)
      assert.match(shader.fragmentShader, /outgoingLight \+= journeyLaunchLight \* journeyLaunch;/,
        'new lighting is limited to Launch pixels so the approved Make finish stays intact')
      const declaration = name => {
        const value = shader.fragmentShader.match(new RegExp(`float ${name} = ([\\s\\S]+?);`))?.[1]
        assert.ok(value, `missing ${name} shader declaration`)
        return value
      }
      const envelope = new Function('uJourneyShimmer', 'smoothstep', `return ${declaration('journeyLaunchEnvelope')}`)
      const travel = new Function('uJourneyShimmer', 'mix', `return ${declaration('journeyLaunchTravel')}`)
      const sweep = new Function('journeyLaunchCoordinate', 'journeyLaunchTravel', 'journeyLaunchEnvelope',
        'journeyLaunchFacing', 'exp', 'pow', `return ${declaration('journeyLaunchSweep')}`)
      assert.equal(envelope(0, smoothstep), 0, 'the sweep starts without a flash')
      assert.equal(envelope(1, smoothstep), 0, 'the sweep stops rather than looping after Launch')
      assert.ok(envelope(.5, smoothstep) > .5)
      assert.ok(travel(0, mix) < 0 && travel(1, mix) > 0, 'the light travels across the whole assembled mark')
      const center = travel(.5, mix), strength = envelope(.5, smoothstep)
      const peak = sweep(center, center, strength, 1, Math.exp, Math.pow)
      const shoulder = sweep(center + .1, center, strength, 1, Math.exp, Math.pow)
      assert.ok(shoulder > peak * .5 && shoulder < peak, 'the light has a broad softened shoulder, not a narrow flash')
    }
    const profile = glass.map(mesh => opticalState(mesh.material))
    for (const shimmer of [0, .25, .5, .75, 1, .75, .5, .25, 0]) {
      model.update(1, .12, 0, Math.PI * 2, 1, 20, 0,
        reveal({ makeEdge: -1, launchEdge: -.5, leftTurn: Math.PI * 2,
          rightTurn: -Math.PI * 2, shimmer }))
      for (const shader of shaders) {
        assert.equal(shader.uniforms.uJourneyShimmer.value, shimmer)
        assert.equal(shader.uniforms.uJourneyShimmer, shaders[0].uniforms.uJourneyShimmer)
        assert.equal(shader.uniforms.uJourneyLaunchEdge.value, -.5)
      }
      assert.ok(glass.every(mesh => mesh.visible))
      assert.deepEqual(glass.map(mesh => opticalState(mesh.material)), profile,
        'the shimmer changes illumination while retaining the approved Glass material')
    }
  } finally { model.dispose() }
})

await test('blueprint crease ink follows the real GLB with the same viewport boundaries as its faces', async () => {
  const model = prepareJourneyModel(await authoredScene())
  const lines = []
  model.rig.traverse(node => { if (node instanceof LineSegments2) lines.push(node) })
  try {
    assert.equal(lines.length, 2, 'each authored half has its own drafting layer')
    assert.ok(lines.every(line => !line.visible), 'ordinary services and footer rendering have no drafting overlay')
    const sample = reveal()
    model.update(0, .2, 0, 0, 1, 0, 0, sample)
    const compiled = []
    for (const material of model.materials) {
      const shader = { uniforms: {}, vertexShader: three.ShaderLib.physical.vertexShader,
        fragmentShader: three.ShaderLib.physical.fragmentShader }
      material.onBeforeCompile(shader, {})
      compiled.push(shader)
    }
    for (const line of lines) {
      assert.ok(line.parent instanceof three.Mesh, 'ink follows the half, rather than a second independent logo')
      assert.ok(line.visible)
      assert.equal(line.material.toneMapped, false, 'drafting ink keeps its dark contrast on white')
      assert.equal(line.material.depthTest, true, 'rear creases must stay hidden by the solid face')
      assert.equal(line.material.depthWrite, false)
      assert.equal(line.material.linewidth, 1.4, 'drafting ink must be stronger than a one-physical-pixel hairline')
      assert.equal(line.material.worldUnits, false, 'ink weight stays consistent as the model moves')
      line.onBeforeRender({ getViewport: target => target.set(0, 0, 1728, 960) })
      assert.deepEqual(line.material.resolution.toArray(), [1728, 960],
        'screen-space strokes use logical viewport pixels independently of drawing-buffer pixel ratio')
      assert.equal(sample.drawingHeight, 1440, 'the skin masks still use physical drawing pixels')
      const start = line.geometry.attributes.instanceStart
      const end = line.geometry.attributes.instanceEnd
      assert.ok(start.count > 0)
      const source = line.parent.geometry.attributes.position
      const front = Math.max(...Array.from({ length: source.count }, (_, i) => source.getY(i)))
      const rimVertices = new Map()
      let frontSegments = 0
      for (let i = 0; i < start.count; i++) {
        if (Math.abs(start.getY(i) - front) > 1e-6
          || Math.abs(end.getY(i) - front) > 1e-6) continue
        frontSegments++
        for (const point of [start, end]) {
          const key = `${point.getX(i).toFixed(6)},${point.getZ(i).toFixed(6)}`
          rimVertices.set(key, (rimVertices.get(key) ?? 0) + 1)
        }
      }
      assert.equal(frontSegments, line.parent.name === 'WS_Left' ? 11 : 4,
        'the shallow authored bevel must not erase any front-cap contour segment')
      assert.ok([...rimVertices.values()].every(degree => degree === 2),
        'each visible cap has a complete closed ink outline, not isolated corner specks')
      const triangles = new three.WireframeGeometry(line.parent.geometry)
      try {
        assert.ok(start.count * 2 < triangles.attributes.position.count,
          'drafting uses contour and crease edges, not every triangle diagonal')
      } finally { triangles.dispose() }
      const shader = { uniforms: {}, vertexShader: line.material.vertexShader,
        fragmentShader: line.material.fragmentShader }
      line.material.onBeforeCompile(shader, {})
      assert.ok(shader.vertexShader.includes('gl_Position.z -= .00004 * gl_Position.w;'))
      assert.ok(shader.fragmentShader.includes('gl_FragColor.a *= journeyInk;'))
      compiled.push(shader)
    }
    for (const [name, value] of Object.entries({
      uJourneySurfaceAmount: sample.amount, uJourneyHeaderEdge: sample.headerEdge,
      uJourneyFindEdge: sample.findEdge, uJourneyMakeEdge: sample.makeEdge,
      uJourneyLaunchEdge: sample.launchEdge, uJourneyDrawingHeight: sample.drawingHeight,
      uJourneyBlueprintDraw: sample.blueprintDraw,
    })) {
      for (const shader of compiled) {
        assert.equal(shader.uniforms[name].value, value)
        assert.equal(shader.uniforms[name], compiled[0].uniforms[name],
          `${name} must update both faces and both ink layers atomically`)
      }
    }
    model.update(1, .12, 0, Math.PI * 2, 1, 1, 0)
    assert.ok(lines.every(line => !line.visible), 'leaving the panel sequence removes all drafting ink')
    for (const shader of compiled) assert.equal(shader.uniforms.uJourneySurfaceAmount.value, 0)
    model.update(0, .2, 0, 0, 0, 1, 0, sample)
    assert.ok(lines.every(line => !line.visible), 'hidden logo state hides its extra resources too')
  } finally { model.dispose() }
})

await test('blueprint trace follows complete connected GLB cap perimeters at a consistent drawing speed', async () => {
  const model = prepareJourneyModel(await authoredScene())
  const lines = []
  model.rig.traverse(node => { if (node instanceof LineSegments2) lines.push(node) })
  try {
    for (const line of lines) {
      const attributes = line.geometry.attributes
      const start = attributes.instanceStart, end = attributes.instanceEnd
      const traceStart = attributes.instanceTraceStart, traceEnd = attributes.instanceTraceEnd
      const path = attributes.instanceTracePath
      assert.ok(traceStart && traceEnd && path, 'every real contour segment carries its drawing interval and path')
      assert.equal(traceStart.count, start.count)
      assert.equal(traceEnd.count, start.count)
      assert.equal(path.count, start.count)
      const source = line.parent.geometry.attributes.position
      const depths = Array.from({ length: source.count }, (_, i) => source.getY(i))
      const capPaths = []
      for (const depth of [Math.min(...depths), Math.max(...depths)]) {
        const cap = []
        for (let i = 0; i < start.count; i++) {
          const from = traceStart.getX(i), to = traceEnd.getX(i)
          assert.ok(Number.isFinite(from) && Number.isFinite(to) && from >= 0 && to <= 1 && from <= to)
          assert.ok(Number.isInteger(path.getX(i)))
          if (Math.abs(start.getY(i) - depth) > 1e-6 || Math.abs(end.getY(i) - depth) > 1e-6) continue
          cap.push({ from, to, path: path.getX(i),
            start: new three.Vector3().fromBufferAttribute(start, i),
            end: new three.Vector3().fromBufferAttribute(end, i) })
        }
        cap.sort((a, b) => a.from - b.from)
        assert.equal(cap.length, line.parent.name === 'WS_Left' ? 11 : 4)
        assert.equal(new Set(cap.map(segment => segment.path)).size, 1, 'each cap is one continuous pen path')
        capPaths.push(cap[0].path)
        assert.ok(Math.abs(cap[0].from) < 1e-7)
        assert.ok(Math.abs(cap.at(-1).to - 1) < 1e-7)
        const perimeter = cap.reduce((sum, segment) => sum + segment.start.distanceTo(segment.end), 0)
        for (let i = 0; i < cap.length; i++) {
          const segment = cap[i], next = cap[(i + 1) % cap.length]
          assert.ok(segment.end.distanceTo(next.start) < 1e-6,
            'successive trace segments must join on the real logo boundary')
          if (i + 1 < cap.length) assert.ok(Math.abs(segment.to - next.from) < 1e-6,
            'the tracing pen never jumps or leaves a gap between intervals')
          assert.ok(Math.abs((segment.to - segment.from)
            - segment.start.distanceTo(segment.end) / perimeter) < 1e-5,
          'long and short contour segments use their physical length, avoiding sudden pen-speed changes')
        }
      }
      assert.notEqual(capPaths[0], capPaths[1], 'front and rear outlines each have their own complete path')
    }
  } finally { model.dispose() }
})

await test('blueprint drawing starts disabled and shares reversible clamped progress without changing the white-face wipe', async () => {
  const model = prepareJourneyModel(await authoredScene())
  const lines = []
  model.rig.traverse(node => { if (node instanceof LineSegments2) lines.push(node) })
  try {
    assert.equal(model.materials[0].userData.journeySurface.uJourneyBlueprintDraw.value, 0,
      'preparing the logo cannot show its contours before the header has cleared')
    const compiled = [...model.materials, ...lines.map(line => line.material)].map(material => {
      const isInk = material instanceof three.ShaderMaterial
      const shader = { uniforms: {},
        vertexShader: isInk ? material.vertexShader : three.ShaderLib.physical.vertexShader,
        fragmentShader: isInk ? material.fragmentShader : three.ShaderLib.physical.fragmentShader }
      material.onBeforeCompile(shader, {})
      return shader
    })
    for (const [input, expected] of [[0, 0], [.25, .25], [.5, .5], [1, 1], [.5, .5], [0, 0],
      [-1, 0], [3, 1], [NaN, 0], [Infinity, 0]]) {
      model.update(0, .2, 0, 0, 1, 4, 1, reveal({ blueprintDraw: input, headerEdge: .41 }))
      for (const shader of compiled) {
        assert.equal(shader.uniforms.uJourneyBlueprintDraw.value, expected)
        assert.equal(shader.uniforms.uJourneyBlueprintDraw, compiled[0].uniforms.uJourneyBlueprintDraw,
          'one draw progress must reach both halves and their white-face materials atomically')
        assert.equal(shader.uniforms.uJourneyHeaderEdge.value, .41,
          'the drawing phase does not move the physical dark-to-white surface boundary')
      }
    }
    model.update(0, .2, 0, 0, 1, 4)
    for (const shader of compiled) assert.equal(shader.uniforms.uJourneyBlueprintDraw.value, 0,
      'legacy calls reset the new drawing phase instead of retaining a previous trace')
  } finally { model.dispose() }
})

await test('independent part turns and scale reverse precisely without altering authored geometry', async () => {
  const model = prepareJourneyModel(await authoredScene())
  const pivots = [], meshes = []
  model.rig.traverse(node => {
    if (node.name.endsWith('_JourneyPivot')) pivots.push(node)
    if (node instanceof three.Mesh && ['WS_Left', 'WS_Right'].includes(node.name)) meshes.push(node)
  })
  const records = meshes.map(mesh => ({ mesh, positions: Array.from(mesh.geometry.attributes.position.array),
    normals: Array.from(mesh.geometry.attributes.normal.array) }))
  const snapshot = () => pivots.map(pivot => ({ position: pivot.position.toArray(),
    quaternion: pivot.quaternion.toArray(), scale: pivot.scale.toArray() }))
  try {
    assert.equal(pivots.length, 2)
    assert.equal(records.length, 2, 'geometry records refer to the authored GLB halves')
    model.update(0, .2, 0, 0, 1, 0)
    const baseline = snapshot()
    const rest = boundsOf(model.rig)
    const changing = reveal({ leftTurn: Math.PI, rightTurn: -Math.PI * .4, partScale: 1.12 })
    model.update(.4, .2, .14, 0, 1, 2, 0, changing)
    const midway = snapshot()
    assert.ok(pivots.some(pivot => Math.abs(pivot.rotation.z + changing.leftTurn) < 1e-8))
    assert.ok(pivots.some(pivot => Math.abs(pivot.rotation.z + changing.rightTurn) < 1e-8))
    for (const pivot of pivots) assert.deepEqual(pivot.scale.toArray(), [1.12, 1.12, 1.12])
    model.update(1, .12, 0, 0, 1, 3, 0,
      reveal({ leftTurn: Math.PI * 2, rightTurn: -Math.PI * 2, shimmer: .5 }))
    const assembled = boundsOf(model.rig)
    assert.ok(assembled.min.distanceTo(rest.min) < 1e-7)
    assert.ok(assembled.max.distanceTo(rest.max) < 1e-7)
    for (const material of model.materials) assert.equal(material.userData.journeySurface.uJourneyShimmer.value, .5)
    model.update(.4, .2, .14, 0, 1, 4, 0, changing)
    assert.deepEqual(snapshot(), midway, 'reverse scrolling reconstructs the same independent intermediate pose')
    model.update(0, .2, 0, 0, 1, 5)
    assert.deepEqual(snapshot(), baseline, 'returning to services resets part scale and rotation exactly')
    for (const { mesh, positions, normals } of records) {
      assert.deepEqual(Array.from(mesh.geometry.attributes.position.array), positions)
      assert.deepEqual(Array.from(mesh.geometry.attributes.normal.array), normals)
    }
  } finally { model.dispose() }
})

await test('finished process assembly does not make extra turns while its skin fades into the quiz', async () => {
  const model = prepareJourneyModel(await authoredScene())
  const pivots = []
  model.rig.traverse(node => { if (node.name.endsWith('_JourneyPivot')) pivots.push(node) })
  try {
    const finished = reveal({ leftTurn: Math.PI * 2, rightTurn: -Math.PI * 2 })
    model.update(1, .12, 0, Math.PI * 2, 1, 4, 0, finished)
    const settled = pivots.map(pivot => pivot.quaternion.clone())
    const settledBounds = boundsOf(model.rig)
    for (const amount of [1, .75, .5, .25, .001, 0, .001, .25, .5, .75, 1]) {
      model.update(1, .12, 0, Math.PI * 2, 1, 4, 0, { ...finished, amount })
      for (let i = 0; i < pivots.length; i++) {
        assert.ok(pivots[i].quaternion.angleTo(settled[i]) < 1e-7,
          `equivalent +2pi/-2pi poses must not spin during material fade (${amount})`)
      }
      const bounds = boundsOf(model.rig)
      assert.ok(bounds.min.distanceTo(settledBounds.min) < 1e-7)
      assert.ok(bounds.max.distanceTo(settledBounds.max) < 1e-7)
    }
    model.update(1, .12, 0, Math.PI * 2, 1, 4)
    assert.equal(pivots[0].rotation.z, Math.PI * 2, 'legacy seven-argument rotation is retained')
    assert.equal(pivots[1].rotation.z, -Math.PI * 2)
  } finally { model.dispose() }
})

await test('private logo geometry and materials dispose once without disposing the shared environment', async () => {
  const model = prepareJourneyModel(await authoredScene())
  const geometries = new Map(), materials = new Map(), backgrounds = new Map()
  let environmentCount = 0
  const environment = new three.Texture()
  environment.addEventListener('dispose', () => { environmentCount++ })
  model.setEnvironment(environment)
  for (const mesh of spinGlassMeshes(model)) {
    assert.equal(mesh.material.envMap, environment)
    backgrounds.set(logoGlassUniforms(mesh.material).uGlassScene.value, 0)
  }
  assert.equal(backgrounds.size, 2, 'each private Glass half owns its transmitted panel texture')
  model.rig.traverse(node => {
    if (node.geometry instanceof three.BufferGeometry) geometries.set(node.geometry, 0)
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material instanceof three.Material) materials.set(material, 0)
    }
  })
  for (const resource of geometries.keys()) resource.addEventListener('dispose', () => {
    geometries.set(resource, geometries.get(resource) + 1)
  })
  for (const resource of materials.keys()) resource.addEventListener('dispose', () => {
    materials.set(resource, materials.get(resource) + 1)
  })
  for (const resource of backgrounds.keys()) resource.addEventListener('dispose', () => {
    backgrounds.set(resource, backgrounds.get(resource) + 1)
  })
  assert.ok(geometries.size >= 2, 'both authored halves own geometry')
  assert.ok(materials.size >= 2, 'both authored halves own their presentation material')
  model.dispose()
  model.dispose()
  for (const [resource, count] of geometries) assert.equal(count, 1, `${resource.type} disposes exactly once`)
  for (const [resource, count] of materials) assert.equal(count, 1, `${resource.name || resource.type} disposes exactly once`)
  for (const [resource, count] of backgrounds) assert.equal(count, 1, `${resource.name} disposes exactly once`)
  assert.equal(environmentCount, 0)
  assert.equal(model.rig.children.length, 0)
  environment.dispose()
})

await test('a later malformed GLB half releases the first half’s uniform-held Glass texture', async () => {
  const scene = await authoredScene()
  const authored = []
  scene.traverse(node => { if (node instanceof three.Mesh) authored.push(node) })
  assert.equal(authored.length, 2)
  const positions = authored[1].geometry.attributes.position
  for (let index = 0; index < positions.count; index++) positions.setY(index, 0)
  authored[1].geometry.computeBoundingBox()
  const descriptor = Object.getOwnPropertyDescriptor(three.DataTexture.prototype, 'dispose')
  const originalDispose = three.DataTexture.prototype.dispose
  const disposed = new Map()
  three.DataTexture.prototype.dispose = function () {
    if (this.name === 'HomepageJourney_MakeGlassBackground') {
      disposed.set(this, (disposed.get(this) ?? 0) + 1)
    }
    return originalDispose.call(this)
  }
  try {
    assert.throws(() => prepareJourneyModel(scene), /glass|contour|extrusion|outline|close/i)
    assert.equal(disposed.size, 1, 'the valid first half created a private background before the second failed')
    assert.deepEqual([...disposed.values()], [1], 'the detached texture is released exactly once on failure')
    const remaining = []
    scene.traverse(node => { if (node.name === 'HomepageJourney_SpinGlass') remaining.push(node) })
    assert.equal(remaining.length, 0, 'failed replacement meshes cannot remain attached with disposed resources')
  } finally {
    if (descriptor) Object.defineProperty(three.DataTexture.prototype, 'dispose', descriptor)
    else delete three.DataTexture.prototype.dispose
    const resources = new Set()
    scene.traverse(node => {
      if (node.geometry) resources.add(node.geometry)
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (material) resources.add(material)
      }
    })
    resources.forEach(resource => resource.dispose())
  }
})

await test('a cancelled logo load never starts a request', async () => {
  const previousFetch = globalThis.fetch
  const controller = new AbortController()
  controller.abort()
  let requests = 0
  globalThis.fetch = async () => {
    requests++
    return { ok: true, arrayBuffer: async () => buffer }
  }
  try {
    await assert.rejects(loadJourneyModel(controller.signal), error => error.name === 'AbortError')
    assert.equal(requests, 0)
  } finally { globalThis.fetch = previousFetch }
})

await test('Launch backlight follows the growing logo, shares its panel boundary, and releases its resources once', () => {
  const light = createJourneyLaunchLight()
  const { mesh } = light
  const geometry = mesh.geometry, material = mesh.material
  let geometryDisposals = 0, materialDisposals = 0
  geometry.addEventListener('dispose', () => { geometryDisposals++ })
  material.addEventListener('dispose', () => { materialDisposals++ })
  const state = { centerX: .6, centerY: -.15, logoWidth: .4, visible: .8,
    launchEdge: .7, launchBottom: 1, drawingHeight: 1440, shimmer: 0 }
  try {
    assert.equal(mesh.visible, false)
    light.update(state)
    assert.equal(mesh.visible, true)
    assert.deepEqual(mesh.position.toArray().slice(0, 2), [state.centerX, state.centerY])
    assert.ok(mesh.position.z < 0 && mesh.renderOrder < 0, 'backlight remains behind the logo')
    assert.equal(material.depthWrite, false, 'the halo cannot hide either GLB half')
    assert.equal(material.depthTest, true)
    const initialSize = mesh.scale.clone()
    for (const factor of [1.09, 1.18, 1.09, 1]) {
      light.update({ ...state, centerX: .4, centerY: .1, logoWidth: state.logoWidth * factor })
      assert.ok(Math.abs(mesh.scale.x / initialSize.x - factor) < 1e-8)
      assert.ok(Math.abs(mesh.scale.y / initialSize.y - factor) < 1e-8)
      assert.deepEqual(mesh.position.toArray().slice(0, 2), [.4, .1])
    }
    for (const progress of [0, .25, .5, .75, 1, .75, .5, .25, 0]) {
      light.update({ ...state, shimmer: progress, launchEdge: .9 - progress, launchBottom: 1 - progress * .2 })
      assert.equal(material.uniforms.uShimmer.value, progress)
      assert.equal(material.uniforms.uLaunchEdge.value, .9 - progress)
      assert.equal(material.uniforms.uLaunchBottom.value, 1 - progress * .2)
      assert.equal(material.uniforms.uDrawingHeight.value, state.drawingHeight)
      assert.equal(material.uniforms.uVisible.value, state.visible)
    }
    assert.match(material.fragmentShader, /1\.0 - gl_FragCoord\.y \/ uDrawingHeight/,
      'the light uses the same top-origin physical-pixel coordinates as the logo wipe')
    assert.match(material.fragmentShader, /smoothstep\(uLaunchEdge - feather, uLaunchEdge \+ feather, canvasY\)/)
    assert.match(material.fragmentShader, /1\.0 - smoothstep\(uLaunchBottom - feather, uLaunchBottom \+ feather, canvasY\)/,
      'the light stops at the moving bottom of the Launch panel as the quiz enters')
    assert.match(material.fragmentShader, /falloff \* panel \* uVisible/,
      'the halo cannot illuminate a panel before Launch passes that pixel')
    light.update({ ...state, visible: 0 })
    assert.equal(mesh.visible, false)
    assert.equal(mesh.geometry, geometry)
    assert.equal(mesh.material, material)
    light.update(state)
    assert.equal(mesh.visible, true, 'reverse scrolling can restore the same light resources')
  } finally { light.dispose(); light.dispose() }
  assert.equal(geometryDisposals, 1)
  assert.equal(materialDisposals, 1)
  assert.equal(mesh.visible, false)
  light.update(state)
  assert.equal(mesh.visible, false, 'disposed lighting cannot remount from a late animation frame')
})

function waterHarness() {
  const water = createJourneyWater()
  const previousTarget = { name: 'existing-render-target' }
  const originalColor = new three.Color(.2, .3, .4)
  let currentTarget = previousTarget, renders = 0, clears = 0
  const renderer = {
    toneMapping: three.ACESFilmicToneMapping, alpha: .3, color: originalColor.clone(), fail: false,
    getRenderTarget: () => currentTarget,
    setRenderTarget(value) { currentTarget = value },
    getClearAlpha() { return this.alpha },
    getClearColor(value) { return value.copy(this.color) },
    setClearColor(value, alpha) { this.color.set(value); this.alpha = alpha },
    clear() { clears++ },
    render() {
      renders++
      assert.equal(water.mesh.visible, false, 'the reflection never captures itself')
      assert.equal(this.toneMapping, three.NoToneMapping, 'capture stays linear until final output')
      if (this.fail) throw Error('mock capture failure')
    },
  }
  return {
    water, renderer,
    update(amount = 1, dawn) { water.update(renderer, {}, {}, 1920, 1080, .3, amount, 2, dawn) },
    assertRestored() {
      assert.equal(currentTarget, previousTarget)
      assert.equal(renderer.toneMapping, three.ACESFilmicToneMapping)
      assert.equal(renderer.alpha, .3)
      assert.equal(renderer.color.getHex(), originalColor.getHex())
    },
    counts: () => ({ renders, clears }),
  }
}

await test('water skips inactive capture and caps its reflection texture while restoring renderer state', () => {
  const h = waterHarness()
  try {
    h.update(0)
    assert.deepEqual(h.counts(), { renders: 0, clears: 0 })
    h.update(1)
    assert.deepEqual(h.counts(), { renders: 1, clears: 1 })
    const uniforms = h.water.mesh.material.uniforms
    assert.equal(uniforms.uLogo.value.image.width, 1024)
    assert.equal(uniforms.uLogo.value.image.height, 576)
    assert.equal(uniforms.uBase.value, .3, 'reflection follows the measured logo base')
    assert.equal(h.water.mesh.visible, true)
    h.assertRestored()
  } finally { h.water.dispose() }
})

await test('the dawn belongs to the closing section and shares the mark\'s own waterline', () => {
  const h = waterHarness()
  try {
    const uniforms = h.water.mesh.material.uniforms
    // Horizon, the mark's feet and the reflected column are the same line by
    // construction: there is only one base, and the shader derives all three
    // from it. Nothing has to be aligned by hand at any viewport size.
    h.update(1)
    assert.equal(uniforms.uBase.value, .3)
    assert.match(h.water.mesh.material.fragmentShader, /uBase - vUv\.y/)
    assert.equal(uniforms.uSection.value, -1,
      'an unsupplied boundary leaves the whole canvas available, as before')

    // The canvas spans the whole journey, so without this boundary the dawn
    // would paint over the quiz chapter sitting above the closing section.
    h.update(1, { sectionEdge: .42 })
    assert.equal(uniforms.uSection.value, .42)
    h.update(1, { sectionEdge: NaN })
    assert.equal(uniforms.uSection.value, -1, 'a broken boundary never masks the wrong band')

    // The sun is a place in the frame, not something that travels: anchoring
    // it to the moving mark slid it in from the right across the handoff.
    const fixed = uniforms.uSunX.value
    h.update(.4, { sectionEdge: .2 })
    h.update(1, { sectionEdge: -.5 })
    assert.equal(uniforms.uSunX.value, fixed, 'the sun never moves')
    assert.ok(fixed > 0 && fixed < 1, 'and sits inside the frame')

    // The dawn runs on its own ramp so it is at full strength for most of the
    // handoff rather than fading up across all of it.
    h.update(1, { amount: .5 })
    assert.equal(uniforms.uDawn.value, .5)
    h.update(1, { amount: 4 })
    assert.equal(uniforms.uDawn.value, 1, 'and never overdrives')
    h.update(1, { amount: NaN })
    assert.equal(uniforms.uDawn.value, 1)

    // Clamping the colour alongside the coverage crushed the sun's core,
    // which is exactly where the most terms overlap.
    const shader = h.water.mesh.material.fragmentShader
    assert.doesNotMatch(shader, /color \* ceiling/,
      'premultiplied colour is allowed past its own coverage')

    // The surface is built in ground distance derived from screen depth, not
    // in screen space. That perspective is what makes the wave field compress
    // toward the horizon instead of banding the screen into stripes.
    assert.match(shader, /ground = \.075 \/ max\(depth/, 'screen depth becomes ground distance')
    assert.match(shader, /journeySwell\(lateral, ground/, 'and the swell is built in it')
    assert.match(shader, /detail = 1\.0 \/ \(1\.0 \+ ground \* ground/,
      'detail dies before the horizon, where a pixel covers unbounded ground')
    assert.match(shader, /vUv\.x \+ slope \*/,
      'the reflection is displaced by the surface it lies on, not by a ripple of its own')
    assert.doesNotMatch(shader, /farFog|nearFog/,
      'the screen-space bands that read as stripes are gone')

    // The sky is graded against the /contact sunset beside it: both stops sit
    // below the section's own ink, which is what makes raising the sky's
    // coverage darken the upper frame instead of lifting it. Get this
    // backwards and the section reads as a pale wash with a glow in it.
    const stop = name => {
      const found = shader.match(new RegExp(`${name} = vec3\\(([^)]+)\\)`))
      assert.ok(found, `${name} is defined`)
      return found[1].split(',').map(Number)
    }
    const luminance = ([r, g, b]) => .2126 * r + .7152 * g + .0722 * b
    const ink = [8 / 255, 13 / 255, 18 / 255]
    for (const name of ['SKY_TOP', 'SKY_LOW']) {
      assert.ok(luminance(stop(name)) < luminance(ink),
        `${name} is darker than the ink it composites over`)
    }
    assert.ok(luminance(stop('SKY_TOP')) < luminance(stop('SKY_LOW')),
      'and the sky darkens with height rather than brightening')
    assert.ok(luminance(stop('WATER_DEEP')) < luminance(stop('SKY_TOP')),
      'the water body is the darkest thing in the frame')

    // The sun stands under the enquiry card so the card's glass carries real
    // light, which means it cannot also stand where the mark does.
    assert.ok(uniforms.uSunX.value > .55 && uniforms.uSunX.value < .92,
      'the sun sits inside the enquiry column, not on the mark')

    assert.equal(h.water.mesh.material.premultipliedAlpha, true,
      'every term is accumulated against its own coverage')
    assert.equal(h.water.mesh.material.depthWrite, false)
    assert.ok(h.water.mesh.renderOrder < 0, 'the dawn sits behind the mark standing in it')
    h.assertRestored()
  } finally { h.water.dispose() }
})

await test('water restores the prior render target, tone mapping and clear color if capture fails', () => {
  const h = waterHarness()
  try {
    h.renderer.fail = true
    assert.throws(() => h.update(1), /mock capture failure/)
    h.assertRestored()
    assert.equal(h.water.mesh.visible, true)
  } finally { h.water.dispose() }
})
