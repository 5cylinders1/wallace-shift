import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './roofers.css'
import { RoofersApp } from './RoofersApp'
import { InfoPage, type InfoPageId } from './pages/InfoPage'
import { currentPage, INFO_PAGES } from './routes'

/**
 * The entry for the deeper pages (demos/roofers/<page>/index.html). It
 * leaves out the timelapse and the estimator, which only the home page
 * (main.tsx) shows.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger)

const path = currentPage()
const page: InfoPageId = (INFO_PAGES as readonly string[]).includes(path) ? (path as InfoPageId) : 'faq'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RoofersApp page={page}>
      <InfoPage page={page} />
    </RoofersApp>
  </StrictMode>,
)
