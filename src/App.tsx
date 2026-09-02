import { useEffect, type ReactElement } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SiteHeader } from './components/SiteHeader/SiteHeader'
import { SiteFooter } from './components/SiteFooter/SiteFooter'
import { HomePage } from './pages/HomePage'
import { ServicesPage } from './pages/ServicesPage'
import { PricingPage } from './pages/PricingPage'
import { ApproachPage } from './pages/ApproachPage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { scrollToRouteTarget, useRoutePath } from './lib/router'

const pages: Record<string, () => ReactElement> = {
  '/': HomePage,
  '/services': ServicesPage,
  '/pricing': PricingPage,
  '/approach': ApproachPage,
  '/about': AboutPage,
  '/contact': ContactPage,
  '/privacy': PrivacyPage,
  '/404': NotFoundPage,
}

function App() {
  const path = useRoutePath()

  useEffect(() => {
    // A route swap replaces everything between the header and the footer,
    // so every ScrollTrigger measured against the outgoing page is stale.
    // Child effects run before this one, so the incoming page's triggers
    // already exist by the time this refreshes.
    //
    // Order matters: `refresh()` restores the scroll offset it recorded on
    // entry, so moving to the new route's position has to happen after it.
    //
    // This used to be followed by 1.5 seconds of repeated re-aiming, to
    // compensate for navigation links that pointed at anchors deep inside
    // a homepage still growing as its media resolved. Those links are now
    // pages, so there is no moving target and no need to chase one.
    ScrollTrigger.refresh()
    scrollToRouteTarget('instant')
  }, [path])

  const Page = pages[path] ?? NotFoundPage

  return (
    <>
      <SiteHeader />
      <main id="main">
        <Page />
      </main>
      <SiteFooter />
    </>
  )
}

export default App
