import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SolaraApp from './SolaraApp'
import './solara.css'

createRoot(document.getElementById('root')!).render(<StrictMode><SolaraApp /></StrictMode>)
