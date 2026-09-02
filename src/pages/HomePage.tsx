import { Hero } from '../components/Hero/Hero'
import { BrandStatement } from '../components/BrandStatement/BrandStatement'
import { Services } from '../components/Services/Services'
import { ShiftQuiz } from '../components/ShiftQuiz/ShiftQuiz'
import { ApproachSummary } from '../components/ApproachSummary/ApproachSummary'
import { ContactCta } from '../components/ContactCta/ContactCta'
import { useRouteMeta } from '../hooks/useDocumentMeta'

/**
 * The homepage now introduces and routes rather than containing
 * everything. The full process sequence and the standards section moved
 * to `/approach`; each remaining section leads somewhere it can be read
 * about properly.
 */
export function HomePage() {
  useRouteMeta('/')

  return (
    <>
      <Hero />
      <BrandStatement />
      <Services />
      <ShiftQuiz />
      <ApproachSummary />
      <ContactCta />
    </>
  )
}
