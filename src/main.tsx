import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './index.css'
import App from './App.tsx'
import { resolvePath, StaticLocationContext } from './lib/router'
import { findRoute } from './content/routeMeta'

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

// Load once per public document, outside React's render lifecycle.
const route = findRoute(resolvePath(window.location.pathname))
if (route && (!route.noindex || route.publicDraft)) {
  const widget = document.createElement('script')
  widget.src = 'https://www.reply365.app/chat/widget.js'
  widget.dataset.widget = '420f110fa3066a067b03d4cc8fcdb1ea'
  widget.defer = true
  document.body.appendChild(widget)
}
