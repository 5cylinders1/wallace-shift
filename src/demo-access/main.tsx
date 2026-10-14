import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DemoRequestPage } from './DemoRequestPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode><DemoRequestPage /></StrictMode>,
)
