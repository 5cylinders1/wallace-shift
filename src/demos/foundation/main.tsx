import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import DatumFoundation from './DatumFoundation'
import './datum.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><DatumFoundation /></StrictMode>,
)
