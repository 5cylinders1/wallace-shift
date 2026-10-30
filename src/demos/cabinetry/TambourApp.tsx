import { useEffect, useRef } from 'react'
import { titles } from './content'
import { usePageMotion } from './motion'
import { scrollToHash, usePage } from './routes'
import { Footer, Header } from './components/Chrome'
import ConsultationPage from './pages/ConsultationPage'
import Home from './pages/Home'
import InvestmentPage from './pages/InvestmentPage'
import PhotographyPage from './pages/PhotographyPage'
import RoomPage from './pages/RoomPage'
import WorkshopPage from './pages/WorkshopPage'

export default function TambourApp() {
  const page = usePage()
  const first = useRef(true)

  useEffect(() => {
    document.title = titles[page.kind]
    // After an in-document navigation, move focus to the new page's heading
    // so keyboard and screen reader users land where sighted users do.
    if (first.current) { first.current = false; if (window.location.hash) scrollToHash(window.location.hash); return }
    if (!window.location.hash) document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
  }, [page.kind])

  usePageMotion(page.kind)

  return <div className={`tb-site is-${page.kind}`}>
    <a className="tb-skip" href="#main">Skip to content</a>
    <Header page={page} />
    {page.kind === 'home' && <Home />}
    {(page.kind === 'kitchens' || page.kind === 'baths' || page.kind === 'built-ins') && <RoomPage key={page.kind} page={page.kind} />}
    {page.kind === 'workshop' && <WorkshopPage />}
    {page.kind === 'investment' && <InvestmentPage />}
    {page.kind === 'consultation' && <ConsultationPage />}
    {page.kind === 'photography' && <PhotographyPage />}
    <Footer />
  </div>
}
