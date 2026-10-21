import SceneHero from './components/SceneHero'
import { Contact, Footer, Header, Materials, Offers, Process, Statement } from './components/Page'

/** Mitre & Rift Cabinetmakers: one page, led by the scroll-built kitchen. */
export default function MitreApp() {
  return (
    <>
      <a className="mr-skip" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <div id="top" />
        <SceneHero />
        <Statement />
        <Offers />
        <Process />
        <Materials />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
