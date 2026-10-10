import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RoofersOffer } from './RoofersOffer'
import './roofers-offer.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><RoofersOffer /></StrictMode>,
)
