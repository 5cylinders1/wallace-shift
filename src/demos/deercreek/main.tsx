import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import DeerCreekApp from './DeerCreekApp'
import './deercreek.css'

const root = document.getElementById('root')!
const slug = root.dataset.dcSlug ?? ''
const app = <StrictMode><DeerCreekApp slug={slug} /></StrictMode>
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
