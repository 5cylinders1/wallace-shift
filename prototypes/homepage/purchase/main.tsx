import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../src/index.css'
import { SiteHeader } from '../../../src/components/SiteHeader/SiteHeader'
import { SiteFooter } from '../../../src/components/SiteFooter/SiteFooter'
import ServiceHome from '../../../src/components/ServiceHome/ServiceHome'

const root = createRoot(document.getElementById('root')!)
root.render(<StrictMode><SiteHeader /><main id="main"><ServiceHome /></main><SiteFooter /></StrictMode>)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
