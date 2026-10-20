import { useEffect, useRef, useState } from 'react'
import type { FoundationEngine } from '../engine/FoundationEngine'

const poster = '/demos/foundation/hero-poster.jpg'
const posterNarrow = '/demos/foundation/hero-poster-mobile.jpg'

function webglAvailable(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

interface StageProps {
  reducedMotion: boolean
  onEngine: (engine: FoundationEngine | null) => void
  onUnavailable: () => void
}

/**
 * The fixed canvas behind the home page. The engine loads after first paint
 * as its own chunk; until its first frame the matching still holds the place,
 * and it stays as the fallback if WebGL is unavailable or lost.
 */
export default function Stage({ reducedMotion, onEngine, onUnavailable }: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!webglAvailable()) { onUnavailable(); return }
    let engine: FoundationEngine | null = null
    let cancelled = false
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const small = Math.min(window.innerWidth, window.innerHeight) < 600
    const resize = () => engine?.resize(window.innerWidth, Math.max(window.innerHeight, document.documentElement.clientHeight))
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      engine?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1)
    }
    const lost = () => { onEngine(null); onUnavailable(); setReady(false) }

    const start = () => import('../engine/FoundationEngine').then(({ FoundationEngine }) => {
      if (cancelled) return
      try {
        engine = new FoundationEngine(canvas, { quality: coarse || small ? 'low' : 'high', reducedMotion })
      } catch {
        onUnavailable()
        return
      }
      resize()
      engine.whenRendered(() => { if (!cancelled) setReady(true) })
      onEngine(engine)
      if (import.meta.env.DEV) (window as unknown as { datum?: FoundationEngine }).datum = engine
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

  return <div className={`dt-stage ${ready ? 'is-ready' : ''}`} aria-hidden="true">
    <picture className="dt-stage-poster">
      <source media="(max-width: 899px)" srcSet={posterNarrow} />
      <img src={poster} alt="" width="1920" height="1200" fetchPriority="high" />
    </picture>
    <canvas ref={canvasRef} />
  </div>
}
