import { Suspense, lazy, useEffect, type ComponentType, type ReactElement } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SiteHeader } from './components/SiteHeader/SiteHeader'
import { SiteFooter } from './components/SiteFooter/SiteFooter'
import { HomePage } from './pages/HomePage'
import { ShowcasePage } from './pages/ShowcasePage'
import { ServicesPage } from './pages/ServicesPage'
import { ServiceLandingPage } from './pages/ServiceLandingPage'
import { serviceLandingPages } from './content/serviceLandingPages'
import { PricingPage } from './pages/PricingPage'
import { ApproachPage } from './pages/ApproachPage'
import { AboutPage } from './pages/AboutPage'
import { ContactPage } from './pages/ContactPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { AiOfferPage } from './pages/AiOfferPage'
import { ContractorOfferPage } from './pages/ContractorOfferPage'
import { contractorOfferForPath } from './content/contractorOffers'
import { WhatNowPage } from './pages/WhatNowPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { scrollToRouteTarget, useRoutePath } from './lib/router'
import { AI_OFFER_CONFIRMATION_PATH, AI_OFFER_PATH, PIT_STOP_EXPERIMENT_PATH, SHOWCASE_PATH, WATER_HERO_EXPERIMENT_PATH, WHAT_NOW_PATH } from './content/routeMeta'

const pages: Record<string, () => ReactElement> = {
  ...Object.fromEntries(serviceLandingPages.map(service => [service.path, () => <ServiceLandingPage service={service} />])),
  '/': HomePage,
  [SHOWCASE_PATH]: ShowcasePage,
  '/services': ServicesPage,
  '/pricing': PricingPage,
  '/approach': ApproachPage,
  '/about': AboutPage,
  '/contact': ContactPage,
  '/privacy': PrivacyPage,
  [AI_OFFER_PATH]: AiOfferPage,
  [AI_OFFER_CONFIRMATION_PATH]: AiOfferPage,
  [WHAT_NOW_PATH]: WhatNowPage,
  '/404': NotFoundPage,
}

/**
 * Experimental routes, kept apart from the site proper on purpose.
 *
 * They load on demand and render without the site header and footer.
 * The showcase separately lazy-loads the water scene for eligible desktops;
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

const ClientPortal = lazy(() => import('./client-portal/ClientPortal').then(module => ({ default: module.ClientPortal })))
const MailApp = lazy(() => import('./mail/MailApp').then(module => ({ default: module.MailApp })))

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
  const contractorOffer = contractorOfferForPath(path)
  if (contractorOffer) return <ContractorOfferPage key={contractorOffer.id} offerId={contractorOffer.id} />
  if (path === '/mail') return <Suspense fallback={<p role="status">Loading Wallace Shift Mail…</p>}><MailApp /></Suspense>
  if (path === AI_OFFER_PATH || path === AI_OFFER_CONFIRMATION_PATH) return <AiOfferPage />
  if (path === '/client-portal') return <Suspense fallback={<p role="status">Loading client portal…</p>}><ClientPortal /></Suspense>
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
      {path !== SHOWCASE_PATH && <SiteFooter />}
    </>
  )
}

export default App
