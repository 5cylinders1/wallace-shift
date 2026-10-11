import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './roofers.css'
import { RoofersApp } from './RoofersApp'
import { HomePage } from './pages/HomePage'

gsap.registerPlugin(useGSAP, ScrollTrigger)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RoofersApp page="home">
      <HomePage />
    </RoofersApp>
  </StrictMode>,
)
