import { HomeHero } from '../components/Hero/HomeHero'
import { HomeJourney } from '../components/HomeJourney/HomeJourney'
import { SHOWCASE_PATH } from '../content/routeMeta'
import { useRouteMeta } from '../hooks/useDocumentMeta'

/** Preserve the complete interactive homepage, including the journey's footer. */
export function ShowcasePage() {
  useRouteMeta(SHOWCASE_PATH)

  return (
    <>
      <HomeHero />
      <HomeJourney />
    </>
  )
}
