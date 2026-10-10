import { lazy, Suspense, useEffect, useRef, useSyncExternalStore } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Hero } from './Hero'
import { HeroContactProvider } from './HeroContactProvider'
import { BrandStatement } from '../BrandStatement/BrandStatement'
import { WaterHeroErrorBoundary } from '../experiments/water-hero/WaterHeroErrorBoundary'
import { getInteractiveHomeHeroSnapshot, getStaticHomeHeroSnapshot, subscribeInteractiveHomeHero } from './homeHeroDisplay'

// React calls this loader only when the eligible branch is rendered. Mobile
// visitors never mount a hidden Canvas or fetch the Three.js scene chunk.
const InteractiveHero = lazy(() => import('../experiments/water-hero/WaterHeroExperiment')
  .then(module => ({ default: module.WaterHeroExperiment })))

// Keep the statement with its hero branch: desktop folds it into the logo
// reveal, while mobile, loading and failure use the About studio still.
function VideoHeroSequence({ posterOnly = false }: { posterOnly?: boolean }) {
  return <><Hero posterOnly={posterOnly} appearance="studio" /><BrandStatement /></>
}

export function HomeHero() {
  const container = useRef<HTMLDivElement>(null)
  const interactive = useSyncExternalStore(subscribeInteractiveHomeHero,
    getInteractiveHomeHeroSnapshot, getStaticHomeHeroSnapshot)

  useEffect(() => {
    if (!container.current) return
    let frame = 0
    let height = -1
    // Loading, failure or a changed input device can replace the tall scene
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
    {interactive ? <WaterHeroErrorBoundary fallback={() => <VideoHeroSequence posterOnly />}>
      <Suspense fallback={<VideoHeroSequence posterOnly />}>
        <InteractiveHero mode="landing" fallback={<VideoHeroSequence posterOnly />} />
      </Suspense>
    </WaterHeroErrorBoundary> : <VideoHeroSequence />}
  </div></HeroContactProvider>
}
