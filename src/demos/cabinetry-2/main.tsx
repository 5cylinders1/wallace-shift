import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MitreApp from './MitreApp'
import './mitre.css'

createRoot(document.getElementById('root')!).render(<StrictMode><MitreApp /></StrictMode>)
