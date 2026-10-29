import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import BucyrusAuto from './BucyrusAuto'
import './bucyrus.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><BucyrusAuto /></StrictMode>,
)
