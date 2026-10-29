import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CompleteApp from './CompleteApp'
import './painting.css'

createRoot(document.getElementById('root')!).render(<StrictMode><CompleteApp /></StrictMode>)
