import { useEffect, type ReactNode } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { PageId } from './routes'
import { SiteHeader } from './components/SiteHeader'

/** How long after load a late layout change (fonts, the timelapse's pin) may still move the section. */
const SETTLE_MS = 2500

/**
 * A link from another page to a section here (/northvane#estimate, say)
 * arrives before the section exists: the page renders in the browser, so
 * the browser's own jump finds nothing and stays at the top. Once the page
 * has rendered, go to the section, and again whenever the layout above it
 * changes (fonts, the timelapse settling, its pin spacing), until the
 * visitor scrolls themselves or the page has had time to settle.
 */
function useArrivalAtSection() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id || id === 'top') return
    let stopped = false
    const go = () => {
      if (!stopped) document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
    const resized = new ResizeObserver(go)
    const stop = () => {
      stopped = true
      resized.disconnect()
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
      window.removeEventListener('pointerdown', stop)
      ScrollTrigger.removeEventListener('refresh', go)
      window.clearTimeout(timer)
    }
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    window.addEventListener('pointerdown', stop)
    ScrollTrigger.addEventListener('refresh', go)
    resized.observe(document.body)
    const frame = window.requestAnimationFrame(go)
    void document.fonts?.ready.then(go)
    const timer = window.setTimeout(stop, SETTLE_MS)
    return () => {
      window.cancelAnimationFrame(frame)
      stop()
    }
  }, [])
}

/**
 * What every Northvane page shares: the skip link and the header. The page
 * itself (pages/) brings its main content, footer and phone action bar, so
 * each document loads only its own sections (main.tsx, info.tsx).
 */
export function RoofersApp({ page, children }: { page: PageId; children: ReactNode }) {
  useArrivalAtSection()
  return (
    <>
      <a className="rf-skip-link" href={page === 'home' ? '#estimator' : '#main'}>
        {page === 'home' ? 'Skip to the roof estimator' : 'Skip to content'}
      </a>
      <span id="top" />
      <SiteHeader page={page} />
      {children}
    </>
  )
}
