import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ContractorsLander from './ContractorsLander'
import './contractors.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><ContractorsLander /></StrictMode>,
)
