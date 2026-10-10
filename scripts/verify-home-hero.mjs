/** Rendering policy and dependency checks; no browser or GPU performance claims. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const base = new URL('../src/components/Hero/', import.meta.url)
const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const compile = (source, jsx = false) => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
  jsx: jsx ? ts.JsxEmit.ReactJSX : undefined,
} }).outputText
const { HOME_HERO_DESKTOP_QUERY, getInteractiveHomeHeroSnapshot, subscribeInteractiveHomeHero,
  getStaticHomeHeroSnapshot } = await import(asModule(compile(await readFile(new URL('homeHeroDisplay.ts', base), 'utf8'))))

await test('homepage eligibility responds to screen, pointer and motion changes, and releases its listener', () => {
  const previousWindow = globalThis.window
  const listeners = new Set()
  const device = { width: 390, hover: false, fine: false, motion: true }
  const query = {
    get matches() { return device.width >= 1024 && device.hover && device.fine && device.motion },
    addEventListener(type, callback) { assert.equal(type, 'change'); listeners.add(callback) },
    removeEventListener(type, callback) { assert.equal(type, 'change'); listeners.delete(callback) },
  }
  assert.equal(HOME_HERO_DESKTOP_QUERY,
    '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
  try {
    delete globalThis.window
    assert.equal(getInteractiveHomeHeroSnapshot(), false)
    assert.equal(getStaticHomeHeroSnapshot(), false)
    subscribeInteractiveHomeHero(() => assert.fail('no server listener'))()
    globalThis.window = { matchMedia(media) { assert.equal(media, HOME_HERO_DESKTOP_QUERY); return query } }
    const observed = [getInteractiveHomeHeroSnapshot()]
    const stop = subscribeInteractiveHomeHero(() => observed.push(getInteractiveHomeHeroSnapshot()))
    for (const next of [
      { width: 1440, hover: true, fine: true },
      { motion: false },
      { motion: true },
      { fine: false },
      { fine: true, width: 1023 },
      { width: 1024 },
    ]) {
      Object.assign(device, next)
      for (const listener of listeners) listener()
    }
    assert.deepEqual(observed, [false, true, false, true, false, false, true])
    stop()
    assert.equal(listeners.size, 0)
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})

await test('original media remains intact while Studio uses the About still for every motion and fallback state', async () => {
  const hook = asModule('export function useReducedMotion() { return globalThis.__homeHeroReducedMotion ?? false }')
  let source = await readFile(new URL('HeroMedia.tsx', base), 'utf8')
  source = source.replace("from '../../hooks/useReducedMotion'", `from '${hook}'`).replace("import './HeroMedia.css'", '')
  const javascript = compile(source, true).replace('from "react/jsx-runtime"', `from '${import.meta.resolve('react/jsx-runtime')}'`)
  const { HeroMedia } = await import(asModule(javascript))
  const previousReducedMotion = globalThis.__homeHeroReducedMotion
  try {
    globalThis.__homeHeroReducedMotion = false
    const video = renderToStaticMarkup(createElement(HeroMedia))
    assert.match(video, /<video[^>]*autoPlay=""[^>]*muted=""[^>]*loop=""[^>]*playsInline=""/)
    assert.match(video, /hero-loop\.webm[\s\S]*hero-loop\.mp4/)
    assert.match(video, /poster="\/media\/wallace-shift-hero-poster\.webp"/)
    const poster = renderToStaticMarkup(createElement(HeroMedia, { posterOnly: true }))
    assert.doesNotMatch(poster, /<video|<source/)
    assert.match(poster, /<img[^>]*wallace-shift-hero-poster\.webp/)
    globalThis.__homeHeroReducedMotion = true
    const reduced = renderToStaticMarkup(createElement(HeroMedia))
    assert.doesNotMatch(reduced, /<video|<source/)
    assert.match(reduced, /<img[^>]*wallace-shift-hero-poster\.webp/)
    for (const reducedMotion of [false, true]) {
      globalThis.__homeHeroReducedMotion = reducedMotion
      for (const posterOnly of [false, true]) {
        const studio = renderToStaticMarkup(createElement(HeroMedia, { appearance: 'studio', posterOnly }))
        assert.match(studio, /hero-media--studio/)
        assert.match(studio, /<img[^>]*src="\/media\/about\/studio-world-mobile\.webp"/)
        assert.doesNotMatch(studio, /<video|<source|hero-loop|wallace-shift-hero-poster/)
      }
    }
  } finally {
    if (previousReducedMotion === undefined) delete globalThis.__homeHeroReducedMotion
    else globalThis.__homeHeroReducedMotion = previousReducedMotion
  }
})

await test('the homepage wrapper keeps the WebGL scene out of its static dependency graph', async () => {
  const visited = new Set()
  async function walk(url) {
    if (visited.has(url.href)) return
    visited.add(url.href)
    const source = await readFile(url, 'utf8')
    const ast = ts.createSourceFile(url.pathname, source, ts.ScriptTarget.Latest, true)
    for (const node of ast.statements) {
      if (!ts.isImportDeclaration(node) || node.importClause?.isTypeOnly) continue
      const specifier = node.moduleSpecifier.text
      assert.ok(!/^(three|@react-three\/fiber)(\/|$)/.test(specifier), `${url.pathname} eagerly imports ${specifier}`)
      assert.ok(!specifier.includes('WaterHeroExperiment'), 'the expensive scene must remain a dynamic import')
      if (!specifier.startsWith('.') || /\.(css|svg|png|webp)$/.test(specifier)) continue
      const target = new URL(specifier, url)
      for (const extension of ['.ts', '.tsx']) {
        const candidate = new URL(target.href + extension)
        try { await readFile(candidate); await walk(candidate); break } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }
    }
  }
  await walk(new URL('HomeHero.tsx', base))
  const wrapper = await readFile(new URL('HomeHero.tsx', base), 'utf8')
  assert.match(wrapper, /lazy\(\(\) => import\('\.\.\/experiments\/water-hero\/WaterHeroExperiment'\)/)
  assert.match(wrapper, /\{interactive \? <WaterHeroErrorBoundary[\s\S]*<\/WaterHeroErrorBoundary> : <VideoHeroSequence \/>\}/)
  assert.match(wrapper, /<InteractiveHero mode="landing" fallback=\{<VideoHeroSequence posterOnly \/>\}/)
  assert.ok([...visited].some(path => path.endsWith('/HeroMedia.tsx')))
  assert.ok([...visited].some(path => path.endsWith('/BrandStatement.tsx')))
  const page = await readFile(new URL('../../pages/HomePage.tsx', base), 'utf8')
  assert.doesNotMatch(page, /import\s+\{\s*BrandStatement\s*\}|<BrandStatement\b/,
    'HomeHero owns the statement; rendering it after HomeHero would duplicate the desktop handoff')
})

await test('mobile, loading and unavailable-scene branches each keep their hero and original statement together', async () => {
  const react = import.meta.resolve('react')
  const runtime = import.meta.resolve('react/jsx-runtime')
  const policy = asModule(`export const getInteractiveHomeHeroSnapshot = () => globalThis.__homeBranchInteractive;
    export const getStaticHomeHeroSnapshot = getInteractiveHomeHeroSnapshot;
    export const subscribeInteractiveHomeHero = () => () => {};`)
  // Only the heavy scene is substituted. Its pending promise exercises the
  // real Suspense fallback, and its explicit failure returns the supplied
  // route fallback just as the WebGL capability/context guard does.
  const lazyReact = asModule(`export * from '${react}'; import {createElement} from '${react}';
    const pending = new Promise(() => {});
    export const lazy = () => props => {
      if (globalThis.__homeBranchPhase === 'loading') throw pending;
      if (globalThis.__homeBranchPhase === 'failure') return props.fallback;
      return createElement('div', {'data-interactive-scene':''});
    };`)
  const hero = asModule(`import {createElement} from '${react}';
    export function Hero({posterOnly=false,appearance}) { return createElement('section',
      {'data-original-hero': posterOnly ? 'poster' : 'video', 'data-appearance':appearance}); }`)
  const statement = asModule(`import {createElement} from '${react}';
    export function BrandStatement() { return createElement('section', {'data-original-statement':''}); }`)
  const provider = asModule('export function HeroContactProvider({children}) { return children }')
  const boundary = asModule(`export function WaterHeroErrorBoundary({children, fallback}) {
    return globalThis.__homeBranchPhase === 'boundary-failure' ? fallback('render failure') : children;
  }`)
  const dependencies = {
    react: lazyReact,
    'gsap/ScrollTrigger': asModule('export const ScrollTrigger = {}'),
    './Hero': hero,
    './HeroContactProvider': provider,
    '../BrandStatement/BrandStatement': statement,
    '../experiments/water-hero/WaterHeroErrorBoundary': boundary,
    './homeHeroDisplay': policy,
    'react/jsx-runtime': runtime,
  }
  let javascript = compile(await readFile(new URL('HomeHero.tsx', base), 'utf8'), true)
  const imports = ts.createSourceFile('HomeHero.js', javascript, ts.ScriptTarget.Latest, true).statements
    .filter(node => ts.isImportDeclaration(node))
  for (const node of imports.reverse()) {
    const replacement = dependencies[node.moduleSpecifier.text]
    assert.ok(replacement, `Provide homepage harness dependency ${node.moduleSpecifier.text}`)
    javascript = javascript.slice(0, node.moduleSpecifier.getStart()) + JSON.stringify(replacement) + javascript.slice(node.moduleSpecifier.end)
  }
  const { HomeHero } = await import(asModule(javascript))
  const previous = { interactive: globalThis.__homeBranchInteractive, phase: globalThis.__homeBranchPhase }
  try {
    for (const [interactive, phase, media] of [
      [false, 'ready', 'video'], [true, 'loading', 'poster'], [true, 'failure', 'poster'],
      [true, 'boundary-failure', 'poster'],
    ]) {
      globalThis.__homeBranchInteractive = interactive
      globalThis.__homeBranchPhase = phase
      const markup = renderToStaticMarkup(createElement(HomeHero))
      assert.equal((markup.match(/data-original-hero=/g) ?? []).length, 1)
      assert.match(markup, new RegExp(`data-original-hero="${media}"`))
      assert.match(markup, /data-appearance="studio"/)
      assert.equal((markup.match(/data-original-statement=/g) ?? []).length, 1)
      assert.ok(markup.indexOf('data-original-hero') < markup.indexOf('data-original-statement'))
    }
    globalThis.__homeBranchInteractive = true
    globalThis.__homeBranchPhase = 'ready'
    const ready = renderToStaticMarkup(createElement(HomeHero))
    assert.match(ready, /data-interactive-scene/)
    assert.doesNotMatch(ready, /data-original-statement|data-original-hero/)
  } finally {
    for (const [name, value] of Object.entries({ __homeBranchInteractive: previous.interactive, __homeBranchPhase: previous.phase })) {
      if (value === undefined) delete globalThis[name]
      else globalThis[name] = value
    }
  }
})

await test('the original-media experiment selects preserved media explicitly and leaves normal logo comparisons intact', async () => {
  const react = import.meta.resolve('react')
  const dependencies = {
    react,
    'react/jsx-runtime': import.meta.resolve('react/jsx-runtime'),
    '../components/experiments/water-hero/WaterHeroExperiment': asModule(`import {createElement} from '${react}';
      export function WaterHeroExperiment() { return createElement('div', {'data-logo-comparison':''}) }`),
    '../components/Hero/Hero': asModule(`import {createElement} from '${react}';
      export function Hero({appearance}) { return createElement('div', {'data-media-appearance':appearance}) }`),
    '../components/Hero/HeroContactProvider': asModule(`import {createElement} from '${react}';
      export function HeroContactProvider({children}) { return createElement('div', {'data-draft-provider':''}, children) }`),
    '../hooks/useDocumentMeta': asModule(`export function useRouteMeta(path) { globalThis.__heroExperimentMeta = path }`),
    '../content/routeMeta': asModule(`export const WATER_HERO_EXPERIMENT_PATH = '/experiments/water-hero'`),
  }
  let javascript = compile(await readFile(new URL('../../pages/WaterHeroExperimentPage.tsx', base), 'utf8'), true)
  const imports = ts.createSourceFile('WaterHeroExperimentPage.js', javascript, ts.ScriptTarget.Latest, true).statements
    .filter(node => ts.isImportDeclaration(node))
  for (const node of imports.reverse()) {
    const replacement = dependencies[node.moduleSpecifier.text]
    assert.ok(replacement, `Provide experiment harness dependency ${node.moduleSpecifier.text}`)
    javascript = javascript.slice(0, node.moduleSpecifier.getStart()) + JSON.stringify(replacement) + javascript.slice(node.moduleSpecifier.end)
  }
  const { WaterHeroExperimentPage } = await import(asModule(javascript))
  const previous = { window: globalThis.window, meta: globalThis.__heroExperimentMeta }
  try {
    for (const search of ['', '?look=glass', '?presentation=unknown', '?presentation=original-media']) {
      globalThis.window = { location: { search } }
      const html = renderToStaticMarkup(createElement(WaterHeroExperimentPage))
      assert.equal(globalThis.__heroExperimentMeta, '/experiments/water-hero')
      if (search === '?presentation=original-media') {
        assert.match(html, /data-media-appearance="original"/)
        assert.match(html, /data-draft-provider/)
        assert.match(html, /href="\/experiments\/water-hero\?look=glass"/)
        assert.doesNotMatch(html, /data-logo-comparison/)
      } else {
        assert.match(html, /data-logo-comparison/)
        assert.doesNotMatch(html, /data-media-appearance/)
      }
    }
  } finally {
    for (const [name, value] of Object.entries({ window: previous.window, __heroExperimentMeta: previous.meta })) {
      if (value === undefined) delete globalThis[name]
      else globalThis[name] = value
    }
  }
})

await test('the frosted enquiry card retains its backdrop, fallback and controls', async () => {
  const card = await readFile(new URL('HeroContactCard.css', base), 'utf8')
  const landing = await readFile(new URL('LandingHeroTheme.css', base), 'utf8')

  // Both declarations support browsers that still require the prefix. These
  // source checks do not establish the rendered effect or text contrast.
  for (const sheet of [card, landing]) {
    assert.match(sheet, /-webkit-backdrop-filter: blur\((\d+)px\)/)
    assert.match(sheet, /[^-]backdrop-filter: blur\((\d+)px\)/)
    const fallback = sheet.match(/@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)\s*\{\s*[^{}]*\.hero-contact-card\s*\{([^{}]+)\}/)?.[1]
    assert.ok(fallback, 'the card has a fallback when neither blur declaration is supported')
    assert.match(fallback, /background(?:-color)?:\s*[^;]+;/,
      'the unsupported-filter fallback supplies its own surface')
  }

  // This selector must outrank the shared reveal rule's will-change: opacity.
  // A permanent opacity hint isolates the card from the canvas even at rest.
  const content = landing.match(/\.water-hero-shell--landing\s+\.water-hero__landing-ui\s+\.water-hero__landing-content\s*\{([^{}]+)\}/)?.[1]
  assert.ok(content, 'the landing content overrides the shared reveal hint')
  const hints = content.match(/will-change:\s*([^;]+);/)?.[1]
  assert.ok(hints, 'the landing content explicitly sets its compositing hint')
  assert.doesNotMatch(hints, /\b(?:opacity|filter|backdrop-filter|mask|clip-path|mix-blend-mode)\b/,
    'the resting content must not create a backdrop root')

  // Decorative glass cannot cover the controls or shrink the submit target.
  const rim = card.match(/\.hero-contact-card::after\s*\{([^{}]+)\}/)?.[1]
  assert.ok(rim, 'the decorative rim remains separate from the fields')
  assert.match(rim, /mask-composite:\s*exclude/)
  assert.match(rim, /pointer-events:\s*none/)
  const submit = card.match(/\.hero-contact-card__submit\s*\{([^{}]+)\}/)?.[1]
  assert.ok(submit)
  for (const dimension of ['width', 'height']) {
    const pixels = Number(submit.match(new RegExp(`\\b${dimension}:\\s*(\\d+)px`))?.[1])
    assert.ok(pixels >= 44, `the submit ${dimension} preserves a 44px hit target`)
  }
})
