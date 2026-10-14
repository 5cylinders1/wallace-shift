/** Component rendering and selection checks, not browser/GPU visual evidence. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const sourceRoot = new URL('../src/', import.meta.url)
const water = 'components/experiments/water-hero/'
const data = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const react = import.meta.resolve('react')
async function moduleUrl(path, dependencies = {}) {
  const source = (await readFile(new URL(path, sourceRoot), 'utf8'))
    .replace(/import ['"][^'"]+\.css['"];?/g, '').replaceAll('import.meta.env.DEV', 'false')
  let javascript = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  const imports = ts.createSourceFile(path, javascript, ts.ScriptTarget.Latest, true).statements
    .filter(node => ts.isImportDeclaration(node))
  for (const node of imports.reverse()) {
    const name = node.moduleSpecifier.text
    const replacement = dependencies[name] ?? (name.startsWith('.') ? null : import.meta.resolve(name))
    assert.ok(replacement, `Supply the ${name} dependency for ${path}`)
    javascript = javascript.slice(0, node.moduleSpecifier.getStart()) + JSON.stringify(replacement) + javascript.slice(node.moduleSpecifier.end)
  }
  return data(javascript)
}

const config = await moduleUrl(`${water}waterHeroConfig.ts`)
const appearance = await moduleUrl(`${water}logoAppearance.ts`, { './waterHeroConfig': config })
const site = await moduleUrl('content/siteConfig.ts')
const { hero, brandStatement } = await import(site)
const pageLink = await moduleUrl('components/PageLink/PageLink.tsx', {
  '../../lib/router': data('export const navigate = () => {}'),
})
const uiUrl = await moduleUrl(`${water}HeroUI.tsx`)
const { HeroUI } = await import(uiUrl)
const card = await moduleUrl('components/Hero/HeroContactCard.tsx', {
  './useHeroContactState': data(`export function useHeroContactState() {
    return {name:'',email:'',status:'idle',setName:()=>{},setEmail:()=>{},submit:async()=>{}} }`),
})
const content = await moduleUrl('components/Hero/HeroContent.tsx', {
  '../../content/siteConfig': site, './HeroContactCard': card,
})
const cue = await moduleUrl('components/Hero/HeroScrollCue.tsx')
const landingUiUrl = await moduleUrl(`${water}LandingHeroUI.tsx`, {
  '../../Hero/HeroContent': content, '../../Hero/HeroScrollCue': cue,
})
const { HeroContent } = await import(content)
const { LandingHeroUI } = await import(landingUiUrl)
const handoffUrl = await moduleUrl(`${water}WaterHeroHandoff.tsx`, {
  '../../../content/siteConfig': site, '../../PageLink/PageLink': pageLink,
  './waterHeroConfig': config,
  './sceneDirector': data('export const SPLIT_START = .82'),
  './handoffProgress': data('export const applyHandoffProgress = () => {}'),
})
const { WaterHeroHandoff } = await import(handoffUrl)
const brandContent = await moduleUrl('components/BrandStatement/BrandStatementContent.tsx', {
  '../../content/siteConfig': site,
})
const brandWipe = await moduleUrl('components/BrandStatement/brandStatementWipe.ts')
const statementUrl = await moduleUrl('components/BrandStatement/BrandStatement.tsx', {
  '../../content/siteConfig': site,
  '../../hooks/useReducedMotion': data('export function useReducedMotion() { return globalThis.__brandReducedMotion ?? false }'),
  './BrandStatementContent': brandContent,
  './brandStatementWipe': brandWipe,
  '@gsap/react': data('export function useGSAP() {}'),
  gsap: data('export default {}'),
})
const brandHandoffUrl = await moduleUrl('components/Hero/WaterHeroBrandHandoff.tsx', {
  '../BrandStatement/BrandStatement': statementUrl,
  '../BrandStatement/BrandStatementContent': brandContent,
  './brandHandoffProgress': data('export const BRAND_HANDOFF_HEIGHT_SVH=335, BRAND_REVEAL_OVERLAP_SVH=190; export function getBrandHandoffFrame() {}'),
})
const { WaterHeroBrandHandoff } = await import(brandHandoffUrl)

const captureStage = data('export function WaterHeroStage(props) { globalThis.__waterStage = props; return null }')
const boundary = await moduleUrl(`${water}WaterHeroErrorBoundary.tsx`)
const { WaterHeroExperiment } = await import(await moduleUrl(`${water}WaterHeroExperiment.tsx`, {
  '../../../hooks/useReducedMotion': await moduleUrl('hooks/useReducedMotion.ts'),
  './WaterHeroErrorBoundary': boundary,
  './WaterHeroStage': captureStage,
  './WaterHeroHandoff': handoffUrl,
  '../../Hero/WaterHeroBrandHandoff': brandHandoffUrl,
  './useQualityTier': data('export function useQualityTier(tier) { return {tier: tier ?? "medium", canDowngrade: false} }'),
  './waterHeroTypes': await moduleUrl(`${water}waterHeroTypes.ts`),
  './logoAppearance': appearance,
  './waterHeroConfig': config,
}))

// A bounded HTML walk ignores decorative duplicates under aria-hidden. It
// leaves the actual rendered heading/paragraph markup intact for assertions.
function semanticMarkup(html) {
  const hidden = []
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
  let result = ''
  for (const token of html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) ?? []) {
    if (token.startsWith('<!--')) continue
    const closing = token.match(/^<\/([\w-]+)/)
    if (closing) {
      if (!hidden.at(-1)) result += token
      hidden.pop()
      continue
    }
    const opening = token.match(/^<([\w-]+)/)
    if (opening) {
      const inaccessible = Boolean(hidden.at(-1)) || /\baria-hidden="true"/.test(token)
      if (!inaccessible) result += token
      if (!voidTags.has(opening[1]) && !token.endsWith('/>')) hidden.push(inaccessible)
      continue
    }
    if (!hidden.at(-1)) result += token
  }
  return result
}

function browserState(search, webgl, run) {
  const previous = { window: globalThis.window, document: globalThis.document, stage: globalThis.__waterStage }
  const writes = []
  globalThis.window = {
    location: { search, href: `https://example.test/experiments/water-hero${search}#review` },
    history: { state: {}, replaceState: (...args) => writes.push(args[2]) },
    matchMedia: () => ({ matches: false }),
  }
  globalThis.document = { createElement: () => ({ getContext: type => {
    assert.equal(type, 'webgl2', 'the renderer requires WebGL2')
    return webgl ? { getExtension: () => ({ loseContext() {} }) } : null
  } }) }
  try { return run(writes) } finally {
    for (const [name, value] of Object.entries({ window: previous.window, document: previous.document, __waterStage: previous.stage })) {
      if (value === undefined) delete globalThis[name]
      else globalThis[name] = value
    }
  }
}

await test('landing pins the Studio finish; the experiment preserves Glass and all comparison looks', () => {
  for (const look of ['led', 'electric', 'glass', 'chrome', 'frosted', 'pearl', 'copper', 'mercury', 'cutlight', 'studio']) {
    const search = `?look=${look}&progress=.68&quality=low&debug=1&reduced=1&channel=2`
    browserState(search, true, writes => {
      const landingMarkup = renderToStaticMarkup(createElement(WaterHeroExperiment, { mode: 'landing' }))
      assert.match(landingMarkup, /water-hero-brand/)
      assert.doesNotMatch(landingMarkup, /A Different|Perspective|water-hero-handoff__title/)
      const landing = globalThis.__waterStage
      assert.equal(landing.appearance, 'studio')
      assert.equal(landing.mode, 'landing')
      assert.equal(landing.tier, 'medium')
      assert.equal(landing.progress.current, 0)
      assert.equal(landing.override.progress, null)
      assert.equal(landing.debug, false)
      assert.equal(landing.reducedMotion, false)
      assert.equal(landing.channel, 0)
      landing.onAppearance('electric')
      assert.deepEqual(writes, [])

      renderToStaticMarkup(createElement(WaterHeroExperiment))
      const experiment = globalThis.__waterStage
      assert.equal(experiment.appearance, look)
      assert.equal(experiment.mode, 'experiment')
      assert.equal(experiment.tier, 'low')
      assert.equal(experiment.progress.current, .68)
      assert.equal(experiment.override.progress, .68)
      assert.equal(experiment.debug, true)
      assert.equal(experiment.reducedMotion, true)
      assert.equal(experiment.channel, 2)
      experiment.onAppearance('led')
      const next = new URL(writes.at(-1), 'https://example.test')
      assert.equal(next.pathname, '/experiments/water-hero')
      assert.equal(next.searchParams.get('look'), 'led')
      assert.equal(next.searchParams.get('progress'), '.68')
      assert.equal(next.hash, '#review')
    })
  }
})

await test('landing reuses the original headline, buttons and enquiry form; default experiment navigation and ending remain', () => {
  const opening = renderToStaticMarkup(createElement(LandingHeroUI, { still: false }))
  for (const cta of [hero.primaryCta, hero.secondaryCta]) {
    assert.ok(opening.includes(`href="${cta.href}"`))
    assert.ok(opening.includes(cta.label))
  }
  assert.doesNotMatch(opening, /Back to wallaceshift|water-hero__masthead|Return to the Wallace Shift/)
  assert.ok(opening.includes(hero.eyebrow))
  assert.ok(opening.includes(hero.supporting))
  for (const line of [...hero.headlineLines, hero.headlineAccent]) assert.ok(opening.includes(line))
  assert.match(opening, /<form[^>]*class="hero-contact-card__form"/)
  const nameInput = opening.match(/<input[^>]*name="name"[^>]*>/)?.[0]
  const emailInput = opening.match(/<input[^>]*name="email"[^>]*>/)?.[0]
  assert.ok(nameInput && emailInput)
  assert.match(nameInput, /autoComplete="name"/)
  assert.match(emailInput, /type="email"/)
  assert.match(opening, /type="submit"/)
  assert.match(opening, /hero__cta-primary/)
  assert.match(opening, /hero__scroll-cue/)
  assert.doesNotMatch(opening, /data-opening-word|Overlooked|Unforgettable/)
  // The landing overlay renders the shared content unchanged; normalize only
  // React's context-specific ID for the form's status announcement.
  const normalizeIds = html => html.replace(/_R_[a-zA-Z0-9]+_/g, '_ID_')
  const original = renderToStaticMarkup(createElement(HeroContent))
  assert.ok(normalizeIds(opening).includes(normalizeIds(original)))
  const experimentOpening = renderToStaticMarkup(createElement(HeroUI, { still: false }))
  const experimentEnding = renderToStaticMarkup(createElement(WaterHeroHandoff, { still: true }))
  assert.match(experimentOpening, /Back to wallaceshift\.com/)
  assert.match(experimentOpening, /A shift in perspective/)
  assert.match(experimentOpening, /data-opening-word="before"/)
  assert.match(experimentOpening, /data-opening-word="after"/)
  assert.match(experimentEnding, /Return to the Wallace Shift site/)
  assert.match(experimentEnding, /data-split-aperture/)
  assert.match(experimentEnding, /A Different/)
  assert.match(experimentEnding, /Perspective/)
  assert.doesNotMatch(experimentOpening + experimentEnding, /water-hero__landing-links/)
})

await test('the landing reveal has one semantic brand statement; the light plane is a decorative color duplicate', () => {
  const ending = renderToStaticMarkup(createElement(WaterHeroBrandHandoff, {
    still: false, progress: {current: 1}, sceneState: {},
  }))
  assert.match(ending, /data-brand-aperture/)
  assert.match(ending, /aria-labelledby="water-hero-brand-title"/)
  assert.match(ending, /class="shift-wipe__plane" aria-hidden="true"/)
  assert.equal((ending.match(/id="water-hero-brand-title"/g) ?? []).length, 1)
  assert.doesNotMatch(ending, /A Different|Perspective|Return to the Wallace Shift|water-hero__landing-links/)
  // Effects initially hide the handoff until its contour opens. Model only
  // that outer activation; the plane's aria-hidden remains untouched.
  assert.match(ending, /^<section[^>]*aria-hidden="true"[^>]*inert=""/)
  const active = ending.replace(/^(<section[^>]*\s)aria-hidden="true"/, '$1aria-hidden="false"')
  const semantic = semanticMarkup(active)
  assert.equal((semantic.match(/<h2\b/g) ?? []).length, 1)
  assert.equal((semantic.match(/<p\b/g) ?? []).length, 1)
  assert.match(semantic, /From <span class="shift-wipe__word">overlooked<\/span> to/)
  assert.match(semantic, /unforgettable\./)
  assert.ok(semantic.includes(brandStatement.body))
  assert.equal((ending.match(/shift-wipe__headline"/g) ?? []).length, 2,
    'base and color-plane treatments render the same shared content')

  const previous = globalThis.__brandReducedMotion
  try {
    for (const reduced of [false, true]) {
      globalThis.__brandReducedMotion = reduced
      const fallback = renderToStaticMarkup(createElement(WaterHeroBrandHandoff, {
        still: true, progress: {current: 0}, sceneState: {},
      }))
      const fallbackSemantic = semanticMarkup(fallback)
      assert.equal((fallbackSemantic.match(/<h2\b/g) ?? []).length, 1)
      assert.equal((fallbackSemantic.match(/<p\b/g) ?? []).length, 1)
      assert.ok(fallbackSemantic.includes(brandStatement.body))
      assert.doesNotMatch(fallback, /A Different|Perspective|water-hero-brand__aperture/)
      if (reduced) assert.match(fallback, /brand-statement--static/)
      else assert.match(fallback, /shift-wipe__stage/)
    }
  } finally {
    if (previous === undefined) delete globalThis.__brandReducedMotion
    else globalThis.__brandReducedMotion = previous
  }
})

await test('unavailable WebGL uses the supplied homepage fallback and preserves the experiment fallback', () => {
  browserState('?look=glass', false, () => {
    const fallback = createElement('section', { id: 'top' }, 'Homepage poster')
    const landing = renderToStaticMarkup(createElement(WaterHeroExperiment, { mode: 'landing', fallback }))
    assert.equal(landing, '<section id="top">Homepage poster</section>')
    const experiment = renderToStaticMarkup(createElement(WaterHeroExperiment, { fallback }))
    assert.match(experiment, /Back to wallaceshift\.com/)
    assert.match(experiment, /Return to the Wallace Shift site/)
    assert.doesNotMatch(experiment, /Homepage poster/)
  })
})

await test('ready landing canvas uses manual frames without diagnostic controls; experiment retains its controls', async () => {
  const reactReady = data(`export * from '${react}'; import {useState as state} from '${react}'; export const useState = initial => state(initial === false ? true : initial)`)
  const empty = name => data(`export function ${name}() { return null }`)
  const marker = (name, attribute) => data(`import {createElement} from '${react}'; export function ${name}() { return createElement('div', {'${attribute}': ''}) }`)
  const { WaterHeroStage } = await import(await moduleUrl(`${water}WaterHeroStage.tsx`, {
    react: reactReady,
    '@react-three/fiber': data(`import {createElement} from '${react}'; export function Canvas(props) { return createElement('canvas', {'data-frames':props.frameloop}) }; export const useThree = () => {}`),
    './DebugOverlay': marker('DebugOverlay', 'data-review-debug'),
    './HeroUI': uiUrl,
    './LandingHeroUI': landingUiUrl,
    './heroUiProgress': empty('applyHeroUiProgress'),
    './LoadingFallback': empty('LoadingFallback'),
    './LogoAppearanceSelector': marker('LogoAppearanceSelector', 'data-review-styles'),
    './WaterScene': empty('WaterScene'),
    './useScrollProgress': empty('useScrollProgress'),
    './sceneActivity': empty('startSceneFrames'),
    './waterHeroConfig': config,
  }))
  const props = { progress: {current: 0}, override: {progress: null}, sceneState: {}, telemetry: {}, tier: 'medium', debug: true, reducedMotion: false, appearance: 'glass' }
  const landing = renderToStaticMarkup(createElement(WaterHeroStage, {...props, mode: 'landing'}))
  assert.match(landing, /id="top"/)
  assert.match(landing, /data-frames="never"/)
  assert.match(landing, /hero-contact-card__form/)
  assert.doesNotMatch(landing, /data-review-debug|data-review-styles/)
  const experiment = renderToStaticMarkup(createElement(WaterHeroStage, props))
  assert.match(experiment, /data-frames="always"/)
  assert.match(experiment, /data-review-debug/)
  assert.match(experiment, /data-review-styles/)
  assert.doesNotMatch(experiment, /id="top"/)
  assert.doesNotMatch(experiment, /hero-contact-card__form/)
})

await test('the opening form fades as a unit, releases hidden focus, and returns without clearing its fields', async () => {
  const opening = await moduleUrl(`${water}openingReveal.ts`)
  const { applyHeroUiProgress } = await import(await moduleUrl(`${water}heroUiProgress.ts`, {
    './openingReveal': opening,
  }))
  const previousDocument = globalThis.document
  let blurs = 0
  const input = { value: 'Retained draft', blur() { blurs++; globalThis.document.activeElement = null } }
  const group = {
    dataset: {inStart:'-1', inEnd:'0', outStart:'.25', outEnd:'.35', shift:'14'},
    style: {}, attributes: {}, inert: false,
    setAttribute(name, value) { this.attributes[name] = value },
    contains(element) { return element === input },
  }
  const root = {querySelector: () => null, querySelectorAll: () => [group]}
  globalThis.document = {activeElement: input}
  try {
    for (const progress of [0, .1, .25]) {
      applyHeroUiProgress(root, progress, false)
      assert.equal(Number(group.style.opacity), 1)
      assert.equal(group.inert, false)
      assert.equal(blurs, 0)
    }
    applyHeroUiProgress(root, .3, false)
    assert.ok(Math.abs(Number(group.style.opacity) - .5) < 1e-12)
    applyHeroUiProgress(root, .35, false)
    assert.equal(group.inert, true)
    assert.equal(group.attributes['aria-hidden'], 'true')
    assert.equal(blurs, 1)
    applyHeroUiProgress(root, .25, false)
    assert.equal(group.inert, false)
    assert.equal(group.attributes['aria-hidden'], 'false')
    assert.equal(input.value, 'Retained draft')
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
})
