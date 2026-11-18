import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SuesTailorApp from './BestTailorApp'
import './best-tailor.css'
import './bridal.css'

createRoot(document.getElementById('root')!).render(<StrictMode><SuesTailorApp /></StrictMode>)
