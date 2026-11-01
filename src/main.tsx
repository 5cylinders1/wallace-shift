import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './index.css'
import App from './App.tsx'
import { resolvePath, StaticLocationContext } from './lib/router'

gsap.registerPlugin(useGSAP, ScrollTrigger)

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}
window.scrollTo(0, 0)

const root = document.getElementById('root')!
const initialLocation = { path: root.dataset.routePath ?? resolvePath(window.location.pathname), search: '' }
const app = (
  <StrictMode>
    <StaticLocationContext.Provider value={initialLocation}>
      <App />
    </StaticLocationContext.Provider>
  </StrictMode>
)

if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
