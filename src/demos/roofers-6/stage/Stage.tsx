import { useEffect, useRef, useState } from 'react'
import type { RoofEngine } from '../engine/RoofEngine'

const poster = '/demos/roofers-6/hero-poster.jpg'
const posterNarrow = '/demos/roofers-6/hero-poster-mobile.jpg'

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

interface StageProps {
  reducedMotion: boolean
  onEngine: (engine: RoofEngine | null) => void
  onUnavailable: () => void
}

/**
 * The fixed canvas behind the page. The engine loads after first paint as
 * its own chunk; until its first frame the matching still holds the place,
 * and it stays as the fallback if WebGL is unavailable or lost.
 */
export default function Stage({ reducedMotion, onEngine, onUnavailable }: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!webglAvailable()) { onUnavailable(); return }
    let engine: RoofEngine | null = null
    let cancelled = false
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const small = Math.min(window.innerWidth, window.innerHeight) < 600
    const resize = () => engine?.resize(window.innerWidth, Math.max(window.innerHeight, document.documentElement.clientHeight))
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      engine?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1)
    }
    const lost = () => { onEngine(null); onUnavailable(); setReady(false) }

    const start = () => import('../engine/RoofEngine').then(({ RoofEngine }) => {
      if (cancelled) return
      try {
        engine = new RoofEngine(canvas, { quality: coarse || small ? 'low' : 'high', reducedMotion })
      } catch {
        onUnavailable()
        return
      }
      resize()
      engine.whenRendered(() => { if (!cancelled) setReady(true) })
      onEngine(engine)
      if (import.meta.env.DEV) (window as unknown as { stratum?: RoofEngine }).stratum = engine
    }).catch(() => onUnavailable())

    // Let the first paint and fonts land before compiling shaders.
    const idle = typeof window.requestIdleCallback === 'function'
      ? { id: window.requestIdleCallback(start, { timeout: 900 }), idle: true }
      : { id: setTimeout(start, 200) as unknown as number, idle: false }
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', pointer, { passive: true })
    canvas.addEventListener('engine-lost', lost)
    return () => {
      cancelled = true
      if (idle.idle) window.cancelIdleCallback(idle.id)
      else clearTimeout(idle.id)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', pointer)
      canvas.removeEventListener('engine-lost', lost)
      onEngine(null)
      engine?.dispose()
    }
  }, [reducedMotion, onEngine, onUnavailable])

  return <div className={`st-stage ${ready ? 'is-ready' : ''}`} aria-hidden="true">
    <picture className="st-stage-poster">
      <source media="(max-width: 899px)" srcSet={posterNarrow} />
      <img src={poster} alt="" width="1920" height="1200" fetchPriority="high" />
    </picture>
    <canvas ref={canvasRef} />
    <div className="st-stage-vignette" />
  </div>
}
