import { Hero } from '../components/Hero/Hero'
import { BrandStatement } from '../components/BrandStatement/BrandStatement'
import { Services } from '../components/Services/Services'
import { ShiftQuiz } from '../components/ShiftQuiz/ShiftQuiz'
import { Approach } from '../components/Approach/Approach'
import { StandardsSection } from '../components/Standards/StandardsSection'
import { ContactCta } from '../components/ContactCta/ContactCta'
import { siteMeta } from '../content/siteConfig'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

export function HomePage() {
  useDocumentMeta(siteMeta.title, siteMeta.description)

  return (
    <>
      <Hero />
      <BrandStatement />
      <Services />
      <ShiftQuiz />
      <Approach />
      <StandardsSection />
      <ContactCta />
    </>
  )
}
