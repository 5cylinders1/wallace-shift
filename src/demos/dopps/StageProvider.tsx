import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { MEDIA } from './content'
import { SpineStage, type Hit, type Shot } from './engine/SpineStage'
import { StageContext, type StageApi } from './stage-context'

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * The fixed, full-screen 3D layer behind the hero, the tour and the symptom guide.
 * It only renders while that part of the page is on screen.
 */
export default function StageProvider({ children, scope }: { children: ReactNode; scope: RefObject<HTMLElement | null> }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<SpineStage | null>(null)
  const pending = useRef<Shot | null>(null)
  const selectHandler = useRef<((hit: Hit) => void) | null>(null)
  const [status, setStatus] = useState<StageApi['status']>('loading')
  const [visible, setVisible] = useState(true)
  const [tip, setTip] = useState<{ hit: Hit; x: number; y: number } | null>(null)

  useEffect(() => {
    if (!canvas.current) return
    if (!webglAvailable()) {
      // Decided once on mount; the poster stands in for the model.
      queueMicrotask(() => setStatus('fallback'))
      return
    }
    let disposed = false
    const instance = new SpineStage(canvas.current)
    stage.current = instance
    if (pending.current) instance.setShot(pending.current)
    instance.onHover = (hit, x, y) => setTip(hit ? { hit, x, y } : null)
    instance.onSelect = (hit) => selectHandler.current?.(hit)
    instance.start()
    instance.load(`${MEDIA}/spine.glb`, `${MEDIA}/draco/`)
      .then(() => { if (!disposed) setStatus('ready') })
      .catch(() => { if (!disposed) setStatus('fallback') })
    // Debug hook for headless checks, where requestAnimationFrame may not run.
    ;(window as unknown as { dopps?: SpineStage }).dopps = instance
    return () => {
      disposed = true
      instance.dispose()
      stage.current = null
    }
  }, [])

  // Pause and hide the layer once the solid sections cover it.
  useEffect(() => {
    const el = scope.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting)
      stage.current?.setActive(entry.isIntersecting)
      if (!entry.isIntersecting) setTip(null)
    })
    observer.observe(el)
    // The label belongs to whatever is under the pointer, which scrolling changes.
    const clear = () => setTip(null)
    window.addEventListener('scroll', clear, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', clear)
    }
  }, [scope])

  const setShot = useCallback((shot: Shot) => {
    pending.current = shot
    stage.current?.setShot(shot)
  }, [])

  const onSelect = useCallback((handler: ((hit: Hit) => void) | null) => { selectHandler.current = handler }, [])

  const api = useMemo(() => ({ setShot, onSelect, status }), [setShot, onSelect, status])

  return (
    <StageContext.Provider value={api}>
      <div className="dp-stage" data-status={status} data-visible={visible || undefined} aria-hidden="true">
        <img className="dp-stage-poster" src={`${MEDIA}/spine-poster.webp`} alt="" width="560" height="1040" />
        <canvas ref={canvas} className="dp-stage-canvas" />
      </div>
      {tip && (
        <div className="dp-tip" style={{ transform: `translate(${tip.x + 16}px, ${tip.y + 14}px)` }} aria-hidden="true">
          <strong>{tip.hit.label}</strong>
          <span>{tip.hit.region === 'sacral' ? 'Sacral' : tip.hit.region.charAt(0).toUpperCase() + tip.hit.region.slice(1)} · click to explore</span>
        </div>
      )}
      {children}
    </StageContext.Provider>
  )
}
