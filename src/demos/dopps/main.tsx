import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import DoppsApp from './DoppsApp'
import './dopps.css'

createRoot(document.getElementById('root')!).render(<StrictMode><DoppsApp /></StrictMode>)
