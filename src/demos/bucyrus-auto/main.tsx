import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import BucyrusAuto from './BucyrusAuto'
import './bucyrus.css'

const root = document.getElementById('root')!
const page = root.dataset.bucyrusPath ?? window.location.pathname
const app = <StrictMode><BucyrusAuto path={page} /></StrictMode>
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
