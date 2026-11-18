import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { business } from './data'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const mediaPath = '/demos/best-tailor/media/cinematic'
const fallbackPoster = `${mediaPath}/poster.webp`
type Manifest = { frameCount: number; width: number; height: number; poster: string; frames: string[] }
type Frame = { image: CanvasImageSource; release: () => void }
type Job<T> = { index: number; resolve: (value: T) => void; reject: (reason: unknown) => void }

function mediaUrl(path: string) {
  const url = new URL(path, `${window.location.origin}${mediaPath}/`)
  if (url.origin !== window.location.origin || !url.pathname.startsWith(`${mediaPath}/`)) throw new Error('Invalid cinematic asset path')
  return url.href
}

function readManifest(value: unknown): Manifest {
  const item = value as Partial<Manifest> | null
  if (!item || !Number.isInteger(item.frameCount) || item.frameCount! < 2 || item.frameCount! > 500
    || !Number.isFinite(item.width) || !Number.isFinite(item.height) || item.width! < 1 || item.height! < 1
    || item.width! > 4096 || item.height! > 4096 || typeof item.poster !== 'string'
    || !Array.isArray(item.frames) || item.frames.length !== item.frameCount
    || !item.frames.every(frame => typeof frame === 'string')) throw new Error('Invalid cinematic manifest')
  return { frameCount: item.frameCount!, width: item.width!, height: item.height!, poster: mediaUrl(item.poster), frames: item.frames.map(mediaUrl) }
}

// Compressed frames can be prefetched; only a small moving window is decoded.
function createSequence(manifest: Manifest, signal: AbortSignal, onFailure: () => void) {
  const blobs = new Map<number, Blob>()
  const frames = new Map<number, Frame>()
  const fetchPromises = new Map<number, Promise<Blob>>()
  const decodePromises = new Map<number, Promise<Frame | null>>()
  const fetchQueue: Job<Blob>[] = []
  const decodeQueue: Job<Frame | null>[] = []
  const listeners = new Set<(index: number) => void>()
  const cacheLimit = window.innerWidth <= 600 ? 16 : 22
  const decodeWidth = Math.min(manifest.width, window.innerWidth <= 600 ? 960 : 1280)
  let fetchActive = 0
  let decodeActive = 0
  let target = 0
  let disposed = false
  const last = manifest.frameCount - 1

  function prioritize<T>(queue: Job<T>[], index: number) {
    const position = queue.findIndex(job => job.index === index)
    if (position > 0) queue.unshift(...queue.splice(position, 1))
  }

  function pumpFetch() {
    while (!disposed && fetchActive < 4 && fetchQueue.length) {
      const job = fetchQueue.shift()!
      fetchActive++
      fetch(manifest.frames[job.index], { signal, cache: 'force-cache' }).then(response => {
        if (!response.ok) throw new Error('Cinematic frame unavailable')
        return response.blob()
      }).then(blob => { if (!disposed) blobs.set(job.index, blob); job.resolve(blob) }, error => {
        job.reject(error)
        if (!disposed && !signal.aborted) onFailure()
      }).finally(() => { fetchActive--; pumpFetch() })
    }
  }

  function getBlob(index: number, priority = false) {
    const cached = blobs.get(index)
    if (cached) return Promise.resolve(cached)
    const pending = fetchPromises.get(index)
    if (pending) { if (priority) prioritize(fetchQueue, index); return pending }
    const promise = new Promise<Blob>((resolve, reject) => {
      const job = { index, resolve, reject }
      if (priority) fetchQueue.unshift(job)
      else fetchQueue.push(job)
    })
    fetchPromises.set(index, promise)
    pumpFetch()
    return promise
  }

  async function decode(blob: Blob): Promise<Frame> {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(blob, { resizeWidth: decodeWidth, resizeQuality: 'high' })
      return { image: bitmap, release: () => bitmap.close() }
    }
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.src = url
    try { await image.decode() } catch (error) { URL.revokeObjectURL(url); throw error }
    return { image, release: () => { image.src = ''; URL.revokeObjectURL(url) } }
  }

  function trim() {
    while (frames.size > cacheLimit) {
      const index = Array.from(frames.keys()).find(key => key !== 0 && key !== last && key !== target)
      if (index === undefined) break
      frames.get(index)!.release()
      frames.delete(index)
    }
  }

  function pumpDecode() {
    while (!disposed && decodeActive < 2 && decodeQueue.length) {
      const job = decodeQueue.shift()!
      if (Math.abs(job.index - target) > 10 && job.index !== 0 && job.index !== last) {
        decodePromises.delete(job.index)
        job.resolve(null)
        continue
      }
      decodeActive++
      getBlob(job.index, true).then(decode).then(frame => {
        if (disposed) { frame.release(); job.resolve(null); return }
        frames.set(job.index, frame)
        trim()
        job.resolve(frame)
        listeners.forEach(listener => listener(job.index))
      }, error => {
        job.reject(error)
        if (!disposed && !signal.aborted) onFailure()
      }).finally(() => { decodePromises.delete(job.index); decodeActive--; pumpDecode() })
    }
  }

  function request(index: number, priority = false) {
    if (disposed) return Promise.resolve(null)
    const cached = frames.get(index)
    if (cached) { frames.delete(index); frames.set(index, cached); return Promise.resolve(cached) }
    const pending = decodePromises.get(index)
    if (pending) { if (priority) { prioritize(decodeQueue, index); prioritize(fetchQueue, index) }; return pending }
    const promise = new Promise<Frame | null>((resolve, reject) => {
      const job = { index, resolve, reject }
      if (priority) decodeQueue.unshift(job)
      else decodeQueue.push(job)
    })
    decodePromises.set(index, promise)
    pumpDecode()
    return promise
  }

  return {
    manifest,
    get: (index: number) => frames.get(index),
    prepare: () => Promise.all([0, last, ...Array.from({ length: Math.min(7, last - 1) }, (_, index) => index + 1)].map(index => request(index, true))),
    prefetch: () => { for (let index = 0; index <= last; index++) void getBlob(index).catch(() => {}) },
    warm: (index: number) => {
      target = index
      void request(index, true).catch(() => {})
      for (let distance = 1; distance <= 6; distance++) {
        if (index + distance <= last) void request(index + distance).catch(() => {})
        if (index - distance >= 0) void request(index - distance).catch(() => {})
      }
    },
    subscribe: (listener: (index: number) => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    dispose: () => {
      disposed = true
      frames.forEach(frame => frame.release())
      frames.clear()
      blobs.clear()
      listeners.clear()
      decodeQueue.splice(0).forEach(job => job.resolve(null))
      fetchQueue.splice(0).forEach(job => job.reject(new DOMException('Sequence disposed', 'AbortError')))
      fetchPromises.clear()
      decodePromises.clear()
    },
  }
}

type Sequence = ReturnType<typeof createSequence>

export default function DressStory() {
  const section = useRef<HTMLElement>(null)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 600px)').matches)
  const [poster, setPoster] = useState(() => window.matchMedia('(max-width: 600px)').matches
    ? { src: `${mediaPath}/mobile/poster.webp`, width: 720, height: 1280 }
    : { src: fallbackPoster, width: 1920, height: 1080 })
  const [sequence, setSequence] = useState<Sequence | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [frameCount, setFrameCount] = useState(0)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const viewport = window.matchMedia('(max-width: 600px)')
    const change = () => { setSequence(null); setStatus('loading'); setReduced(preference.matches); setCompact(viewport.matches) }
    preference.addEventListener('change', change)
    viewport.addEventListener('change', change)
    return () => { preference.removeEventListener('change', change); viewport.removeEventListener('change', change) }
  }, [])

  useEffect(() => {
    let disposed = false
    let failed = false
    let runtime: Sequence | undefined
    const controller = new AbortController()
    const fail = () => {
      if (disposed || failed) return
      failed = true
      controller.abort()
      runtime?.dispose()
      setSequence(null)
      setStatus('fallback')
    }
    const loadPoster = async (src: string) => {
      const image = new Image()
      image.fetchPriority = 'high'
      image.src = src
      await image.decode()
      if (!disposed) setPoster({ src, width: image.naturalWidth, height: image.naturalHeight })
    }
    const defaultPoster = mediaUrl(compact ? 'mobile/poster.webp' : 'poster.webp')
    const posterReady = loadPoster(defaultPoster).catch(() => {})
    void (async () => {
      try {
        const response = await fetch(`${mediaPath}/${compact ? 'mobile/' : ''}manifest.json`, { signal: controller.signal })
        if (!response.ok) throw new Error('Cinematic sequence not available')
        const manifest = readManifest(await response.json())
        if (disposed) return
        setFrameCount(manifest.frameCount)
        await posterReady
        if (manifest.poster !== defaultPoster) await loadPoster(manifest.poster)
        if (disposed) return
        if (reduced) { setStatus('ready'); return }
        runtime = createSequence(manifest, controller.signal, fail)
        await runtime.prepare()
        if (disposed || failed) return
        setSequence(runtime)
        setStatus('ready')
        runtime.prefetch()
      } catch { if (!disposed) fail() }
    })()
    return () => { disposed = true; controller.abort(); runtime?.dispose() }
  }, [reduced, compact])

  useGSAP(() => {
    const root = section.current
    if (!root) return
    const media = root.querySelector<HTMLElement>('.bt-assembly-media')!
    const canvas = root.querySelector<HTMLCanvasElement>('.bt-assembly-canvas')!
    const context = canvas.getContext('2d', { alpha: false })
    root.dataset.reducedMotion = String(reduced)
    root.dataset.assemblyMode = 'static'
    root.dataset.assemblyReady = String(status !== 'loading')
    root.dataset.assemblyStart = '0'
    root.dataset.assemblyEnd = '0'
    root.dataset.assemblyProgress = '100'
    root.dataset.assemblyFrame = '-1'
    root.dataset.assemblyTargetFrame = '-1'
    root.dataset.assemblyFrameCount = String(frameCount)
    let displayed = -1
    let target = 0
    let disposed = false
    let redraw = 0
    let trigger: ScrollTrigger | undefined
    const dimensions = sequence?.manifest ?? poster

    function rectangle(frameIndex = target) {
      const width = media.clientWidth
      const height = media.clientHeight
      let scale = Math.max(width / dimensions.width, height / dimensions.height)
      // On portrait screens preserve the central gown rather than magnifying its edges out of view.
      if (window.innerWidth <= 600 && dimensions.width > dimensions.height) {
        const progress = sequence ? frameIndex / (sequence.manifest.frameCount - 1) : 1
        const subjectWidth = reduced ? .40 : progress <= .6 ? .84 - .14 * progress / .6 : .70 - .30 * (progress - .6) / .4
        scale = Math.min(scale, width / (dimensions.width * subjectWidth))
      }
      const drawWidth = dimensions.width * scale
      const drawHeight = dimensions.height * scale
      return { width, height, drawWidth, drawHeight, x: (width - drawWidth) / 2, y: (height - drawHeight) / 2 }
    }

    function paint(force = false) {
      if (disposed || reduced || !sequence || !context) return
      let frameIndex = target
      let frame = sequence.get(frameIndex)
      if (!frame && force && displayed >= 0) {
        frameIndex = displayed
        frame = sequence.get(frameIndex)
      }
      if (!frame) {
        if (force) {
          displayed = -1
          root!.dataset.assemblyFrame = '-1'
          root!.dataset.assemblyMode = 'static'
        }
        return
      }
      if (!force && frameIndex === displayed) return
      const rect = rectangle(frameIndex)
      const ratio = canvas.width / Math.max(rect.width, 1)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.fillStyle = '#20191a'
      context.fillRect(0, 0, rect.width, rect.height)
      context.drawImage(frame.image, rect.x, rect.y, rect.drawWidth, rect.drawHeight)
      displayed = frameIndex
      root!.dataset.assemblyFrame = String(displayed)
      root!.dataset.assemblyMode = 'cinematic'
    }

    function resize() {
      if (disposed) return
      const rect = rectangle()
      const ratio = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 600 ? 1.5 : 2)
      const width = Math.round(rect.width * ratio)
      const height = Math.round(rect.height * ratio)
      const changed = canvas.width !== width || canvas.height !== height
      if (canvas.width !== width) canvas.width = width
      if (canvas.height !== height) canvas.height = height
      root!.style.setProperty('--bt-cinematic-width', `${rect.drawWidth}px`)
      root!.style.setProperty('--bt-cinematic-height', `${rect.drawHeight}px`)
      root!.style.setProperty('--bt-cinematic-left', `${rect.x}px`)
      root!.style.setProperty('--bt-cinematic-top', `${rect.y}px`)
      paint(changed)
    }

    resize()
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(redraw)
      redraw = requestAnimationFrame(resize)
    })
    observer.observe(media)
    let unsubscribe: (() => void) | undefined
    if (sequence && !reduced && context) {
      root.dataset.assemblyReady = 'false'
      const playhead = { frame: 0 }
      const timeline = gsap.timeline({ defaults: { ease: 'none' } })
      timeline.fromTo(playhead, { frame: 0 }, { frame: sequence.manifest.frameCount - 1, duration: 100, onUpdate: () => {
        const next = Math.round(playhead.frame)
        if (next !== target) { target = next; sequence.warm(target) }
        root.dataset.assemblyTargetFrame = String(target)
        paint()
      } }, 0)
      timeline.to('.bt-assembly-intro', { opacity: 0, y: -14, duration: 10 }, 8)
      timeline.fromTo('.bt-assembly-detail', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 9 }, 35)
      timeline.to('.bt-assembly-detail', { opacity: 0, y: -14, duration: 9 }, 65)
      timeline.fromTo('.bt-assembly-finale', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 9 }, 82)
      timeline.fromTo('.bt-assembly-progress-fill', { scaleX: 0 }, { scaleX: 1, duration: 100 }, 0)
      trigger = ScrollTrigger.create({
        trigger: root, animation: timeline, pin: true, scrub: true, invalidateOnRefresh: true,
        start: () => `top ${root.closest('.bt-site')?.querySelector('.bt-header')?.getBoundingClientRect().height ?? 0}px`,
        end: () => `+=${Math.round(root.clientHeight * 3.2)}`,
        onUpdate: self => { root.dataset.assemblyProgress = (self.progress * 100).toFixed(3) },
        onRefresh: self => {
          root.dataset.assemblyStart = String(self.start)
          root.dataset.assemblyEnd = String(self.end)
          root.dataset.assemblyProgress = (self.progress * 100).toFixed(3)
        },
      })
      unsubscribe = sequence.subscribe(index => { if (index === target) paint() })
      sequence.warm(target)
      paint()
      root.dataset.assemblyTargetFrame = String(target)
      root.dataset.assemblyReady = 'true'
      document.fonts.ready.then(() => { if (!disposed) { trigger?.refresh(); resize() } })
    }
    return () => {
      disposed = true
      observer.disconnect()
      cancelAnimationFrame(redraw)
      unsubscribe?.()
      root.dataset.assemblyMode = 'static'
    }
  }, { scope: section, dependencies: [sequence, reduced, status, poster, frameCount], revertOnUpdate: true })

  return <section ref={section} className="bt-assembly" aria-labelledby="hero-title" aria-describedby="assembly-description" data-assembly-progress="100" data-assembly-frame="-1" data-assembly-frame-count={frameCount} data-assembly-start="0" data-assembly-end="0" data-assembly-ready="false" data-assembly-mode="static" data-reduced-motion={reduced} data-poster-kind="cinematic">
    <h1 id="hero-title" className="bt-assembly-sr">Look incredible. Feel completely you.</h1>
    <p id="assembly-description" className="bt-assembly-sr">Personal dress alterations and thoughtful repairs, by appointment in Overland Park. An illustrative film follows the flowing fabric and details of a gown. Ask Sue about the fit, timing, and alterations for your own dress.</p>
    <div className="bt-assembly-stage">
      <div className="bt-assembly-media" role="img" aria-label="Illustrative ivory gown in warm studio light">
        <img className="bt-assembly-poster bt-assembly-finished" src={poster.src} alt="" width={poster.width} height={poster.height} fetchPriority="high" />
        <canvas className="bt-assembly-canvas" aria-hidden="true" />
      </div>
      <div className="bt-assembly-copy bt-assembly-intro" aria-hidden="true">
        <p className="bt-assembly-title"><span className="bt-assembly-lead"><span>Look</span>{' '}<span>incredible.</span></span>{' '}<em>Feel completely you.</em></p>
        <p className="bt-assembly-body">For the aisle, the evening, and the everyday.</p>
      </div>
      <div className="bt-assembly-copy bt-assembly-detail" aria-hidden="true"><p className="bt-assembly-title">Every detail.<br /><em>A little more you.</em></p></div>
      <div className="bt-assembly-copy bt-assembly-finale" aria-hidden="true"><p className="bt-assembly-title">Ready for<br /><em>your moment.</em></p></div>
      <div className="bt-assembly-contact">
        <a className="bt-button bt-button-burgundy" href="#request-fitting">Request a fitting <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" /></svg></a>
        <a className="bt-assembly-call" href={business.phoneHref}>Or call {business.phone}</a>
        <p>By appointment only · Overland Park</p>
      </div>
      <div className="bt-assembly-footer" aria-hidden="true">
        <span className="bt-assembly-scroll">A little closer, with every scroll <svg viewBox="0 0 16 20" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M8 1v17m-5-5 5 5 5-5" /></svg></span>
        <div className="bt-assembly-progress"><span className="bt-assembly-progress-fill" /></div>
        <span className="bt-assembly-caption">An illustrative gown</span>
      </div>
    </div>
  </section>
}
