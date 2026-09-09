/** Authored-geometry and shader-wiring regressions; no browser/GPU rendering. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Box3, FrontSide, Matrix3, Matrix4, MeshPhysicalMaterial, ShaderLib, Texture, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ts from 'typescript'

async function sourceModule(path, replacements = []) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8')
  for (const [from, to] of replacements) source = source.replace(from, to)
  const javascript = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  } }).outputText.replace("from 'three'", `from '${import.meta.resolve('three')}'`)
  return `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
}
const base = '../src/components/experiments/water-hero/'
const configUrl = await sourceModule(`${base}waterHeroConfig.ts`)
const colorUrl = await sourceModule(`${base}shaders/underwaterColor.ts`)
const shaderUrl = await sourceModule(`${base}shaders/logoGlass.ts`)
const ledUrl = await sourceModule(`${base}shaders/logoLED.ts`)
const { LOGO_MATERIAL, WS_LOGO_URL } = await import(configUrl)
const { createLogoGlassMaterial, logoGlassUniforms, bindGlassScene } = await import(await sourceModule(`${base}logoMaterial.ts`, [
  ["from './waterHeroConfig'", `from '${configUrl}'`],
  ["from './shaders/underwaterColor'", `from '${colorUrl}'`],
  ["from './shaders/logoGlass'", `from '${shaderUrl}'`],
  ["from './shaders/logoLED'", `from '${ledUrl}'`],
]))
const bytes = await readFile(new URL(`../public${WS_LOGO_URL}`, import.meta.url))
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
scene.updateMatrixWorld(true)
const meshes = []
scene.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh) })
const bounds = new Box3().setFromObject(scene), size = bounds.getSize(new Vector3())
const thickness = size.y * 2 / size.x
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const bevel = deviation => smooth(.005, .030, deviation) * (1 - smooth(.18, .45, deviation))

await test('the material retains physical IOR and specular defines after copying the standard GLB material', () => {
  const source = meshes[0].material, originalColor = source.color.toArray()
  const material = createLogoGlassMaterial(source, thickness)
  assert.ok(material instanceof MeshPhysicalMaterial)
  assert.ok(Object.hasOwn(material.defines, 'PHYSICAL'), 'standard copy must not erase the PHYSICAL define')
  assert.equal(material.ior, LOGO_MATERIAL.ior)
  assert.equal(material.metalness, 0)
  assert.equal(material.transmission, 0, 'transparent particles come from the owned capture, not native opaque-only transmission')
  assert.equal(material.side, FrontSide)
  assert.equal(material.transparent, false)
  assert.equal(material.depthWrite, true)
  assert.equal(material.clearcoat, 0, 'composite preserves the base physical specular BRDF')
  for (const key of ['map', 'normalMap', 'roughnessMap', 'bumpMap']) assert.equal(material[key], null)
  assert.deepEqual(source.color.toArray(), originalColor)
  assert.notEqual(material.color, source.color)
  material.dispose()
})

await test('actual physical shader wiring keeps transmission before tone mapping and independent proxy uniforms', () => {
  const real = createLogoGlassMaterial(meshes[0].material, thickness)
  const proxy = createLogoGlassMaterial(meshes[0].material, thickness)
  const realUniforms = logoGlassUniforms(real), proxyUniforms = logoGlassUniforms(proxy)
  const texture = new Texture()
  bindGlassScene([real], texture, 1024, 576)
  assert.equal(realUniforms.uGlassReady.value, 1)
  assert.equal(realUniforms.uGlassScene.value, texture)
  assert.deepEqual(realUniforms.uGlassResolution.value.toArray(), [1024, 576])
  assert.equal(proxyUniforms.uGlassReady.value, 0, 'reflection proxy cannot sample beauty-camera coordinates')
  assert.equal(proxyUniforms.uGlassScene.value, null)
  const shader = { vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader, uniforms: {} }
  real.onBeforeCompile(shader, {})
  for (const [key, value] of Object.entries(realUniforms)) assert.equal(shader.uniforms[key], value)
  assert.ok(shader.vertexShader.indexOf('vGlassBevel =') > shader.vertexShader.indexOf('#include <beginnormal_vertex>'))
  assert.ok(shader.vertexShader.indexOf('vGlassClip =') > shader.vertexShader.indexOf('#include <project_vertex>'))
  const composite = shader.fragmentShader.indexOf('outgoingLight = totalSpecular + glassBody + glassRim')
  assert.ok(composite > shader.fragmentShader.indexOf('vec3 totalSpecular ='))
  assert.ok(composite < shader.fragmentShader.indexOf('#include <opaque_fragment>'))
  assert.ok(composite < shader.fragmentShader.indexOf('#include <tonemapping_fragment>'))
  bindGlassScene([real], null)
  assert.equal(realUniforms.uGlassReady.value, 0)
  assert.deepEqual(realUniforms.uGlassResolution.value.toArray(), [1, 1])
  real.dispose(); proxy.dispose(); texture.dispose()
})

await test('authored bevel illumination occupies a narrow area and excludes the front planes and deep walls', t => {
  const a = new Vector3(), b = new Vector3(), c = new Vector3()
  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position, normal = mesh.geometry.attributes.normal, indices = mesh.geometry.index
    let area = 0, litArea = 0, flatArea = 0, wallArea = 0
    for (let i = 0; i < indices.count; i += 3) {
      const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)]
      a.fromBufferAttribute(position, ids[0]); b.fromBufferAttribute(position, ids[1]); c.fromBufferAttribute(position, ids[2])
      const triangleArea = b.sub(a).cross(c.sub(a)).length() * .5
      const deviations = ids.map(id => 1 - Math.abs(normal.getY(id)))
      const centroidBand = bevel(deviations.reduce((sum, value) => sum + value, 0) / 3)
      area += triangleArea; litArea += triangleArea * centroidBand
      if (Math.max(...deviations) < .0001) { flatArea += triangleArea; assert.equal(centroidBand, 0) }
      if (Math.min(...deviations) > .45) { wallArea += triangleArea; assert.equal(centroidBand, 0) }
    }
    assert.ok(flatArea > 0 && wallArea > 0)
    assert.ok(litArea / area > .01 && litArea / area < .06, 'rounded face bevels emit; the material body does not')
    t.diagnostic(`${mesh.name}: ${(litArea / area * 100).toFixed(2)}% area-weighted rim at triangle centroids; CPU geometry estimate`)
  }
})

await test('face axes and optical path remain finite throughout the turn and mirrored-camera views', () => {
  const axis = new Vector3(), normal = new Vector3(), view = new Vector3(), opticalNormal = new Matrix3()
  const orient = new Matrix4().makeRotationX(Math.PI / 2)
  const frontBeer = [1.65, 1.30, 1.10].map(extinction => Math.exp(-extinction * thickness))
  assert.ok(frontBeer.every(value => value > .45 && value < .70), 'front faces transmit a readable smoked background')
  for (let degrees = 0; degrees <= 180; degrees += 5) {
    const transform = new Matrix4().makeRotationY(degrees * Math.PI / 180).multiply(orient)
    opticalNormal.getNormalMatrix(transform)
    axis.set(0, 1, 0).applyMatrix3(opticalNormal).normalize()
    for (const cameraY of [-.10, .10]) {
      view.set(0, cameraY - .54, 7.9).normalize()
      const path = thickness / Math.max(.30, Math.abs(axis.dot(view)))
      assert.ok(Number.isFinite(path) && path >= thickness && path <= thickness / .30 + 1e-12)
      for (const mesh of meshes) {
        const authored = mesh.geometry.attributes.normal
        for (let i = 0; i < authored.count; i++) {
          normal.fromBufferAttribute(authored, i).applyMatrix3(opticalNormal).normalize()
          if (Math.abs(authored.getY(i)) > .9999) assert.ok(Math.abs(normal.dot(axis)) > .9999)
          const noV = Math.max(0, Math.min(1, normal.dot(view)))
          const f0 = ((LOGO_MATERIAL.ior - 1) / (LOGO_MATERIAL.ior + 1)) ** 2 * LOGO_MATERIAL.specularIntensity
          const fresnel = f0 + (1 - f0) * (1 - noV) ** 5
          const body = frontBeer.map((_, channel) => Math.exp(-[1.65, 1.30, 1.10][channel] * path) * (1 - fresnel))
          assert.ok(body.every(value => Number.isFinite(value) && value >= 0 && value <= 1))
        }
      }
    }
  }
})
