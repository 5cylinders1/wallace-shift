import { lazy, Suspense, useEffect, useRef, useSyncExternalStore } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Hero } from './Hero'
import { HeroContactProvider } from './HeroContactProvider'
import { BrandStatement } from '../BrandStatement/BrandStatement'
import { WaterHeroErrorBoundary } from '../experiments/water-hero/WaterHeroErrorBoundary'
import { LoadingFallback } from '../experiments/water-hero/LoadingFallback'
import { getInteractiveHomeHeroSnapshot, getStaticHomeHeroSnapshot, subscribeInteractiveHomeHero } from './homeHeroDisplay'

// Both mobile and desktop load the scene on demand. Reduced-motion visitors
// keep the lightweight still without fetching the Three.js scene chunk.
const InteractiveHero = lazy(() => import('../experiments/water-hero/WaterHeroExperiment')
  .then(module => ({ default: module.WaterHeroExperiment })))

// Keep the complete composition available when animation is unavailable.
function StaticHeroSequence() {
  return <><Hero posterOnly appearance="studio" /><BrandStatement /></>
}

function LoadingHeroSequence() {
  return <><section className="hero-loading-shell" aria-label="Loading the homepage">
    <LoadingFallback visible />
  </section><BrandStatement /></>
}

export function HomeHero() {
  const container = useRef<HTMLDivElement>(null)
  const interactive = useSyncExternalStore(subscribeInteractiveHomeHero,
    getInteractiveHomeHeroSnapshot, getStaticHomeHeroSnapshot)

  useEffect(() => {
    if (!container.current) return
    let frame = 0
    let height = -1
    // Loading, failure or a changed motion preference can replace the tall scene
    // with a single-screen hero. Remeasure later sections after that layout.
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.height === height) return
      height = entry.contentRect.height
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        ScrollTrigger.refresh()
      })
    })
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return <HeroContactProvider><div ref={container}>
    {interactive ? <WaterHeroErrorBoundary fallback={() => <StaticHeroSequence />}>
      <Suspense fallback={<LoadingHeroSequence />}>
        <InteractiveHero mode="landing" fallback={<StaticHeroSequence />} />
      </Suspense>
    </WaterHeroErrorBoundary> : <StaticHeroSequence />}
  </div></HeroContactProvider>
}
