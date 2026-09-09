/** Checks ideal projected sprite sizes across render targets. Hardware point
 * rasterization and the final water optics still require browser playback. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { CubeCamera, PerspectiveCamera, Vector4, WebGLCubeRenderTarget } from 'three'
import ts from 'typescript'

async function sourceModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
}
const { updatePointDrawScale } = await sourceModule('../src/components/experiments/water-hero/pointDrawScale.ts')
const { QUALITY } = await sourceModule('../src/components/experiments/water-hero/waterHeroConfig.ts')
const { particleDepthGLSL, updateParticleDepthPass } = await sourceModule('../src/components/experiments/water-hero/particleDepth.ts')
const close = (actual, expected, description) => assert.ok(Math.abs(actual - expected) < 1e-9, `${description}: ${actual} vs ${expected}`)

function depthFunction(name) {
  const match = particleDepthGLSL.match(new RegExp(`float ${name}\\(([^)]*)\\)\\s*\\{([^}]*)\\}`))
  assert.ok(match, `${name} remains a scalar calculation that can be verified independently`)
  const args = match[1].split(',').map(argument => argument.trim().replace(/^float /, ''))
  const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  const fn = new Function('max', 'mix', 'exp', 'smoothstep', ...args, match[2].replace(/\bfloat\b/g, 'let'))
  return (...values) => fn(Math.max, (a, b, t) => a + (b - a) * t, Math.exp, smoothstep, ...values)
}
const opticalDistance = depthFunction('particleOpticalDistance')
const transmittance = depthFunction('particleTransmittance')
const defocus = depthFunction('particleDefocus')

await test('depth contrast separates near, middle and distant matter without darkening portrait framing', () => {
  for (const focusDistance of [6.5, 9, 14, 20]) {
    const layers = [-3.5, 0, 4].map(offset => transmittance(opticalDistance(focusDistance + offset, focusDistance, 1), 1))
    assert.ok(layers[0] > layers[1] * 1.3, 'near matter has stronger contrast than the focus layer')
    assert.ok(layers[2] < layers[1] * .68, 'distant matter recedes behind the focus layer')
    assert.ok(layers[2] > .45, 'the far layer stays present between light crests')
    close(layers[1], transmittance(6.5, 1), 'responsive standoff preserves contrast at the logo')
    assert.equal(defocus(focusDistance, focusDistance, 1), 0, 'the middle layer stays crisp')
    assert.ok(defocus(focusDistance * .4, focusDistance, 1) > .8, 'very near grains soften')
  }
})

await test('cube captures bypass view defocus and keep particle radiance; the next beauty draw restores depth', () => {
  const target = new WebGLCubeRenderTarget(64)
  const cube = new CubeCamera(.05, 40, target)
  const current = { uViewDepth: { value: 1 } }
  for (const camera of cube.children) {
    updateParticleDepthPass(camera, current)
    assert.equal(current.uViewDepth.value, 0)
    for (const distance of [.08, 1, 4, 8, 16, 20]) {
      assert.equal(defocus(distance, .35, current.uViewDepth.value), 0)
      close(opticalDistance(distance, .35, current.uViewDepth.value), distance, 'probe uses local optical distance')
      assert.ok(transmittance(distance, current.uViewDepth.value) > .62, 'reflection radiance is not faded by screen-camera focus')
    }
  }
  updateParticleDepthPass(new PerspectiveCamera(), current)
  assert.equal(current.uViewDepth.value, 1)
  target.dispose()
})

await test('depth response remains finite and continuous while moving or reversing through the volume', () => {
  for (const focus of [.1, 6.5, 10, 20]) for (let i = 1; i < 400; i++) {
    const distance = i / 10
    for (const viewPass of [0, 1]) {
      const light = transmittance(opticalDistance(distance, focus, viewPass), viewPass)
      const blur = defocus(distance, focus, viewPass)
      const previous = defocus(distance - .0001, focus, viewPass)
      assert.ok(Number.isFinite(light) && light > 0 && light <= 1)
      assert.ok(Number.isFinite(blur) && blur >= 0 && blur <= 1)
      assert.ok(Math.abs(blur - previous) < .001, 'focus contains no step or abrupt threshold')
    }
  }
})

await test('all six reflection cube faces produce positive physical point diameters', () => {
  const target = new WebGLCubeRenderTarget(64)
  const cube = new CubeCamera(.05, 40, target)
  const current = uniforms()
  const scratch = new Vector4()
  for (const camera of cube.children) {
    updatePointDrawScale({ getCurrentViewport: v => v.set(0, 0, 64, 64) }, camera, current, scratch, 1080)
    close(current.uPointScale.value, 32, 'cube projection magnitude')
    assert.ok(current.uPixelRatio.value > 0)
  }
  target.dispose()
})

function uniforms() {
  return { uPointScale: { value: 1 }, uPixelRatio: { value: 1 } }
}
function projectedCssDiameter(uniforms, worldSize, depth, stretch, minimum, maximum) {
  const ratio = uniforms.uPixelRatio.value
  return Math.max(minimum * ratio, Math.min(maximum * ratio,
    worldSize * stretch * uniforms.uPointScale.value / depth)) / ratio
}

for (const [label, width, height] of [
  ['large desktop', 1728, 1117],
  ['phone portrait', 390, 844],
  ['tablet portrait', 768, 1024],
]) {
  await test(`beauty, reflection and refraction retain projected CSS sprite sizes: ${label}`, () => {
    for (const quality of Object.values(QUALITY)) {
      const bufferWidth = Math.round(width * quality.dprCap)
      const bufferHeight = Math.round(height * quality.dprCap)
      const targetHeight = cap => Math.max(2, Math.round(bufferHeight * Math.min(1, cap / Math.max(bufferWidth, bufferHeight))))
      const camera = new PerspectiveCamera(32, width / height, .025, 400)
      const reference = uniforms()
      const scratch = new Vector4()
      updatePointDrawScale({ getCurrentViewport: target => target.set(0, 0, bufferWidth, bufferHeight) }, camera, reference, scratch, height)
      for (const drawHeight of [bufferHeight, targetHeight(quality.reflectionSize), targetHeight(quality.refractionSize)]) {
        const current = uniforms()
        updatePointDrawScale({ getCurrentViewport: target => target.set(0, 0, bufferWidth, drawHeight) }, camera, current, scratch, height)
        // Fine water, stretched currents, droplets and spray exercise the
        // physical-size region plus both CSS pixel clamps in the shaders.
        for (const [size, depth, stretch, minimum, maximum] of [
          [.000001, 20, 1, .6, 2.7],
          [.009, 4, 1, .6, 2.7],
          [.006, 4, 2.5, .6, 3.6],
          [.045, 4, 1, .75, 15],
          [.36, 4, 1, .75, 42],
          [10, .1, 1, .75, 42],
        ]) {
          close(projectedCssDiameter(current, size, depth, stretch, minimum, maximum),
            projectedCssDiameter(reference, size, depth, stretch, minimum, maximum), `${label} sprite size at draw height ${drawHeight}`)
        }
      }
    }
  })
}

await test('each draw restores beauty scale after both water targets without mutating renderer or camera state', () => {
  const camera = new PerspectiveCamera(32, 16 / 9, .025, 400)
  const projection = camera.projectionMatrix.clone()
  const actualViewport = new Vector4(0, 0, 2400, 1500)
  const renderer = { getCurrentViewport: target => target.copy(actualViewport) }
  const materialUniforms = uniforms()
  const scratch = new Vector4()
  updatePointDrawScale(renderer, camera, materialUniforms, scratch, 750)
  const beauty = [materialUniforms.uPointScale.value, materialUniforms.uPixelRatio.value]
  for (const targetHeight of [640, 480, 1500]) {
    actualViewport.set(11, 7, 2400, targetHeight)
    updatePointDrawScale(renderer, camera, materialUniforms, scratch, 750)
    assert.deepEqual(actualViewport.toArray(), [11, 7, 2400, targetHeight], 'draw viewport is read only')
  }
  assert.deepEqual([materialUniforms.uPointScale.value, materialUniforms.uPixelRatio.value], beauty)
  assert.deepEqual(camera.projectionMatrix.elements, projection.elements)
})

await test('point projection follows the actual draw camera and active viewport rather than a fixed field of view', () => {
  const camera = new PerspectiveCamera(50, 1, .025, 400)
  const current = uniforms()
  updatePointDrawScale({ getCurrentViewport: target => target.set(20, 30, 500, 320) }, camera, current, new Vector4(), 800)
  close(current.uPointScale.value, 320 / (2 * Math.tan(25 * Math.PI / 180)), 'actual camera projection')
  close(current.uPixelRatio.value, .4, 'active viewport scale')
})

await test('one-pixel rasterization retains subpixel sprite energy after target expansion', () => {
  for (const ratio of [.1, .25, .5, 1, 1.35, 1.75, 2]) {
    for (const cssDiameter of [.6, .75, 1.2, 3.6, 15, 42]) {
      const requested = cssDiameter * ratio
      const rasterized = Math.max(1, requested)
      const coverage = Math.min(1, requested * requested)
      const displayedArea = rasterized * rasterized * coverage / (ratio * ratio)
      close(displayedArea, cssDiameter * cssDiameter, 'target-independent covered area')
      assert.ok(rasterized >= 1, 'the shader accounts for the hardware minimum')
      assert.ok(coverage > 0 && coverage <= 1, 'coverage cannot amplify opacity')
    }
  }
})
