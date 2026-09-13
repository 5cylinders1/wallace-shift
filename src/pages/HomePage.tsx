import { HomeHero } from '../components/Hero/HomeHero'
import { HomeJourney } from '../components/HomeJourney/HomeJourney'
import { useRouteMeta } from '../hooks/useDocumentMeta'

/** The independent water-hero and pit-stop experiments retain their own art direction. */
export function HomePage() {
  useRouteMeta('/')

  return (
    <>
      <HomeHero />
      <HomeJourney />
    </>
  )
}
