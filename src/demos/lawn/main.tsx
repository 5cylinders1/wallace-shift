import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TrawsomeApp from './TrawsomeApp'
import './lawn.css'
import './estimate/estimator.css'

createRoot(document.getElementById('root')!).render(<StrictMode><TrawsomeApp /></StrictMode>)
