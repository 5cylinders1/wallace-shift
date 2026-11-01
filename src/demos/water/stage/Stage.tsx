import { useEffect, useRef, useState } from 'react'
import type { WaterEngine } from '../engine/WaterEngine'

function webglAvailable(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

interface StageProps {
  reducedMotion: boolean
  onEngine: (engine: WaterEngine | null) => void
  onUnavailable: () => void
}

/**
 * The fixed canvas behind the 3D chapters. The engine loads after first paint
 * as its own chunk; a rendered still of the same shot holds the place until
 * then, and stays as the fallback if WebGL is unavailable or lost.
 */
export default function Stage({ reducedMotion, onEngine, onUnavailable }: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!webglAvailable()) { onUnavailable(); return }
    let engine: WaterEngine | null = null
    let cancelled = false
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const small = Math.min(window.innerWidth, window.innerHeight) < 600
    const resize = () => engine?.resize(window.innerWidth, Math.max(window.innerHeight, document.documentElement.clientHeight))
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      engine?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1)
    }
    const lost = () => { onEngine(null); onUnavailable(); setReady(false) }

    // Drag anywhere that isn't a control to look around the model.
    let dragging: { x: number; y: number; id: number } | null = null
    const interactive = 'a, button, input, select, textarea, label, summary, [role="radiogroup"], .rf-light'
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || (event.target as Element).closest?.(interactive)) return
      dragging = { x: event.clientX, y: event.clientY, id: event.pointerId }
    }
    const move = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragging.id) return
      const dx = event.clientX - dragging.x
      const dy = event.clientY - dragging.y
      dragging.x = event.clientX
      dragging.y = event.clientY
      // A vertical touch drag is a scroll; only a sideways one turns the model.
      if (event.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) return
      engine?.orbitBy(-dx, event.pointerType === 'touch' ? 0 : dy)
    }
    const up = () => { dragging = null }

    const start = async () => {
      // The badge on the tank is drawn to a canvas, so its font must be ready first.
      await Promise.race([document.fonts.load('500 92px Newsreader'), new Promise((done) => setTimeout(done, 500))]).catch(() => undefined)
      const { WaterEngine } = await import('../engine/WaterEngine')
      if (cancelled) return
      try {
        engine = new WaterEngine(canvas, { quality: coarse || small ? 'low' : 'high', reducedMotion })
      } catch {
        onUnavailable()
        return
      }
      resize()
      engine.whenRendered(() => { if (!cancelled) setReady(true) })
      onEngine(engine)
      if (import.meta.env.DEV) (window as unknown as { riffle?: WaterEngine }).riffle = engine
      await engine.load()
    }

    // Let the first paint and fonts land before compiling shaders.
    const begin = () => { start().catch(() => { if (!cancelled) onUnavailable() }) }
    const idle = typeof window.requestIdleCallback === 'function'
      ? { id: window.requestIdleCallback(begin, { timeout: 900 }), idle: true }
      : { id: setTimeout(begin, 200) as unknown as number, idle: false }
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', pointer, { passive: true })
    window.addEventListener('pointerdown', down, { passive: true })
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up, { passive: true })
    window.addEventListener('pointercancel', up, { passive: true })
    canvas.addEventListener('engine-lost', lost)
    return () => {
      cancelled = true
      if (idle.idle) window.cancelIdleCallback(idle.id)
      else clearTimeout(idle.id)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', pointer)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      canvas.removeEventListener('engine-lost', lost)
      onEngine(null)
      engine?.dispose()
    }
  }, [reducedMotion, onEngine, onUnavailable])

  return <div className={`rf-stage ${ready ? 'is-ready' : ''}`} aria-hidden="true">
    <picture className="rf-stage-poster">
      <source media="(max-width: 899px)" srcSet="/demos/water/poster-narrow.webp" />
      <img src="/demos/water/poster.webp" alt="" width="1920" height="1200" fetchPriority="high" />
    </picture>
    <canvas ref={canvasRef} />
    <div className="rf-stage-scrim" />
  </div>
}
