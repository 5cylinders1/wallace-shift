import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { RoofersOffer } from './RoofersOffer'
import './roofers-offer.css'

const root = document.getElementById('root')!
const app = <StrictMode><RoofersOffer /></StrictMode>
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
