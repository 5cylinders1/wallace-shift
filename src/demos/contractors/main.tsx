import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import ContractorsLander from './ContractorsLander'
import './contractors.css'

const root = document.getElementById('root')!
const app = <StrictMode><ContractorsLander /></StrictMode>
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
