import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DemoAgreementPage } from './DemoAgreementPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode><DemoAgreementPage /></StrictMode>,
)
