import { useEffect } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SiteHeader } from './components/SiteHeader/SiteHeader'
import { SiteFooter } from './components/SiteFooter/SiteFooter'
import { HomePage } from './pages/HomePage'
import { PricingPage } from './pages/PricingPage'
import { routes, scrollToRouteTarget, useRoutePath } from './lib/router'

/** How long after a route change anchor alignment keeps correcting itself. */
const ANCHOR_SETTLE_MS = 1500
/** Interval between those corrections. */
const ANCHOR_RETRY_MS = 120

function App() {
  const path = useRoutePath()

  useEffect(() => {
    // A route swap replaces everything between the header and the footer,
    // so every ScrollTrigger measured against the outgoing page is stale.
    // Child effects run before this one, so the incoming page's triggers
    // already exist by the time this refreshes.
    //
    // Order matters: `refresh()` restores the scroll offset it recorded on
    // entry, so moving to the new route's anchor has to happen after it,
    // not in the click handler that started the navigation.
    ScrollTrigger.refresh()
    scrollToRouteTarget('instant')

    if (!window.location.hash) return

    // A deep anchor is not done being aimed at. The homepage keeps growing
    // for a moment after mount as its media resolves, and a single jump
    // gets clamped to the shorter document it saw — a visitor heading for
    // #contact lands well above it. Re-aim on a short interval while that
    // settles, and hand control straight back the moment they scroll.
    let cancelled = false
    let timer = 0
    const cancel = () => {
      cancelled = true
      window.clearTimeout(timer)
    }

    const deadline = performance.now() + ANCHOR_SETTLE_MS
    const realign = () => {
      if (cancelled) return
      scrollToRouteTarget('instant')
      if (performance.now() < deadline) {
        timer = window.setTimeout(realign, ANCHOR_RETRY_MS)
      }
    }
    timer = window.setTimeout(realign, ANCHOR_RETRY_MS)

    window.addEventListener('wheel', cancel, { passive: true })
    window.addEventListener('touchstart', cancel, { passive: true })
    window.addEventListener('keydown', cancel)

    return () => {
      cancel()
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchstart', cancel)
      window.removeEventListener('keydown', cancel)
    }
  }, [path])

  return (
    <>
      <SiteHeader />
      <main>
        {path === routes.pricing ? <PricingPage /> : <HomePage />}
      </main>
      <SiteFooter />
    </>
  )
}

export default App
