/** Actual AmbientLoop effect behavior with simulated refs/observers; not video decoding or browser verification. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const data = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const key = '__servicePlaybackHarness'
const hookModule = data(`
  export const useRef = value => globalThis.${key}.useRef(value);
  export const useState = value => globalThis.${key}.useState(value);
  export const useEffect = (effect, deps) => globalThis.${key}.useEffect(effect, deps);
`)
const jsxModule = data('export const jsx = (type, props) => ({type, props}); export const jsxs = jsx;')
const reducedMotionModule = data(`export const useReducedMotion = () => globalThis.${key}.reducedMotion;`)
let source = ts.transpileModule(await readFile(new URL('../src/components/AmbientLoop/AmbientLoop.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
}).outputText
source = source.replace(/from ['"]react['"]/g, `from '${hookModule}'`)
  .replace(/from ['"]react\/jsx-runtime['"]/g, `from '${jsxModule}'`)
  .replace(/from ['"]\.\.\/\.\.\/hooks\/useReducedMotion['"]/g, `from '${reducedMotionModule}'`)
  .replace(/^import ['"][^'"]+\.css['"];?\s*$/gm, '')
const { AmbientLoop } = await import(data(source))
const media = { poster: '/media/services/svc-trust-ice.webp', video: '/media/services/svc-trust-ice.mp4' }

function createHarness(props, reducedMotion = false) {
  const originalObserver = globalThis.IntersectionObserver
  const originalHarness = globalThis[key]
  const hooks = []
  const refs = new Set()
  const observers = []
  const root = { tagName: 'DIV' }
  const video = {
    tagName: 'VIDEO', playing: false, playCalls: 0, pauseCalls: 0,
    play() { this.playing = true; this.playCalls++; return Promise.resolve() },
    pause() { this.playing = false; this.pauseCalls++ },
  }
  let cursor = 0
  let pendingEffects = []
  let dirty = true
  let tree

  const harness = {
    props, reducedMotion, observers, root, video,
    useRef(value) {
      const index = cursor++
      hooks[index] ??= { kind: 'ref', value: { current: value } }
      return hooks[index].value
    },
    useState(value) {
      const index = cursor++
      hooks[index] ??= { kind: 'state', value: typeof value === 'function' ? value() : value }
      return [hooks[index].value, next => {
        const value = typeof next === 'function' ? next(hooks[index].value) : next
        if (!Object.is(value, hooks[index].value)) { hooks[index].value = value; dirty = true }
      }]
    },
    useEffect(effect, deps) {
      const index = cursor++
      const previous = hooks[index]
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        pendingEffects.push({ index, effect, deps, cleanup: previous?.cleanup })
      }
    },
    flush() {
      let commits = 0
      while (dirty) {
        assert.ok(++commits < 10, 'effects must settle without a render loop')
        dirty = false
        cursor = 0
        pendingEffects = []
        tree = AmbientLoop(harness.props)
        for (const ref of refs) ref.current = null
        refs.clear()
        const attach = node => {
          if (!node || typeof node !== 'object') return
          if (node.props?.ref) {
            node.props.ref.current = node.type === 'video' ? video : root
            refs.add(node.props.ref)
          }
          for (const child of [node.props?.children].flat()) attach(child)
        }
        attach(tree)
        for (const pending of pendingEffects) pending.cleanup?.()
        for (const pending of pendingEffects) hooks[pending.index] = {
          kind: 'effect', deps: pending.deps, cleanup: pending.effect(),
        }
      }
    },
    update(nextProps = {}, reduce = harness.reducedMotion) {
      harness.props = { ...harness.props, ...nextProps }
      harness.reducedMotion = reduce
      dirty = true
      harness.flush()
    },
    elements(type) {
      const found = []
      const visit = node => {
        if (!node || typeof node !== 'object') return
        if (node.type === type) found.push(node)
        for (const child of [node.props?.children].flat()) visit(child)
      }
      visit(tree)
      return found
    },
    observer(kind) {
      const found = observers.filter(observer => !observer.disconnected && (
        kind === 'load' ? observer.options.rootMargin === '240px' : observer.options.threshold === .1
      ))
      assert.equal(found.length, 1, `expected one active ${kind} observer`)
      return found[0]
    },
    destroy() {
      for (const hook of hooks) if (hook.kind === 'effect') hook.cleanup?.()
      if (originalObserver === undefined) delete globalThis.IntersectionObserver
      else globalThis.IntersectionObserver = originalObserver
      if (originalHarness === undefined) delete globalThis[key]
      else globalThis[key] = originalHarness
    },
  }
  globalThis[key] = harness
  globalThis.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback
      this.options = options
      this.disconnected = false
      observers.push(this)
    }
    observe(target) { this.target = target }
    disconnect() { this.disconnected = true }
    enter(isIntersecting) {
      assert.equal(this.disconnected, false, 'cannot deliver to a cleaned up observer')
      this.callback([{ target: this.target, isIntersecting }])
      harness.flush()
    }
  }
  harness.flush()
  return harness
}

await test('inactive panels retain their poster without scheduling a video load', () => {
  const h = createHarness({ media, active: false })
  try {
    assert.equal(h.elements('img')[0].props.src, media.poster)
    assert.equal(h.elements('video').length, 0)
    assert.equal(h.observers.length, 0)
    h.update({ active: true })
    const loading = h.observer('load')
    assert.equal(loading.target, h.root)
    loading.enter(false)
    assert.equal(h.elements('video').length, 0, 'outside the preload margin stays poster-only')
    h.update({ active: false })
    assert.equal(loading.disconnected, true, 'deselection cancels pending loading')
    assert.equal(h.video.playCalls, 0)
  } finally { h.destroy() }
})

await test('loaded active panels play only while visible, and deselection or cleanup pauses them', () => {
  const h = createHarness({ media })
  try {
    const loading = h.observer('load')
    loading.enter(true)
    assert.equal(loading.disconnected, true)
    const element = h.elements('video')[0]
    assert.equal(element.props.src, media.video)
    assert.equal(element.props.muted, true)
    assert.equal(element.props.loop, true)
    assert.equal(element.props.playsInline, true)
    assert.equal(h.video.playCalls, 0, 'preloading does not start playback')
    const playback = h.observer('play')
    playback.enter(false)
    assert.equal(h.video.playing, false)
    playback.enter(true)
    assert.equal(h.video.playing, true)
    assert.equal(h.video.playCalls, 1)
    playback.enter(false)
    assert.equal(h.video.playing, false)
    playback.enter(true)
    h.update({ active: false })
    assert.equal(h.video.playing, false)
    assert.equal(playback.disconnected, true)
    assert.equal(h.observers.filter(observer => !observer.disconnected).length, 0)
    const previousPlays = h.video.playCalls
    h.update({ active: true })
    assert.equal(h.observers.filter(observer => observer.options.rootMargin).length, 1, 'a loaded panel does not reload')
    assert.equal(h.video.playCalls, previousPlays, 'reselection waits for visibility')
    const resumed = h.observer('play')
    resumed.enter(true)
    assert.equal(h.video.playing, true)
  } finally { h.destroy() }
  assert.equal(h.video.playing, false, 'unmount pauses playback')
  assert.equal(h.observers.filter(observer => !observer.disconnected).length, 0, 'unmount releases all observers')
})

await test('reduced motion always preserves the poster and avoids or stops the video', () => {
  const h = createHarness({ media, active: true }, true)
  try {
    assert.equal(h.elements('img')[0].props.src, media.poster)
    assert.equal(h.elements('video').length, 0)
    assert.equal(h.observers.length, 0)
    h.update({}, false)
    h.observer('load').enter(true)
    h.observer('play').enter(true)
    assert.equal(h.video.playing, true)
    h.update({}, true)
    assert.equal(h.elements('video').length, 0)
    assert.equal(h.elements('img')[0].props.src, media.poster)
    assert.equal(h.video.playing, false)
    assert.equal(h.observers.filter(observer => !observer.disconnected).length, 0)
  } finally { h.destroy() }
})

await test('a failed video returns to its poster and releases playback', () => {
  const h = createHarness({ media, active: true })
  try {
    h.observer('load').enter(true)
    h.observer('play').enter(true)
    h.elements('video')[0].props.onError()
    h.flush()
    assert.equal(h.elements('video').length, 0)
    assert.equal(h.elements('img')[0].props.src, media.poster)
    assert.equal(h.video.playing, false)
    assert.equal(h.observers.filter(observer => !observer.disconnected).length, 0)
  } finally { h.destroy() }
})
