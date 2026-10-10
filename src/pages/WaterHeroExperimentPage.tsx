import { useEffect, useState } from 'react'
import { WaterHeroExperiment } from '../components/experiments/water-hero/WaterHeroExperiment'
import { Hero } from '../components/Hero/Hero'
import { HeroContactProvider } from '../components/Hero/HeroContactProvider'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import { WATER_HERO_EXPERIMENT_PATH } from '../content/routeMeta'

/**
 * The isolated route for the realtime water hero.
 *
 * Reachable by URL only: it carries no nav label, is absent from the
 * sitemap, and is marked noindex/nofollow in both the prerendered
 * document and — via the effect below — after a client-side navigation,
 * which the baked-in tag cannot cover.
 */
export function WaterHeroExperimentPage() {
  useRouteMeta(WATER_HERO_EXPERIMENT_PATH)
  const [originalMedia] = useState(() => typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('presentation') === 'original-media')

  useEffect(() => {
    const existing = document.head.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    )
    const previous = existing?.content ?? null
    const meta = existing ?? document.createElement('meta')

    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    if (!existing) document.head.appendChild(meta)

    // Restored on the way out, so navigating back to a real page does not
    // leave the rest of the site telling crawlers to ignore it.
    return () => {
      if (previous === null) meta.remove()
      else meta.content = previous
    }
  }, [])

  if (originalMedia) return <HeroContactProvider><div className="hero-original-experiment">
    <nav className="hero-original-experiment__nav" aria-label="Preserved homepage hero">
      <span>Original homepage media</span>
      <a href="/">Back to Wallace Shift</a>
      <a href={`${WATER_HERO_EXPERIMENT_PATH}?look=glass`}>Glass logo experiment</a>
    </nav>
    <Hero appearance="original" />
  </div></HeroContactProvider>

  return <WaterHeroExperiment />
}
