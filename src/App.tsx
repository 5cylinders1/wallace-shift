import { Suspense, lazy, useEffect, type ComponentType, type ReactElement } from 'react'
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
import { PIT_STOP_EXPERIMENT_PATH, WATER_HERO_EXPERIMENT_PATH } from './content/routeMeta'

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

/**
 * Experimental routes, kept apart from the site proper on purpose.
 *
 * They load on demand and render without the site header and footer.
 * The homepage separately lazy-loads the water scene for eligible desktops;
 * mobile visitors keep the existing video and do not load its WebGL chunk.
 * The experiment still owns its review controls and noindex metadata.
 */
const WaterHeroExperimentPage = lazy(() =>
  import('./pages/WaterHeroExperimentPage').then((module) => ({
    default: module.WaterHeroExperimentPage,
  })),
)

const PitStopExperimentPage = lazy(() =>
  import('./pages/PitStopExperimentPage').then((module) => ({
    default: module.PitStopExperimentPage,
  })),
)

const experiments: Record<string, ComponentType> = {
  [WATER_HERO_EXPERIMENT_PATH]: WaterHeroExperimentPage,
  [PIT_STOP_EXPERIMENT_PATH]: PitStopExperimentPage,
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

  const Experiment = experiments[path]
  if (Experiment) {
    return (
      <main id="main">
        <Suspense fallback={null}>
          <Experiment />
        </Suspense>
      </main>
    )
  }

  const Page = pages[path] ?? NotFoundPage

  return (
    <>
      <SiteHeader />
      <main id="main">
        <Page />
      </main>
      {path !== '/' && <SiteFooter />}
    </>
  )
}

export default App
