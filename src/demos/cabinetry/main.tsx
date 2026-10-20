import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TambourApp from './TambourApp'
import './tambour.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><TambourApp /></StrictMode>,
)
